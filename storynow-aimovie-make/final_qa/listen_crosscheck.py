#!/usr/bin/env python3
"""兩個 AI 交叉聽（2026-10-06，從範本E 移植；外層工作流、範本 A～G 共用）：
AI 耳朵（Gemini）標出的每個疑點，再用 faster-whisper 重聽一次分級。
  確定  —— 兩邊都聽到問題（例：「10 公尺」兩邊都聽成「四公尺」）→ 一定要處理
  待聽  —— whisper 判斷不了（多音字聲調、英文口音），或兩邊說法不一 → 給人聽
  可接受 —— 多音字讀音在接受清單裡（台灣口語讀法、檢查清單本身寫錯）→ 不用聽
  誤報  —— whisper 清楚聽到稿子原文（例：AI 耳朵說漏唸「不」，其實有唸）→ 不用聽

  python <skill>/final_qa/listen_crosscheck.py qa/聽檢/聽檢.json
    （ai_listen.py 的輸出；範本E 是 11_品檢/v8_聽檢/<節>/聽檢.json，可一次給多個檔）
  寫在第一個檔案的資料夾：交叉聽.json、交叉聽.html、交叉聽.md。有「確定」時 exit 2（提醒人處理，不擋流程）。
  接受清單：專案根目錄有 唸法接受清單.json 就用專案的，否則用 final_qa/唸法接受清單.json。
實測（範本E 單元一）：AI 耳朵 43 個疑點 → 要人聽的剩 18 個。
"""
from __future__ import annotations
import ast, difflib, html, json, re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
HERE = Path(__file__).resolve().parent
_W = None
_CACHE_F: Path | None = None
_CACHE: dict = {}


def whisper(mp3: str) -> str:
    """同一個音檔（路徑＋修改時間）只轉一次"""
    key = f"{mp3}|{Path(mp3).stat().st_mtime:.0f}"
    if key not in _CACHE:
        _CACHE[key] = _whisper(mp3)
        if _CACHE_F:
            _CACHE_F.write_text(json.dumps(_CACHE, ensure_ascii=False), encoding="utf-8")
    return _CACHE[key]


def _whisper(mp3: str) -> str:
    global _W
    if _W is None:
        from faster_whisper import WhisperModel
        _W = WhisperModel("medium", device="cpu", compute_type="int8")
    segs, _ = _W.transcribe(mp3, language="zh", initial_prompt="以下是繁體中文的旁白。")
    return "".join(s.text for s in segs)


try:
    from opencc import OpenCC
    _cc = OpenCC("s2t")
except Exception:          # 沒有 opencc 就不轉
    _cc = None


def norm(s: str) -> str:
    s = _cc.convert(s) if _cc else s
    return re.sub(r"[\s，。、：；「」『』（）—！？,.!?:;\"'…·]", "", s).lower()


def best_ratio(phrase: str, text: str) -> float:
    p, t = norm(phrase), norm(text)
    if not p or not t:
        return 0.0
    if p in t:
        return 1.0
    n, best = len(p), 0.0
    for i in range(0, max(1, len(t) - n + 1)):
        best = max(best, difflib.SequenceMatcher(None, p, t[i:i + n + 2]).ratio())
    return best


def items(rec: dict) -> list[dict]:
    """把聽檢結果拆成一個一個疑點：(類別, 位置文字, 說明)"""
    out = []
    res = rec.get("result", {})
    for k in ("多音詞", "英數詞", "數字", "其他問題"):
        v = res.get(k) or []
        if isinstance(v, str):
            try:
                v = ast.literal_eval(v)
            except Exception:
                v = []
        for x in v:
            if k != "其他問題" and x.get("正確") is not False:
                continue
            where = x.get("位置") or x.get("詞") or x.get("寫法") or ""
            out.append({"kind": k, "where": where,
                        "desc": x.get("說明") or x.get("問題") or f"應「{x.get('應唸', '')}」聽到「{x.get('聽到', '')}」"})
    return out


_acc = Path.cwd() / "唸法接受清單.json"
ACCEPT = json.loads((_acc if _acc.exists() else HERE / "唸法接受清單.json").read_text(encoding="utf-8"))


def accepted(it: dict) -> str:
    """多音字聽到的讀音在接受清單裡 → 回傳原因"""
    m = re.search(r"聽到「([^」]*)」", it["desc"])
    heard = m.group(1) if m else ""
    for why, words in (("台灣口語常見讀法", ACCEPT.get("台灣口語", {})), ("檢查清單預期讀音寫錯，聲音是對的", ACCEPT.get("清單讀音錯", {}))):
        if any(s in heard for s in words.get(it["where"], [])):
            return why
    return ""


def classify(it: dict, heard: str) -> tuple[str, str]:
    if it["kind"] == "多音詞" and accepted(it):
        return "可接受", accepted(it)
    if it["kind"] in ("多音詞", "英數詞"):
        return "待聽", "whisper 判斷不了聲調／口音"
    if it["kind"] == "數字":
        digits = re.sub(r"\D", "", it["where"])
        if digits and digits in re.sub(r"\D", "", heard):
            return "誤報", f"whisper 聽到 {digits}"
        return "確定", "whisper 也沒聽到這個數字"
    r = best_ratio(it["where"], heard)
    if r >= 0.92:
        return "誤報", f"whisper 聽到原文（相似度 {r:.2f}）"
    if r < 0.75:
        return "確定", f"whisper 也對不上原文（相似度 {r:.2f}）"
    return "待聽", f"兩邊不一致（相似度 {r:.2f}）"


def main(files: list[Path]) -> dict:
    global _CACHE_F, _CACHE
    out_dir = files[0].parent
    _CACHE_F = out_dir / "_whisper快取.json"
    _CACHE = json.loads(_CACHE_F.read_text(encoding="utf-8")) if _CACHE_F.exists() else {}
    rows, stat = [], {"確定": 0, "待聽": 0, "可接受": 0, "誤報": 0}
    for f in files:
        for rec in json.loads(f.read_text(encoding="utf-8")):
            its = items(rec)
            if not its:
                continue
            heard = whisper(rec["audio"]) if any(i["kind"] in ("數字", "其他問題") for i in its) else ""
            for it in its:
                lv, why = classify(it, heard)
                stat[lv] += 1
                rows.append({"sid": rec.get("sid", ""), "scene": rec["scene"], **it, "level": lv, "why": why, "audio": rec["audio"]})
    print(f"AI 耳朵 {sum(stat.values())} 個疑點 → 確定 {stat['確定']}、待聽 {stat['待聽']}、可接受 {stat['可接受']}、誤報 {stat['誤報']}（後兩種不用聽）")
    order = {"確定": 0, "待聽": 1, "可接受": 2, "誤報": 3}
    rows.sort(key=lambda x: (order[x["level"]], x["sid"], x["scene"]))
    (out_dir / "交叉聽.json").write_text(json.dumps(rows, ensure_ascii=False, indent=1), encoding="utf-8")
    E = html.escape
    tr = "".join(f"<tr class='{ {'確定': 'bad', '待聽': 'warn', '可接受': 'ok', '誤報': 'ok'}[x['level']] }'><td>{x['level']}</td>"
                 f"<td>{E((x['sid'] + ' ' + x['scene']).strip())}</td><td>{E(x['kind'])}</td><td>{E(x['where'])}</td>"
                 f"<td>{E(x['desc'])}</td><td>{E(x['why'])}</td>"
                 f"<td>{'' if x['level'] in ('誤報', '可接受') else '<audio controls preload=none src=' + chr(39) + Path(x['audio']).resolve().as_uri() + chr(39) + '></audio>'}</td></tr>"
                 for x in rows)
    (out_dir / "交叉聽.html").write_text(
        "<!doctype html><html lang='zh-Hant'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>"
        "<title>交叉聽</title><style>body{background:#181818;color:#eee;font-family:'Microsoft JhengHei',sans-serif;padding:16px}"
        "table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #333;padding:6px;text-align:left;vertical-align:top}"
        ".bad td:first-child{color:#ff6a50}.warn td:first-child{color:#e8a43a}.ok{opacity:.55}audio{width:220px}</style>"
        f"<h1>兩個 AI 交叉聽</h1><p>確定 {stat['確定']}、待聽 {stat['待聽']}、可接受 {stat['可接受']}、誤報 {stat['誤報']}（可接受與誤報不用聽）</p>"
        f"<table><tr><th>分級</th><th>場景</th><th>類別</th><th>位置</th><th>AI 耳朵說</th><th>whisper</th><th>聽</th></tr>{tr}</table></html>",
        encoding="utf-8")
    md = ["# 兩個 AI 交叉聽", "", f"確定 {stat['確定']}、待聽 {stat['待聽']}、可接受 {stat['可接受']}、誤報 {stat['誤報']}", "",
          "| 分級 | 場景 | 類別 | 位置 | AI 耳朵說 | whisper |", "|---|---|---|---|---|---|"]
    md += [f"| {x['level']} | {(x['sid'] + ' ' + x['scene']).strip()} | {x['kind']} | {x['where']} | {x['desc']} | {x['why']} |".replace("\n", " ")
           for x in rows]
    (out_dir / "交叉聽.md").write_text("\n".join(md) + "\n", encoding="utf-8")
    return stat


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    st = main([Path(a) for a in sys.argv[1:]])
    sys.exit(2 if st["確定"] else 0)
