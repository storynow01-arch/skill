#!/usr/bin/env bash
# 批次算圖：① 1-1 教學影片 × 3 風格　② 研習說明＋宣傳片 × 10 風格
# 720p（--scale=0.6667）供比較用；選定風格後再出 1080p 正式版。
# 進度寫在 render_all.log
set -u
ROOT="/d/claude/01教學影片手刻版"
SK="$HOME/.claude/skills/code-video-studio/scripts"
LOG="$ROOT/render_all.log"
export PYTHONIOENCODING=utf-8
R="npx remotion render src/index.ts Video --concurrency=4 --crf=20 --scale=0.6667 --audio-codec=aac --audio-bitrate=192k --log=error"
log() { echo "$(date +%H:%M:%S) $*" | tee -a "$LOG"; }

log "=== 開始 ==="

# ① 單元1_純旁白：1-1 × 風格 2 / 8 / 3
cd "$ROOT/單元1_純旁白" && mkdir -p out
for pair in "02:blueprint" "08:chalkboard" "03:clean-light"; do
  n=${pair%%:*}; st=${pair#*:}
  log "1-1 [$n $st] build"
  python "$SK/build.py" storyboard.json --style "$st" > /dev/null || { log "FAIL build 1-1 $st"; continue; }
  log "1-1 [$n $st] render"
  $R "out/1-1_${n}_${st}.mp4" > /dev/null 2>&1 && log "1-1 [$n $st] 完成" || log "FAIL render 1-1 $st"
done

# ② 風格比較_研習說明：10 風格
cd "$ROOT/風格比較_研習說明" && mkdir -p out "$ROOT/風格比較_研習說明/成品"
i=1
for st in cyber-neon blueprint clean-light synthwave terminal glass swiss chalkboard pixel cinematic; do
  n=$(printf "%02d" $i); i=$((i+1))
  log "研習 [$n $st] 說明段"
  python "$SK/build.py" notice.json --style "$st" > /dev/null && $R "out/notice_${st}.mp4" > /dev/null 2>&1 || { log "FAIL notice $st"; continue; }
  log "研習 [$n $st] 宣傳段"
  python "$SK/build.py" promo.json --style "$st" > /dev/null && $R "out/promo_${st}.mp4" > /dev/null 2>&1 || { log "FAIL promo $st"; continue; }
  ffmpeg -v error -y -i "out/notice_${st}.mp4" -i "out/promo_${st}.mp4" -filter_complex \
    "[0:a]loudnorm=I=-14:TP=-1,aresample=48000[a0];[1:a]loudnorm=I=-14:TP=-1,aresample=48000[a1];[0:v]fps=30,format=yuv420p[v0];[1:v]fps=30,format=yuv420p[v1];[v0][a0][v1][a1]concat=n=2:v=1:a=1[v][a]" \
    -map "[v]" -map "[a]" -c:v libx264 -crf 20 -preset veryfast -c:a aac -b:a 192k -movflags +faststart "成品/${n}_${st}.mp4" \
    && log "研習 [$n $st] 完成" || log "FAIL concat $st"
done
log "=== 全部完成 ==="
