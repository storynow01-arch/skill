#!/usr/bin/env python3
"""配音後聽檢（AI 耳朵）：把每一場的配音＋文稿＋檢查清單交給 Gemini 聽，逐項回報讀音。

  py qa\\ai_listen.py <輸出資料夾> <節...> [--audio-dir 02_語音] [--model auto]
  例：py qa\\ai_listen.py ..\\11_品檢\\聽檢_單元一 1-1 1-2

檢查清單（每一場）：
  多音詞：qa/poly_ab.py 的 word_pinyin（轉簡體查詞組＋多音字清單覆蓋）給正確讀音，請 AI 回報聽到的讀音
  英數詞：網址、協定、產品名、指令 —— 請 AI 判斷唸法是否正確（英文、逐字母、或被唸成中文近似音）
  數字：年份、百分比、連接埠、IP —— 請 AI 寫出聽到的唸法
另外請 AI 列出「清單以外」聽起來不對的地方（漏字、多字、明顯唸錯）。
模型：auto＝最新正式版 gemini-<版本>-flash（不用 TTS 模型；聽音檔用一般多模態模型）。
輸出：聽檢報告.html（只列有問題的場景，附可播放的音檔）、.md、聽檢.json
為什麼：Gemini／克隆聲音不能用 edge-tts 時代的時長比對，也不是每次都一樣；直接請模型聽最直接。
"""
from __future__ import annotations
import base64, html, json, re, sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parent.parent
ROOT = ENGINE.parent
sys.path.insert(0, str(ENGINE))
sys.path.insert(0, str(ENGINE / "qa"))
import gemini_tts as G                                    # noqa: E402
from tts import parse                                     # noqa: E402
from poly_ab import word_pinyin, SPEC                     # noqa: E402
SKIP = set(json.loads((ROOT / "00_規範" / "配音設定.json").read_text(encoding="utf-8")).get("skip_rules", []))

LATIN = re.compile(r"(?<![A-Za-z0-9])[A-Za-z][A-Za-z0-9+#]*(?:[.\-/:][A-Za-z0-9+#]+)*(?![A-Za-z0-9])")
NUM = re.compile(r"\d+(?:\.\d+)+|\d{3,}|\d+%|\d+\s?年")


def listen_model(model: str = "auto") -> str:
    if model != "auto":
        return model
    names = [m["name"].split("/")[-1] for m in G.call("GET", "models", query="pageSize=1000").get("models", [])]
    found = sorted(((tuple(int(x) for x in m.group(1).split(".")), n) for n in names
                    if (m := re.fullmatch(r"gemini-(\d+(?:\.\d+)*)-flash", n))), reverse=True)
    return found[0][1]


def checklist(narr: str) -> dict:
    import jieba
    big = ENGINE / "qa" / "dict" / "dict.txt.big"
    if big.exists() and getattr(jieba, "_tw_dict", None) != str(big):
        jieba.set_dictionary(str(big))
        jieba._tw_dict = str(big)
    for w in SPEC_WORDS():
        jieba.add_word(w)                                  # 多音字清單的詞不要被拆開（鋪好、重問）
    chars = set(SPEC.get("字", ""))
    poly = {}
    for w in jieba.cut(narr.replace("\n", "")):
        if re.fullmatch(r"[一-鿿]+", w) and any(c in chars for c in w):
            poly[w] = " ".join(word_pinyin(w))
    # 英數詞與數字也給「應唸」：照 發音規範.json 轉換（不套 edge 權宜寫法），AI 才知道 65535 要逐字、ping 要英文
    from tts import to_speech
    eng = {}
    for w in sorted(set(LATIN.findall(narr))):
        say = to_speech(w, skip=SKIP)
        if say == w:
            eng[w] = "英文原音（網址唸成 x 點 y 點 com；協定縮寫逐字母也可）"
        elif re.fullmatch(r"(?:[A-Za-z0-9] )+[A-Za-z0-9]", say):
            eng[w] = f"逐字母：{say}"
        else:
            eng[w] = f"唸成：{say}"
    num = {}
    for w in sorted(set(NUM.findall(narr))):
        say = to_speech(w, skip=SKIP)
        num[w] = say if say != w else "一般中文讀法"
    return {"多音詞（應唸）": poly, "英數詞（應唸）": eng, "數字（應唸）": num}


PROMPT = """你是台灣華語教學影片的配音品管。請仔細聽這段音檔，它是照下面的文稿唸的。

文稿：
{text}

請逐項檢查並只回 JSON：
{{"多音詞": [{{"詞": "…", "應唸": "…", "聽到": "拼音（含聲調）", "正確": true/false}}],
  "英數詞": [{{"詞": "…", "聽到": "例如：英文 ping／逐字母 H T T P S／中文近似音『聘』", "正確": true/false, "說明": "…"}}],
  "數字": [{{"寫法": "…", "聽到": "中文寫出聽到的唸法", "正確": true/false}}],
  "其他問題": [{{"位置": "附近的文字", "問題": "漏字／多字／唸錯／停頓怪", "說明": "…"}}]}}

判斷標準：台灣華語讀音（教育部國語辭典）；英文專有名詞照英文或業界慣用唸法（HTTP 可逐字母）；
清單裡每一項都附「應唸」：聽到的唸法和「應唸」不同就是錯（例如 65535 應唸「六五五三五」，唸成「六萬五千五百三十五」就是錯；
ping 應唸英文原音，被唸成中文腔或中文近似音就是錯）。
清單：{check}"""


def ask(mp3: Path, text: str, check: dict, model: str) -> dict:
    body = {"contents": [{"role": "user", "parts": [
        {"inline_data": {"mime_type": "audio/mpeg", "data": base64.b64encode(mp3.read_bytes()).decode()}},
        {"text": PROMPT.format(text=text, check=json.dumps(check, ensure_ascii=False))}]}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0}}
    r = G.call("POST", f"models/{model}:generateContent", body)
    raw = "".join(p.get("text", "") for c in r.get("candidates", []) for p in c.get("content", {}).get("parts", []))
    try:
        return json.loads(raw)
    except Exception:
        return {"_raw": raw[:2000]}


def problems(res: dict, check: dict | None = None) -> list[str]:
    out = []
    for k in ("多音詞", "英數詞", "數字"):
        want = (check or {}).get(f"{k}（應唸）", {})
        for x in res.get(k, []) or []:
            if x.get("正確") is False:
                w = x.get("詞") or x.get("寫法")
                out.append(f"{k}：{w} 應「{x.get('應唸') or want.get(w, '')}」聽到「{x.get('聽到', '')}」{x.get('說明', '')}")
    for x in res.get("其他問題", []) or []:
        out.append(f"其他：{x.get('位置', '')} {x.get('問題', '')} {x.get('說明', '')}")
    if "_raw" in res:
        out.append("（AI 回覆不是 JSON，見 聽檢.json）")
    return out


def SPEC_WORDS():
    return [w for w in json.loads((ROOT / "00_規範" / "多音字清單.json").read_text(encoding="utf-8"))["詞"]]


def main(out: Path, ids: list[str], audio_dir: Path, model: str):
    G.api_key(ROOT)
    m = listen_model(model)
    out.mkdir(parents=True, exist_ok=True)
    rows = []
    for sid in ids:
        f = next(p for p in (ROOT / "01_腳本").glob(f"{sid}_*.md") if "_plan" not in p.name)
        for scn, _, narr in parse(f):
            mp3 = audio_dir / sid / f"{scn}.mp3"
            if not mp3.exists():
                continue
            chk = checklist(narr)
            res = ask(mp3, narr, chk, m)
            ps = problems(res, chk)
            rows.append({"sid": sid, "scene": scn, "text": narr, "check": chk, "result": res, "problems": ps,
                         "audio": str(mp3)})
            print(f"  {sid} {scn}：{'✓' if not ps else '⚠ ' + str(len(ps))}", flush=True)
    (out / "聽檢.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    bad = [r for r in rows if r["problems"]]
    md = [f"# 配音後聽檢（AI 耳朵，{m}）", "", f"{len(rows)} 場，有疑問 {len(bad)} 場", ""]
    sec = []
    for r in bad:
        md += [f"## {r['sid']} {r['scene']}", ""] + [f"- {p}" for p in r["problems"]] + [""]
        au = base64.b64encode(Path(r["audio"]).read_bytes()).decode()
        sec.append(f'<section><h2>{r["sid"]} {r["scene"]}</h2><audio controls src="data:audio/mpeg;base64,{au}"></audio>'
                   f'<ul>{"".join(f"<li>{html.escape(p)}</li>" for p in r["problems"])}</ul>'
                   f'<details><summary>文稿</summary><p>{html.escape(r["text"])}</p></details></section>')
    (out / "聽檢報告.md").write_text("\n".join(md), encoding="utf-8")
    (out / "聽檢報告.html").write_text(f'''<!doctype html><meta charset="utf-8"><title>配音聽檢</title>
<style>body{{font-family:"Noto Sans TC",sans-serif;background:#111;color:#ddd;margin:24px;max-width:1000px;line-height:1.6}}
section{{border-bottom:1px solid #333;padding:8px 0}}audio{{width:100%;height:32px}}summary{{color:#999;cursor:pointer}}</style>
<h1>配音後聽檢（AI 耳朵）</h1><p>模型 {m}　{len(rows)} 場，有疑問 <b>{len(bad)}</b> 場。只列有疑問的場景，請聽音檔確認。</p>
{"".join(sec) or "<p>✓ 沒有發現問題</p>"}''', encoding="utf-8")
    print(f"→ {out / '聽檢報告.html'}（{len(rows)} 場，有疑問 {len(bad)} 場）")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    ad = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--audio-dir=")), str(ROOT / "02_語音"))
    md_ = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--model=")), "auto")
    main(Path(args[0]), args[1:], Path(ad), md_)
