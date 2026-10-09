#!/usr/bin/env python3
"""刪除 Gemini 專案裡儲存的聲音（永久刪除、救不回來）——由使用者自己執行，執行時要親手打「刪除」才會動手。

  cd <有 .env.local 金鑰的專案>
  python delete_voices.py voice_aaa voice_bbb …

先列出每個 id 的名稱讓你核對，打「刪除」才真的刪；打別的字就取消。
（2026-10-09：永久刪除不由 Claude 代按，Claude 只準備清單與這支程式）"""
import sys as _s; _s.stdout.reconfigure(encoding="utf-8", errors="replace")
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gemini_tts as G  # noqa: E402


def main():
    ids = [a for a in sys.argv[1:] if a.startswith("voice_")]
    if not ids:
        raise SystemExit(__doc__)
    from list_voices import fetch          # 和 list_voices.py 同一套讀法（欄位是 id、display_name）
    G.api_key(Path.cwd())
    names = {v["id"]: v.get("display_name") or (v.get("prompted") or {}).get("input", "")[:40] for v in fetch()}
    print("要永久刪除的聲音：")
    for i in ids:
        print(f"  {i}  {names.get(i, '（這個專案裡找不到）')}")
    if input("\n確定要刪除，請輸入「刪除」兩個字：").strip() != "刪除":
        print("已取消，什麼都沒刪。")
        return
    for i in ids:
        if i not in names:
            print(f"  略過 {i}（找不到）")
            continue
        try:
            G.call("DELETE", f"voices/{i}")
        except ValueError:      # 刪除成功時回應是空的，json 解析會失敗
            pass
        print(f"  已刪除 {i}  {names[i]}")


if __name__ == "__main__":
    main()
