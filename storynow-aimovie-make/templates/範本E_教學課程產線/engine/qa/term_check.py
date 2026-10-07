#!/usr/bin/env python3
"""第⓪關 文稿檢查：在配音之前，檢查文稿與分鏡的專業用詞與寫法。

  py qa\\term_check.py [檔案或資料夾...] [--out 輸出資料夾] [--rules 規範檔]
  例：py qa\\term_check.py ..\\01_腳本                      （預設：01_腳本 的 *.md 與 *_plan.json）
      py qa\\term_check.py storyboard.json --out 11_品檢\\文稿檢查   （十二步流程的 storyboard 也可以）

規則：00_規範/用詞規範.json（rules 正規表示式、mainland 大陸用語、names 產品正式寫法）。
輸出：文稿檢查報告.html、.md、.json；有「必改」時 exit 1（流程可以擋下來）。
為什麼在第⓪關：字幕與畫面文字直接照稿子顯示，寫法錯誤（mail 點 google 點 com、百分之九十九點九、
服務水準協議）到成片才被發現，就要重配、重渲（2026-10-05 單元一的教訓）。
"""
from __future__ import annotations
import argparse, html, json, re, sys
from datetime import datetime
from pathlib import Path

ENGINE = Path(__file__).resolve().parent.parent
ROOT = ENGINE.parent
SKIP_MD = re.compile(r"^(---|id:|unit:|episode:|section:|core_metaphor:|scriptId)")
NOT_SCREEN_KEYS = {"cue", "cueWords", "icon", "id", "type", "scriptId", "kind", "variant", "color", "frame", "focusPlan"}


def collect(paths: list[Path]) -> list[Path]:
    out = []
    for p in paths:
        if p.is_dir():
            # 只看文稿（<單元>-<節>_標題.md）；規劃、審閱等文件不檢查
            out += sorted(x for x in p.glob("*.md") if re.match(r"\d+-\d+_", x.name))
            out += sorted(p.glob("*_plan.json"))
        elif p.exists():
            out.append(p)
    return out


def units(f: Path):
    """(行號, 文字, 是否畫面文字)"""
    text = f.read_text(encoding="utf-8")
    if f.suffix == ".json":
        # 完整解析 JSON（storyboard 的旁白常寫成一行陣列 "lines": ["…", "…"]），逐字串檢查；
        # 行號用「這段字串第一次出現的行」，找不到就給 0
        lines = text.split("\n")

        def line_of(sv: str) -> int:
            needle = json.dumps(sv, ensure_ascii=False)[1:-1][:40]
            return next((k for k, l in enumerate(lines, 1) if needle in l), 0)

        def walk(o, key=None):
            if isinstance(o, str):
                if key not in NOT_SCREEN_KEYS and o.strip():
                    yield line_of(o), o, True
            elif isinstance(o, list):
                for x in o:
                    yield from walk(x, key)
            elif isinstance(o, dict):
                for k, v in o.items():
                    yield from walk(v, k)
        yield from walk(json.loads(text))
        return
    for i, line in enumerate(text.split("\n"), 1):
        if not line.strip() or SKIP_MD.match(line) or line.startswith("## "):
            continue
        yield i, line, line.startswith(("VISUAL", "title:", "chapter_label:", "prev:", "next_hint:"))


def check(files: list[Path], rules: dict) -> list[dict]:
    found = []
    names = {n.lower(): n for n in rules.get("names", {}).get("list", [])}
    for f in files:
        for i, line, screen in units(f):
            for r in rules["rules"]:
                if r.get("only_screen") and not screen:
                    continue
                if r.get("only_narration") and screen:       # 2026-10-06：只檢查旁白（畫面上的節編號標籤沒問題）
                    continue
                if r.get("skip") and re.search(r["skip"], line):
                    continue
                for m in re.finditer(r["pattern"], line):
                    found.append({"file": f.name, "line": i, "level": r["level"], "rule": f'{r["id"]} {r["name"]}',
                                  "hit": m.group(0), "suggest": r["suggest"], "source": r.get("source", ""), "text": line.strip()})
                    break
            for k, v in rules.get("mainland", {}).items():
                if k.startswith("_"):
                    continue
                to, skip = v
                if "虛擬機" in k and not screen:           # 使用者決定：旁白可說「虛擬機」，畫面一律「虛擬機器」
                    continue
                pat = k if "(?" in k else re.escape(k)
                if re.search(pat, line) and not (skip and re.search(skip, line)):
                    found.append({"file": f.name, "line": i, "level": "必改" if "虛擬機" not in k else "建議",
                                  "rule": "M 大陸／非台灣用語", "hit": re.search(pat, line).group(0), "suggest": to,
                                  "source": "樂詞網／台灣官方用語", "text": line.strip()})
            for m in re.finditer(r"(?<![A-Za-z0-9./:@-])([A-Za-z][A-Za-z0-9-]*)(?![A-Za-z0-9./:@-])", line):
                w = m.group(1)
                canon = names.get(w.lower())
                domain_label = w.islower() and re.search(r"網域|網址|伺服器|\bcom\b", line)   # 1-3：google 是網域名稱的一段
                if canon and w != canon and not domain_label and not (w.isupper() and len(w) > 3 and screen):
                    found.append({"file": f.name, "line": i, "level": "建議", "rule": "N 產品／技術名寫法",
                                  "hit": w, "suggest": canon, "source": "官方商標寫法", "text": line.strip()})
    return found


def report(found: list[dict], files: list[Path], out: Path):
    out.mkdir(parents=True, exist_ok=True)
    (out / "文稿檢查.json").write_text(json.dumps(found, ensure_ascii=False, indent=1), encoding="utf-8")
    by = {}
    for x in found:
        by.setdefault((x["level"], x["rule"]), []).append(x)
    order = sorted(by, key=lambda k: ({"必改": 0, "建議": 1}.get(k[0], 2), k[1]))
    must = sum(len(v) for k, v in by.items() if k[0] == "必改")
    md = [f"# 文稿檢查報告（第⓪關）", "", f"時間：{datetime.now():%Y-%m-%d %H:%M}　檔案 {len(files)} 個　"
          f"必改 {must} 處　建議 {len(found) - must} 處", ""]
    sec = []
    for k in order:
        xs = by[k]
        md += [f"## 【{k[0]}】{k[1]}（{len(xs)} 處）", "", f"- 建議寫法：{xs[0]['suggest']}", f"- 依據：{xs[0]['source']}", ""]
        md += [f"  - `{x['file']}:{x['line']}` 「{x['hit']}」 {x['text'][:90]}" for x in xs] + [""]
        color = "#ff6b6b" if k[0] == "必改" else "#f4c542"
        lis = "".join(f"<li><code>{html.escape(x['file'])}:{x['line']}</code> 「<b>{html.escape(x['hit'])}</b>」 "
                      f"{html.escape(x['text'][:110])}</li>" for x in xs)
        sec.append(f'<section><h2><span class="tag" style="background:{color}">{k[0]}</span>{html.escape(k[1])}（{len(xs)} 處）</h2>'
                   f'<p><b>建議寫法：</b>{html.escape(xs[0]["suggest"])}　<b>依據：</b>{html.escape(xs[0]["source"])}</p>'
                   f'<details{" open" if k[0] == "必改" else ""}><summary>位置</summary><ul>{lis}</ul></details></section>')
    if not found:
        md.append("✓ 沒有發現問題")
    (out / "文稿檢查報告.md").write_text("\n".join(md), encoding="utf-8")
    (out / "文稿檢查報告.html").write_text(f'''<!doctype html><meta charset="utf-8"><title>文稿檢查</title>
<style>body{{font-family:"Noto Sans TC",sans-serif;background:#111;color:#ddd;margin:24px;max-width:1100px;line-height:1.6}}
section{{border-bottom:1px solid #333;padding:6px 0 12px}}.tag{{color:#111;border-radius:6px;padding:2px 8px;margin-right:10px;font-size:14px}}
code{{color:#f0a030}}summary{{cursor:pointer;color:#aaa}}</style>
<h1>文稿檢查報告（第⓪關）</h1><p>{datetime.now():%Y-%m-%d %H:%M}　檔案 {len(files)} 個　<b>必改 {must} 處</b>　建議 {len(found) - must} 處</p>
{"".join(sec) or "<p>✓ 沒有發現問題</p>"}''', encoding="utf-8")
    return must


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("paths", nargs="*")
    ap.add_argument("--out")
    # 規範檔：課程專案的 00_規範\用詞規範.json；沒有就用程式旁邊的（skill 的 final_qa\ 一起附上）
    default_rules = next((p for p in (ROOT / "00_規範" / "用詞規範.json", Path(__file__).with_name("用詞規範.json"))
                          if p.exists()), ROOT / "00_規範" / "用詞規範.json")
    ap.add_argument("--rules", default=str(default_rules))
    a = ap.parse_args()
    files = collect([Path(p) for p in a.paths] or [ROOT / "01_腳本"])
    if not files:
        sys.exit("找不到要檢查的文稿（給檔案或資料夾路徑；資料夾只看 <單元>-<節>_*.md 與 *_plan.json）")
    rules = json.loads(Path(a.rules).read_text(encoding="utf-8"))
    found = check(files, rules)
    out = Path(a.out) if a.out else ROOT / "11_品檢" / "文稿審查" / f"文稿檢查_{datetime.now():%Y%m%d_%H%M}"
    must = report(found, files, out)
    print(f"檔案 {len(files)} 個：必改 {must} 處、建議 {len(found) - must} 處 → {out / '文稿檢查報告.html'}")
    sys.exit(1 if must else 0)


if __name__ == "__main__":
    main()
