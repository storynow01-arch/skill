"""A2 答案核對（2026-10-08）：影片裡歷屆試題的答案，必須和官方參考答案一樣。

    python answer_check.py storyboard.json [--answers 科目包/<科目>/歷屆答案.json] [--out qa/品檢紀錄]

答案表（每科一份，預設 科目包/<storyboard 的 subject>/歷屆答案.json，從測驗中心公布的參考答案建）：
  {"_來源": "技專校院統一入學測驗中心 114 學年度參考答案", "114": {"專二": {"23": "C", "24": "A"}}}
場景（quiz、qaEnd 或任何有 answerIndex 的場景）：
  "exam": "114-專二-23"                  題號：學年度-考科-題號
  props.answerIndex（0 起算）或 props.answer（"C"）
  props.options 一律放滿四個、照原題 A～D 順序（2026-10-10 起；統測就是四選一）
  ⛔ 不准只放部分選項或換順序：範本的字母永遠照 A、B、C、D 排，少放一個就會把原題 (D) 標成 C。
     舊欄位 "examOptions" 已停用，出現就擋。
"""
import argparse, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_record import Recorder

SKILL = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def lookup(table, exam):
    year, subj, no = exam.split('-')
    return table.get(year, {}).get(subj, {}).get(no)


def check(sb, table, table_path, rec):
    n = 0
    for sc in sb.get('scenes', []):
        exam = sc.get('exam')
        if not exam:
            continue
        n += 1
        sid, p = sc.get('id', '?'), sc.get('props', {})
        where = f'{sid}（{exam}）'
        try:
            official = lookup(table, exam) if table is not None else None
        except ValueError:
            rec.problem('A2.缺表', where, '題號格式要寫「學年度-考科-題號」，例 114-專二-23', sc)
            continue
        if official is None:
            rec.problem('A2.缺表', where, f'答案表查不到這一題（{table_path or "沒有答案表"}）', sc)
            continue
        if str(official).strip() == '送分':
            rec.problem('A2.送分', where, '這題官方公告送分（題目有瑕疵），不適合當例題，要用就要在影片裡講清楚', sc)
            continue
        if sc.get('examOptions'):
            rec.problem('A2.選項', where, '不准只放部分選項（examOptions 已停用）：四個選項全放、照原題順序', sc)
            continue
        if 'options' in p and len(p['options']) != 4:
            rec.problem('A2.選項', where, f'畫面放了 {len(p["options"])} 個選項；歷屆題要四個全放、照原題 A～D 順序', sc)
        letters = list('ABCDE')
        if 'answer' in p:
            shown = str(p['answer']).strip().upper()
        elif isinstance(p.get('answerIndex'), int) and p['answerIndex'] < len(letters):
            shown = letters[p['answerIndex']]
        else:
            rec.problem('A2.答案', where, '場景沒有 answerIndex 或 answer，無法核對', sc)
            continue
        official = str(official).strip().upper()
        # 疑義後公告「A 或 C 皆可」記成 "AC"：影片寫其中一個就算對
        if shown != official and not (len(official) > 1 and len(shown) == 1 and shown in official):
            rec.problem('A2.答案', where, f'影片的答案是 {shown}，官方參考答案是 {official}', sc)
    rec.note(f'核對 {n} 題' + (f'（答案表 {table_path}）' if table_path else ''))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('storyboard'); ap.add_argument('--answers'); ap.add_argument('--out', default='qa/品檢紀錄')
    a = ap.parse_args()
    sb = json.load(open(a.storyboard, encoding='utf-8'))
    path = a.answers or (os.path.join(SKILL, '科目包', sb['subject'], '歷屆答案.json') if sb.get('subject') else None)
    table = json.load(open(path, encoding='utf-8')) if path and os.path.exists(path) else None
    rec = Recorder('A2 答案核對', a.out)
    check(sb, table, path if table is not None else None, rec)
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
