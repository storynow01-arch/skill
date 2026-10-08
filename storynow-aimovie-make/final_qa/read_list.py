"""唸法清單（2026-10-08 從範本E qa/read_check.py 移植，改讀 storyboard）：列出旁白裡所有「TTS 可能唸錯」的東西，審稿時逐項確認。

    python read_list.py storyboard.json [--provider edge|gemini] [--out qa/唸法清單] [--rec qa/品檢紀錄]

每一項列出：原文寫法 → 實際送給 TTS 的寫法（套用全域與科目包念法、句子的 say）
  英數詞（網址、指令、型號、縮寫）、數字（含單位、百分比、年份）、多音詞（多音字清單.json，OpenCC 轉簡體再查 pypinyin）、符號
provider 沒指定：先看 storyboard 的 voice.provider，再看專案 .env.local 有 GEMINI_API_KEY 就是 gemini，否則 edge（和 build.py 的配音規則一樣）。
只出報告（級別：提醒），不擋。
"""
import argparse, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SKILL = os.path.abspath(os.path.join(HERE, '..'))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(SKILL, 'engine', 'scripts'))
from qa_record import Recorder

LATIN = re.compile(r"(?<![A-Za-z0-9])[A-Za-z][A-Za-z0-9+#]*(?:[.\-/:][A-Za-z0-9+#]+)*(?![A-Za-z0-9])")
NUM = re.compile(r"\d+(?:\.\d+)*%?(?:\s?(?:年代|年|毫秒|秒|分鐘|公尺|公里|元|Mbps|MB|GB|GHz|位元|個|台|次|天|小時))?")
SYM = re.compile(r"[%/:→—～~&@#=+*<>\[\]{}|\\]")
POLY = json.load(open(os.path.join(HERE, '多音字清單.json'), encoding='utf-8'))
BIG_DICT = os.path.join(SKILL, 'templates', '範本E_教學課程產線', 'engine', 'qa', 'dict', 'dict.txt.big')
_T2S = None


def word_pinyin(word):
    """詞的標準讀音：先 OpenCC 轉簡體再查 pypinyin（繁體詞查不到會退回單字最常見讀音），多音字清單的「詞」優先"""
    global _T2S
    from pypinyin import pinyin, Style
    if _T2S is None:
        import opencc
        _T2S = opencc.OpenCC('t2s')
    py = [x[0] for x in pinyin(_T2S.convert(word), style=Style.TONE)]
    for w, r in POLY['詞'].items():
        if w in word:
            c = next((ch for ch in w if ch in POLY.get('字', '')), None)
            if c and c in word:
                py[word.index(c)] = r
    return py


def provider_of(proj):
    env = os.path.join(proj, '.env.local')
    if os.path.exists(env) and re.search(r'^\s*GEMINI_API_KEY\s*=\s*\S+', open(env, encoding='utf-8').read(), re.M):
        return 'gemini'
    return 'edge'


def collect(sb, provider):
    import build, jieba
    build.load_subject_pron(sb.get('subject'))
    if os.path.exists(BIG_DICT):
        jieba.set_dictionary(BIG_DICT)
    for w in POLY['詞']:
        jieba.add_word(w)
    chars = set(POLY.get('字', ''))
    rows, seen = [], set()
    for sc in sb.get('scenes', []):
        sid = sc.get('id', '?')
        for ln in sc.get('lines', []):
            text = ln['text'] if isinstance(ln, dict) else ln
            say = ln.get('say') if isinstance(ln, dict) else None
            said = build.to_speech(say or text, provider)
            for m in LATIN.finditer(text):
                w = m.group(0)
                if ('英數', w) in seen: continue
                seen.add(('英數', w))
                rows.append({'scene': sid, 'kind': '英數', 'item': w, 'tts': build.to_speech(w, provider), 'line': text, 'say': say})
            for m in NUM.finditer(text):
                w = m.group(0).strip()
                if not w or ('數字', w) in seen: continue
                seen.add(('數字', w))
                rows.append({'scene': sid, 'kind': '數字', 'item': w, 'tts': build.to_speech(w, provider), 'line': text, 'say': say})
            for w in jieba.cut(say or text):
                if re.fullmatch(r'[一-鿿]+', w) and any(ch in chars for ch in w) and ('多音', w) not in seen:
                    seen.add(('多音', w))
                    rows.append({'scene': sid, 'kind': '多音', 'item': w, 'tts': ' '.join(word_pinyin(w)), 'line': text, 'say': say})
            for m in SYM.finditer(text):
                rows.append({'scene': sid, 'kind': '符號', 'item': m.group(0), 'tts': said[:40], 'line': text, 'say': say})
            if say:
                rows.append({'scene': sid, 'kind': '另寫念法', 'item': text[:40], 'tts': said[:60], 'line': text, 'say': say})
    return rows


def write(rows, out, provider, title):
    os.makedirs(out, exist_ok=True)
    json.dump(rows, open(os.path.join(out, '唸法清單.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    md = [f'# 唸法清單：{title}', '', f'配音：{provider}。「送 TTS」是程式轉換後真正送出的文字，審稿時逐項確認。', '']
    for kind in ('英數', '數字', '多音', '符號', '另寫念法'):
        rs = [r for r in rows if r['kind'] == kind]
        if not rs: continue
        md += [f'## {kind}（{len(rs)}）', '', '| 場景 | 寫法 | 送 TTS | 句子 |', '|---|---|---|---|']
        md += [f"| {r['scene']} | {r['item']} | {r['tts']} | {r['line'][:40]} |" for r in rs]
        md.append('')
    open(os.path.join(out, '唸法清單.md'), 'w', encoding='utf-8').write('\n'.join(md))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('storyboard'); ap.add_argument('--provider', choices=['edge', 'gemini'])
    ap.add_argument('--out', default='qa/唸法清單'); ap.add_argument('--rec', default='qa/品檢紀錄')
    a = ap.parse_args()
    sb = json.load(open(a.storyboard, encoding='utf-8'))
    provider = a.provider or (sb.get('voice') or {}).get('provider') or provider_of(os.path.dirname(os.path.abspath(a.storyboard)))
    rec = Recorder('R 唸法清單', a.rec)
    rows = collect(sb, provider)
    write(rows, a.out, provider, sb.get('title', ''))
    counts = '、'.join(f'{k} {sum(r["kind"] == k for r in rows)}' for k in ('英數', '數字', '多音', '符號', '另寫念法'))
    rec.note(f'{counts} → {os.path.join(a.out, "唸法清單.md")}')
    sys.exit(rec.finish())


if __name__ == '__main__':
    main()
