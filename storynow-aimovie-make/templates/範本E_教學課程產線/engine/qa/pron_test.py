#!/usr/bin/env python3
"""唸法標準題（品檢 N5，2026-10-06）：改了 發音規範.json、tts.py、配音設定.json 的 gemini_replace 之後跑一次，
確認送進 Gemini 的文字跟預期一樣。全部通過才可以配音。
  py qa\\pron_test.py           # 測目前的規則
  py qa\\pron_test.py --old     # 模擬 2026-10-05 以前的舊規則（統計改善用）
每一題：(稿子寫法, 送 Gemini 必須「包含」的文字, 不可以出現的文字)。
"""
from __future__ import annotations
import json, re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
ENGINE = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ENGINE))
import tts                       # noqa: E402
import tts_gemini as T           # noqa: E402

CASES = [
    # IP、版本、小數
    ("192.168.0.1", "一九二點一六八點零點一", None),
    ("172.16.300.5 和 10.0.0.254", "一七二點一六點三零零點五", None),
    ("一個 2.4 GHz", "二點四", None),
    ("大約每秒 12.5 MB", "12.5", "一二點五"),
    ("保證 99.9%", "99.9", "九九點九"),
    ("0.1 毫秒", "零點一", None),
    ("Python 3.11 和 3.12", "三點十一", "三點一一"),
    ("你就不能用 3.9", "三點九", None),
    # 號碼、連接埠
    ("打 104 查號台", "一零四", None),
    ("0 到 1023", "一零二三", None),
    ("49152 以上", "四九一五二", None),
    ("80 號和 443 號", "四四三", None),
    ("65535", "六五五三五", None),
    ("localhost:3000", "冒號3000", None),
    ("3-2-1 原則", "三二一", "3-2-1"),
    # 網址
    ("mail.google.com", "mail點google點com", "."),
    ("最右邊那一段 com", "點com", None),
    ("edu.tw 是台灣的教育機構", "點E D U點T W", "edu"),
    ("gov.tw", "點G O V點T W", None),
    ("最左邊的 www", "triple W", "www"),
    ("打開 www.google.com", "triple W點google點com", None),
    ("路徑是 /", "斜線", None),
    ("/about 代表關於我們", "斜線about", None),
    ("速度是 MB/s", "MB/s", "斜線"),
    # 縮寫、英文
    ("DNS 和 HTTPS", "D N S", None),
    ("用 ping 測試", "ping", "聘"),
    ("about 頁面", "about", "額抱特"),
    ("1 Gbps", "G b p s", None),
    ("Wi-Fi", "Wi-Fi", None),
    ("100 Mbps", "100", None),
]


def old_rules(text: str, cfg: dict) -> str:
    """2026-10-05 以前：兩段式數字一律逐字、數字詞典在後、沒有 gemini_replace"""
    old_dot2 = re.compile(r"(?<![\d.])(\d{1,3})\.(\d{1,3})(?![\d.])")
    d = lambda s: "".join(tts._ZH[int(c)] for c in s)
    text = tts._IPV4.sub(lambda m: "點".join(d(g) for g in m.groups()), text)
    text = old_dot2.sub(lambda m: f"{d(m.group(1))}點{d(m.group(2))}", text)
    for num, say in tts._SPEC.get("數字詞典", {}).items():
        if not num.startswith("_") and num not in ("3.11", "3.12", "3-2-1"):
            text = re.sub(rf"(?<![\d.]){re.escape(num)}(?![\d.])", say, text)
    for term, say in tts._SPEC["詞典"].items():
        if term not in set(cfg.get("skip_rules", [])):
            text = re.sub(rf"(?<![A-Za-z]){re.escape(term)}(?![A-Za-z0-9])", say, text)
    return text


def run(old: bool = False) -> tuple[int, list[str]]:
    cfg = json.loads((ENGINE.parent / "00_規範" / "配音設定.json").read_text(encoding="utf-8"))
    fails = []
    for src, must, never in CASES:
        s = re.sub(r"[ \t]+", "", src)                      # 旁白會先拿掉空白（tts.parse）
        out = old_rules(s, cfg) if old else T.gemini_text(s, cfg)
        ok = must in out and (never is None or never not in out)
        if not ok:
            fails.append(f"{src} → {out}（要有「{must}」{'、不可有「' + never + '」' if never else ''}）")
    return len(CASES) - len(fails), fails


if __name__ == "__main__":
    ok, fails = run("--old" in sys.argv)
    print(f"{'舊規則' if '--old' in sys.argv else '目前規則'}：{ok}/{len(CASES)} 通過")
    for f in fails:
        print("  ✗", f)
    sys.exit(0 if not fails else 1)
