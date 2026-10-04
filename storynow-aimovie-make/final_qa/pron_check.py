#!/usr/bin/env python3
"""唸法時長比對：TTS 實際把一個詞唸成什麼。

  py pron_check.py 詞1,詞2,... [--voice zh-TW-YunJheNeural --rate +18% --pitch +4Hz]

方法（2026-10-03 在教學課程產線驗證過）：同一個詞重複 4 次送 TTS，再把每個候選唸法也各送一次，
比總時長。差 ≤0.03 秒＝TTS 就是那樣唸；跟所有候選都差很多＝TTS 在自己猜，要明定唸法。
候選自動產生：英文 → 逐字母、小寫單字；數字 → 逐字（四四三）、中文整數（四百四十三）。
語音辨識（whisper）對英文縮寫、數字唸法分辨不出來，所以不用它判斷。
"""
from __future__ import annotations
import asyncio, json, subprocess, sys, tempfile
from pathlib import Path

ZH = "零一二三四五六七八九"


def zh_int(n: int) -> str:
    """整數 → 中文讀法（0～99999）"""
    if n == 0:
        return "零"
    units = [(10000, "萬"), (1000, "千"), (100, "百"), (10, "十"), (1, "")]
    out, zero = "", False
    for u, name in units:
        d = n // u % 10 if u < 10000 else n // u
        if d:
            if zero and out:
                out += "零"
            out += ("兩" if d == 2 and (u >= 1000 or (u == 100 and not out)) else ZH[d]) + name
            zero = False
        elif out:
            zero = True
    return out[1:] if out.startswith("一十") else out


def candidates(term: str) -> list[str]:
    if term.isdigit():
        return ["".join(ZH[int(c)] for c in term), zh_int(int(term))]
    alts = [" ".join(term)]
    if term.lower() != term:
        alts.append(term.lower())
    return alts


async def _syn(text, path, voice, rate, pitch):
    import edge_tts
    await edge_tts.Communicate("，".join([text] * 4) + "。", voice, rate=rate, pitch=pitch).save(path)


def _dur(p) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)],
                       capture_output=True, text=True)
    return float(r.stdout)


def compare_terms(terms, out=None, voice="zh-TW-YunJheNeural", rate="+18%", pitch="+4Hz"):
    out = Path(out or tempfile.mkdtemp())
    out.mkdir(parents=True, exist_ok=True)
    res = []
    for k, t in enumerate(terms):
        row = {}
        for i, s in enumerate([t] + candidates(t)):
            p = out / f"{k}_{i}.mp3"
            asyncio.run(_syn(s, p, voice, rate, pitch))
            row[s] = round(_dur(p), 2)
        raw = row[t]
        alts = {s: d for s, d in row.items() if s != t}
        best = min(alts, key=lambda s: abs(alts[s] - raw))
        same = abs(alts[best] - raw) <= 0.03
        if not same:
            verdict = f"跟候選都不同（最接近「{best}」，差 {abs(alts[best] - raw):.2f}s）→ TTS 在自己猜，請明定唸法"
        elif t.isupper() and best == t.lower():
            verdict = f"唸成英文單字「{best}」→ 縮寫通常應逐字母唸，請確認"
        else:
            verdict = f"＝「{best}」"
        res.append({"term": t, "durations": row, "closest": best, "verdict": verdict})
    return res


if __name__ == "__main__":
    for r in compare_terms(sys.argv[1].split(",")):
        print(f"{r['term']:12} {r['verdict']}   {r['durations']}")


# ── 英文詞回聽（2026-10-04 加入）───────────────────────────────────────
# 時長比對只能分辨「逐字母／整個詞」，分辨不出英文單字唸得像不像（例如 mail 被唸成「妙」）。
# 這裡把詞放進 3 種句子各合成一次，用 faster-whisper small 以英文模式辨識，3 次中至少 2 次聽得出該詞才算唸對。
# base 模型實測太粗（同一段音檔前後結論不同），small 才可靠。
CARRIERS = ["這個詞是 {w}，{w}。", "請輸入 {w} 這個字。", "{w} 是常見的英文縮寫。"]
_MODEL = None


def _asr_en(path: str) -> str:
    global _MODEL
    if _MODEL is None:
        from faster_whisper import WhisperModel
        _MODEL = WhisperModel("small", device="cpu", compute_type="int8")
    segs, _ = _MODEL.transcribe(path, language="en", beam_size=5)
    return "".join(s.text for s in segs).strip()


def english_check(word: str, spoken: str | None = None, out=None, accept: list[str] | None = None,
                  voice="zh-TW-YunJheNeural", rate="+18%", pitch="+4Hz") -> dict:
    """word：稿子上的詞；spoken：實際送進 TTS 的寫法（預設同 word）；accept：辨識結果裡出現哪些拼法算對"""
    import re
    out = Path(out or tempfile.mkdtemp())
    out.mkdir(parents=True, exist_ok=True)
    spoken = spoken or word
    norm = lambda x: re.sub(r"[^a-z0-9]", "", x.lower())
    targets = [norm(a) for a in (accept or [word])]
    votes, heard = 0, []
    for k, tpl in enumerate(CARRIERS):
        p = out / f"en_{norm(word)}_{norm(spoken)}_{k}.mp3"
        import edge_tts
        asyncio.run(edge_tts.Communicate(tpl.format(w=spoken), voice, rate=rate, pitch=pitch).save(str(p)))
        h = _asr_en(str(p))
        heard.append(h)
        votes += any(t in norm(h) for t in targets)
    return {"word": word, "spoken": spoken, "votes": votes, "ok": votes >= 2, "heard": heard}
