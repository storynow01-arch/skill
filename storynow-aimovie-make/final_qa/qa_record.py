"""品檢紀錄（2026-10-08）：每支品檢程式用它記錄結果、耗時、例外，並依 品檢分級.json 決定要不要擋。

    from qa_record import Recorder
    rec = Recorder('A3 計算與化簡', out='qa/品檢紀錄')
    rec.problem('A3.算錯', 'S9', '化簡結果不等價：…', scene=scene)   # scene 有 qaExempt 就記成例外
    sys.exit(rec.finish())          # 有「擋」級問題 → 1，否則 0

紀錄寫到 <out>/<檢查名>.json；qa_summary.py 彙整成品檢總表（含每項耗時）。
"""
import json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
LEVELS = json.load(open(os.path.join(HERE, '品檢分級.json'), encoding='utf-8'))['項目']


def level(code):
    """實際生效的級別：擋／提醒（「提醒後擋」未升級時當提醒）"""
    lv = LEVELS.get(code, {}).get('級別', '提醒')
    if lv == '提醒後擋':
        return '擋' if LEVELS[code].get('已升級') else '提醒'
    return lv


class Recorder:
    def __init__(self, name, out='qa/品檢紀錄'):
        self.name, self.out, self.t0 = name, out, time.time()
        self.items, self.exempt, self.notes = [], [], []

    def problem(self, code, where, msg, scene=None):
        why = ((scene or {}).get('qaExempt') or {}).get(code)
        row = {'code': code, 'where': where, 'msg': msg, 'level': level(code)}
        if why:
            self.exempt.append({**row, 'reason': why})
        else:
            self.items.append(row)

    def note(self, msg):
        self.notes.append(msg)

    def finish(self, quiet=False):
        sec = round(time.time() - self.t0, 2)
        block = [x for x in self.items if x['level'] == '擋']
        warn = [x for x in self.items if x['level'] != '擋']
        os.makedirs(self.out, exist_ok=True)
        rec = {'name': self.name, 'seconds': sec, 'result': '擋' if block else ('提醒' if warn else '通過'),
               'block': block, 'warn': warn, 'exempt': self.exempt, 'notes': self.notes}
        json.dump(rec, open(os.path.join(self.out, f'{self.name}.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        if not quiet:
            mark = {'擋': '✗', '提醒': '⚠', '通過': '✓'}[rec['result']]
            print(f'{mark} {self.name}：擋 {len(block)}、提醒 {len(warn)}、例外 {len(self.exempt)}（{sec}s）')
            for x in block: print(f'   ✗ [{x["code"]}] {x["where"]}：{x["msg"]}')
            for x in warn: print(f'   ⚠ [{x["code"]}] {x["where"]}：{x["msg"]}')
            for x in self.exempt: print(f'   ℹ 例外 [{x["code"]}] {x["where"]}：{x["reason"]}')
            for n in self.notes: print(f'   ℹ {n}')
        return 1 if block else 0


if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
