#!/usr/bin/env python3
"""多音詞 AI 判讀：自動找出旁白裡的多音詞，判斷 TTS 有沒有唸成正確讀音。

  py qa\\poly_ab.py <輸出資料夾> <節...>        例：py qa\\poly_ab.py ..\\11_品檢\\多音詞_EP2 1-8 1-9

方法（2026-10-04 在 EP1／EP2 驗證，使用者試聽確認）：
  1. 旁白每句先經 to_speech()（已套用 發音規範.json「多音詞替換」的詞會自動略過）
  2. jieba 斷詞，挑出含「多音字清單.json → 字」的詞；正確讀音取 多音字清單 → 詞，沒有就用 pypinyin 的詞組讀音
  3. 同一句再合成兩次：多音字換成「只有一種讀音的同音字」——正確讀音版、錯誤讀音版
  4. MFCC＋DTW 對齊整句，只量原句裡那個詞的區段比較像哪一版
  差距 > +0.10 判「對」、< −0.10 判「唸錯」、中間「不確定」。
輸出：poly_ab.json、多音詞試聽.html（只列唸錯與不確定，聲音內嵌，附建議替換）
修正：把建議替換寫進 00_規範/發音規範.json「多音詞替換」，重新配音。
⚠ pypinyin 的讀音也可能錯——「唸錯」代表 TTS 和字典不一致，要人聽「正確讀音版」確認。
"""
from __future__ import annotations
import asyncio, base64, html, json, re, subprocess, sys
from pathlib import Path
import numpy as np
from scipy.signal import stft
from scipy.fft import dct

ENGINE = Path(__file__).resolve().parent.parent
ROOT = ENGINE.parent
sys.path.insert(0, str(ENGINE))
from subtitles import original_sentences          # noqa: E402
from tts import to_speech, VOICE, RATE, PITCH     # noqa: E402

SPEC = json.loads((ROOT / "00_規範" / "多音字清單.json").read_text(encoding="utf-8"))
HOP = 160 / 16000


# ── 讀音與同音字 ─────────────────────────────────────────────
def _readings(c: str) -> list[str]:
    from pypinyin.constants import PINYIN_DICT
    return [r for r in PINYIN_DICT.get(ord(c), "").split(",") if r]


def _homophone_table() -> dict[str, str]:
    """讀音 → 最常用、而且只有這一種讀音的字（用 jieba 大詞典字頻排序）"""
    freq = {}
    for ln in (ENGINE / "qa" / "dict" / "dict.txt.big").read_text(encoding="utf-8").splitlines():
        p = ln.split()
        if len(p) >= 2 and len(p[0]) == 1 and re.fullmatch(r"[一-鿿]", p[0]):
            freq[p[0]] = freq.get(p[0], 0) + int(p[1])
    poly = set(SPEC.get("字", ""))
    best = {}
    for c, f in sorted(freq.items(), key=lambda x: -x[1]):
        r = _readings(c)
        if len(r) == 1 and c not in poly and r[0] not in best:
            best[r[0]] = c
    return best


def expected(word: str, c: str) -> str:
    if word in SPEC["詞"]:
        return SPEC["詞"][word]
    from pypinyin import pinyin, Style
    return pinyin(word, style=Style.TONE)[word.index(c)][0]


def find_targets(ids: list[str]) -> list[dict]:
    import jieba
    big = ENGINE / "qa" / "dict" / "dict.txt.big"
    if big.exists():
        jieba.set_dictionary(str(big))
    for w in SPEC["詞"]:
        jieba.add_word(w)
    chars = set(SPEC.get("字", ""))
    seen, out = set(), []
    for sid in ids:
        for scn, opt in original_sentences(sid).items():
            for line in opt["sents"]:
                spoken = to_speech(line)
                for w in jieba.cut(spoken):
                    c = next((ch for ch in w if ch in chars), None)
                    if not c or w in seen:
                        continue
                    seen.add(w)
                    exp = expected(w, c)
                    wrong = [r for r in _readings(c)[:3] if r != exp]
                    if wrong:
                        out.append({"sid": sid, "scene": scn, "line": line, "spoken": spoken,
                                    "word": w, "char": c, "expected": exp, "wrong": wrong[0]})
    return out


# ── 合成與比對 ───────────────────────────────────────────────
async def _syn(text: str, path: Path, target: str):
    import edge_tts
    comm = edge_tts.Communicate(text, VOICE, rate=RATE, pitch=PITCH, boundary="WordBoundary")
    audio, bounds = b"", []
    async for m in comm.stream():
        if m["type"] == "audio":
            audio += m["data"]
        elif m["type"] == "WordBoundary":
            bounds.append((m["offset"] / 1e7, (m["offset"] + m["duration"]) / 1e7, m["text"]))
    path.write_bytes(audio)
    pos, acc = text.index(target), 0
    for s, e, t in bounds:
        k = text.find(t, acc)
        if k < 0:
            continue
        if k <= pos < k + len(t):
            return s, e
        acc = k + len(t)
    return None


def _pcm(f: Path) -> np.ndarray:
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                       capture_output=True)
    return np.frombuffer(r.stdout, np.int16).astype(np.float32) / 32768


def _melfb(n=40, nfft=512, sr=16000):
    m = lambda f: 2595 * np.log10(1 + f / 700)
    im = lambda x: 700 * (10 ** (x / 2595) - 1)
    b = np.floor((nfft + 1) * im(np.linspace(m(50), m(7600), n + 2)) / sr).astype(int)
    fb = np.zeros((n, nfft // 2 + 1))
    for i in range(n):
        fb[i, b[i]:b[i + 1]] = (np.arange(b[i], b[i + 1]) - b[i]) / max(1, b[i + 1] - b[i])
        fb[i, b[i + 1]:b[i + 2]] = (b[i + 2] - np.arange(b[i + 1], b[i + 2])) / max(1, b[i + 2] - b[i + 1])
    return fb


_FB = _melfb()


def _mfcc(x):
    _, _, z = stft(x, 16000, nperseg=400, noverlap=240, nfft=512)
    c = dct(np.log(_FB @ (np.abs(z) ** 2) + 1e-8), axis=0, norm="ortho")[1:13]
    return (c - c.mean(1, keepdims=True)).T


def _region(fo: Path, fx: Path, rng, pad=0.03) -> float:
    """DTW 對齊整句，回傳原句 rng 區段沿對齊路徑的平均距離"""
    a, b = _mfcc(_pcm(fo)), _mfcc(_pcm(fx))
    d = np.sqrt(((a[:, None, :] - b[None, :, :]) ** 2).sum(-1))
    n, m = d.shape
    C = np.full((n + 1, m + 1), np.inf)
    C[0, 0] = 0
    for i in range(1, n + 1):
        prev, cur, di = C[i - 1], C[i], d[i - 1]
        best = np.minimum(prev[1:], prev[:-1])           # 上、左上
        for j in range(1, m + 1):
            cur[j] = di[j - 1] + min(best[j - 1], cur[j - 1])
    i, j, per, cnt = n, m, np.zeros(n), np.zeros(n)
    while i > 0 and j > 0:
        per[i - 1] += d[i - 1, j - 1]
        cnt[i - 1] += 1
        k = int(np.argmin([C[i - 1, j - 1], C[i - 1, j], C[i, j - 1]]))
        i, j = (i - 1, j - 1) if k == 0 else (i - 1, j) if k == 1 else (i, j - 1)
    per /= np.maximum(cnt, 1)
    s, e = int((rng[0] - pad) / HOP), int((rng[1] + pad) / HOP)
    return float(per[max(0, s):e].mean())


def main(out: Path, ids: list[str]):
    clips = out / "clips_ab"
    clips.mkdir(parents=True, exist_ok=True)
    targets = find_targets(ids)
    homo = _homophone_table()
    todo = []
    for k, t in enumerate(targets):
        ok, bad = homo.get(t["expected"]), homo.get(t["wrong"])
        if not ok or not bad:
            t["verdict"] = "無同音字"
            continue
        t.update(k=k, ok_char=ok, bad_char=bad, fix=t["word"].replace(t["char"], ok))
        todo.append(t)
    print(f"{len(targets)} 個多音詞，{len(todo)} 個可比對", flush=True)

    async def run():
        sem, res = asyncio.Semaphore(8), {}

        async def job(t, tag, rep):
            pos = t["spoken"].index(t["word"]) + t["word"].index(t["char"])
            text = t["spoken"][:pos] + rep + t["spoken"][pos + 1:]
            async with sem:
                res[(t["k"], tag)] = await _syn(text, clips / f"{t['k']}_{tag}.mp3", t["word"].replace(t["char"], rep))
        await asyncio.gather(*[job(t, tag, rep) for t in todo
                               for tag, rep in (("o", t["char"]), ("r", t["ok_char"]), ("w", t["bad_char"]))])
        return res
    res = asyncio.run(run())

    for t in todo:
        rng = res.get((t["k"], "o"))
        if not rng:
            t["verdict"] = "找不到邊界"
            continue
        a = _region(clips / f"{t['k']}_o.mp3", clips / f"{t['k']}_r.mp3", rng)
        b = _region(clips / f"{t['k']}_o.mp3", clips / f"{t['k']}_w.mp3", rng)
        t["margin"] = round((b - a) / (a + b), 3)
        t["verdict"] = "對" if t["margin"] > 0.10 else "唸錯" if t["margin"] < -0.10 else "不確定"
        print(f"  {t['sid']} {t['word']} {t['expected']}  {t['margin']:+.2f} {t['verdict']}", flush=True)
    (out / "poly_ab.json").write_text(json.dumps(targets, ensure_ascii=False, indent=1), encoding="utf-8")
    write_html(out, targets)
    cnt = {v: sum(t["verdict"] == v for t in targets) for v in ("對", "唸錯", "不確定", "無同音字", "找不到邊界")}
    print("→", cnt)


def write_html(out: Path, rows: list[dict]):
    def au(k, tag):
        b = base64.b64encode((out / "clips_ab" / f"{k}_{tag}.mp3").read_bytes()).decode()
        return f'<audio controls src="data:audio/mpeg;base64,{b}"></audio>'
    show = sorted([r for r in rows if r["verdict"] in ("唸錯", "不確定")], key=lambda r: r["margin"])
    tr = "".join(
        f'<tr class="{"bad" if r["verdict"] == "唸錯" else "mid"}"><td>{r["verdict"]}</td>'
        f'<td><b>{r["word"]}</b> {r["expected"]}<br><small>{r["sid"]} {r["scene"]}</small></td>'
        f'<td>{html.escape(r["line"])}</td><td>{au(r["k"], "o")}</td><td>{au(r["k"], "r")}<br><small>{r["fix"]}</small></td>'
        f'<td>{au(r["k"], "w")}</td><td><code>"{r["word"]}": "{r["fix"]}"</code></td></tr>' for r in show)
    ok = sum(r["verdict"] == "對" for r in rows)
    other = [r["word"] for r in rows if r["verdict"] in ("無同音字", "找不到邊界")]
    (out / "多音詞試聽.html").write_text(f'''<!doctype html><meta charset="utf-8"><title>多音詞判讀</title>
<style>body{{font-family:"Noto Sans TC",sans-serif;background:#111;color:#ddd;margin:24px}}table{{border-collapse:collapse;width:100%}}
td,th{{border-bottom:1px solid #333;padding:6px;vertical-align:middle}}audio{{height:28px;width:170px}}code{{color:#8cf}}
.bad td:first-child{{color:#ff6b6b;font-weight:bold}}.mid td:first-child{{color:#f4c542}}</style>
<h1>多音詞 AI 判讀</h1><p>共 {len(rows)} 個多音詞：判定正確 {ok} 個（不列出）；下面 {len(show)} 個請聽「正確讀音版」是否正確，
正確就把最後一欄加進 <code>發音規範.json → 多音詞替換</code>。</p>
<table><tr><th>判定</th><th>詞／應唸</th><th>句子</th><th>原句</th><th>正確讀音版</th><th>錯誤讀音版</th><th>建議替換</th></tr>{tr}</table>
<p><small>無法比對（找不到同音字或邊界）：{"、".join(other) or "無"}</small></p>''', encoding="utf-8")


if __name__ == "__main__":
    main(Path(sys.argv[1]), sys.argv[2:])
