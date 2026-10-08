#!/usr/bin/env python3
"""配音後聽檢（AI 耳朵），給十二步流程與範本 A～D 用（範本E 另有 qa/ai_listen.py 讀 02_語音）。

  python <skill>/engine/scripts/ai_listen.py [--out qa/聽檢] [--model auto]     （在專案資料夾執行，build.py 之後）

讀 src/data/spec.json 的 voiceLines（每句旁白的文字與起訖秒數）＋ public/voice.wav，依場景切出旁白片段
（範本F／G 讀 timings.json 的每段配音檔），
連同文稿與檢查清單（多音詞的應唸、英數詞、數字）送最新 Gemini Flash（一般多模態模型）聽，回報唸錯、漏字、多字。
輸出：qa/聽檢/聽檢報告.html（只列有疑問的場景、附音檔）、.md、聽檢.json；有疑問時 exit 2（不擋流程，提醒人工確認）。
接著跑 final_qa/listen_crosscheck.py qa/聽檢/聽檢.json（兩個 AI 交叉聽），只有「確定／待聽」要人聽。
金鑰：專案 .env.local 的 GEMINI_API_KEY；沒有金鑰就跳過（exit 0）。
"""
from __future__ import annotations
import sys as _s; _s.stdout.reconfigure(encoding="utf-8", errors="replace")   # cp950 主控台印 ⚠ 會當掉（2026-10-08）
import argparse, base64, html, json, os, re, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
SKILL = HERE.parent.parent
sys.path.insert(0, str(HERE))
import gemini_tts as G                      # noqa: E402

LATIN = re.compile(r"(?<![A-Za-z0-9])[A-Za-z][A-Za-z0-9+#]*(?:[.\-/:][A-Za-z0-9+#]+)*(?![A-Za-z0-9])")
NUM = re.compile(r"\d+(?:\.\d+)+|\d{3,}|\d+%|\d+\s?年")
POLY = json.loads((SKILL / "final_qa" / "多音字清單.json").read_text(encoding="utf-8"))
_T2S = None


def word_pinyin(word: str) -> list[str]:
    """pypinyin 詞組庫是簡體，先 OpenCC 轉簡體再查（處理 chǔ、差別 chā）；多音字清單的詞優先"""
    global _T2S
    from pypinyin import pinyin, Style
    if _T2S is None:
        import opencc
        _T2S = opencc.OpenCC("t2s")
    py = [x[0] for x in pinyin(_T2S.convert(word), style=Style.TONE)]
    for w, r in POLY["詞"].items():
        c = next((ch for ch in w if ch in POLY.get("字", "")), None)
        if w in word and c and c in word:
            py[word.index(c)] = r
    return py


def checklist(text: str) -> dict:
    import jieba
    for w in POLY["詞"]:
        jieba.add_word(w)
    chars = set(POLY.get("字", ""))
    poly = {w: " ".join(word_pinyin(w)) for w in jieba.cut(text)
            if re.fullmatch(r"[一-鿿]+", w) and any(c in chars for c in w)}
    eng = {w: "英文原音（網址唸成 x 點 y 點 com；協定縮寫逐字母也可）" for w in sorted(set(LATIN.findall(text)))}
    num = {w: "一般中文讀法（連接埠號、編號逐字唸）" for w in sorted(set(NUM.findall(text)))}
    return {"多音詞（應唸）": poly, "英數詞（應唸）": eng, "數字（應唸）": num}


PROMPT = """你是台灣華語影片的配音品管。請仔細聽這段音檔，它是照下面的文稿唸的。

文稿：
{text}

請逐項檢查並只回 JSON：
{{"多音詞": [{{"詞": "…", "聽到": "拼音（含聲調）", "正確": true/false}}],
  "英數詞": [{{"詞": "…", "聽到": "…", "正確": true/false, "說明": "…"}}],
  "數字": [{{"寫法": "…", "聽到": "…", "正確": true/false}}],
  "其他問題": [{{"位置": "附近的文字", "問題": "漏字／多字／唸錯", "說明": "…"}}]}}
判斷標準：台灣華語讀音（教育部國語辭典）；清單每一項附「應唸」，聽到的跟應唸不同就是錯。
唸法約定（照這樣唸都算對，不要回報）：網址裡的「.」唸「點」；單獨的 com／org／net 前面多唸一個「點」；
edu、gov、tw 逐字母唸；www 唸「triple W」；「主機:埠號」的冒號唸「冒號」；路徑的「/」唸「斜線」；連接埠與號碼逐字唸（3000 可唸三千）；
英文字母或數字跟中文之間不必停頓。
清單：{check}"""


def listen_model(model: str) -> str:
    if model != "auto":
        return model
    names = [m["name"].split("/")[-1] for m in G.call("GET", "models", query="pageSize=1000").get("models", [])]
    found = sorted(((tuple(int(x) for x in m.group(1).split(".")), n) for n in names
                    if (m := re.fullmatch(r"gemini-(\d+(?:\.\d+)*)-flash", n))), reverse=True)
    return found[0][1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="qa/聽檢")
    ap.add_argument("--model", default="auto")
    a = ap.parse_args()
    try:
        G.api_key(os.getcwd())
    except SystemExit:
        print("  （沒有 GEMINI_API_KEY，跳過 AI 耳朵聽檢）")
        return 0
    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    clips = []                                   # (場景, 文字, 音檔, 起, 訖)
    if Path("src/data/spec.json").exists():      # 十二步流程、範本 A～D
        spec = json.loads(Path("src/data/spec.json").read_text(encoding="utf-8"))
        voice = Path("public") / (spec.get("voice") or "voice.wav")
        scenes = {}
        for vl in spec.get("voiceLines") or []:
            scenes.setdefault(vl["scene"], []).append(vl)
        if voice.exists():
            clips = [(scn, "".join(v["text"] for v in vls), voice, vls[0]["from"] - 0.1, vls[-1]["to"] + 0.25)
                     for scn, vls in scenes.items()]
    elif Path("timings.json").exists():          # 範本F／G（2026-10-06）：每段配音檔
        for sg in json.loads(Path("timings.json").read_text(encoding="utf-8"))["segs"]:
            clips.append((f"第{sg['i']}段", sg["text"], Path(sg["wav"]), 0.0, None))
    if not clips:
        print("  （沒有旁白，跳過 AI 耳朵聽檢）")
        return 0
    m = listen_model(a.model)
    rows = []
    for scn, text, src, a0, a1 in clips:
        mp3 = out / f"{scn}.mp3"
        cut = ["-ss", f"{max(a0, 0):.2f}"] + (["-to", f"{a1:.2f}"] if a1 is not None else [])
        subprocess.run(["ffmpeg", "-v", "error", "-y", *cut, "-i", str(src),
                        "-c:a", "libmp3lame", "-q:a", "4", str(mp3)], check=True)
        chk = checklist(text)
        body = {"contents": [{"role": "user", "parts": [
            {"inline_data": {"mime_type": "audio/mpeg", "data": base64.b64encode(mp3.read_bytes()).decode()}},
            {"text": PROMPT.format(text=text, check=json.dumps(chk, ensure_ascii=False))}]}],
            "generationConfig": {"responseMimeType": "application/json", "temperature": 0}}
        r = G.call("POST", f"models/{m}:generateContent", body)
        raw = "".join(p.get("text", "") for c in r.get("candidates", []) for p in c.get("content", {}).get("parts", []))
        try:
            res = json.loads(raw)
        except Exception:
            res = {"_raw": raw[:1500]}
        probs = []
        for k in ("多音詞", "英數詞", "數字"):
            want = chk.get(f"{k}（應唸）", {})
            for x in res.get(k, []) or []:
                if x.get("正確") is False:
                    w = x.get("詞") or x.get("寫法")
                    probs.append(f"{k}：{w} 應「{want.get(w, '')}」聽到「{x.get('聽到', '')}」{x.get('說明', '')}")
        for x in res.get("其他問題", []) or []:
            probs.append(f"其他：{x.get('位置', '')} {x.get('問題', '')} {x.get('說明', '')}")
        rows.append({"scene": scn, "text": text, "problems": probs, "audio": str(mp3), "result": res})
        print(f"  {scn}：{'✓' if not probs else '⚠ ' + str(len(probs))}", flush=True)
    (out / "聽檢.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    bad = [r for r in rows if r["problems"]]
    (out / "聽檢報告.md").write_text("\n".join([f"# 配音後聽檢（AI 耳朵，{m}）", "", f"{len(rows)} 場，有疑問 {len(bad)} 場", ""]
        + [f"## {r['scene']}\n" + "\n".join(f"- {p}" for p in r["problems"]) + "\n" for r in bad]), encoding="utf-8")
    sec = "".join(f'<section><h2>{r["scene"]}</h2><audio controls src="data:audio/mpeg;base64,'
                  f'{base64.b64encode(Path(r["audio"]).read_bytes()).decode()}"></audio><ul>'
                  + "".join(f"<li>{html.escape(p)}</li>" for p in r["problems"])
                  + f'</ul><details><summary>文稿</summary><p>{html.escape(r["text"])}</p></details></section>' for r in bad)
    (out / "聽檢報告.html").write_text(f'''<!doctype html><meta charset="utf-8"><title>配音聽檢</title>
<style>body{{font-family:"Noto Sans TC",sans-serif;background:#111;color:#ddd;margin:24px;max-width:1000px;line-height:1.6}}
section{{border-bottom:1px solid #333;padding:8px 0}}audio{{width:100%;height:32px}}summary{{color:#999;cursor:pointer}}</style>
<h1>配音後聽檢（AI 耳朵）</h1><p>模型 {m}　{len(rows)} 場，有疑問 <b>{len(bad)}</b> 場（只列有疑問的，請聽音檔確認；AI 標出的不一定是錯）</p>
{sec or "<p>✓ 沒有發現問題</p>"}''', encoding="utf-8")
    print(f"→ {out / '聽檢報告.html'}（{len(rows)} 場，有疑問 {len(bad)} 場）")
    return 2 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
