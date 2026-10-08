"""D3 縮圖（2026-10-08）：YouTube 縮圖規格（擋）＋縮到搜尋結果大小的預覽（提醒，人工看大字讀不讀得到）。

    python thumb_check.py <縮圖>.jpg [--out qa/品檢紀錄] [--preview qa/縮圖預覽]

D3.規格（擋）  JPG／PNG／GIF、2MB 以內、16:9（±2%）、寬至少 640（YouTube 上傳限制）
D3.縮圖（提醒）寬不到 1280（YouTube 建議 1280×720）；預覽頁：手機搜尋結果（168×94）、首頁（246×138）、電腦搜尋（360×202），
              白底與深色底各一張——標題大字縮到 168 寬還要讀得到
"""
import argparse, base64, io, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_record import Recorder

SIZES = [('手機搜尋結果', 168, 94), ('首頁推薦', 246, 138), ('電腦搜尋結果', 360, 202)]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('thumb'); ap.add_argument('--out', default='qa/品檢紀錄'); ap.add_argument('--preview', default='qa/縮圖預覽')
    a = ap.parse_args()
    from PIL import Image
    rec = Recorder('D3 縮圖', a.out)
    name = os.path.basename(a.thumb)
    if not os.path.exists(a.thumb):
        rec.problem('D3.規格', name, '找不到縮圖檔'); sys.exit(rec.finish())
    size = os.path.getsize(a.thumb)
    im = Image.open(a.thumb)
    w, h = im.size
    if im.format not in ('JPEG', 'PNG', 'GIF'):
        rec.problem('D3.規格', name, f'格式 {im.format}，YouTube 只收 JPG／PNG／GIF')
    if size > 2 * 1024 * 1024:
        rec.problem('D3.規格', name, f'{size / 1048576:.1f} MB，超過 2 MB（JPG 品質調低或縮小）')
    if abs(w / h - 16 / 9) > 16 / 9 * 0.02:
        rec.problem('D3.規格', name, f'{w}×{h} 不是 16:9（會被加黑邊或裁切）')
    if w < 640:
        rec.problem('D3.規格', name, f'寬 {w}，YouTube 至少 640')
    elif w < 1280:
        rec.problem('D3.縮圖', name, f'寬 {w}，建議 1280×720 以上（大螢幕看會糊）')
    os.makedirs(a.preview, exist_ok=True)
    rgb = im.convert('RGB')
    cells = []
    for label, tw, th in SIZES:
        buf = io.BytesIO()
        rgb.resize((tw, th), Image.LANCZOS).save(buf, 'PNG')
        b64 = base64.b64encode(buf.getvalue()).decode()
        cells.append(f'<figure><figcaption>{label} {tw}×{th}</figcaption>'
                     f'<div class="row"><div class="bg light"><img src="data:image/png;base64,{b64}"></div>'
                     f'<div class="bg dark"><img src="data:image/png;base64,{b64}"></div></div></figure>')
    html = ('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><title>縮圖預覽</title><style>'
            'body{font-family:"Noto Sans TC","Microsoft JhengHei",sans-serif;margin:24px;color:#222}'
            '.row{display:flex;gap:16px}.bg{padding:12px;border-radius:8px}.light{background:#fff;border:1px solid #ddd}.dark{background:#0f0f0f}'
            'figure{margin:0 0 24px}figcaption{font-weight:700;margin-bottom:6px}</style>'
            f'<h1>縮圖預覽：{name}</h1><p>{w}×{h}、{size / 1024:.0f} KB。縮到最小（手機搜尋結果）時，標題大字還讀得到嗎？</p>'
            + ''.join(cells))
    out = os.path.join(a.preview, '縮圖預覽.html')
    open(out, 'w', encoding='utf-8').write(html)
    rec.note(f'{w}×{h}、{size / 1024:.0f} KB；預覽頁 {out}（人工看）')
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
