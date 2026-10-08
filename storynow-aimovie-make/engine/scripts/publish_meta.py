"""上架資料：檢查後寫一列進 上架清單.csv（系列教學影片 乙12）。

標題、說明、標籤由 Claude 依系列設定的「上架規格」寫好，這支程式負責擋掉不合 YouTube 規則或不合系列規格的資料。

    python publish_meta.py <上架清單.csv> --file out/成片.mp4 --title "【統測資電】數位邏輯｜卡諾圖怎麼圈｜8 分鐘搞懂" \
        --desc "第一行：這支教什麼\\n第二行：系列播放清單連結" --playlist "數位邏輯設計" --time "2026-10-15 19:00" \
        --tags "統測,資電,卡諾圖" --thumb 縮圖/卡諾圖2.jpg --ai 是 [--prefix "【統測資電】"]

同一個檔名已在清單裡 → 更新那一列（不重複新增）。
"""
import argparse, csv, datetime, os, subprocess, sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
COLS = ['檔名', '標題', '說明前兩行', '標籤', '播放清單', '縮圖', '發布時間', 'AI揭露', '狀態']


def check(a):
    """回傳問題列表（空＝通過）。依據：YouTube 標題 ≤100 字、標籤合計 ≤500 字；頻道規劃的標題格式與說明欄。"""
    bad = []
    if not a.title.strip(): bad.append('標題是空的')
    if len(a.title) > 100: bad.append(f'標題 {len(a.title)} 字，YouTube 上限 100')
    if a.prefix and not a.title.startswith(a.prefix): bad.append(f'標題沒有系列前綴「{a.prefix}」')
    lines = [x for x in a.desc.replace('\\n', '\n').split('\n') if x.strip()]
    if len(lines) < 2: bad.append('說明前兩行要寫滿：第一行教什麼、第二行播放清單或下一支')
    if len(a.tags) > 500: bad.append(f'標籤合計 {len(a.tags)} 字，YouTube 上限 500')
    if a.ai not in ('是', '否'): bad.append('AI揭露只能填 是／否')
    try:
        datetime.datetime.strptime(a.time, '%Y-%m-%d %H:%M')
    except ValueError:
        bad.append(f'發布時間「{a.time}」格式要 YYYY-MM-DD HH:MM')
    if not os.path.exists(a.file): bad.append(f'找不到成片：{a.file}')
    if a.thumb and not os.path.exists(a.thumb): bad.append(f'找不到縮圖：{a.thumb}')
    return bad


def write_row(csv_path, row):
    rows = []
    if os.path.exists(csv_path):
        with open(csv_path, encoding='utf-8-sig', newline='') as f:
            rows = [r for r in csv.DictReader(f)]
    rows = [r for r in rows if r.get('檔名') != row['檔名']] + [row]
    with open(csv_path, 'w', encoding='utf-8-sig', newline='') as f:   # utf-8-sig：Excel 開中文不亂碼
        w = csv.DictWriter(f, fieldnames=COLS, extrasaction='ignore')
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, '') for k in COLS})


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('csv')
    for k in ('file', 'title', 'desc', 'playlist', 'time'): ap.add_argument(f'--{k}', required=True)
    ap.add_argument('--tags', default=''); ap.add_argument('--thumb', default='')
    ap.add_argument('--ai', default='是'); ap.add_argument('--prefix', default='')
    a = ap.parse_args()
    bad = check(a)
    if a.thumb and os.path.exists(a.thumb):          # D3 縮圖規格（2026-10-08）：不合 YouTube 規格就不寫進清單
        tq = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'final_qa', 'thumb_check.py')
        if subprocess.run([sys.executable, tq, a.thumb, '--out', os.path.join(os.path.dirname(os.path.abspath(a.csv)), 'qa', '品檢紀錄'),
                           '--preview', os.path.join(os.path.dirname(os.path.abspath(a.csv)), '縮圖預覽')]).returncode:
            bad.append('縮圖不合 YouTube 規格（見上方 ✗）')
    if bad:
        print('上架資料沒過：'); [print(f'  ✗ {b}') for b in bad]
        sys.exit(1)
    write_row(a.csv, {'檔名': os.path.basename(a.file), '標題': a.title, '說明前兩行': a.desc.replace('\\n', ' / '),
                      '標籤': a.tags, '播放清單': a.playlist, '縮圖': a.thumb, '發布時間': a.time,
                      'AI揭露': a.ai, '狀態': '待上架'})
    print(f'✓ 已寫入 {a.csv}：{a.title}')


if __name__ == '__main__':
    main()
