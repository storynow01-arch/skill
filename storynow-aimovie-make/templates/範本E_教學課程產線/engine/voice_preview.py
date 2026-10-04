#!/usr/bin/env python3
"""第⑦步聲音試聽：用 Gemini 聲音設計做幾個聲音，同一句台詞各唸一次，產出固定格式的試聽頁。

  python voice_preview.py --out 05_聲音試聽 --line "台詞" \\
      --voice "A 明亮清爽=描述…" --voice "B 溫暖中音=描述…" --voice "C 低沉渾厚=描述…" \\
      [--style "講話方式"] [--gender male] [--asr]

  也可以用設定檔：python voice_preview.py --config voices.json
      {"line": "…", "style": "…", "gender": "male",
       "voices": [{"name": "A 明亮清爽", "description": "…"}, {"name": "已有聲音", "voice_id": "voice_…"}]}

台詞建議 3～5 句、約 20 秒：太短（一兩句）時平均音高會受語調起伏影響，比較不準。
輸出（--out 資料夾）：
  試聽.html      聲音內嵌（單檔就能傳給別人聽）、每個聲音附平均音高（越低越沉）、語速（字/秒）、選用的語音辨識吻合度
  voices.json    每個聲音的 id 與描述 → 使用者選定後，把 id 或描述寫進 storyboard 的 voice（或範本E 的 配音設定.json）
  <名稱>.mp3     各聲音的試聽檔
金鑰：環境變數 GEMINI_API_KEY 或專案 .env.local。設計的聲音存在 Gemini 專案裡一年（上限 200 個）。
"""
from __future__ import annotations
import argparse, base64, html, json, os, re, subprocess, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gemini_tts as G      # noqa: E402

HAN = re.compile(r"[一-鿿A-Za-z0-9]")


def pcm16k(path: Path):
    import numpy as np
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                       capture_output=True)
    return np.frombuffer(r.stdout, np.int16).astype(np.float32) / 32768


def median_f0(x, sr: int = 16000) -> float:
    """自相關法估每 20ms 的基頻，取中位數（只算有聲段）"""
    import numpy as np
    out = []
    for i in range(0, len(x) - 800, 320):
        w = x[i:i + 800] - x[i:i + 800].mean()
        if np.sqrt((w ** 2).mean()) < 0.02:
            continue
        ac = np.correlate(w, w, "full")[799:]
        lo, hi = sr // 350, sr // 60
        k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.5 * ac[0]:
            out.append(sr / k)
    return float(np.median(out)) if out else 0.0


def asr_match(path: Path, line: str) -> int:
    import difflib
    from faster_whisper import WhisperModel
    m = WhisperModel("small", device="cpu", compute_type="int8")
    segs, _ = m.transcribe(str(path), language="zh", initial_prompt="以下是繁體中文。")
    norm = lambda s: "".join(HAN.findall(s)).lower()
    return round(difflib.SequenceMatcher(None, norm(line), norm("".join(s.text for s in segs))).ratio() * 100)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--config")
    ap.add_argument("--line")
    ap.add_argument("--voice", action="append", default=[], help="名稱=聲音描述（可重複）")
    ap.add_argument("--style", default=G.DEFAULT_STYLE)
    ap.add_argument("--gender", default="male")
    ap.add_argument("--language", default="zh-TW")
    ap.add_argument("--model", default="auto")
    ap.add_argument("--asr", action="store_true", help="加算語音辨識吻合度（需要 faster-whisper，較慢）")
    a = ap.parse_args()

    cfg = json.loads(Path(a.config).read_text(encoding="utf-8")) if a.config else {}
    line = cfg.get("line") or a.line
    style = cfg.get("style") or a.style
    gender = cfg.get("gender") or a.gender
    voices = cfg.get("voices") or [dict(zip(("name", "description"), v.split("=", 1))) for v in a.voice]
    if not line or not voices:
        sys.exit("需要 --line 與至少一個 --voice（或 --config）")

    out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    G.api_key(out)
    model = G.resolve_model(cfg.get("model") or a.model)
    rows = []
    for v in voices:
        name = v["name"].strip()
        vid = v.get("voice_id") or G.design_voice(v["description"], gender=v.get("gender", gender),
                                                   language_code=a.language, name=name)
        safe = re.sub(r'[\\/:*?"<>|\s]+', "_", name)
        wav = out / f"{safe}.wav"
        wav.write_bytes(G.synth(line, vid, style=style, model=model))
        mp3 = out / f"{safe}.mp3"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(wav), "-c:a", "libmp3lame", "-q:a", "3", str(mp3)],
                       check=True)
        x = pcm16k(wav)
        dur = len(x) / 16000
        row = {"name": name, "voice_id": vid, "description": v.get("description", ""), "file": mp3.name,
               "f0": round(median_f0(x)), "seconds": round(dur, 1),
               "cps": round(len(HAN.findall(line)) / dur, 1) if dur else 0}
        if a.asr:
            row["asr"] = asr_match(wav, line)
        wav.unlink()
        rows.append(row)
        print(f"  {name:12} {row['f0']:4d} Hz  {row['cps']} 字/秒  {vid}")

    (out / "voices.json").write_text(json.dumps({"model": model, "style": style, "line": line, "voices": rows},
                                                ensure_ascii=False, indent=1), encoding="utf-8")
    au = lambda f: f'<audio controls src="data:audio/mpeg;base64,{base64.b64encode((out / f).read_bytes()).decode()}"></audio>'
    tr = "".join(
        f'<tr><td><b>{html.escape(r["name"])}</b><br><small>{html.escape(r["description"])}</small></td>'
        f'<td>{au(r["file"])}</td><td>{r["f0"]} Hz</td><td>{r["cps"]} 字/秒</td>'
        + (f'<td>{r["asr"]}%</td>' if a.asr else "") + "</tr>" for r in rows)
    (out / "試聽.html").write_text(f'''<!doctype html><meta charset="utf-8"><title>聲音試聽</title>
<style>body{{font-family:"Noto Sans TC",sans-serif;background:#111;color:#ddd;margin:24px;max-width:1100px}}
table{{border-collapse:collapse;width:100%}}td,th{{border-bottom:1px solid #333;padding:10px;text-align:left;vertical-align:middle}}
audio{{height:30px;width:280px}}small{{color:#999}}</style>
<h1>聲音試聽</h1>
<p>模型 <b>{html.escape(model)}</b>；講話方式：{html.escape(style)}</p>
<p>台詞：「{html.escape(line)}」</p>
<table><tr><th>聲音</th><th>試聽</th><th>平均音高</th><th>語速</th>{"<th>辨識吻合</th>" if a.asr else ""}</tr>{tr}</table>
<p><small>平均音高越低聲音越沉（台詞約 20 秒以上才準）。選定後把 voices.json 裡該聲音的 voice_id（或 description）寫進 storyboard 的 voice。</small></p>''',
                                   encoding="utf-8")
    print(f"→ {out / '試聽.html'}")


if __name__ == "__main__":
    main()
