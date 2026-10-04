# 渲染指定節到 05_輸出_節\<ver>\，不覆蓋已交付的檔案。
# 用法：powershell -File render_v2.ps1 -Ver v2 -Ids 1-1,1-2
# 每一節都檢查兩件事才算成功（接手文件第八節踩過的坑）：
#   1. npx 的 exit code 為 0
#   2. 輸出檔存在，而且修改時間晚於這一節開始渲染的時間
param([string]$Ver = "v2", [string[]]$Ids)
# powershell -File 不會把 1-1,1-2 拆成陣列，整串會變成一個字串，這裡自己拆
$Ids = @($Ids | ForEach-Object { $_ -split "," } | Where-Object { $_ })
$ErrorActionPreference = "Continue"
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
$root = "D:\claude\01教學影片AI製作"
$out = Join-Path $root "05_輸出_節\$Ver"
New-Item -ItemType Directory -Force $out | Out-Null
Set-Location (Join-Path $root "04_引擎\remotion")
$fail = @()
foreach ($id in $Ids) {
  $t0 = Get-Date
  $dst = Join-Path $out "$id.mp4"
  Write-Output ("[{0}] {1} 開始" -f $t0.ToString("HH:mm:ss"), $id)
  npx remotion render src/index.ts Section $dst --props="src/data/$id.props.json" --log=error
  $code = $LASTEXITCODE
  $ok = ($code -eq 0) -and (Test-Path $dst) -and ((Get-Item $dst).LastWriteTime -gt $t0)
  $min = [math]::Round(((Get-Date) - $t0).TotalMinutes, 1)
  if ($ok) { Write-Output "  ✓ $id 完成（$min 分）" } else { Write-Output "  ✗ $id 失敗 exit=$code"; $fail += $id }
}
if ($fail.Count) { Write-Output "失敗：$($fail -join ', ')"; exit 1 }
Write-Output "全部完成"
exit 0
