"""品檢自我測試（2026-10-08，範本E qa/selftest.py 的做法）：故意做壞的材料，每一種都要被抓到；乾淨的要通過。

    python selftest.py            # 全部（約 1～2 分鐘）
    python selftest.py --fast     # 不做影片合併的案例（幾秒）

改了任何品檢規則（final_qa/、engine/scripts/build.py 的品檢部分、品檢分級.json）就一定要跑，沒全過不推。
2026-10-08 階段 2 加上：C1 SRT、D2 色盲、D3 縮圖、E2 音效、A1 的 C 程式（有 gcc 才測）；完整版另加 E1 閃爍、D4 靜止、F1 系列一致性。
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
    # 2026-10-10：歷屆題只放三個選項（1-1 原題 D 被標成 C）
    storyboard_case(work, 'A2 少放選項', 'answer_check.py', {'scenes': [{'id': 'S1', 'exam': '114-專二-1', 'props': {'options': ['甲', '乙', '丙'], 'answerIndex': 2}}]}, {'A2.選項'}, ('--answers', ans))
    storyboard_case(work, 'A2 四選項', 'answer_check.py', {'scenes': [{'id': 'S1', 'exam': '114-專二-1', 'props': {'options': ['甲', '乙', '丙', '丁'], 'answerIndex': 2}}]}, set(), ('--answers', ans))
    storyboard_case(work, 'A2 缺表', 'answer_check.py', {'scenes': [{'id': 'S1', 'exam': '113-專二-1', 'props': {'answerIndex': 1}}]}, {'A2.缺表'}, ('--answers', ans))
    sym = os.path.join(work, 'sym.json')
    json.dump({'名詞': {'及閘': {'符號': ['gate_and']}, '或閘': {'符號': ['gate_or']}}}, open(sym, 'w', encoding='utf-8'), ensure_ascii=False)
    storyboard_case(work, 'S1 符號正確', 'symbol_check.py', {'scenes': [{'id': 'S1', 'type': 'cards', 'props': {'cards': [{'icon': 'gate_and'}]}, 'lines': ['及閘長得像 D']}]}, set(), ('--symbols', sym))
    storyboard_case(work, 'S1 及閘畫成紙箱', 'symbol_check.py', {'scenes': [{'id': 'S1', 'type': 'cards', 'props': {'cards': [{'icon': 'package'}]}, 'lines': ['及閘長得像 D']}]}, {'S1.符號'}, ('--symbols', sym))
    storyboard_case(work, 'S1 只畫一個', 'symbol_check.py', {'scenes': [{'id': 'S1', 'type': 'cards', 'props': {'cards': [{'icon': 'gate_and'}]}, 'lines': ['及閘和或閘']}]}, {'S1.部分'}, ('--symbols', sym))
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


# ── 階段 2（2026-10-08）─────────────────────────────────
def run_case(work, name, cmd, expect, cwd=None):
    t0 = time.time()
    d = os.path.join(work, ''.join(c if c.isalnum() else '_' for c in name))   # Windows 資料夾名不能有 : 等符號
    os.makedirs(d, exist_ok=True)
    run([PY, *cmd, '--out', os.path.join(d, 'rec')], cwd or work)
    case(name, expect, codes(os.path.join(d, 'rec')), t0)


def ff(*args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', *args], check=True)


def stage2_fast(work):
    # C1 SRT
    spec = {'fps': 30, 'captions': [{'text': '第一頁', 'from': 0, 'to': 30}, {'text': '第二頁', 'from': 30, 'to': 60}]}
    sp = os.path.join(work, 'c1_spec.json'); json.dump(spec, open(sp, 'w', encoding='utf-8'), ensure_ascii=False)
    good = os.path.join(work, 'c1_good.srt')
    run([PY, os.path.join(Q, 'srt_tool.py'), 'make', sp, good], work)
    bad = os.path.join(work, 'c1_bad.srt')
    open(bad, 'w', encoding='utf-8-sig').write(open(good, encoding='utf-8-sig').read().replace('第二頁', '第二夜'))
    run_case(work, 'C1 SRT 一致', [os.path.join(Q, 'srt_tool.py'), 'check', sp, good], set())
    run_case(work, 'C1 SRT 錯字', [os.path.join(Q, 'srt_tool.py'), 'check', sp, bad], {'C1.不一致'})
    run_case(work, 'C1 SRT 片頭沒位移', [os.path.join(Q, 'srt_tool.py'), 'check', sp, good, '--lead', '3'], {'C1.不一致'})
    # D2 色盲
    cb_bad = os.path.join(work, 'cb_bad.json'); cb_ok = os.path.join(work, 'cb_ok.json')
    json.dump([{'frame': 1, 'colors': {'190,80,60': '紅', '110,130,50': '綠'}}], open(cb_bad, 'w', encoding='utf-8'), ensure_ascii=False)
    json.dump([{'frame': 1, 'colors': {'229,84,63': '紅', '43,134,191': '藍'}}], open(cb_ok, 'w', encoding='utf-8'), ensure_ascii=False)
    run_case(work, 'D2 紅藍分得出', [os.path.join(Q, 'colorblind_check.py'), cb_ok], set())
    run_case(work, 'D2 紅綠易混', [os.path.join(Q, 'colorblind_check.py'), cb_bad], {'D2.色盲'})
    # D3 縮圖
    from PIL import Image
    Image.new('RGB', (1280, 720), (240, 240, 240)).save(os.path.join(work, 'th_ok.jpg'), quality=90)
    Image.new('RGB', (800, 800), (240, 240, 240)).save(os.path.join(work, 'th_square.jpg'))
    Image.fromarray(np.random.randint(0, 255, (1080, 1920, 3), np.uint8)).save(os.path.join(work, 'th_big.png'))
    run_case(work, 'D3 縮圖合格', [os.path.join(Q, 'thumb_check.py'), 'th_ok.jpg', '--preview', 'prev'], set())
    run_case(work, 'D3 不是 16:9', [os.path.join(Q, 'thumb_check.py'), 'th_square.jpg', '--preview', 'prev'], {'D3.規格'})
    run_case(work, 'D3 超過 2MB', [os.path.join(Q, 'thumb_check.py'), 'th_big.png', '--preview', 'prev'], {'D3.規格'})
    # E2 音效
    sr, n = 48000, 48000 * 6
    t = np.arange(n) / sr
    voice = (0.2 * np.sin(2 * np.pi * 180 * t) * (np.sin(2 * np.pi * 2 * t) > -0.5)).astype(np.float32)
    quiet = np.zeros(n, np.float32); quiet[sr * 2: sr * 2 + 2400] = 0.005
    loud = np.zeros(n, np.float32); loud[sr * 2: sr * 2 + 2400] = 0.4
    for name, x in (('e2_voice', voice), ('e2_quiet', quiet), ('e2_loud', loud)):
        with wave.open(os.path.join(work, name + '.wav'), 'wb') as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x * 32767).astype(np.int16).tobytes())
    run_case(work, 'E2 音效夠小聲', [os.path.join(Q, 'sfx_check.py'), '--sfx', 'e2_quiet.wav', '--voice', 'e2_voice.wav'], set())
    run_case(work, 'E2 音效蓋旁白', [os.path.join(Q, 'sfx_check.py'), '--sfx', 'e2_loud.wav', '--voice', 'e2_voice.wav'], {'E2.音效'})
    # A1 C 程式（有 gcc 才測）
    sys.path.insert(0, Q)
    from code_check import find_tool
    if find_tool('gcc'):
        nl = chr(92) + 'n'
        ok = '#include <stdio.h>\nint main(){int a[]={1,2,3,4,5},s=0;for(int i=0;i<5;i++)s+=a[i];printf("%d' + nl + '",s);return 0;}'
        oob = ok.replace('i<5', 'i<=5')
        storyboard_case(work, 'A1 C 正確', 'code_check.py', {'scenes': [{'id': 'S1', 'props': {'o': '15'}, 'verify': [{'type': 'code', 'lang': 'c', 'src': ok, 'stdout': '15'}]}]}, set())
        storyboard_case(work, 'A1 C 陣列越界', 'code_check.py', {'scenes': [{'id': 'S1', 'props': {'o': '15'}, 'verify': [{'type': 'code', 'lang': 'c', 'src': oob, 'stdout': '15'}]}]}, {'A1.警告'})
    else:
        print('ℹ 這台電腦沒有 gcc，跳過 A1 的 C 程式案例')


def stage2_video(work):
    # E1 閃爍、D4 靜止、F1 系列一致性（要做影片，放在完整版）
    ff('-f', 'lavfi', '-i', "color=black:s=320x180:r=30:d=3,geq=lum='if(lt(mod(N,6),3),235,16)':cb=128:cr=128", '-pix_fmt', 'yuv420p', os.path.join(work, 'flicker.mp4'))
    ff('-f', 'lavfi', '-i', "color=black:s=320x180:r=30:d=4,geq=lum='16+219*(0.5+0.5*sin(2*PI*N/60))':cb=128:cr=128", '-pix_fmt', 'yuv420p', os.path.join(work, 'fade.mp4'))
    run_case(work, 'E1 淡入淡出', [os.path.join(Q, 'flash_check.py'), 'fade.mp4'], set())
    run_case(work, 'E1 快速閃爍', [os.path.join(Q, 'flash_check.py'), 'flicker.mp4'], {'E1.閃爍'})
    ff('-f', 'lavfi', '-i', 'testsrc2=s=320x180:r=30:d=4', '-f', 'lavfi', '-i', 'color=gray:s=320x180:r=30:d=12',
       '-filter_complex', '[0][1]concat=n=2:v=1[v]', '-map', '[v]', '-pix_fmt', 'yuv420p', os.path.join(work, 'frozen.mp4'))
    sp = os.path.join(work, 'frozen_spec.json')
    json.dump({'fps': 30, 'scenes': [{'id': 'S1', 'from': 0}], 'voiceLines': [{'from': 4.5, 'to': 15.5}]}, open(sp, 'w', encoding='utf-8'))
    run_case(work, 'D4 講話時畫面不動', [os.path.join(Q, 'still_check.py'), 'frozen.mp4', '--spec', sp], {'D4.靜止'})
    for name, src in (('f1_a', 'color=c=0xefeff0'), ('f1_b', 'color=c=0x181818')):     # 淺灰白板 vs 深色背景
        ff('-f', 'lavfi', '-i', f'{src}:s=640x360:r=30:d=4', '-f', 'lavfi', '-i', 'sine=f=300:d=4', '-c:v', 'libx264', '-preset', 'ultrafast',
           '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', os.path.join(work, name + '.mp4'))
    run([PY, os.path.join(Q, 'series_check.py'), 'f1_a.mp4', '--template', 'D', '--make-ref', 'f1_ref.json'], work)
    run_case(work, 'F1 同一支', [os.path.join(Q, 'series_check.py'), 'f1_a.mp4', '--template', 'D', '--ref', 'f1_ref.json'], set())
    run_case(work, 'F1 換範本換配色', [os.path.join(Q, 'series_check.py'), 'f1_b.mp4', '--template', 'H', '--ref', 'f1_ref.json'], {'F1.規格', 'F1.風格'})


def caption_cases(work):
    """F1 字幕閃爍、F2 字幕抖動、F11 畫面突跳——淺色與深色背景各做一次（2026-10-08 範本E 驗收抓到：
    這三項原本只在範本E 的深色背景驗證過；淺色白板上 F1／F2 永遠 0、單格突跳從來抓不到）"""
    sys.path.insert(0, Q)
    from final_qa import band_boxes, flicker_and_jitter, jumps
    from pathlib import Path
    font = 'C\\:/Windows/Fonts/msjhbd.ttc'
    for bg, label in (('0xeeeef0', '淺色'), ('0x181818', '深色')):
        base = os.path.join(work, f'cap_{label}.mp4')
        txt = lambda t, a, b: (f"drawtext=fontfile='{font}':text='{t}':fontsize=54:fontcolor=white:borderw=8:bordercolor=0x1d232a:"
                               f"x=(w-tw)/2:y=950:enable='between(n,{a},{b})'")
        ff('-f', 'lavfi', '-i', f'color=c={bg}:s=1920x1080:r=30:d=6', '-vf',
           "drawbox=x=300:y=300:w=500:h=300:color=0x2b86bf:t=fill,drawbox=x=1100:y=250:w=400:h=420:color=0xe5543f:t=12,"
           + txt('第一頁字幕測試', 0, 89) + ',' + txt('第二頁的字幕', 90, 179), '-pix_fmt', 'yuv420p', base)
        bad = {
            'F1 字幕閃 1 格': ['-vf', f"drawbox=x=0:y=930:w=iw:h=90:color={bg}:t=fill:enable='eq(n,90)'"],
            'F2 字幕抖動': ['-filter_complex', "[0:v]split[m][s];[s]crop=1920:90:0:930[b];[m][b]overlay=x=12:y=930:enable='between(n,20,80)*not(mod(n,4))'"],
            'F11 單格突跳': ['-filter_complex', "[0:v]split[m][s];[s]crop=1920:700:0:160[c];[m][c]overlay=x=0:y=200:enable='eq(n,120)'"],
        }

        def measure(p):
            fl, jt = flicker_and_jitter(band_boxes(Path(p), 930, 90))
            return {k for k, v in (('F1', fl), ('F2', jt), ('F11', jumps(Path(p)))) if v}
        t0 = time.time()
        case(f'{label}底 字幕與畫面乾淨', set(), measure(base), t0)
        for name, args in bad.items():
            t0 = time.time()
            out = os.path.join(work, f'cap_{label}_{name[:3].strip()}.mp4')
            ff('-i', base, *args, '-pix_fmt', 'yuv420p', out)
            case(f'{label}底 {name}', {name.split()[0]}, measure(out), t0)


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
        stage2_fast(work)
        if not a.fast:
            stage2_video(work)
            caption_cases(work)
            merge_cases(work)
    finally:
        if not a.keep: shutil.rmtree(work, ignore_errors=True)
    bad = [r for r in RESULTS if not r[1]]
    print(f'\n品檢自我測試：{len(RESULTS) - len(bad)}/{len(RESULTS)} 通過（{time.time() - t0:.0f} 秒）' + ('' if not a.keep else f'；材料留在 {work}'))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
