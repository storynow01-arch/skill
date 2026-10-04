#!/usr/bin/env python3
"""從「範本E_教學課程產線」建立一個新的課程專案資料夾。

  py <範本E>\\engine\\new_course.py <新專案資料夾>

建出的結構（引擎各支程式都以這個結構找檔案，不要改名）：
  00_規範\\     發音規範、多音字清單、品檢規範、styles\\garychen-dark
  01_腳本\\     雙軌稿 <id>_<標題>.md ＋ 分鏡 <id>_plan.json（附 1-1 範例）
  02_語音\\     tts.py 產出
  03_素材\\brand\\  cover.jpg、intro.mp4、logo.png ← 需自備（業主素材不隨範本散布）
  04_引擎\\     Python 管線＋qa＋remotion
  05_輸出_節\\  06_輸出_集\\  11_品檢\\
"""
from __future__ import annotations
import shutil, subprocess, sys
from pathlib import Path

TPL = Path(__file__).resolve().parent.parent      # 範本E 根目錄


def main(dst: Path):
    if dst.exists() and any(dst.iterdir()):
        raise SystemExit(f"{dst} 已存在且不是空的，為避免覆蓋請換一個資料夾")
    for d in ("01_腳本", "02_語音", "03_素材/brand", "05_輸出_節", "06_輸出_集", "11_品檢"):
        (dst / d).mkdir(parents=True, exist_ok=True)
    shutil.copytree(TPL / "規範", dst / "00_規範")
    shutil.copytree(TPL / "engine", dst / "04_引擎", ignore=shutil.ignore_patterns("new_course.py", "export_template.py"))
    for f in (TPL / "examples").iterdir():
        shutil.copy2(f, dst / "01_腳本" / f.name)
    print(f"→ {dst}")
    print("  安裝 Remotion 套件…")
    npm = shutil.which("npm") or shutil.which("npm.cmd")
    r = subprocess.run([npm, "install"], cwd=dst / "04_引擎" / "remotion") if npm else None
    if r is None or r.returncode:
        print("  ⚠ npm install 失敗，請手動到 04_引擎\\remotion 執行")
    print("\n還需要：把 cover.jpg（封面）、intro.mp4（片頭）、logo.png（右上角 LOGO）放進 03_素材\\brand\\")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit("用法: py new_course.py <新專案資料夾>")
    main(Path(sys.argv[1]))
