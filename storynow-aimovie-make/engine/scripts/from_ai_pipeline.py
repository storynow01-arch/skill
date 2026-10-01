"""把「01教學影片AI製作」產線的雙軌稿（.md）＋ 分鏡（_plan.json）轉成 code-video-studio 的 storyboard.json。

用法：
    python from_ai_pipeline.py <稿.md> <plan.json> <輸出 storyboard.json> [--style blueprint] [--hud-left "網路概論"]

對應：title_card→title、scenario→scenario、definition→definition、concept_cards→cards、
     comparison→vs、quiz→quiz、closing_card→recap、qa_endcard→qaEnd（固定秒數、無旁白）
cue 對齊：plan 裡的 cue / cueWords 字串會在旁白逐行中搜尋，找到哪一行就在那一行出現。
"""
import argparse, json, re


def parse_md(path):
    text = open(path, encoding='utf-8').read()
    out = {}
    for b in re.split(r'^## ', text, flags=re.M)[1:]:
        m = re.match(r'(S\d+)', b)
        nm = re.search(r'^NARRATION:\s*\n(.*?)(?=\n---|\Z)', b, re.S | re.M)
        if not m or not nm:
            continue
        lines = [re.sub(r'\*\*(.+?)\*\*', r'\1', l).strip() for l in nm.group(1).split('\n')]
        out[m.group(1)] = [l for l in lines if l]
    return out


def find(lines, word, default=-1):
    if not word:
        return default
    for i, l in enumerate(lines):
        if word in l:
            return i
    return default


def convert(md, plan, style, hud_left):
    narr = parse_md(md)
    pl = json.load(open(plan, encoding='utf-8'))
    scenes = []
    for s in pl['scenes']:
        sid, typ, p = s['id'], s['type'], s['props']
        lines = narr.get(sid, [])
        sc = {'id': sid, 'lines': lines}
        if typ == 'title_card':
            sc.update(type='title', impact=True, props={'eyebrow': p.get('eyebrow', ''), 'title': p['title'], 'en': p.get('subtitleEn', ''), 'size': 140})
        elif typ == 'scenario':
            spin = p.get('icon') in ('🌀',)
            sc.update(type='scenario', props={'heading': p['heading'], 'icon': p['icon'], 'pills': p['pills'], 'spin': spin,
                                              'cueMap': [find(lines, w) for w in p.get('cueWords', [])]})
        elif typ == 'definition':
            hl = p.get('highlight', '')
            sc.update(type='definition', accent='accent', props={**p, 'cueMap': [find(lines, p['bigText'][:4], 0), find(lines, hl[:2], 1)],
                                                                 'noteCues': [min(len(lines) - 1, 1 + i) for i in range(len(p.get('sideNotes', [])))]})
        elif typ == 'concept_cards':
            cards = [{'icon': c.get('icon'), 'title': c['title'], 'note': c.get('note')} for c in p['cards']]
            cm = [find(lines, c.get('cue'), min(len(lines) - 1, i + 1)) for i, c in enumerate(p['cards'])]
            sc.update(type='cards', props={'heading': p['heading'], 'cards': cards, 'cueMap': cm, 'footer': p.get('footer')})
        elif typ == 'comparison':
            cw = p.get('cueWords', [])
            cm = [find(lines, cw[0], 0) if cw else 0, find(lines, cw[1], min(len(lines) - 1, 2)) if len(cw) > 1 else min(len(lines) - 1, 2)]
            sc.update(type='vs', props={'left': p['left'], 'right': p['right'], 'mid': p.get('mid', 'vs'), 'footerPill': p.get('footerPill'), 'cueMap': cm})
        elif typ == 'quiz':
            sc.update(type='quiz', props={**p, 'revealCue': find(lines, '答案', len(lines) - 2)})
        elif typ == 'closing_card':
            tk = p.get('takeaway', [])
            sc.update(type='recap', impact=True, props={**p, 'takeCues': [find(lines, t[:4], i + 1) for i, t in enumerate(tk)],
                                                         'nextCue': find(lines, '下一節', len(lines) - 1)})
        elif typ == 'qa_endcard':
            sc.update(type='qaEnd', sec=p.get('totalSec', 6), lines=[], props=p)
        else:
            sc.update(type='statement', props={'heading': p.get('heading', sid)})
        scenes.append(sc)
    return {'title': pl.get('chapterLabel', ''), 'mode': 'teach', 'style': style,
            'hud': {'left': hud_left, 'right': pl.get('chapterLabel', '')},
            'voice': {'name': 'zh-TW-YunJheNeural', 'rate': '+18%', 'pitch': '+4Hz'},
            'lineGap': 0.3, 'lead': 0.4, 'tail': 0.7, 'scenes': scenes}


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('md'); ap.add_argument('plan'); ap.add_argument('out')
    ap.add_argument('--style', default='blueprint'); ap.add_argument('--hud-left', default='網路概論 · 單元 1')
    a = ap.parse_args()
    sb = convert(a.md, a.plan, a.style, a.hud_left)
    json.dump(sb, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print('storyboard →', a.out, f'({len(sb["scenes"])} scenes, {sum(len(s["lines"]) for s in sb["scenes"])} lines)')
