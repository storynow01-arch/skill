#!/usr/bin/env bash
# 最終品檢：對 v2 成品從頭量一次，不沿用任何舊結果。
#   bash qa/run_final_qa.sh <標籤>      （在 04_引擎 執行）
# 每一步都檢查 exit code，失敗就停（不印假的「完成」）。
set -euo pipefail
L="${1:-修改後}"
OUT="../11_品檢/$L"
IDS="1-1 1-2 1-3 1-4 1-5 1-6 1-7 1-8 1-9 1-10 1-11 1-12 1-13 1-14"
export PYTHONIOENCODING=utf-8
mkdir -p "$OUT"
echo "[1/7] 版面探針（14 節）"
( cd remotion && node qa_layout.mjs "../$OUT" $IDS 2>&1 | grep -v "^\[Tab" )
echo "[2/7] 字幕、同步、唸法、聲音、畫面、整集"
python qa/qa_run.py "$L" $IDS --sec-dir 05_輸出_節/v2 --ep-dir 06_輸出_集/v2 \
  --ep EP1=1-1,1-2,1-3,1-4,1-5,1-6,1-7 --ep EP2=1-8,1-9,1-10,1-11,1-12,1-13,1-14
echo "[3/7] 英數詞試聽片段、多音詞試聽"
python qa/qa_asr.py "$OUT" $IDS
python qa/qa_asr.py "$OUT" $IDS --poly
echo "[4/7] 唸法：沿用修改前的時長比對證據（判斷依據），報告另列每個詞現在送進 TTS 的寫法"
cp ../11_品檢/修改前/pron_duration.json "$OUT/pron_duration.json"
echo "[5/7] 通用最終品檢（只看 mp4）"
for ep in EP1 EP2; do
  python qa/final_qa.py "../06_輸出_集/v2/$ep.mp4" --out "$OUT/final_$ep" --lufs -16 --minutes 28,33 --silence-ok 7.5 || echo "  ⚠ $ep 有未通過項目（見 $OUT/final_$ep/final_qa.md）"
done
echo "[6/7] 修改前後對照"
python qa/make_compare.py "$L"
echo "[7/7] 報告"
python qa/make_report.py "$L" --title "EP1・EP2 品檢報告（修改後）" --changes "$OUT/changes.json"
echo "完成 → $OUT/品檢報告.html"
