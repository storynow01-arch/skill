#!/usr/bin/env python3
"""範本規格檢查（2026-10-07）：依 templates/範本清單.json，逐一檢查每個範本符不符合 templates/範本規格.md。
只讀不寫，不會改任何檔案。有任何 ✗ 時 exit 1 → push 前一定要全部 ✓。

用法（在 skill 倉庫任何位置）：python <skill>/templates/check_templates.py [--only H]
"""
from __future__ import annotations
import argparse, json, re, subprocess, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
TPL = Path(__file__).resolve().parent            # storynow-aimovie-make/templates
SKILL = TPL.parent
REPO = SKILL.parent
SECTIONS = [("示範片", r"^##\s*(長什麼樣|10 秒示範片)"), ("適合", r"^##\s*適合"), ("原始提示詞", r"^##\s*原始提示詞"),
            ("流程與品檢", r"^##\s*流程與品檢"), ("概念忠實度檢查", r"^##\s*概念忠實度檢查"), ("範本設定", r"^##\s*範本設定")]


def probe(mp4: Path):
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height", "-of", "json", str(mp4)],
                           capture_output=True, text=True, timeout=60)
        d = json.loads(r.stdout)
    except Exception:
        return None
    v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), {})
    return {"sec": float(d.get("format", {}).get("duration", 0)), "w": v.get("width"), "h": v.get("height"),
            "audio": any(s.get("codec_type") == "audio" for s in d.get("streams", []))}


def check(t: dict, texts: dict) -> list[tuple[str, bool, str]]:
    out = []
    d = TPL / t["dir"]
    ok = lambda name, cond, note="": out.append((name, bool(cond), note))
    ok("資料夾", d.is_dir(), str(d.relative_to(SKILL)))
    if not d.is_dir():
        return out
    ok("命名 範本<代號>_<名稱>", t.get("legacy_name") or re.fullmatch(rf"範本{t['code']}_.+", t["dir"]), "舊名保留" if t.get("legacy_name") else "")
    readme = d / "README.md"
    ok("README.md", readme.exists())
    full = list(d.glob("提示詞_*完整版.md"))
    ok("完整版提示詞", full, full[0].name if full else "缺 提示詞_範本<代號>完整版.md")
    demo = d / "示範"
    info = probe(demo / "示範.mp4") if (demo / "示範.mp4").exists() else None
    ok("示範/示範.mp4", info and 6 <= info["sec"] <= 20 and info["w"] == 1920 and info["h"] == 1080 and info["audio"],
       f"{info['sec']:.1f} 秒 {info['w']}×{info['h']}{' 有聲' if info['audio'] else ' 無聲'}" if info else "缺")
    ok("示範/poster.jpg", (demo / "poster.jpg").exists())
    ok("示範/總覽.jpg", (demo / "總覽.jpg").exists())
    ok("示範分鏡", (demo / "storyboard.json").exists() or list(demo.glob("示範分鏡*")))
    if readme.exists():
        md = readme.read_text(encoding="utf-8")
        head = md.split("\n## ", 1)[0]
        ok("README 引言：來源", "來源：" in head)
        ok("README 引言：觸發", "觸發：" in head or "使用者輸入" in head or "使用者說" in head or (t.get("protected") and "觸發：" in md),
           "受保護範本：寫在結尾範本卡片" if t.get("protected") else "")
        for name, pat in SECTIONS:
            ok(f"README ## {name}", re.search(pat, md, re.M))
        bad = []
        for link in re.findall(r"\]\(([^)#\s]+)\)", md):
            if re.match(r"^(https?:|mailto:)", link):
                continue
            if not (d / link).exists():
                bad.append(link)
        ok("README 相對連結都在", not bad, "、".join(bad[:4]))
        if "## 概念忠實度檢查" in md:
            ok("忠實度表格（make_video 會印）", re.search(r"## 概念忠實度檢查.*?\n\| \d", md, re.S))
    # 登記
    ok("登記：SKILL.md 快速指令", t["dir"] in texts["skill_quick"])
    ok("登記：SKILL.md 工具與檔案", t["dir"] in texts["skill_tools"] or (t["code"] in "ABCD" and "範本A～D_" in texts["skill_tools"]))
    ok("登記：網站 site/build.mjs", f"['{t['dir'].split('_')[0] + '_' if '_' in t['dir'] else t['dir']}'" in texts["site"])
    ok("登記：根目錄 README", re.search(rf"範本\s*{re.escape(t['code'])}\b|範本{re.escape(t['code'])}|{re.escape(t['dir'])}", texts["root"]) if t["code"] != "info1" else "資訊科範本1" in texts["root"])
    if t["type"] == "shared":
        ok("登記：make_video.py TPL", re.search(rf"'{t['code']}':\s*\{{'name'", texts["make_video"]))
        ok("登記：Root.tsx Composition", f'id="Template{t["code"]}"' in texts["root_tsx"])
        ok("程式：tpl/Template{0}.tsx".format(t["code"]), (SKILL / "engine/template/src/tpl" / f"Template{t['code']}.tsx").exists())
        ok("登記：場景語彙", t["code"] in "ABCD" or f"範本{t['code']}" in texts["vocab"])
    else:
        ok("自帶產線：engine 或產生器", (d / "engine").is_dir() or list(d.glob("*/make*.py")) or list(d.rglob("make*.py")))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="只檢查某個代號")
    a = ap.parse_args()
    reg = json.loads((TPL / "範本清單.json").read_text(encoding="utf-8"))["templates"]
    skill = (SKILL / "SKILL.md").read_text(encoding="utf-8")
    texts = {
        "skill_quick": skill.split("## 快速指令", 1)[-1].split("\n## ", 1)[0],
        "skill_tools": skill.split("## 工具與檔案", 1)[-1].split("\n## ", 1)[0],
        "site": (SKILL / "site/build.mjs").read_text(encoding="utf-8"),
        "root": (REPO / "README.md").read_text(encoding="utf-8"),
        "make_video": (SKILL / "engine/scripts/make_video.py").read_text(encoding="utf-8"),
        "root_tsx": (SKILL / "engine/template/src/Root.tsx").read_text(encoding="utf-8"),
        "vocab": (TPL / "範本風格_場景語彙.md").read_text(encoding="utf-8"),
    }
    # 有資料夾但沒登記的範本
    dirs = {p.name for p in TPL.iterdir() if p.is_dir()}
    unreg = sorted(dirs - {t["dir"] for t in reg})
    total_bad = 0
    for t in reg:
        if a.only and t["code"] != a.only:
            continue
        res = check(t, texts)
        bad = [r for r in res if not r[1]]
        total_bad += len(bad)
        print(f"\n{'✓' if not bad else '✗'} {t['dir']}（{t['type']}）{'　' + str(len(bad)) + ' 項不符' if bad else ''}")
        for name, good, note in res:
            if not good:
                print(f"   ✗ {name}{'：' + note if note else ''}")
    if unreg and not a.only:
        total_bad += len(unreg)
        print("\n✗ 有資料夾但沒登記在 範本清單.json：" + "、".join(unreg))
    print(f"\n{'全部符合範本規格 ✓' if total_bad == 0 else f'共 {total_bad} 項不符 → 照 templates/範本規格.md 補齊後再 push'}")
    return 1 if total_bad else 0


if __name__ == "__main__":
    raise SystemExit(main())
