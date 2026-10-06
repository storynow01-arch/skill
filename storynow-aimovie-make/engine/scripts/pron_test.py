#!/usr/bin/env python3
"""唸法標準題（2026-10-06，從範本E 移植；十一步流程、範本 A～D 用）：確認 build.py 送進 TTS 的文字跟預期一樣。
改了 voices.json 的 gemini_replace、pron_zh-TW.json、build.py 的 to_speech 之後一定要跑；make_video.py 配音前自動跑，沒全過就停。

  python <skill>/engine/scripts/pron_test.py              （在專案資料夾執行）

題目：
  通用題（下方 CASES）：IP、小數、網址、edu／gov、www、冒號埠號、路徑斜線、英文詞不亂換字 —— 任何專案都適用
  專案題：專案根目錄的 唸法標準題.json（選用）—— 這門課／這支片自己的讀法，例：
    [{"稿": "打 104 查號台", "要有": "一零四"}, {"稿": "Python 3.11", "要有": "三點十一", "不可有": "三點一一"}]
規則：只在用 Gemini 配音時檢查（專案 .env.local 有金鑰）；edge-tts 的權宜詞典是另一套，沒有金鑰時跳過（exit 0）。
"""
from __future__ import annotations
import json, os, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

# (稿子寫法, 送 TTS 必須「包含」的文字, 不可以出現的文字)
CASES = [
    ("192.168.0.1", "一九二點一六八點零點一", None),
    ("172.16.300.5 和 10.0.0.254", "一七二點一六點三零零點五", None),
    ("一個 2.4 GHz", "二點四", None),
    ("大約每秒 12.5 MB", "12.5", "一二點五"),
    ("保證 99.9%", "99.9", "九九點九"),
    ("0.1 毫秒", "零點一", None),
    ("你就不能用 3.9", "三點九", None),
    ("localhost:3000", "冒號3000", None),
    ("mail.google.com", "mail點google點com", "."),
    ("最右邊那一段 com", "點com", None),
    ("edu.tw 是台灣的教育機構", "點E D U點T W", "edu"),
    ("gov.tw", "點G O V點T W", None),
    ("最左邊的 www", "triple W", "www"),
    ("打開 www.google.com", "triple W點google點com", None),
    ("路徑是 /", "斜線", None),
    ("/about 代表關於我們", "斜線about", None),
    ("速度是 MB/s", "MB/s", "斜線"),
    ("用 ping 測試", "ping", "聘"),
    ("about 頁面", "about", "額抱特"),
    ("Wi-Fi", "Wi-Fi", None),
    ("100 Mbps", "100", None),
]


def main() -> int:
    import gemini_tts as G
    if not G.has_key(os.getcwd()):
        print("（這個專案沒有 Gemini 金鑰 → 用 edge-tts，唸法標準題只測 Gemini 規則，跳過）")
        return 0
    import build
    cases = list(CASES)
    f = Path(G.project_root(os.getcwd())) / "唸法標準題.json"
    if f.exists():
        cases += [(c["稿"], c.get("要有"), c.get("不可有")) for c in json.loads(f.read_text(encoding="utf-8"))]
    bad = []
    for raw, must, mustnot in cases:
        out = build.to_speech(raw, "gemini")
        if (must and must not in out) or (mustnot and mustnot in out):
            bad.append(f"「{raw}」→「{out}」（要有「{must}」{f'，不可有「{mustnot}」' if mustnot else ''}）")
    print(f"唸法標準題：{len(cases) - len(bad)}/{len(cases)} 通過" + ("（含專案題 " + f.name + "）" if f.exists() else ""))
    for b in bad:
        print("  ✗", b)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
