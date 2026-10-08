"""A3 計算與化簡驗證（2026-10-08）：畫面上的計算、進位轉換、布林化簡、卡諾圖都用程式重算一次。

    python math_check.py storyboard.json [--out qa/品檢紀錄]

自動檢查（不用多寫欄位）：
  kmap      每一圈：格數是 2 的次方、格子相鄰（＝同一個乘積項的最小項）、沒圈到 0；寫了 term 就要和圈的格子一致
            所有圈都寫了 term：OR 起來要等於函數（隨意項 dc 可圈可不圈）；不是最簡 → A3.最簡（提醒）
  terms     布林式換 0／1 的場景開始一題；後面的 kmap 照座標填的 place、填 1 的 ones 要和式子一致（A3.一致）
  readTable 逐個變數比對的結果，要和同一組格子的圈寫的 term 一致
手動標註（場景的 "verify" 清單）：
  {"type": "bool", "expr": "A'B'C'D + A'B'CD", "result": "A'B'D", "vars": "ABCD", "dc": []}
  {"type": "calc", "expr": "0b1011 + 3", "result": "14"}
  {"type": "base", "value": "1011", "from": 2, "to": 16, "result": "B"}
例外：場景寫 "qaExempt": {"A3.最簡": "這一步刻意先不化簡"}。
"""
import argparse, ast, json, operator, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qa_record import Recorder

TERM = re.compile(r"([A-Za-z])('?)")


# ── 布林 ────────────────────────────────────────────
def term_bits(term, vars_):
    """「A'B'D」→ {'A':0,'B':0,'D':1}；有不在 vars 的字母就丟 ValueError"""
    t = term.replace('’', "'").replace(' ', '')
    if t in ('1', ''):
        return {}
    bits, pos = {}, 0
    for m in TERM.finditer(t):
        if m.start() != pos:
            raise ValueError(f'看不懂「{term}」')
        v = m.group(1).upper()
        if v not in vars_:
            raise ValueError(f'「{term}」的 {v} 不在變數 {vars_} 裡')
        bits[v] = 0 if m.group(2) else 1
        pos = m.end()
    if pos != len(t):
        raise ValueError(f'看不懂「{term}」')
    return bits


def term_minterms(term, vars_):
    bits = term_bits(term, vars_)
    n = len(vars_)
    return {i for i in range(2 ** n)
            if all(((i >> (n - 1 - vars_.index(v))) & 1) == b for v, b in bits.items())}


def sop_minterms(sop, vars_):
    out = set()
    for t in re.split(r'\s*\+\s*', sop.strip()):
        out |= term_minterms(t, vars_)
    return out


def literals(sop):
    return sum(len(TERM.findall(t)) for t in re.split(r'\s*\+\s*', sop.strip()) if t not in ('1', ''))


def implicant_of(cells, n):
    """一組格子共同固定的位元 → 乘積項的最小項集合（格子相鄰＝同一個乘積項）"""
    fixed = {}
    for k in range(n):
        vals = {(c >> (n - 1 - k)) & 1 for c in cells}
        if len(vals) == 1:
            fixed[k] = vals.pop()
    return {i for i in range(2 ** n) if all(((i >> (n - 1 - k)) & 1) == b for k, b in fixed.items())}, fixed


def fixed_to_term(fixed, vars_):
    return ''.join(vars_[k] + ("'" if b == 0 else '') for k, b in sorted(fixed.items())) or '1'


def minimal_literals(vars_, ones, dc):
    from sympy import symbols, SOPform
    syms = symbols(' '.join(vars_))
    syms = syms if isinstance(syms, tuple) else (syms,)
    n = len(vars_)
    to_bits = lambda i: [(i >> (n - 1 - k)) & 1 for k in range(n)]
    expr = SOPform(syms, [to_bits(i) for i in sorted(ones)], [to_bits(i) for i in sorted(dc)])
    terms = []
    for t in str(expr).split('|'):            # sympy 的 (D & ~A & ~B) → 照變數順序寫成 A'B'D
        lits = {m.group(2): bool(m.group(1)) for m in re.finditer(r'(~?)([A-Za-z]\w*)', t)}
        terms.append(''.join(v + ("'" if lits[v] else '') for v in vars_ if v in lits) or '1')
    return sum(len(TERM.findall(t)) for t in terms), ' + '.join(terms)


# ── 計算 ────────────────────────────────────────────
OPS = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv,
       ast.FloorDiv: operator.floordiv, ast.Mod: operator.mod, ast.Pow: operator.pow,
       ast.BitAnd: operator.and_, ast.BitOr: operator.or_, ast.BitXor: operator.xor,
       ast.LShift: operator.lshift, ast.RShift: operator.rshift, ast.USub: operator.neg, ast.Invert: operator.invert}
FUNCS = {'int': int, 'bin': bin, 'oct': oct, 'hex': hex, 'abs': abs, 'round': round, 'max': max, 'min': min}


def safe_eval(expr):
    def ev(n):
        if isinstance(n, ast.Expression): return ev(n.body)
        if isinstance(n, ast.Constant) and isinstance(n.value, (int, float, str)): return n.value
        if isinstance(n, ast.BinOp) and type(n.op) in OPS: return OPS[type(n.op)](ev(n.left), ev(n.right))
        if isinstance(n, ast.UnaryOp) and type(n.op) in OPS: return OPS[type(n.op)](ev(n.operand))
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in FUNCS:
            return FUNCS[n.func.id](*[ev(a) for a in n.args])
        raise ValueError('只接受數字、四則與位元運算、int/bin/oct/hex/abs/round/max/min')
    return ev(ast.parse(expr, mode='eval'))


def same_value(got, want):
    try:
        return abs(float(got) - float(str(want).replace(',', ''))) < 1e-9
    except (TypeError, ValueError):
        return str(got).strip().lower() == str(want).strip().lower()


# ── 主程式 ──────────────────────────────────────────
def check(sb, rec):
    scenes = sb.get('scenes', [])
    group_terms = {}                      # frozenset(cells) → term（給 readTable 對照）
    for sc in scenes:
        p = sc.get('props', {})
        if sc.get('type') == 'kmap':
            vars_ = (p.get('rowVar', '') + p.get('colVar', '')).upper()
            for g in p.get('groups', []):
                if g.get('term'):
                    group_terms[frozenset(g.get('cells', []))] = g['term']
    cur = None                            # 目前這一題：{'vars', 'ones', 'where'}
    for sc in scenes:
        sid, typ, p = sc.get('id', '?'), sc.get('type'), sc.get('props', {})
        if typ in ('title', 'recap'):
            cur = None
        if typ == 'terms' and p.get('terms'):
            vars_ = p.get('vars') or ''.join(sorted({c.upper() for t in p['terms'] for c in t if c.isalpha()}))
            try:
                cur = {'vars': vars_, 'ones': sop_minterms(' + '.join(p['terms']), vars_), 'where': sid}
            except ValueError as e:
                rec.problem('A3.一致', sid, str(e), sc)
        if typ == 'kmap':
            vars_ = (p.get('rowVar', '') + p.get('colVar', '')).upper()
            n = len(vars_)
            if not n:
                continue
            if cur and cur['vars'] != vars_:
                cur = None
            ones, dc = set(p.get('ones', [])), set(p.get('dc', []))
            placed = {int(x['code'], 2) for x in p.get('place', []) if re.fullmatch(r'[01]{%d}' % n, str(x.get('code', '')))}
            if cur:
                if placed - cur['ones']:
                    rec.problem('A3.一致', sid, f'照座標填的格子 {sorted(placed - cur["ones"])} 不在 {cur["where"]} 的式子裡', sc)
                if ones and ones != cur['ones']:
                    rec.problem('A3.一致', sid, f'填 1 的格子 {sorted(ones)} 和 {cur["where"]} 的式子 {sorted(cur["ones"])} 不同', sc)
            groups = p.get('groups', [])
            for k, g in enumerate(groups, 1):
                cells = set(g.get('cells', []))
                if not cells:
                    continue
                imp, fixed = implicant_of(cells, n)
                if imp != cells:
                    why = '格數不是 2 的次方' if len(cells) & (len(cells) - 1) else '格子不相鄰（不是同一個乘積項）'
                    rec.problem('A3.圈法', f'{sid} 第 {k} 圈', f'{sorted(cells)}：{why}', sc)
                    continue
                if (ones or dc) and cells - ones - dc:
                    rec.problem('A3.圈法', f'{sid} 第 {k} 圈', f'圈到 0 的格子 {sorted(cells - ones - dc)}', sc)
                if g.get('term'):
                    try:
                        if term_minterms(g['term'], vars_) != cells:
                            rec.problem('A3.圈法', f'{sid} 第 {k} 圈', f'寫「{g["term"]}」，但這一圈的格子應該是「{fixed_to_term(fixed, vars_)}」', sc)
                    except ValueError as e:
                        rec.problem('A3.圈法', f'{sid} 第 {k} 圈', str(e), sc)
            if ones and groups and all(g.get('term') for g in groups):
                try:
                    got = set().union(*(term_minterms(g['term'], vars_) for g in groups))
                except ValueError:
                    continue
                if ones - got:
                    rec.problem('A3.算錯', sid, f'化簡結果漏掉 1 的格子 {sorted(ones - got)}', sc)
                elif got - ones - dc:
                    rec.problem('A3.算錯', sid, f'化簡結果多包了 0 的格子 {sorted(got - ones - dc)}', sc)
                else:
                    ours = ' + '.join(g['term'] for g in groups)
                    best, best_s = minimal_literals(vars_, ones, dc)
                    if literals(ours) > best:
                        rec.problem('A3.最簡', sid, f'「{ours}」有 {literals(ours)} 個字母，最簡 {best} 個（例：{best_s}）', sc)
        if typ == 'readTable' and p.get('codes'):
            codes = p['codes']
            n = len(codes[0])
            vars_ = (p.get('vars') or 'ABCDEFGH'[:n]).upper()
            cells = frozenset(int(c, 2) for c in codes)
            imp, fixed = implicant_of(set(cells), n)
            derived = fixed_to_term(fixed, vars_)
            if imp != set(cells):
                rec.problem('A3.圈法', sid, f'比對的格子 {list(codes)} 不是一個合法的圈（不相鄰或格數不是 2 的次方）', sc)
            elif cells in group_terms:
                try:
                    if term_minterms(group_terms[cells], vars_) != term_minterms(derived, vars_):
                        rec.problem('A3.一致', sid, f'逐個比對得到「{derived}」，但圈上寫「{group_terms[cells]}」', sc)
                except ValueError as e:
                    rec.problem('A3.一致', sid, str(e), sc)
        for v in sc.get('verify', []):
            kind = v.get('type')
            try:
                if kind == 'bool':
                    vars_ = v.get('vars') or ''.join(sorted({c.upper() for c in v['expr'] + v['result'] if c.isalpha()}))
                    a, b, dc = sop_minterms(v['expr'], vars_), sop_minterms(v['result'], vars_), set(v.get('dc', []))
                    if (a - dc) != (b - dc):
                        rec.problem('A3.算錯', sid, f'「{v["expr"]}」化簡成「{v["result"]}」不等價（差在最小項 {sorted((a ^ b) - dc)}）', sc)
                    else:
                        best, best_s = minimal_literals(vars_, a - dc, dc)
                        if literals(v['result']) > best:
                            rec.problem('A3.最簡', sid, f'「{v["result"]}」不是最簡（最簡 {best} 個字母，例：{best_s}）', sc)
                elif kind == 'calc':
                    got = safe_eval(v['expr'])
                    if not same_value(got, v['result']):
                        rec.problem('A3.算錯', sid, f'{v["expr"]} = {got}，畫面寫 {v["result"]}', sc)
                elif kind == 'base':
                    val = int(str(v['value']), int(v['from']))
                    if val != int(str(v['result']), int(v['to'])):
                        rec.problem('A3.算錯', sid, f'{v["value"]}（{v["from"]} 進位）= {val}（10 進位），畫面寫 {v["result"]}（{v["to"]} 進位）', sc)
                else:
                    rec.problem('A3.算錯', sid, f'不認得的 verify 類型「{kind}」', sc)
            except (ValueError, KeyError, SyntaxError, ZeroDivisionError) as e:
                rec.problem('A3.算錯', sid, f'verify 寫法有誤：{e}', sc)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('storyboard'); ap.add_argument('--out', default='qa/品檢紀錄')
    a = ap.parse_args()
    rec = Recorder('A3 計算與化簡', a.out)
    check(json.load(open(a.storyboard, encoding='utf-8')), rec)
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
