"""品檢自我測試（2026-10-08，範本E qa/selftest.py 的做法）：故意做壞的材料，每一種都要被抓到；乾淨的要通過。

    python selftest.py            # 全部（約 1～2 分鐘）
    python selftest.py --fast     # 不做影片合併的案例（幾秒）

改了任何品檢規則（final_qa/、engine/scripts/build.py 的品檢部分、品檢分級.json）就一定要跑，沒全過不推。
pre-push 會自動跑 --fast。文字對比（L.對比）要真的渲染畫面，不在這裡測，見 final_qa/README.md 的實測紀錄。
"""
import argparse, json, os, shutil, subprocess, sys, tempfile, time, wave

import numpy as np

sys.stdout.reconfigure(encoding='utf-8', errors='replace')
Q = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = os.path.join(Q, '..', 'engine', 'scripts')
PY = sys.executable
RESULTS = []


def run(cmd, cwd):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, encoding='utf-8', errors='replace')


def codes(rec_dir):
    out = set()
    for f in os.listdir(rec_dir) if os.path.isdir(rec_dir) else []:
        r = json.load(open(os.path.join(rec_dir, f), encoding='utf-8'))
        out |= {x['code'] for x in r['block'] + r['warn']}
    return out


def case(name, expect, got, t0):
    ok = (got == set()) if expect == set() else expect <= got
    RESULTS.append((name, ok, expect, got, time.time() - t0))
    print(f'{"✓" if ok else "✗"} {name}：預期 {sorted(expect) or "通過"}，實際 {sorted(got) or "通過"}（{time.time() - t0:.1f}s）', flush=True)


def storyboard_case(work, name, script, sb, expect, extra=()):
    t0 = time.time()
    d = os.path.join(work, name); os.makedirs(d)
    json.dump(sb, open(os.path.join(d, 'sb.json'), 'w', encoding='utf-8'), ensure_ascii=False)
    run([PY, os.path.join(Q, script), 'sb.json', '--out', 'rec', *extra], d)
    case(name, expect, codes(os.path.join(d, 'rec')), t0)


# ── A1／A2／A3 ──────────────────────────────────────────
def text_cases(work):
    code = lambda src, out, **k: {'type': 'code', 'lang': 'python', 'src': src, 'stdout': out, **k}
    storyboard_case(work, 'A1 乾淨', 'code_check.py', {'scenes': [{'id': 'S1', 'props': {'o': '7'}, 'verify': [code('print(3+4)', '7')]}]}, set())
    storyboard_case(work, 'A1 輸出錯', 'code_check.py', {'scenes': [{'id': 'S1', 'props': {'o': '8'}, 'verify': [code('print(3+4)', '8')]}]}, {'A1.執行'})
    storyboard_case(work, 'A1 不在畫面', 'code_check.py', {'scenes': [{'id': 'S1', 'props': {'o': '?'}, 'verify': [code('print(3+4)', '7')]}]}, {'A1.畫面'})
    storyboard_case(work, 'A1 無窮迴圈', 'code_check.py', {'scenes': [{'id': 'S1', 'props': {}, 'verify': [code('while 1: pass', '', timeout=2)]}]}, {'A1.執行'})
    storyboard_case(work, 'A1 未標', 'code_check.py', {'scenes': [{'id': 'S1', 'props': {'c': 'printf("%d", i);'}}]}, {'A1.未標'})
    storyboard_case(work, 'A1 例外標記', 'code_check.py', {'scenes': [{'id': 'S1', 'props': {'o': '8'}, 'qaExempt': {'A1.執行': '測試'}, 'verify': [code('print(3+4)', '8')]}]}, set())
    ans = os.path.join(work, 'ans.json')
    json.dump({'114': {'專二': {'1': 'C'}}}, open(ans, 'w', encoding='utf-8'))
    storyboard_case(work, 'A2 答對', 'answer_check.py', {'scenes': [{'id': 'S1', 'exam': '114-專二-1', 'props': {'answerIndex': 2}}]}, set(), ('--answers', ans))
    storyboard_case(work, 'A2 答錯', 'answer_check.py', {'scenes': [{'id': 'S1', 'exam': '114-專二-1', 'props': {'answerIndex': 1}}]}, {'A2.答案'}, ('--answers', ans))
    storyboard_case(work, 'A2 缺表', 'answer_check.py', {'scenes': [{'id': 'S1', 'exam': '113-專二-1', 'props': {'answerIndex': 1}}]}, {'A2.缺表'}, ('--answers', ans))
    km = lambda groups, ones=(1, 3, 9, 15): {'id': 'S2', 'type': 'kmap', 'props': {'rowVar': 'AB', 'colVar': 'CD', 'ones': list(ones), 'groups': groups}}
    good = [{'cells': [1, 3], 'term': "A'B'D"}, {'cells': [1, 9], 'term': "B'C'D"}, {'cells': [15], 'term': 'ABCD'}]
    terms = {'id': 'S1', 'type': 'terms', 'props': {'terms': ["A'B'C'D", "A'B'CD", "AB'C'D", 'ABCD']}}
    storyboard_case(work, 'A3 卡諾圖正確', 'math_check.py', {'scenes': [terms, km(good)]}, set())
    storyboard_case(work, 'A3 項寫錯', 'math_check.py', {'scenes': [terms, km([good[0], {'cells': [1, 9], 'term': "BC'D"}, good[2]])]}, {'A3.圈法'})
    storyboard_case(work, 'A3 圈不相鄰', 'math_check.py', {'scenes': [km([{'cells': [1, 15]}])]}, {'A3.圈法'})
    storyboard_case(work, 'A3 漏圈', 'math_check.py', {'scenes': [km(good[:2])]}, {'A3.算錯'})
    storyboard_case(work, 'A3 和式子不一致', 'math_check.py', {'scenes': [terms, km(good, ones=(1, 3, 9, 14))]}, {'A3.一致'})
    storyboard_case(work, 'A3 不是最簡', 'math_check.py', {'scenes': [{'id': 'S1', 'verify': [{'type': 'bool', 'expr': "AB + AB'", 'result': "AB + AB'"}]}]}, {'A3.最簡'})
    storyboard_case(work, 'A3 計算錯', 'math_check.py', {'scenes': [{'id': 'S1', 'verify': [{'type': 'calc', 'expr': '0b1011+3', 'result': '15'},
                                                                                             {'type': 'base', 'value': 'FF', 'from': 16, 'to': 2, 'result': '11111110'}]}]}, {'A3.算錯'})


# ── B1 ─────────────────────────────────────────────────
def fake_voice(path, f0, sr=48000, sec=12):
    """像說話的合成聲：基頻 f0 的諧波、每 0.25 秒一個音節、中間有停頓"""
    t = np.arange(int(sr * sec)) / sr
    x = sum(np.sin(2 * np.pi * f0 * k * t) / k for k in range(1, 12))
    env = (np.sin(2 * np.pi * 2 * t) > -0.3).astype(float) * (0.6 + 0.4 * np.sin(2 * np.pi * 4 * t) ** 2)
    x = (x * env / np.abs(x).max() * 0.5).astype(np.float32)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x * 32767).astype(np.int16).tobytes())


def voice_cases(work):
    meta = lambda prov='edge', voice='zh-TW-YunJheNeural': {'voices': [{'provider': prov, 'model': '', 'voice': voice, 'style': '', 'rate': '+5%', 'pitch': '+0Hz', 'lines': 10}],
                                                            'voice_wav': 'public/voice.wav'}
    spec = {'voiceLines': [{'say': '這是一句測試用的旁白文字', 'from': i * 1.2, 'to': i * 1.2 + 1.0} for i in range(10)]}

    def proj(name, f0, m):
        d = os.path.join(work, name)
        for sub in ('public', 'qa', os.path.join('src', 'data')): os.makedirs(os.path.join(d, sub))
        fake_voice(os.path.join(d, 'public', 'voice.wav'), f0)
        json.dump(m, open(os.path.join(d, 'qa', 'voice_meta.json'), 'w', encoding='utf-8'))
        json.dump(spec, open(os.path.join(d, 'src', 'data', 'spec.json'), 'w', encoding='utf-8'))
        return d
    ref = os.path.join(work, 'voice_ref.json')
    run([PY, os.path.join(Q, 'voice_check.py'), proj('B1 樣片', 120, meta()), '--make-ref', ref], work)
    for name, f0, m, expect in (('B1 同聲音', 120, meta(), set()), ('B1 換模型', 120, meta('gemini', 'storynow01'), {'B1.模型'}),
                                ('B1 聲音變了', 175, meta(), {'B1.聲紋'})):
        t0 = time.time()
        d = proj(name, f0, m)
        run([PY, os.path.join(Q, 'voice_check.py'), d, '--ref', ref, '--out', os.path.join(d, 'rec')], work)
        case(name, expect, codes(os.path.join(d, 'rec')), t0)


# ── M 合併與整集 ─────────────────────────────────────────
def clip(path, sec, *, level=-20, black_head=0.0, silence_tail=0.0, silence_head=0.0, click=False):
    sr = 48000
    n = int(sec * sr)
    t = np.arange(n) / sr
    a = (10 ** (level / 20)) * np.sin(2 * np.pi * 220 * t) * (0.7 + 0.3 * np.sin(2 * np.pi * 3 * t))
    if silence_head: a[: int(silence_head * sr)] = 0
    if silence_tail: a[n - int(silence_tail * sr):] = 0
    if click:
        a[: int(0.6 * sr)] = 0
        i = int(0.15 * sr); a[i:i + 480] = 0.98
    wav = path + '.wav'
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((a * 32767).astype(np.int16).tobytes())
    vf = 'testsrc2=size=640x360:rate=30'
    vchain = f'drawbox=enable=lt(t\\,{black_head}):color=black:t=fill' if black_head else 'null'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', vf, '-i', wav, '-t', str(sec), '-vf', vchain,
                    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', path], check=True)
    os.remove(wav)
    qa = os.path.splitext(path)[0] + '_品檢'
    os.makedirs(qa, exist_ok=True)
    json.dump({'result': '通過'}, open(os.path.join(qa, 'final_qa.json'), 'w', encoding='utf-8'))


def merge_case(work, name, specs, expect, *, minutes=None, edit_chapters=None, fail_qa=None):
    t0 = time.time()
    d = os.path.join(work, name); os.makedirs(d)
    files = []
    for k, sp in enumerate(specs, 1):
        f = os.path.join(d, f'p{k}.mp4'); clip(f, **sp); files.append(f)
    if fail_qa:
        json.dump({'result': ['F1 黑畫面']}, open(os.path.join(d, f'p{fail_qa}_品檢', 'final_qa.json'), 'w', encoding='utf-8'))
    r = run([PY, os.path.join(SCRIPTS, 'assemble_series.py'), '--out', 'long.mp4', *files,
             *sum((['--title', f'第 {k} 支'] for k in range(1, len(files) + 1)), [])], d)
    got = codes(os.path.join(d, 'qa', '品檢紀錄'))
    if r.returncode == 0:
        if edit_chapters:
            open(os.path.join(d, 'long_章節.txt'), 'w', encoding='utf-8').write(edit_chapters)
        run([PY, os.path.join(Q, 'seam_check.py'), 'long.mp4', '--out', 'rec', *(['--minutes', minutes] if minutes else [])], d)
        got |= codes(os.path.join(d, 'rec'))
    case(name, expect, got, t0)


def merge_cases(work):
    ok = {'sec': 11}
    merge_case(work, 'M 乾淨', [ok, ok, ok], set())
    merge_case(work, 'M 合併前沒過品檢', [ok, ok, ok], {'M.合併前品檢'}, fail_qa=2)
    merge_case(work, 'M 接點黑畫面', [ok, {'sec': 11, 'black_head': 1.2}, ok], {'M.接縫'})
    merge_case(work, 'M 接點斷音', [{'sec': 11, 'silence_tail': 1.6}, {'sec': 11, 'silence_head': 1.6}, ok], {'M.接縫'})
    merge_case(work, 'M 接點爆音', [ok, {'sec': 11, 'click': True}, ok], {'M.接縫'})
    merge_case(work, 'M 音量落差', [{'sec': 11, 'level': -32}, {'sec': 11, 'level': -18}, {'sec': 11, 'level': -18}], {'M.接縫'})
    merge_case(work, 'M 長度不在範圍', [ok, ok, ok], {'M.長度'}, minutes='5,10')
    merge_case(work, 'M 章節不合規則', [ok, ok, ok], {'M.章節'}, edit_chapters='0:00 第 1 支\n0:05 第 2 支\n')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--fast', action='store_true'); ap.add_argument('--keep', action='store_true')
    a = ap.parse_args()
    os.environ['QA_SELFTEST'] = '1'
    work = tempfile.mkdtemp(prefix='qa_selftest_')
    t0 = time.time()
    try:
        text_cases(work)
        voice_cases(work)
        if not a.fast:
            merge_cases(work)
    finally:
        if not a.keep: shutil.rmtree(work, ignore_errors=True)
    bad = [r for r in RESULTS if not r[1]]
    print(f'\n品檢自我測試：{len(RESULTS) - len(bad)}/{len(RESULTS)} 通過（{time.time() - t0:.0f} 秒）' + ('' if not a.keep else f'；材料留在 {work}'))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
