"""S1 專業名詞符號（2026-10-09）：旁白講到專業名詞，畫面一定要畫出它的「正確標準符號」，不能用一般圖示代替。

    python symbol_check.py storyboard.json [--symbols 科目包/<科目>/術語符號.json] [--out qa/品檢紀錄]

起因：0-0 開場旁白說「及閘長得像一個 D、或閘像尖尖的子彈」，畫面卻是紙箱圖示；舊品檢只確認「圖示畫得出來」，
沒確認「專業名詞配的是正確符號」。使用者：「提到專業的名詞，就一定要找出它正確的符號並畫出來」。

符號表（每科一份，預設 科目包/<storyboard 的 subject>/術語符號.json）：
  {"名詞": {"及閘": {"符號": ["gate_and"], "來源": "IEEE Std 91 特徵形"}, ...}}
  符號＝白板圖示名稱（lib/whiteboard 的 WB_ICONS）或專用場景型別（例 kmap）。

檢查（每個場景）：
  S1.符號（擋）    旁白提到名詞，這個場景裡一個對應符號都沒有（圖示、場景型別都算）
  S1.部分（提醒）  提到好幾個名詞，只畫出其中幾個
  S1.名詞表（提醒）專案資料夾的 01_內容分析.md 沒有「專業名詞與符號」段落（寫稿前要先查好每個名詞的正確符號）
刻意的例外（例如只是順口帶過）：場景寫 "qaExempt": {"S1.符號": "理由"}。
"""
import argparse, json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_record import Recorder

SKILL = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))


def scene_text(sc):
    out = []
    for ln in sc.get('lines') or []:
        out.append(ln['text'] if isinstance(ln, dict) else str(ln))
    return '\n'.join(out)


def scene_symbols(sc):
    """場景裡出現的所有字串值（icon、sketch、type…），用來找符號名稱"""
    found = {sc.get('type', '')}
    def walk(v):
        if isinstance(v, dict):
            for x in v.values(): walk(x)
        elif isinstance(v, list):
            for x in v: walk(x)
        elif isinstance(v, str):
            found.add(v)
    walk(sc.get('props', {}))
    return found


def mentioned(text, terms):
    """長的名詞先比對，比對到的位置挖掉（「反及閘」不會再算成「及閘」）"""
    hit = []
    for t in sorted(terms, key=len, reverse=True):
        if t in text:
            hit.append(t)
            text = text.replace(t, '\0' * len(t))
    return hit


def check(sb, table, rec, sb_dir):
    terms = (table or {}).get('名詞', {})
    n = 0
    for sc in sb.get('scenes', []):
        hit = mentioned(scene_text(sc), terms)
        if not hit:
            continue
        n += 1
        syms = scene_symbols(sc)
        ok = [t for t in hit if set(terms[t].get('符號', [])) & syms]
        where = f"{sc.get('id', '?')}"
        if not ok:
            need = '、'.join(f"{t}→{'/'.join(terms[t].get('符號', []))}" for t in hit)
            rec.problem('S1.符號', where, f'旁白講到 {"、".join(hit)}，畫面沒有對應的標準符號（要用：{need}）', sc)
        elif len(ok) < len(hit):
            miss = [t for t in hit if t not in ok]
            rec.problem('S1.部分', where, f'旁白講到 {"、".join(hit)}，只畫出 {"、".join(ok)}；{"、".join(miss)} 沒有符號', sc)
    ana = os.path.join(sb_dir, '01_內容分析.md')
    if os.path.exists(ana) and '專業名詞與符號' not in open(ana, encoding='utf-8').read():
        rec.problem('S1.名詞表', '01_內容分析.md', '沒有「專業名詞與符號」段落：寫稿前要先查好每個專業名詞的正確符號（來源）並列表')
    rec.note(f'有專業名詞的場景 {n} 個（符號表 {len(terms)} 個名詞）')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('storyboard'); ap.add_argument('--symbols'); ap.add_argument('--out', default='qa/品檢紀錄')
    a = ap.parse_args()
    sb = json.load(open(a.storyboard, encoding='utf-8'))
    path = a.symbols or (os.path.join(SKILL, '科目包', sb['subject'], '術語符號.json') if sb.get('subject') else None)
    table = json.load(open(path, encoding='utf-8')) if path and os.path.exists(path) else None
    rec = Recorder('S1 專業名詞符號', a.out)
    if table is None:
        rec.note('這一科還沒有 術語符號.json，跳過（新科目開始時建一份）')
    else:
        check(sb, table, rec, os.path.dirname(os.path.abspath(a.storyboard)))
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
