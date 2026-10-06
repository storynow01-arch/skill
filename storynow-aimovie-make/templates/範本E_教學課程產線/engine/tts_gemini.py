#!/usr/bin/env python3
"""Gemini Flash TTS 配音（自動用最新正式版；取代 edge-tts，舊版 tts.py 保留可退回）。

用法:
    py tts_gemini.py ../01_腳本/1-8_傳輸媒介.md [--force] [--out=<資料夾>]   （--out 試做用，不覆寫 02_語音）
設定:
    00_規範/配音設定.json   模型、聲音 id（或聲音描述，第一次自動設計並寫回）、講課風格、每段字數
    .env.local（專案根目錄） GEMINI_API_KEY=...   ← 金鑰只放這裡，不進 git
輸出（與 tts.py 相同格式，下游 build_data.py 不用改）:
    02_語音/<id>/S1.mp3 S1.srt …、full.mp3、marks.json

做法：
  1. 同一節相鄰場景併成一段（≤ 每段字數），一段送一次請求 —— 免費層每天次數很少，一節約 3～4 次
  2. Gemini 不給時間戳 → 用 faster-whisper 逐字時間 + difflib 對齊已知文稿，算出每句起訖
  3. 依句子時間把整段切回各場景（切點落在兩場景之間的停頓中點），每場一個 mp3 + 句級 srt
  4. 每段音檔依文字雜湊快取在 02_語音/<id>/_gemini_cache/，配額用完（429）就停，隔天重跑會從斷點接續
"""
from __future__ import annotations
import hashlib, json, re, shutil, subprocess, sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parent
ROOT = ENGINE.parent
sys.path.insert(0, str(ENGINE))
from tts import parse, lint, to_speech, dur          # noqa: E402

CFG_PATH = ROOT / "00_規範" / "配音設定.json"
import gemini_tts as G                                  # noqa: E402  共用：金鑰、最新模型、聲音設計、合成、對齊
Quota = G.Quota


def load_cfg() -> dict:
    cfg = json.loads(CFG_PATH.read_text(encoding="utf-8"))
    G.api_key(ROOT)
    cfg["model_resolved"] = G.resolve_model(cfg.get("model", "auto"))
    if not cfg.get("voice_id"):
        # 第一次：用聲音描述設計聲音，id 寫回設定檔（聲音存在 Gemini 專案裡一年）
        cfg["voice_id"] = G.design_voice(cfg.get("voice_description") or G.DEFAULT_DESCRIPTION,
                                         gender=cfg.get("gender", "male"),
                                         language_code=cfg.get("language_code", "zh-TW"),
                                         name=cfg.get("voice_name", "course_voice"))
        save = {k: v for k, v in cfg.items() if k != "model_resolved"}
        CFG_PATH.write_text(json.dumps(save, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  已設計聲音 → {cfg['voice_id']}（寫回 {CFG_PATH.name}）")
    return cfg


def gemini_text(text: str, cfg: dict) -> str:
    """送 Gemini 的文字：數字、IP、縮寫照 to_speech 轉；但 edge-tts 專用的權宜寫法
    （多音詞同音字替換、英文詞的中文近似音）Gemini 不需要，在 配音設定.json 的 skip_rules 列出。"""
    text = to_speech(text, skip=set(cfg.get("skip_rules", [])))
    # Gemini 專用的唸法統一（配音設定.json 的 gemini_replace），例如單獨的 com → .com 唸「點 com」
    for r in cfg.get("gemini_replace", []):
        if r["repl"] == "__SPELL__":           # 逐字母：edu → E D U
            text = re.sub(r["pattern"], lambda m: " ".join(m.group(0).upper()), text)
        else:
            text = re.sub(r["pattern"], r["repl"], text)
    return text


def synth(text: str, cfg: dict, wav: Path):
    wav.write_bytes(G.synth(text, cfg["voice_id"], style=cfg["style"], model=cfg["model_resolved"]))


def split_sentences(narr: str) -> list[str]:
    """與 edge-tts 句級字幕相同的切法：一行一句，再依句末標點細分"""
    out = []
    for line in narr.split("\n"):
        out += [p for p in re.split(r"(?<=[。？！；])", line.strip()) if p.strip()]
    return out


def srt_time(x: float) -> str:
    ms = int(round(max(x, 0) * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def main(md: Path, force: bool = False, out_dir: str = ""):
    cfg = load_cfg()
    sid = md.stem.split("_")[0]
    final = Path(out_dir).resolve() / sid if out_dir else ROOT / "02_語音" / sid
    cache = final / "_gemini_cache"
    cache.mkdir(parents=True, exist_ok=True)
    # 整節成功才覆寫（2026-10-05：配額中途用完，1-1 變成新舊聲音混在一起）：先寫到 _staging，全部完成再搬
    out = final / "_staging"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir()
    scenes = parse(md)
    print(f"{md.name} → {len(scenes)} 個 scene（{cfg['model_resolved']}，聲音 {cfg['voice_id']}）\n")

    problems = [p for s, _, n in scenes for p in lint(gemini_text(n, cfg), s)]
    if problems:
        print("⚠ 唸法規則沒蓋到：\n  " + "\n  ".join(problems))

    # 1. 併段
    groups, cur, n = [], [], 0
    for sc in scenes:
        c = len(re.sub(r"\s", "", sc[2]))
        if cur and n + c > cfg.get("chunk_chars", 700):
            groups.append(cur); cur, n = [], 0
        cur.append(sc); n += c
    if cur:
        groups.append(cur)

    rows, total, warnings = [], 0.0, []
    for g, grp in enumerate(groups):
        sents_by_scene = [split_sentences(gemini_text(narr, cfg)) for _, _, narr in grp]
        text = "\n".join(s for ss in sents_by_scene for s in ss)
        h = hashlib.sha1(json.dumps([text, cfg["model_resolved"], cfg["voice_id"], cfg["style"]],
                                    ensure_ascii=False).encode()).hexdigest()[:12]
        wav = cache / f"{h}.wav"
        if force or not wav.exists():
            print(f"  第 {g + 1}/{len(groups)} 段（{len(text)} 字）送 Gemini…", flush=True)
            try:
                synth(text, cfg, wav)
            except Quota as e:
                print(f"\n⛔ 配額用完，已完成的段落都在快取裡，之後重跑同一指令會接續。\n{e}")
                sys.exit(3)
        flat = [s for ss in sents_by_scene for s in ss]
        spans = G.align(flat, str(wav))
        # 對齊檢查：每句長度要合理（每字至少 0.1 秒）；太短＝辨識沒對到（漏唸、唸錯、亂唸）
        for q, (st, en) in enumerate(spans):
            nchar = len(re.sub(r"[^\u4e00-\u9fffA-Za-z0-9]", "", flat[q]))
            if nchar >= 4 and (en - st) < 0.1 * nchar:
                warnings.append({"group": g + 1, "sentence": flat[q], "seconds": round(en - st, 2)})
        total_wav = dur(wav)
        # 2. 依場景切：切點＝前一場最後一句結束與下一場第一句開始的中點
        k, cuts = 0, [0.0]
        for ss in sents_by_scene[:-1]:
            k += len(ss)
            cuts.append((spans[k - 1][1] + spans[k][0]) / 2)
        cuts.append(total_wav)
        k = 0
        for j, (s, slug, narr) in enumerate(grp):
            a, b = cuts[j], cuts[j + 1]
            mp3 = out / f"{s}.mp3"
            subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(wav), "-ss", f"{a:.3f}", "-to", f"{b:.3f}",
                            "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "128k", str(mp3)], check=True)
            # 3. 句級 srt（相對於本場起點；字幕顯示原稿文字，不是送 TTS 的唸法）
            orig = split_sentences(narr)
            ss = sents_by_scene[j]
            lines = []
            for q, sent in enumerate(ss):
                st, en = spans[k + q]
                nxt = spans[k + q + 1][0] if q + 1 < len(ss) else b
                en = max(en, min(nxt, en + 0.25))
                label = orig[q] if len(orig) == len(ss) else sent
                lines.append(f"{q + 1}\n{srt_time(st - a)} --> {srt_time(en - a)}\n{label}\n")
            (out / f"{s}.srt").write_text("\n".join(lines), encoding="utf-8")
            k += len(ss)
            d = dur(mp3)
            total += d
            chars = len(re.sub(r"\s", "", narr))
            rows.append({"scene": s, "slug": slug, "seconds": round(d, 2), "chars": chars,
                         "cps": round(chars / d, 1) if d else 0})
            print(f"  {s:3} {slug:14} {d:6.2f}s  {chars:4d}字  {chars / d if d else 0:4.1f}字/秒")

    lst = out / "concat.txt"
    lst.write_text("".join(f"file '{out / (r['scene'] + '.mp3')}'\n" for r in rows), encoding="utf-8")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst),
                    "-c", "copy", str(out / "full.mp3")], check=True)
    (out / "marks.json").write_text(json.dumps(
        {"id": sid, "engine": "gemini", "model": cfg["model_resolved"], "voice": cfg["voice_id"], "style": cfg["style"],
         "total_seconds": round(total, 2), "scenes": rows, "align_warnings": warnings},
        ensure_ascii=False, indent=2), encoding="utf-8")
    # 全部成功 → 檢查對齊 → 搬到正式位置（原本的檔案先移到 _上一版）
    sent_total = sum(len(split_sentences(gemini_text(n, cfg))) for _, _, n in scenes)
    if warnings:
        print(f"\n⚠ 對齊可疑 {len(warnings)}／{sent_total} 句（可能漏唸或唸錯）：")
        for w in warnings[:10]:
            print(f"   第{w['group']}段 {w['seconds']}s「{w['sentence'][:30]}」")
    if len(warnings) > max(2, sent_total * 0.1) and "--accept" not in sys.argv:
        print(f"⛔ 可疑句太多，沒有覆寫 {final}（新音檔留在 _staging，聽過沒問題可加 --accept 重跑）")
        sys.exit(4)
    prev = final / "_上一版"
    if prev.exists():
        shutil.rmtree(prev)
    old = [x for x in final.iterdir() if x.is_file()]
    if old:
        prev.mkdir()
        for x in old:
            shutil.move(str(x), str(prev / x.name))
    for x in out.iterdir():
        shutil.move(str(x), str(final / x.name))
    out.rmdir()
    # concat.txt 裡記的是 _staging 路徑 → 改回正式位置
    (final / "concat.txt").write_text("".join(f"file '{final / (r['scene'] + '.mp3')}'\n" for r in rows), encoding="utf-8")
    print(f"\n  合計 {total:.1f} 秒 ({total / 60:.2f} 分)　對齊可疑 {len(warnings)} 句\n  輸出 → {final}（原檔在 _上一版）")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    od = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--out=")), "")
    main(Path(args[0]).resolve(), force="--force" in sys.argv, out_dir=od)
