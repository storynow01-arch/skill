#!/usr/bin/env python3
"""任務儀表板的資料來源：掃 ~/.claude/projects/ 每個專案最新的對話紀錄（*.jsonl），輸出 JSON 給 mod 畫面。

每個專案：
  state    running（90 秒內有新紀錄）／waiting（Claude 講完了、在等你）／idle
  ago      最後動作距今幾秒
  title    對話標題（有的話）
  lastUser 你最後說的話；lastClaude Claude 最後一句文字
  status   專案資料夾有 工作清單.md → 「目前狀態」前 3 條；有 進度.md → 前 3 行
  open     工作清單.md 裡還沒勾的項目數
  bg       背景工作：專案 .claude/dashboard.json 的 {"logs": ["相對路徑", …]}，30 分鐘內有更新的紀錄檔 → 最後一行
           （Claude 閒著、但批次／渲染還在背景跑的專案也算「執行中」）
  plan     全部進度與預計完成時間：dashboard.json 的 "progress"（見 plan()）；沒設定就是 null
只讀檔，不寫任何東西。用法：python scan_projects.py [天數=7]
"""
from __future__ import annotations
import json, os, re, sys, time
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path.home() / ".claude" / "projects"
DAYS = float(sys.argv[1]) if len(sys.argv) > 1 else 7
TAIL = 400_000                    # 只讀每份紀錄最後 400 KB


def text_of(content) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
    return ""


def clean(s: str, n: int = 90) -> str:
    s = re.sub(r"<[^>]+>[\s\S]*?</[^>]+>", " ", s)          # 系統標籤（system-reminder…）拿掉
    s = re.sub(r"\s+", " ", s).strip()
    return s[:n] + ("…" if len(s) > n else "")


def tail_lines(p: Path) -> list[dict]:
    size = p.stat().st_size
    with p.open("rb") as f:
        f.seek(max(0, size - TAIL))
        raw = f.read().decode("utf-8", errors="replace")
    out = []
    for ln in raw.splitlines()[1 if size > TAIL else 0:]:
        try:
            out.append(json.loads(ln))
        except Exception:
            pass
    return out


def progress(cwd: str) -> tuple[list[str], int]:
    d = Path(cwd)
    wl = d / "工作清單.md"
    if wl.exists():
        md = wl.read_text(encoding="utf-8", errors="replace")
        status, open_n, in_status = [], 0, False
        for line in md.splitlines():
            if line.startswith("## "):
                in_status = "目前狀態" in line
                continue
            if in_status and line.startswith("- ") and len(status) < 3:
                status.append(clean(line[2:].replace("**", ""), 70))
            if re.match(r"^\s*- \[ \]", line):
                open_n += 1
        return status, open_n
    pg = d / "進度.md"
    if pg.exists():
        lines = [clean(x.lstrip("-# ").replace("**", ""), 70) for x in pg.read_text(encoding="utf-8", errors="replace").splitlines()
                 if x.strip() and not x.startswith("#")]
        return lines[:3], 0
    return [], 0


def first_cwd(p: Path) -> str:
    with p.open("rb") as f:
        head = f.read(200_000).decode("utf-8", errors="replace")
    for ln in head.splitlines():
        try:
            c = json.loads(ln).get("cwd")
        except Exception:
            continue
        if c:
            return c
    return ""


def background(cwd: str, now: float) -> str:
    """專案登記的背景紀錄檔，30 分鐘內有更新就回傳最後一行"""
    cfg = Path(cwd) / ".claude" / "dashboard.json"
    if not cfg.exists():
        return ""
    try:
        logs = json.loads(cfg.read_text(encoding="utf-8")).get("logs", [])
    except Exception:
        return ""
    best = None
    for rel in logs:
        p = Path(cwd) / rel
        if p.exists() and now - p.stat().st_mtime < 1800 and (best is None or p.stat().st_mtime > best.stat().st_mtime):
            best = p
    if best is None:
        return ""
    lines = [x for x in tail_text(best).splitlines() if x.strip()]
    return clean(lines[-1], 60) if lines else ""


def plan(cwd: str, now: float) -> dict | None:
    """全部進度與預計完成時間：專案 .claude/dashboard.json 的 "progress"
      {"label": "節", "total": 56, "glob": "完成記號的 glob",
       "extra": [{"label": "集", "total": 8, "glob": "…"}],       # 只顯示數量，不算進百分比
       "wait": {"until": "15:05", "items": ["完成記號路徑", …]},   # 今天 until 之前不會動的項目（例：等配音額度）
       "per_item_min": 20, "tail_min": 30}                         # 每項分鐘（不給就用最近完成間隔的中位數）、收尾分鐘
    """
    cfg = Path(cwd) / ".claude" / "dashboard.json"
    if not cfg.exists():
        return None
    try:
        pc = json.loads(cfg.read_text(encoding="utf-8")).get("progress")
    except Exception:
        return None
    if not pc:
        return None
    root = Path(cwd)
    marks = sorted(p.stat().st_mtime for p in root.glob(pc["glob"]))
    total = int(pc["total"])
    done = min(len(marks), total)
    extra = [{"label": x["label"], "done": len(list(root.glob(x["glob"]))), "total": int(x["total"])}
             for x in pc.get("extra", [])]
    gaps = sorted(b - a for a, b in zip(marks, marks[1:]) if now - b < 86400 and 180 < b - a < 3600)
    per = pc.get("per_item_min", 0) * 60 or (gaps[len(gaps) // 2] if gaps else 0)
    remaining = total - done
    eta = None
    wait_text = ""
    if remaining == 0:
        eta = marks[-1] if marks else now
    elif per:
        t = now
        w = pc.get("wait") or {}
        waiting = 0
        wait_text = ""
        if w.get("until"):
            hh, mm = map(int, w["until"].split(":"))
            lt = time.localtime(now)
            until = time.mktime((lt.tm_year, lt.tm_mon, lt.tm_mday, hh, mm, 0, 0, 0, -1))
            if now < until:
                waiting = min(remaining, sum(1 for r in w.get("items", []) if not (root / r).exists()))
                t = max(now + (remaining - waiting) * per, until)
                wait_text = w["until"] if waiting else ""
        eta = (t if waiting else now) + (waiting or remaining) * per + pc.get("tail_min", 0) * 60
    return {"label": pc.get("label", ""), "done": done, "total": total, "pct": round(done * 100 / total) if total else 0,
            "extra": extra, "perMin": round(per / 60), "eta": int(eta) if eta else None,
            "etaText": eta_text(eta, now) if eta else "", "waitUntil": wait_text}


def eta_text(eta: float, now: float) -> str:
    a, b = time.localtime(eta), time.localtime(now)
    if (a.tm_year, a.tm_yday) == (b.tm_year, b.tm_yday):
        return time.strftime("%H:%M", a)
    if time.localtime(now + 86400).tm_yday == a.tm_yday:
        return "明天 " + time.strftime("%H:%M", a)
    return time.strftime("%m/%d %H:%M", a)


def tail_text(p: Path, n: int = 4000) -> str:
    size = p.stat().st_size
    with p.open("rb") as f:
        f.seek(max(0, size - n))
        return f.read().decode("utf-8", errors="replace")


def scan_one(proj: Path, now: float) -> dict | None:
    logs = [p for p in proj.glob("*.jsonl")]
    if not logs:
        return None
    log = max(logs, key=lambda p: p.stat().st_mtime)
    mtime = log.stat().st_mtime
    if now - mtime > DAYS * 86400:
        return None
    rows = tail_lines(log)
    cwd = first_cwd(log)                            # 專案根目錄＝對話開始時的位置（對話中 cd 到子資料夾不算）
    title, last_user, last_claude, last_kind = "", "", "", ""
    for r in rows:
        cwd = cwd or r.get("cwd") or ""
        if r.get("type") in ("ai-title", "custom-title", "summary"):
            title = r.get("title") or r.get("customTitle") or r.get("aiTitle") or r.get("summary") or title
        msg = r.get("message") or {}
        if r.get("type") == "user" and not r.get("isMeta"):
            c = msg.get("content")
            if isinstance(c, list) and any(isinstance(b, dict) and b.get("type") == "tool_result" for b in c):
                last_kind = "tool"
                continue
            raw = text_of(c).lstrip()
            if raw.startswith("<"):                 # 背景工作通知、系統訊息不是你說的話
                continue
            t = clean(raw)
            if t and not t.startswith("[Request interrupted"):
                last_user, last_kind = t, "user"
        elif r.get("type") == "assistant":
            c = msg.get("content") or []
            t = clean(text_of(c))
            uses = isinstance(c, list) and any(isinstance(b, dict) and b.get("type") == "tool_use" for b in c)
            if t:
                last_claude = t
            last_kind = "assistant-tool" if uses else ("assistant" if t else last_kind)
    if not cwd:
        return None
    ago = now - mtime
    bg = background(cwd, now)
    state = "running" if ago < 90 or bg else ("waiting" if last_kind == "assistant" else "idle")
    status, open_n = progress(cwd)
    return {"name": Path(cwd).name or cwd, "cwd": cwd, "state": state, "ago": int(ago), "title": clean(title, 60),
            "lastUser": last_user, "lastClaude": last_claude, "status": status, "open": open_n, "bg": bg,
            "plan": plan(cwd, now)}


def main():
    now = time.time()
    seen: dict[str, dict] = {}
    for proj in ROOT.iterdir() if ROOT.exists() else []:
        if not proj.is_dir():
            continue
        try:
            row = scan_one(proj, now)
        except Exception as ex:                     # 一個專案讀壞了，不影響其他專案
            row = None
            print(f"skip {proj.name}: {ex}", file=sys.stderr)
        if row and (row["cwd"] not in seen or row["ago"] < seen[row["cwd"]]["ago"]):
            seen[row["cwd"]] = row
    order = {"running": 0, "waiting": 1, "idle": 2}
    rows = sorted(seen.values(), key=lambda r: (order[r["state"]], r["ago"]))
    print(json.dumps({"at": int(now), "projects": rows}, ensure_ascii=False))


if __name__ == "__main__":
    main()
