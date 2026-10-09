@echo off
cd /d "%~dp0"
title 展示網頁（關掉這個視窗就停止）
python "%~dp0啟動展示網頁.py" %*
if errorlevel 1 pause
