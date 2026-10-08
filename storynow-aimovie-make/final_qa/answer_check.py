"""A2 答案核對（2026-10-08）：影片裡歷屆試題的答案，必須和官方參考答案一樣。

    python answer_check.py storyboard.json [--answers 科目包/<科目>/歷屆答案.json] [--out qa/品檢紀錄]

答案表（每科一份，預設 科目包/<storyboard 的 subject>/歷屆答案.json，從測驗中心公布的參考答案建）：
  {"_來源": "技專校院統一入學測驗中心 114 學年度參考答案", "114": {"專二": {"23": "C", "24": "A"}}}
場景（quiz、qaEnd 或任何有 answerIndex 的場景）：
  "exam": "114-專二-23"                  題號：學年度-考科-題號
  props.answerIndex（0 起算）或 props.answer（"C"）
  "examOptions": ["A", "C", "D"]          畫面只放部分選項或換了順序時，寫出每個選項原本的代號（預設 A、B、C、D）
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
        letters = sc.get('examOptions') or list('ABCDE')
        if 'answer' in p:
            shown = str(p['answer']).strip().upper()
        elif isinstance(p.get('answerIndex'), int) and p['answerIndex'] < len(letters):
            shown = letters[p['answerIndex']]
        else:
            rec.problem('A2.答案', where, '場景沒有 answerIndex 或 answer，無法核對', sc)
            continue
        if shown != str(official).strip().upper():
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
