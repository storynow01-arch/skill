"""海青工商資訊科 官方宣傳片「攜手築夢·智造未來」— Python 手刻版

畫面：PIL 逐格繪製；輸出：moviepy（libx264）。分鏡以 128 BPM 小節為單位，與 audio/soundtrack.wav 對拍。

用法：
    python trailer.py            # 4 個 worker 平行算圖 → ffmpeg 串接並混入配樂
    python trailer.py --still 12.3   # 輸出單張預覽 still_12.3.png
"""
import argparse, math, os, subprocess, sys
from functools import lru_cache

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops

HERE = os.path.dirname(os.path.abspath(__file__))
AUDIO = os.path.join(HERE, 'audio', 'soundtrack.wav')
OUT = os.path.join(HERE, 'haiching_it_trailer_python.mp4')

W, H, FPS = 1920, 1080, 30
DUR = 60.0
BAR = 60 / 128 * 4  # 1.875 s

# ---------- 色票 ----------
BG0 = (4, 8, 20)
CYAN = (0, 229, 255)
BLUE = (47, 123, 255)
VIOLET = (150, 100, 255)
GOLD = (255, 200, 64)
SILVER = (205, 215, 230)
BRONZE = (220, 135, 75)
WHITE = (236, 246, 255)
GREY = (120, 140, 170)
GREEN = (60, 255, 170)
ORANGE = (255, 160, 70)
PINK = (255, 70, 150)

FONTS = {
    'tc': 'C:/Windows/Fonts/msjhbd.ttc',
    'tcl': 'C:/Windows/Fonts/msjh.ttc',
    'num': 'C:/Windows/Fonts/bahnschrift.ttf',
    'mono': 'C:/Windows/Fonts/consola.ttf',
    'monob': 'C:/Windows/Fonts/consolab.ttf',
}


@lru_cache(None)
def font(key, size, var=None):
    f = ImageFont.truetype(FONTS[key], size)
    if key == 'num':
        f.set_variation_by_name(var or 'Bold')
    return f


# ---------- 小工具 ----------
def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def prog(t, start, dur):
    return clamp((t - start) / dur)


def ease_out(x):
    return 1 - (1 - clamp(x)) ** 3


def ease_io(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def back_out(x, s=1.7):
    x = clamp(x) - 1
    return 1 + (s + 1) * x ** 3 + s * x ** 2


def mul(c, a):
    a = clamp(a)
    return tuple(int(BG0[i] + (c[i] - BG0[i]) * a) for i in range(3))


def lerp(a, b, x):
    return a + (b - a) * x


@lru_cache(512)
def text_img(text, fkey, size, color, glow=0, glow_color=None, spacing=0, var=None):
    """回傳 RGBA 文字圖（含光暈），已快取。"""
    f = font(fkey, size, var)
    if spacing:
        widths = [f.getlength(ch) for ch in text]
        tw = int(sum(widths) + spacing * (len(text) - 1))
    else:
        tw = int(f.getlength(text))
    asc, desc = f.getmetrics()
    th = asc + desc
    pad = glow * 3 + 4
    img = Image.new('RGBA', (tw + pad * 2, th + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if spacing:
        x = pad
        for ch, w in zip(text, widths):
            d.text((x, pad), ch, font=f, fill=color + (255,))
            x += w + spacing
    else:
        d.text((pad, pad), text, font=f, fill=color + (255,))
    if glow:
        a = img.getchannel('A').filter(ImageFilter.GaussianBlur(glow))
        a = a.point(lambda v: min(255, int(v * 1.6)))
        g = Image.new('RGBA', img.size, (glow_color or color) + (0,))
        g.putalpha(a)
        img = Image.alpha_composite(g, img)
    return img


def put(canvas, img, x, y, anchor='c', alpha=1.0, scale=1.0):
    if alpha <= 0.01:
        return
    if scale != 1.0:
        img = img.resize((max(1, int(img.width * scale)), max(1, int(img.height * scale))), Image.BILINEAR)
    if alpha < 0.999:
        img = img.copy()
        img.putalpha(img.getchannel('A').point(lambda v: int(v * alpha)))
    w, h = img.size
    if anchor == 'c':
        x, y = x - w // 2, y - h // 2
    elif anchor == 'l':
        y = y - h // 2
    elif anchor == 'r':
        x, y = x - w, y - h // 2
    canvas.paste(img, (int(x), int(y)), img)


def text(canvas, s, x, y, fkey='tc', size=40, color=WHITE, anchor='c', alpha=1.0, scale=1.0,
         glow=0, glow_color=None, spacing=0, var=None):
    put(canvas, text_img(s, fkey, size, color, glow, glow_color, spacing, var), x, y, anchor, alpha, scale)


def typed(s, t, cps):
    return s[: int(max(0, t) * cps)]


# ---------- 預先計算的圖層 ----------
def _base():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    g = np.zeros((H, W, 3), np.float32)
    top = np.array([6, 12, 30], np.float32); bot = np.array([2, 5, 14], np.float32)
    k = (yy / H)[..., None]
    g[:] = top * (1 - k) + bot * k
    # 中央淡淡的藍色光暈
    r = np.sqrt(((xx - W / 2) / W) ** 2 + ((yy - H * 0.45) / H) ** 2)
    g += (np.clip(1 - r * 2.2, 0, 1) ** 2)[..., None] * np.array([10, 30, 60], np.float32)
    return Image.fromarray(g.clip(0, 255).astype(np.uint8))


BASE = _base()


def _post_mask():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
    vig = 1 - np.clip(r - 0.55, 0, 1) ** 1.6 * 0.75
    scan = np.where((np.arange(H) % 3) == 0, 0.9, 1.0)[:, None]
    return (vig * scan).astype(np.float32)[..., None]


POST = _post_mask()

RNG = np.random.default_rng(3)
PARTICLES = [(RNG.uniform(0, W), RNG.uniform(0, H), RNG.uniform(10, 45), RNG.uniform(1, 3.2), RNG.uniform(0.2, 1))
             for _ in range(110)]

CODE_BG_LINES = """for (int i = 0; i < n; i++) sum += a[i];
def train(model, data): return model.fit(data)
struct Node { int key; Node *left, *right; };
while (!queue.empty()) { bfs(queue.front()); }
GPIO.output(LED_PIN, GPIO.HIGH)
tensor = torch.relu(W @ x + b)
digitalWrite(13, HIGH); delay(250);
if (sensor.read() > THRESHOLD) alert();
MOVJ P[1] V=50 ; MOVL P[2] V=200
SELECT * FROM students WHERE dream = 'future';
int *p = malloc(sizeof(int) * N);
mqtt.publish("haiching/it/iot", payload)
esp_wifi_start(); xTaskCreate(loop, "ai", 4096);
quick_sort(arr, 0, n - 1);
ip route 10.0.0.0 255.0.0.0 192.168.1.1
yield from edge_ai.infer(frame)""".split('\n')


def _code_layer():
    f = font('mono', 22)
    lines = CODE_BG_LINES * 6
    img = Image.new('RGB', (760, len(lines) * 34), (0, 0, 0))
    d = ImageDraw.Draw(img)
    for i, ln in enumerate(lines):
        c = (18, 48, 70) if i % 3 else (22, 60, 90)
        d.text((10, i * 34), ln, font=f, fill=c)
    return img


CODE_LAYER = _code_layer()


# ---------- 背景 ----------
def background(t, accent=CYAN, grid_a=1.0, code_a=1.0):
    im = BASE.copy()
    d = ImageDraw.Draw(im)
    hz = 690
    vx = W / 2
    # 透視地板格線
    gc = mul(tuple(int(c * 0.55) for c in accent), 0.55 * grid_a)
    for i in range(-16, 17):
        xb = vx + i * 190
        d.line([(vx + i * 12, hz), (xb, H)], fill=gc, width=1)
    for j in range(16):
        z = ((j - t * 2.2) % 16) + 0.6
        y = hz + 390 / z
        if y > H:
            continue
        a = clamp(1.2 / z) * grid_a
        d.line([(0, y), (W, y)], fill=mul(tuple(int(c * 0.6) for c in accent), a), width=1)
    d.line([(0, hz), (W, hz)], fill=mul(accent, 0.35 * grid_a), width=2)
    # 粒子
    for (px, py, sp, sz, br) in PARTICLES:
        y = (py - t * sp) % H
        x = px + math.sin(t * 0.7 + py) * 12
        c = mul(accent, br * 0.6 * grid_a)
        d.ellipse([x - sz / 2, y - sz / 2, x + sz / 2, y + sz / 2], fill=c)
    # 兩側捲動程式碼
    if code_a > 0:
        off = int(t * 40) % (CODE_LAYER.height // 2)
        crop = CODE_LAYER.crop((0, off, 760, off + H))
        if code_a < 1:
            crop = Image.eval(crop, lambda v: int(v * code_a))
        for x0 in (20, W - 780):
            region = im.crop((x0, 0, x0 + 760, H))
            im.paste(ImageChops.lighter(region, crop), (x0, 0))
    return im


def hud(canvas, t, chapter, accent):
    d = ImageDraw.Draw(canvas)
    c = mul(accent, 0.8)
    L = 46
    for (x, y, sx, sy) in [(40, 40, 1, 1), (W - 40, 40, -1, 1), (40, H - 40, 1, -1), (W - 40, H - 40, -1, -1)]:
        d.line([(x, y), (x + L * sx, y)], fill=c, width=3)
        d.line([(x, y), (x, y + L * sy)], fill=c, width=3)
    text(canvas, 'HAICHING IT // OFFICIAL TRAILER 2026', 70, 72, 'num', 20, mul(WHITE, 0.7), 'l', var='SemiBold', spacing=2)
    if chapter:
        text(canvas, chapter, W - 70, 72, 'num', 20, mul(accent, 0.95), 'r', var='SemiBold', spacing=2)
    fr = int(t * FPS)
    tc = f'{int(t // 60):02d}:{int(t % 60):02d}:{fr % FPS:02d}'
    text(canvas, 'REC ● ' + tc, 70, H - 72, 'mono', 20, mul(WHITE, 0.6), 'l')
    # 進度條
    x0, x1, y = W - 420, W - 70, H - 72
    d.line([(x0, y), (x1, y)], fill=mul(GREY, 0.4), width=3)
    d.line([(x0, y), (x0 + (x1 - x0) * t / DUR, y)], fill=c, width=3)


def chapter_tag(canvas, t, num, zh, en, accent, x=140, y=190):
    a = ease_out(prog(t, 0, 0.5))
    d = ImageDraw.Draw(canvas)
    d.rectangle([x - 40 + (1 - a) * -80, y - 44, x - 32 + (1 - a) * -80, y + 44], fill=mul(accent, a))
    text(canvas, num, x - 10 - (1 - a) * 60, y, 'num', 84, accent, 'l', a, glow=10, var='Bold')
    text(canvas, zh, x + 120 + (1 - a) * 60, y - 16, 'tc', 44, WHITE, 'l', a)
    text(canvas, en, x + 122 + (1 - a) * 60, y + 30, 'num', 20, mul(accent, 0.9), 'l', a, spacing=4, var='SemiBold')


def heading(canvas, t, zh, en, accent, y=330, x=140, size=64, delay=0.15):
    a = ease_out(prog(t, delay, 0.5))
    text(canvas, zh, x - (1 - a) * 40, y, 'tc', size, WHITE, 'l', a, glow=8, glow_color=accent)
    text(canvas, en, x - (1 - a) * 40, y + size * 0.8, 'num', 22, mul(accent, 0.95), 'l', a, spacing=5, var='SemiBold')


def panel(d, box, accent, a=1.0, title=None, canvas=None):
    x0, y0, x1, y1 = box
    d.rectangle(box, fill=mul((10, 22, 44), a), outline=mul(accent, 0.7 * a), width=2)
    d.rectangle([x0, y0, x1, y0 + 34], fill=mul((14, 34, 64), a))
    for i, c in enumerate([PINK, GOLD, GREEN]):
        d.ellipse([x0 + 14 + i * 22, y0 + 11, x0 + 26 + i * 22, y0 + 23], fill=mul(c, a))
    if title and canvas is not None:
        text(canvas, title, x0 + 90, y0 + 17, 'mono', 18, mul(GREY, 1.2), 'l', a)


# ---------- 語法上色 ----------
KW = {'int', 'void', 'return', 'while', 'for', 'if', 'include', 'import', 'from', 'def', 'in', 'as', 'struct'}


def code_tokens(line):
    """極簡 tokenizer：回傳 [(text, color)]"""
    out = []
    if '//' in line:
        i = line.index('//'); return code_tokens(line[:i]) + [(line[i:], GREY)]
    if line.strip().startswith('#') and 'include' not in line:
        return [(line, GREY)]
    import re
    for m in re.finditer(r'"[^"]*"|<[^>]*>|[A-Za-z_]\w*|\d+|\s+|.', line):
        s = m.group()
        if s.startswith('"') or (s.startswith('<') and s.endswith('>')):
            c = ORANGE
        elif s in KW:
            c = PINK
        elif s.isdigit():
            c = GOLD
        elif re.match(r'[A-Za-z_]', s):
            nxt = line[m.end():m.end() + 1]
            c = CYAN if nxt == '(' else WHITE
        else:
            c = (150, 180, 210)
        out.append((s, c))
    return out


def draw_code(canvas, lines, x, y, t, cps=55, size=24, lh=36, a=1.0, cursor=True):
    d = ImageDraw.Draw(canvas)
    f = font('mono', size)
    cw = f.getlength('M')
    budget = int(max(0, t) * cps)
    for li, ln in enumerate(lines):
        if budget <= 0:
            break
        shown = ln[:budget]
        budget -= len(ln) + 4
        col = 0
        d.text((x - 48, y + li * lh), f'{li + 1:>2}', font=f, fill=mul(GREY, 0.6 * a))
        for tok, c in code_tokens(shown):
            d.text((x + col * cw, y + li * lh), tok, font=f, fill=mul(c, a))
            col += len(tok)
        if budget <= 0 and cursor and int(t * 3) % 2 == 0:
            d.rectangle([x + col * cw + 2, y + li * lh + 4, x + col * cw + cw * 0.8, y + li * lh + size + 4], fill=mul(CYAN, a))


# ============================================================
#                         分鏡
# ============================================================
BOOT = [
    '$ ssh future@haiching-it.edu.tw',
    '[ OK ] Mounting C / Python compilers ......... done',
    '[ OK ] Loading algorithms & data structures .. done',
    '[ OK ] Edge-AI accelerator ................... online',
    '[ OK ] ESP32 / Arduino IoT mesh .............. 64 nodes',
    '[ OK ] Collaborative robot arm ............... calibrated',
    '$ ./launch --trailer 2026',
]


def s_intro(c, t, T):
    d = ImageDraw.Draw(c)
    # 終端機 0.3 ~ 5.2 s
    if t < 5.6:
        k = 1 - ease_io(prog(t, 5.0, 0.5))  # 收合
        a = ease_out(prog(t, 0.2, 0.5))
        cx, cy = W / 2, H / 2 - 20
        hw, hh = 720, 230 * k + 2
        panel(d, [cx - hw, cy - hh, cx + hw, cy + hh], CYAN, a, 'tty1 — haiching-it', c)
        if k > 0.6:
            f = font('mono', 28)
            budget = int(max(0, t - 0.5) * 95)
            for i, ln in enumerate(BOOT):
                if budget <= 0:
                    break
                s = ln[:budget]; budget -= len(ln) + 6
                y = cy - hh + 60 + i * 50
                if s.startswith('[ OK ]'):
                    d.text((cx - hw + 40, y), s[:6], font=f, fill=GREEN)
                    d.text((cx - hw + 40 + f.getlength(s[:6]), y), s[6:], font=f, fill=WHITE)
                else:
                    d.text((cx - hw + 40, y), s, font=f, fill=CYAN)
                if budget <= 0 and int(t * 4) % 2 == 0:
                    x = cx - hw + 40 + f.getlength(s)
                    d.rectangle([x + 4, y + 4, x + 20, y + 32], fill=CYAN)
    # Logo 5.4 ~ 7.5 s
    if t > 5.3:
        a = ease_out(prog(t, 5.3, 0.6))
        text(c, 'OFFICIAL TRAILER · 2026', W / 2, H / 2 - 170, 'num', 26, CYAN, 'c', a, spacing=10, var='SemiBold')
        text(c, '海青工商', W / 2, H / 2 - 95, 'tc', 56, WHITE, 'c', a, spacing=18)
        text(c, '資 訊 科', W / 2, H / 2 + 20, 'tc', 150, WHITE, 'c', a, scale=lerp(1.12, 1.0, a), glow=16, glow_color=CYAN)
        w = 520 * ease_out(prog(t, 5.7, 0.8))
        d.line([(W / 2 - w, H / 2 + 120), (W / 2 + w, H / 2 + 120)], fill=CYAN, width=2)
        text(c, 'DEPARTMENT OF INFORMATION TECHNOLOGY', W / 2, H / 2 + 160, 'num', 26, mul(WHITE, 0.85), 'c',
             ease_out(prog(t, 6.0, 0.6)), spacing=8, var='SemiBold')


def s_title(c, t, T):
    d = ImageDraw.Draw(c)
    cx, cy = W / 2, H / 2 - 10
    # 旋轉六角環
    for k, (r, sp, col) in enumerate([(430, 0.25, CYAN), (470, -0.18, BLUE), (520, 0.1, VIOLET)]):
        a = ease_out(prog(t, 0.05 * k, 0.6)) * 0.6
        pts = [(cx + r * math.cos(t * sp + i * math.pi / 3), cy + r * 0.42 * math.sin(t * sp + i * math.pi / 3)) for i in range(7)]
        d.line(pts, fill=mul(col, a), width=2)
    for i in range(48):
        ang = i / 48 * 2 * math.pi + t * 0.3
        r0, r1 = 560, 575 if i % 4 else 600
        a = 0.5 * ease_out(prog(t, 0.2, 0.8))
        d.line([(cx + r0 * math.cos(ang), cy + r0 * 0.42 * math.sin(ang)), (cx + r1 * math.cos(ang), cy + r1 * 0.42 * math.sin(ang))], fill=mul(CYAN, a), width=2)
    a = ease_out(prog(t, 0, 0.35))
    text(c, '海青工商資訊科  官方宣傳片', cx, cy - 150, 'tc', 34, mul(CYAN, 1), 'c', ease_out(prog(t, 0.3, 0.5)), spacing=8)
    text(c, '攜手築夢·智造未來', cx, cy, 'tc', 150, WHITE, 'c', a, scale=lerp(1.25, 1.0, ease_out(prog(t, 0, 0.9))), glow=18, glow_color=CYAN)
    w = 700 * ease_out(prog(t, 0.3, 0.8))
    d.line([(cx - w, cy + 105), (cx + w, cy + 105)], fill=CYAN, width=3)
    d.line([(cx - w * 0.6, cy - 105), (cx + w * 0.6, cy - 105)], fill=mul(CYAN, 0.6), width=2)
    sub = typed('BUILD DREAMS TOGETHER · ENGINEER THE FUTURE', t - 0.8, 40)
    text(c, sub or ' ', cx, cy + 150, 'num', 30, mul(WHITE, 0.9), 'c', var='SemiBold', spacing=6)


C_CODE = [
    '#include <stdio.h>',
    'int main(void) {',
    '    int dream = 1, future = 0;',
    '    while (dream) {',
    '        future += learn();  // level up',
    '    }',
    '    return future;',
    '}',
]
PY_CODE = [
    'import numpy as np',
    'from edge_ai import Model',
    '',
    'model = Model("yolo-nano")',
    'for frame in camera.stream():',
    '    result = model.detect(frame)',
    '    esp32.send(result.label)',
]


def s_code(c, t, T):
    chapter_tag(c, t, '01', 'AI & 軟體工程', 'AI & SOFTWARE ENGINEERING', CYAN)
    heading(c, t, '核心程式力', 'CORE CODING', CYAN, y=380)
    a = ease_out(prog(t, 0.35, 0.5))
    text(c, 'C', 140, 560, 'num', 150, CYAN, 'l', a, glow=14, var='Bold')
    text(c, '×', 300, 560, 'num', 80, mul(WHITE, 0.6), 'l', a, var='Light')
    text(c, 'Python', 385, 560, 'num', 150, GOLD, 'l', a, glow=14, var='Bold')
    for i, s in enumerate(['程式設計基礎', '演算法思維', 'AI 應用開發']):
        aa = ease_out(prog(t, 0.8 + i * 0.15, 0.4))
        d = ImageDraw.Draw(c)
        d.rounded_rectangle([140 + i * 230, 690, 350 + i * 230, 742], 26, outline=mul(CYAN, aa), width=2)
        text(c, s, 245 + i * 230, 716, 'tc', 26, WHITE, 'c', aa)
    d = ImageDraw.Draw(c)
    s1 = ease_out(prog(t, 0.1, 0.5)); s2 = ease_out(prog(t, 0.5, 0.5))
    x0 = 1020 + (1 - s1) * 200
    panel(d, [x0, 250, x0 + 780, 580], CYAN, s1, 'main.c', c)
    draw_code(c, C_CODE, x0 + 70, 300, t - 0.3, 110, 22, 34, s1, cursor=t < 2.2)
    x0 = 1080 + (1 - s2) * 200
    panel(d, [x0, 610, x0 + 780, 900], GOLD, s2, 'edge_ai.py', c)
    draw_code(c, PY_CODE, x0 + 70, 660, t - 1.0, 110, 22, 34, s2)


BST_VALS = [50, 30, 70, 20, 40, 60, 80, 35, 65, 90]


def _bst_layout():
    """依插入順序建 BST，子節點水平偏移隨深度遞減。"""
    OFF = [230, 120, 62]
    pos, parent, child = {}, {}, {}
    root = BST_VALS[0]; pos[root] = (0, 0)
    for v in BST_VALS[1:]:
        n = root
        while True:
            side = 'L' if v < n else 'R'
            if (n, side) in child:
                n = child[(n, side)]; continue
            child[(n, side)] = v; parent[v] = n
            px, depth = pos[n]
            pos[v] = (px + (-1 if side == 'L' else 1) * OFF[depth], depth + 1)
            break
    return pos, parent


BST_POS, BST_PAR = _bst_layout()


def _bubble_states():
    arr = [7, 3, 11, 5, 9, 2, 12, 6, 10, 1, 8, 4]
    st = [(arr[:], -1)]
    a = arr[:]
    for i in range(len(a)):
        for j in range(len(a) - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                st.append((a[:], j))
    st.append((a[:], -1))
    return st


BUBBLE = _bubble_states()


def s_algo(c, t, T):
    chapter_tag(c, t, '01', 'AI & 軟體工程', 'AI & SOFTWARE ENGINEERING', CYAN)
    heading(c, t, '演算法 × 資料結構', 'ALGORITHMS & DATA STRUCTURES', CYAN, y=330)
    d = ImageDraw.Draw(c)
    # BST
    ox, oy = 520, 480
    for i, v in enumerate(BST_VALS):
        at = 0.3 + i * 0.22
        a = ease_out(prog(t, at, 0.3))
        if a <= 0:
            continue
        x, y = ox + BST_POS[v][0], oy + BST_POS[v][1] * 120
        if v in BST_PAR:
            p = BST_PAR[v]
            px, py = ox + BST_POS[p][0], oy + BST_POS[p][1] * 120
            ex, ey = lerp(px, x, a), lerp(py, y, a)
            d.line([(px, py), (ex, ey)], fill=mul(CYAN, 0.7), width=3)
        r = 34 * back_out(prog(t, at, 0.35))
        hot = 0 <= t - at < 0.4
        d.ellipse([x - r, y - r, x + r, y + r], fill=mul((10, 30, 60), 1), outline=GOLD if hot else CYAN, width=3)
        if r > 20:
            text(c, str(v), x, y, 'num', 28, WHITE, 'c', a)
    text(c, 'Binary Search Tree · insert()', ox, 950, 'mono', 24, mul(GREY, 1.3), 'c', ease_out(prog(t, 0.5, 0.5)))
    # Bubble sort bars
    k = min(len(BUBBLE) - 1, int(prog(t, 0.5, 2.9) * (len(BUBBLE) - 1)))
    arr, j = BUBBLE[k]
    bx, by = 1080, 900
    ap = ease_out(prog(t, 0.2, 0.5))
    for i, v in enumerate(arr):
        h = v * 38 * ap
        col = GOLD if i in (j, j + 1) else (GREEN if k == len(BUBBLE) - 1 else CYAN)
        d.rectangle([bx + i * 60, by - h, bx + i * 60 + 44, by], fill=mul(col, 0.85), outline=col)
    text(c, 'sort(arr)  →  O(n²) → O(n log n)', bx + 360, 950, 'mono', 24, mul(GREY, 1.3), 'c', ap)
    done = k == len(BUBBLE) - 1
    if done:
        text(c, 'SORTED ✓', bx + 360, 370, 'num', 34, GREEN, 'c', glow=8, var='Bold')


NN_LAYERS = [4, 6, 6, 3]


def s_ai_iot(c, t, T):
    chapter_tag(c, t, '01', 'AI & 軟體工程', 'AI & SOFTWARE ENGINEERING', CYAN)
    heading(c, t, 'AI 邊緣運算 × 智慧物聯網', 'EDGE AI · ESP32 / ARDUINO IoT', CYAN, y=330)
    d = ImageDraw.Draw(c)
    # 神經網路
    ox, oy, gx = 200, 700, 170
    nodes = []
    for li, n in enumerate(NN_LAYERS):
        col = []
        for k in range(n):
            col.append((ox + li * gx, oy + (k - (n - 1) / 2) * 62))
        nodes.append(col)
    ap = ease_out(prog(t, 0.2, 0.6))
    for li in range(len(nodes) - 1):
        for a_ in nodes[li]:
            for b_ in nodes[li + 1]:
                d.line([a_, b_], fill=mul(BLUE, 0.35 * ap), width=1)
    # 訊號脈衝
    for p in range(26):
        ph = (t * 1.3 + p * 0.137) % 1.0
        li = int(ph * 3)
        f = ph * 3 - li
        a_ = nodes[li][(p * 7) % len(nodes[li])]
        b_ = nodes[li + 1][(p * 5 + li) % len(nodes[li + 1])]
        x, y = lerp(a_[0], b_[0], f), lerp(a_[1], b_[1], f)
        d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=mul(CYAN, ap))
    for li, col in enumerate(nodes):
        for k, (x, y) in enumerate(col):
            pulse = 0.5 + 0.5 * math.sin(t * 6 + li + k)
            d.ellipse([x - 16, y - 16, x + 16, y + 16], fill=mul((10, 30, 60), ap), outline=mul(CYAN if li < 3 else GOLD, ap * (0.6 + 0.4 * pulse)), width=3)
    labels = ['person 0.97', 'robot 0.93', 'chip 0.88']
    for k, (x, y) in enumerate(nodes[-1]):
        text(c, labels[k], x + 36, y, 'mono', 20, GOLD, 'l', ap)
    text(c, 'EDGE AI INFERENCE  ·  12 ms', ox + 255, 960, 'mono', 22, mul(GREY, 1.3), 'c', ap)
    # ESP32 晶片
    cx, cy = 1400, 660
    s = ease_out(prog(t, 0.5, 0.6))
    cw, ch = 170 * s, 130 * s
    for side in range(12):
        yy = cy - 110 + side * 20
        if s > 0.2:
            d.line([(cx - cw - 20, yy), (cx - cw, yy)], fill=mul(SILVER, s), width=4)
            d.line([(cx + cw, yy), (cx + cw + 20, yy)], fill=mul(SILVER, s), width=4)
    d.rounded_rectangle([cx - cw, cy - ch, cx + cw, cy + ch], 12, fill=(16, 22, 34), outline=mul(CYAN, s), width=3)
    text(c, 'ESP32', cx, cy - 16, 'num', 54, WHITE, 'c', s, var='Bold')
    text(c, 'Wi-Fi · BLE · Dual-Core', cx, cy + 40, 'num', 20, mul(CYAN, 0.9), 'c', s, var='SemiBold')
    sensors = [('TEMP', -330, -250), ('CAM', 330, -250), ('SERVO', -330, 250), ('LED', 330, 250), ('ARDUINO', 0, -300)]
    for i, (lab, dx, dy) in enumerate(sensors):
        a = ease_out(prog(t, 0.9 + i * 0.12, 0.4))
        if a <= 0:
            continue
        sx, sy = cx + dx, cy + dy
        # 虛線連線 + 封包
        n = 14
        for q in range(n):
            if q % 2 == 0:
                d.line([(lerp(cx, sx, q / n), lerp(cy, sy, q / n)), (lerp(cx, sx, (q + 1) / n), lerp(cy, sy, (q + 1) / n))], fill=mul(BLUE, a * 0.8), width=2)
        f = (t * 0.9 + i * 0.3) % 1.0
        px, py = lerp(cx, sx, f), lerp(cy, sy, f)
        d.rectangle([px - 6, py - 6, px + 6, py + 6], fill=mul(GREEN, a))
        d.rounded_rectangle([sx - 80, sy - 32, sx + 80, sy + 32], 10, fill=(10, 26, 50), outline=mul(GREEN, a), width=2)
        text(c, lab, sx, sy, 'num', 26, WHITE, 'c', a, var='SemiBold')
    # 無線電波
    for k in range(3):
        r = ((t * 120 + k * 60) % 180) + 40
        aa = (1 - (r - 40) / 180) * s
        d.arc([cx - r, cy - ch - 40 - r, cx + r, cy - ch - 40 + r], 220, 320, fill=mul(CYAN, aa), width=3)


ARM_BASE = (1300, 900)
ARM_L = (260, 220, 70)


def _ik(x, y):
    """2 連桿 IK（肘向上），第 3 節保持垂直向下。"""
    bx, by = ARM_BASE
    wx, wy = x, y - ARM_L[2]  # 腕點
    dx, dy = wx - bx, by - wy
    l1, l2 = ARM_L[0], ARM_L[1]
    D = clamp((dx * dx + dy * dy - l1 * l1 - l2 * l2) / (2 * l1 * l2), -1, 1)
    q2 = -math.acos(D)
    q1 = math.atan2(dy, dx) - math.atan2(l2 * math.sin(q2), l1 + l2 * math.cos(q2))
    return q1, q2


ARM_KEYS = [  # (time, x, y, grip_closed, cmd_index)
    (0.0, 1480, 640, 0, 0), (0.6, 1060, 820, 0, 0), (0.9, 1060, 820, 1, 1),
    (1.6, 1300, 560, 1, 2), (2.3, 1560, 820, 1, 2), (2.6, 1560, 820, 0, 3), (3.4, 1480, 640, 0, 4), (9, 1480, 640, 0, 4)]
ARM_CMDS = ['MOVJ  P[1]  V=60%  ; approach', 'GRIP  CLOSE        ; pick', 'MOVL  P[2]  V=250mm/s',
            'GRIP  OPEN         ; place', 'MOVJ  HOME         ; done']


def arm_state(t):
    for k in range(len(ARM_KEYS) - 1):
        t0, x0, y0, g0, c0 = ARM_KEYS[k]; t1, x1, y1, g1, c1 = ARM_KEYS[k + 1]
        if t0 <= t < t1:
            f = ease_io((t - t0) / (t1 - t0))
            return lerp(x0, x1, f), lerp(y0, y1, f), g0 if f < 0.5 else g1, c1 if f > 0.05 else c0
    return ARM_KEYS[-1][1], ARM_KEYS[-1][2], 0, 4


def s_robot(c, t, T):
    chapter_tag(c, t, '01', 'AI & 軟體工程', 'AI & SOFTWARE ENGINEERING', CYAN)
    heading(c, t, '協作型機械手臂程式控制', 'COLLABORATIVE ROBOT ARM PROGRAMMING', CYAN, y=330)
    d = ImageDraw.Draw(c)
    lt = max(0, t - 0.3)
    x, y, g, ci = arm_state(lt)
    q1, q2 = _ik(x, y)
    bx, by = ARM_BASE
    j1 = (bx + ARM_L[0] * math.cos(q1), by - ARM_L[0] * math.sin(q1))
    j2 = (j1[0] + ARM_L[1] * math.cos(q1 + q2), j1[1] - ARM_L[1] * math.sin(q1 + q2))
    tip = (j2[0], j2[1] + ARM_L[2])
    a = ease_out(prog(t, 0.1, 0.5))
    # 工作台
    d.rectangle([900, 900, 1760, 918], fill=mul((30, 50, 80), a))
    for k in range(10):
        d.line([(920 + k * 86, 918), (900 + k * 86, 960)], fill=mul(GREY, 0.3 * a), width=2)
    # 方塊
    if lt < 0.9:
        bpos = (1060, 876)
    elif lt < 2.6:
        bpos = (tip[0], tip[1] + 22)
    else:
        bpos = (1560, 876)
    d.rectangle([bpos[0] - 24, bpos[1] - 24, bpos[0] + 24, bpos[1] + 24], fill=mul(GOLD, a), outline=WHITE)
    d.rectangle([1520, 900 - 4, 1600, 900], fill=mul(GREEN, a))
    text(c, 'P[2]', 1560, 935, 'mono', 18, GREEN, 'c', a)
    text(c, 'P[1]', 1060, 935, 'mono', 18, CYAN, 'c', a)
    # 手臂
    d.rounded_rectangle([bx - 70, by - 20, bx + 70, by + 18], 8, fill=mul((40, 60, 90), a))
    for p0, p1, w in [((bx, by), j1, 34), (j1, j2, 26), (j2, (tip[0], tip[1] - 14), 16)]:
        d.line([p0, p1], fill=mul((200, 215, 235), a), width=w)
        d.line([p0, p1], fill=mul(CYAN, a), width=4)
    for p, r in [((bx, by), 30), (j1, 24), (j2, 18)]:
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=mul((20, 40, 70), a), outline=mul(CYAN, a), width=4)
    gap = 12 if g else 30
    for s_ in (-1, 1):
        d.line([(tip[0] + s_ * gap, tip[1] - 14), (tip[0] + s_ * gap, tip[1] + 10)], fill=mul(GOLD, a), width=8)
    d.line([(tip[0] - 32, tip[1] - 14), (tip[0] + 32, tip[1] - 14)], fill=mul(GOLD, a), width=6)
    # 角度讀數
    degs = [math.degrees(q1), math.degrees(q2), -math.degrees(q1 + q2) - 90]
    for k, v in enumerate(degs):
        text(c, f'J{k + 1}  {v:+07.1f}°', 1800, 420 + k * 44, 'mono', 26, CYAN, 'r', a)
    text(c, f'TCP  X{x - bx:+05.0f}  Z{by - y:+05.0f}', 1800, 420 + 3 * 44, 'mono', 26, GOLD, 'r', a)
    # 程式清單
    d.rectangle([140, 480, 760, 820], fill=mul((10, 22, 44), a), outline=mul(CYAN, 0.6 * a), width=2)
    text(c, 'cobot_task.prg', 170, 510, 'mono', 20, GREY, 'l', a)
    for k, cmd in enumerate(ARM_CMDS):
        yy = 560 + k * 52
        on = k == ci and lt > 0
        if on:
            d.rectangle([150, yy - 20, 750, yy + 20], fill=mul(BLUE, 0.45))
        text(c, f'{k + 1:02d}  ' + cmd, 170, yy, 'mono', 24, WHITE if on else mul(GREY, 1.2), 'l', a)


def counter(c, val, x, y, size, color, suffix='', anchor='l', a=1.0, glow=16):
    text(c, f'{val}{suffix}', x, y, 'num', size, color, anchor, a, glow=glow, var='Bold')


def s_worldskills(c, t, T):
    chapter_tag(c, t, '02', '冠軍搖籃', 'THE CRADLE OF CHAMPIONS', GOLD)
    d = ImageDraw.Draw(c)
    # 旋轉線框地球
    cx, cy, R = 1380, 600, 300
    a = ease_out(prog(t, 0.1, 0.6))
    rot = t * 0.5
    tilt = 0.35
    def proj(lat, lon):
        x = math.cos(lat) * math.sin(lon + rot); z = math.cos(lat) * math.cos(lon + rot); y = math.sin(lat)
        y2 = y * math.cos(tilt) - z * math.sin(tilt); z2 = y * math.sin(tilt) + z * math.cos(tilt)
        return cx + x * R * a, cy - y2 * R * a, z2
    for lat_d in range(-60, 90, 30):
        lat = math.radians(lat_d)
        pts = [proj(lat, math.radians(l)) for l in range(0, 361, 8)]
        for p, q in zip(pts, pts[1:]):
            d.line([p[:2], q[:2]], fill=mul(GOLD, 0.55 if p[2] > 0 else 0.15), width=2)
    for lon_d in range(0, 180, 20):
        lon = math.radians(lon_d)
        pts = [proj(math.radians(la), lon) for la in range(-90, 271, 8)]
        for p, q in zip(pts, pts[1:]):
            d.line([p[:2], q[:2]], fill=mul(GOLD, 0.5 if p[2] > 0 else 0.12), width=2)
    cities = [(23.5, 121), (46.9, 7.4), (31.2, 121.5), (45.8, 4.8), (55.8, 49.1), (24.5, 54.4), (48.2, 16.4), (37.5, 127)]
    for i, (la, lo) in enumerate(cities):
        x, y, z = proj(math.radians(la), math.radians(lo))
        if z > 0:
            r = 7 + 3 * math.sin(t * 5 + i)
            d.ellipse([x - r, y - r, x + r, y + r], fill=WHITE if i == 0 else GOLD)
            if i == 0:
                rr = 20 + (t * 40) % 40
                d.ellipse([x - rr, y - rr, x + rr, y + rr], outline=mul(GOLD, 1 - (rr - 20) / 40), width=2)
    d.ellipse([cx - R * a - 16, cy - R * a - 16, cx + R * a + 16, cy + R * a + 16], outline=mul(GOLD, 0.35), width=2)
    # 計數
    v = int(round(10 * ease_out(prog(t, 0.25, 1.4))))
    ca = ease_out(prog(t, 0.2, 0.3))
    counter(c, v, 140, 540, 260, GOLD, '', 'l', ca, glow=22)
    text(c, '位', 160 + font('num', 260).getlength(str(v)), 610, 'tc', 72, WHITE, 'l', ca)
    text(c, 'WorldSkills 國際技能競賽', 150, 740, 'tc', 50, WHITE, 'l', ease_out(prog(t, 0.6, 0.5)))
    text(c, '正取國手 · 代表台灣前進世界技能最高殿堂', 150, 810, 'tc', 32, mul(GOLD, 1), 'l', ease_out(prog(t, 0.8, 0.5)))
    text(c, 'WORLDSKILLS INTERNATIONAL COMPETITORS', 150, 870, 'num', 22, mul(WHITE, 0.7), 'l', ease_out(prog(t, 1.0, 0.5)), spacing=4, var='SemiBold')


def medal(d, c, x, y, r, col, label=None, a=1.0):
    d.polygon([(x - r * 0.6, y - r * 2.1), (x - r * 0.05, y - r * 2.1), (x + r * 0.25, y - r * 0.7), (x - r * 0.3, y - r * 0.7)], fill=mul(BLUE, a))
    d.polygon([(x + r * 0.6, y - r * 2.1), (x + r * 0.05, y - r * 2.1), (x - r * 0.25, y - r * 0.7), (x + r * 0.3, y - r * 0.7)], fill=mul(PINK, a * 0.9))
    d.ellipse([x - r, y - r, x + r, y + r], fill=mul(col, a), outline=mul(WHITE, a), width=max(2, int(r / 12)))
    d.ellipse([x - r * 0.72, y - r * 0.72, x + r * 0.72, y + r * 0.72], outline=mul(tuple(int(v * 0.7) for v in col), a), width=max(2, int(r / 10)))
    if label:
        text(c, label, x, y, 'num', int(r * 0.8), (40, 30, 10), 'c', a, var='Bold')


def s_gold12(c, t, T):
    chapter_tag(c, t, '02', '冠軍搖籃', 'THE CRADLE OF CHAMPIONS', GOLD)
    d = ImageDraw.Draw(c)
    v = int(round(12 * ease_out(prog(t, 0.25, 1.6))))
    ca = ease_out(prog(t, 0.15, 0.3))
    counter(c, v, 140, 560, 260, GOLD, '', 'l', ca, glow=22)
    text(c, '面', 160 + font('num', 260).getlength(str(v)), 630, 'tc', 72, WHITE, 'l', ca)
    text(c, '全國技能競賽 金牌', 150, 760, 'tc', 56, WHITE, 'l', ease_out(prog(t, 0.5, 0.5)))
    text(c, '12 NATIONAL GOLD MEDALS', 150, 830, 'num', 24, mul(GOLD, 1), 'l', ease_out(prog(t, 0.7, 0.5)), spacing=5, var='SemiBold')
    for i in range(12):
        at = 0.3 + i * 0.13
        s = back_out(prog(t, at, 0.35))
        if s <= 0:
            continue
        col, row = i % 4, i // 4
        x, y = 1000 + col * 190, 420 + row * 210
        medal(d, c, x, y + 30, 58 * s, GOLD, 'G' if s > 0.6 else None, clamp(s))


def s_56th(c, t, T):
    chapter_tag(c, t, '02', '冠軍搖籃', 'THE CRADLE OF CHAMPIONS', GOLD)
    d = ImageDraw.Draw(c)
    a = ease_out(prog(t, 0.1, 0.5))
    text(c, '第 56 屆全國技能競賽', W / 2, 310, 'tc', 70, WHITE, 'c', a, glow=10, glow_color=GOLD)
    text(c, '金 · 銀 · 銅  全包辦', W / 2, 400, 'tc', 50, GOLD, 'c', ease_out(prog(t, 0.3, 0.5)), spacing=6)
    base = 945
    for i, (col, lab, h, pl) in enumerate([(SILVER, '銀', 200, 2), (GOLD, '金', 265, 1), (BRONZE, '銅', 150, 3)]):
        x = W / 2 + (i - 1) * 300
        hh = h * ease_out(prog(t, 0.3 + i * 0.1, 0.7))
        d.rectangle([x - 120, base - hh, x + 120, base], fill=mul(tuple(int(v * 0.25) for v in col), 1), outline=mul(col, 0.9), width=3)
        if hh > 60:
            text(c, str(pl), x, base - hh + 50, 'num', 60, col, 'c', clamp(hh / h), var='Bold')
        md = prog(t, 0.9 + i * 0.2, 0.45)
        if md > 0:
            y = lerp(base - h - 400, base - h - 70, ease_out(md))
            medal(d, c, x, y, 56 * back_out(md), col, None, clamp(md * 2))
            text(c, lab, x, y, 'tc', 44, (40, 30, 10), 'c', clamp(md * 2))
    text(c, '南區分區賽 · 資通訊網路建置 ╳ 資訊與網路技術  雙職類前三名包辦', W / 2, 995, 'tc', 30, WHITE, 'c', ease_out(prog(t, 1.6, 0.5)))
    # 全國總決賽徽章
    ba = ease_out(prog(t, 2.0, 0.5))
    d.rounded_rectangle([1470, 520, 1800, 640], 16, fill=mul((50, 30, 10), ba), outline=mul(BRONZE, ba), width=3)
    text(c, '全國總決賽', 1635, 555, 'tc', 30, WHITE, 'c', ba)
    text(c, '勇奪銅牌 ★', 1635, 603, 'tc', 34, BRONZE, 'c', ba)
    d.rounded_rectangle([120, 520, 450, 640], 16, fill=mul((10, 30, 50), ba), outline=mul(GOLD, ba), width=3)
    text(c, '技優甄審加分', 285, 555, 'tc', 30, WHITE, 'c', ba)
    text(c, '最高 30%', 285, 603, 'tc', 34, GOLD, 'c', ba)


TIMELINE = [('2017', '阿布達比', '世界優勝'), ('2019', '喀山', '正取國手'), ('2022', '特別賽', '世界銀牌×2 · 銅牌'),
            ('2024', '法國里昂', '世界優勝×2'), ('2025', '上海', '正取國手×2')]


def s_timeline(c, t, T):
    chapter_tag(c, t, '02', '冠軍搖籃', 'THE CRADLE OF CHAMPIONS', GOLD)
    heading(c, t, '國際技能競賽 · 榮耀足跡', 'WORLDSKILLS HALL OF FAME', GOLD, y=330)
    d = ImageDraw.Draw(c)
    y = 660
    x0, x1 = 200, 1720
    p = ease_io(prog(t, 0.2, 2.2))
    d.line([(x0, y), (x0 + (x1 - x0) * p, y)], fill=GOLD, width=4)
    d.ellipse([x0 + (x1 - x0) * p - 9, y - 9, x0 + (x1 - x0) * p + 9, y + 9], fill=WHITE)
    for i, (yr, city, res) in enumerate(TIMELINE):
        x = x0 + 80 + i * (x1 - x0 - 160) / 4
        a = ease_out(prog(t, 0.2 + 2.2 * (x - x0) / (x1 - x0), 0.35))
        if a <= 0:
            continue
        up = i % 2 == 0
        r = 16 * back_out(a)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(30, 20, 5), outline=GOLD, width=4)
        yy = y - 120 if up else y + 120
        d.line([(x, y + (-r if up else r)), (x, yy + (50 if up else -50))], fill=mul(GOLD, a * 0.6), width=2)
        text(c, yr, x, yy - (10 if up else -10), 'num', 64, GOLD, 'c', a, glow=10, var='Bold')
        text(c, city, x, yy + (-70 if up else 70) - (0 if up else 0), 'tc', 28, mul(WHITE, 0.8), 'c', a)
        text(c, res, x, y + (60 if up else -60), 'tc', 28, WHITE, 'c', a)
    text(c, '國手 100% 錄取頂大', W / 2, 950, 'tc', 40, GOLD, 'c', ease_out(prog(t, 2.6, 0.5)), glow=8)


def s_rate(c, t, T):
    chapter_tag(c, t, '03', '升學與未來', 'ACADEMIC TRIUMPHS & FUTURE PATHWAYS', VIOLET)
    d = ImageDraw.Draw(c)
    cx, cy, R = 1320, 620, 260
    p = ease_out(prog(t, 0.25, 1.6))
    d.ellipse([cx - R, cy - R, cx + R, cy + R], outline=mul(VIOLET, 0.25), width=28)
    d.arc([cx - R, cy - R, cx + R, cy + R], -90, -90 + 360 * 0.34 * p, fill=CYAN, width=28)
    for k in range(60):
        ang = math.radians(k * 6 - 90)
        r0, r1 = R + 30, R + (48 if k % 5 == 0 else 40)
        d.line([(cx + r0 * math.cos(ang), cy + r0 * math.sin(ang)), (cx + r1 * math.cos(ang), cy + r1 * math.sin(ang))], fill=mul(CYAN, 0.5), width=2)
    v = int(round(34 * p))
    counter(c, v, cx, cy - 10, 170, WHITE, '%', 'c', 1, glow=18)
    text(c, '國立科大錄取率', cx, cy + 110, 'tc', 36, CYAN, 'c', ease_out(prog(t, 0.6, 0.4)))
    a = ease_out(prog(t, 0.3, 0.5))
    text(c, '約', 140, 470, 'tc', 60, WHITE, 'l', a)
    text(c, '34%', 140, 600, 'num', 180, CYAN, 'l', a, glow=20, var='Bold')
    text(c, '每 3 位同學 就有 1 位上國立', 150, 750, 'tc', 44, WHITE, 'l', ease_out(prog(t, 0.8, 0.5)))
    text(c, 'NATIONAL UNIVERSITY ADMISSION RATE', 150, 815, 'num', 22, mul(VIOLET, 1.2), 'l', ease_out(prog(t, 1.0, 0.5)), spacing=4, var='SemiBold')


UNIS = [('國立臺灣科技大學', 'Taiwan Tech · NTUST', '技優保送 · 頂大第一志願'),
        ('國立雲林科技大學', 'YunTech', '智慧機器人技優專班'),
        ('國立高雄科技大學', 'NKUST', '強勢錄取 10 人')]
MORE = ['勤益科大', '屏東大學', '虎尾科大', '屏東科大', '臺中科大', '臺東專校']


def s_unis(c, t, T):
    chapter_tag(c, t, '03', '升學與未來', 'ACADEMIC TRIUMPHS & FUTURE PATHWAYS', VIOLET)
    d = ImageDraw.Draw(c)
    v = int(round(26 * ease_out(prog(t, 0.25, 1.4))))
    ca = ease_out(prog(t, 0.15, 0.3))
    counter(c, v, 140, 500, 230, CYAN, '', 'l', ca, glow=20)
    text(c, '人次', 160 + font('num', 230).getlength(str(v)), 570, 'tc', 64, WHITE, 'l', ca)
    text(c, '國立大專院校錄取', 150, 690, 'tc', 50, WHITE, 'l', ease_out(prog(t, 0.5, 0.5)))
    text(c, 'ADMITTED TO NATIONAL UNIVERSITIES', 150, 755, 'num', 22, mul(VIOLET, 1.2), 'l', ease_out(prog(t, 0.7, 0.5)), spacing=4, var='SemiBold')
    for i, (zh, en, note) in enumerate(UNIS):
        a = ease_out(prog(t, 0.3 + i * 0.25, 0.5))
        x = 900 + (1 - a) * 300
        y = 290 + i * 180
        d.rounded_rectangle([x, y, x + 880, y + 150], 18, fill=mul((14, 22, 50), a), outline=mul(CYAN if i == 0 else VIOLET, a), width=3)
        d.rectangle([x, y + 20, x + 8, y + 130], fill=mul(CYAN, a))
        text(c, zh, x + 50, y + 50, 'tc', 46, WHITE, 'l', a)
        text(c, en, x + 50, y + 108, 'num', 26, mul(CYAN, 1), 'l', a, var='SemiBold')
        text(c, note, x + 850, y + 108, 'tc', 28, GOLD, 'r', a)
    for i, s in enumerate(MORE):
        a = ease_out(prog(t, 1.4 + i * 0.1, 0.4))
        x = 150 + i * 280
        d.rounded_rectangle([x, 890, x + 250, 950], 30, outline=mul(VIOLET, a), width=2)
        text(c, s, x + 125, 920, 'tc', 28, WHITE, 'c', a)


CAREERS = [('AI 軟體工程師', CYAN), ('半導體韌體研發', GOLD), ('網路資安工程師', GREEN), ('物聯網自動化', VIOLET), ('全端 / 雲端開發', PINK)]


def s_career(c, t, T):
    chapter_tag(c, t, '03', '升學與未來', 'ACADEMIC TRIUMPHS & FUTURE PATHWAYS', VIOLET)
    heading(c, t, 'AI × 軟體開發  黃金前景', 'GOLDEN CAREER PROSPECTS', CYAN, y=330)
    d = ImageDraw.Draw(c)
    # 上升曲線圖
    x0, y0, x1, y1 = 140, 920, 1100, 480
    a = ease_out(prog(t, 0.2, 0.5))
    for k in range(6):
        yy = y0 - k * (y0 - y1) / 5
        d.line([(x0, yy), (x1, yy)], fill=mul(GREY, 0.2 * a), width=1)
    p = ease_io(prog(t, 0.3, 2.2))
    pts = []
    for i in range(0, 101):
        f = i / 100
        if f > p:
            break
        yv = f ** 1.8 * 0.92 + 0.04 * math.sin(f * 14) * (1 - f)
        pts.append((x0 + f * (x1 - x0), y0 - yv * (y0 - y1)))
    if len(pts) > 1:
        fill = pts + [(pts[-1][0], y0), (x0, y0)]
        d.polygon(fill, fill=(12, 40, 70))
        d.line(pts, fill=CYAN, width=6)
        ex, ey = pts[-1]
        d.ellipse([ex - 12, ey - 12, ex + 12, ey + 12], fill=WHITE)
    for k, yr in enumerate(['2020', '2022', '2024', '2026', '2028', '2030']):
        text(c, yr, x0 + k * (x1 - x0) / 5, y0 + 30, 'num', 22, mul(GREY, 1.2), 'c', a, var='SemiBold')
    text(c, 'AI TALENT DEMAND  +', x0 + 10, y1 - 20, 'num', 24, CYAN, 'l', a, var='SemiBold', spacing=3)
    for i, (s, col) in enumerate(CAREERS):
        at = 0.8 + i * 0.3
        s_ = back_out(prog(t, at, 0.4))
        if s_ <= 0:
            continue
        x, y = 1470, 450 + i * 105
        aa = clamp(s_)
        d.rounded_rectangle([x - 280 * s_, y - 40, x + 280 * s_, y + 40], 40, fill=mul(tuple(int(v * 0.2) for v in col), aa), outline=mul(col, aa), width=3)
        text(c, s, x, y, 'tc', 38, WHITE, 'c', aa)
    text(c, '學長姐遍佈半導體、軟體與通訊頂尖大廠', W / 2, 1000, 'tc', 34, GOLD, 'c', ease_out(prog(t, 2.8, 0.5)))


def s_outro(c, t, T):
    d = ImageDraw.Draw(c)
    cx, cy = W / 2, H / 2 - 40
    for k in range(3):
        r = 380 + k * 70 + math.sin(t * 1.5 + k) * 8
        a = ease_out(prog(t, 0.1 * k, 0.8)) * (0.45 - k * 0.1)
        d.arc([cx - r, cy - r * 0.42, cx + r, cy + r * 0.42], (t * 30 * (1 if k % 2 else -1)) % 360,
              (t * 30 * (1 if k % 2 else -1)) % 360 + 250, fill=mul([CYAN, BLUE, VIOLET][k], a), width=3)
    a = ease_out(prog(t, 0, 0.5))
    text(c, '攜手築夢·智造未來', cx, cy - 20, 'tc', 140, WHITE, 'c', a, scale=lerp(1.15, 1.0, ease_out(prog(t, 0, 1.2))), glow=18, glow_color=CYAN)
    text(c, '海青工商  資訊科', cx, cy + 115, 'tc', 56, CYAN, 'c', ease_out(prog(t, 0.4, 0.5)), spacing=10)
    text(c, '有理想 · 有目標 · 不斷進步 · 追求最好還要更好', cx, cy + 205, 'tc', 34, mul(WHITE, 0.9), 'c', ease_out(prog(t, 0.9, 0.6)))
    text(c, 'HAICHING INDUSTRIAL HIGH SCHOOL · DEPARTMENT OF INFORMATION TECHNOLOGY', cx, cy + 275, 'num', 22,
         mul(GOLD, 1), 'c', ease_out(prog(t, 1.3, 0.6)), spacing=4, var='SemiBold')
    w = 640 * ease_out(prog(t, 0.3, 0.8))
    d.line([(cx - w, cy + 70), (cx + w, cy + 70)], fill=CYAN, width=3)


# (start_bar, end_bar, fn, accent, chapter label)
SCENES = [
    (0, 4, s_intro, CYAN, 'BOOT'),
    (4, 6, s_title, CYAN, 'TITLE'),
    (6, 8, s_code, CYAN, '01 / AI & SOFTWARE'),
    (8, 10, s_algo, CYAN, '01 / AI & SOFTWARE'),
    (10, 12, s_ai_iot, CYAN, '01 / AI & SOFTWARE'),
    (12, 14, s_robot, CYAN, '01 / AI & SOFTWARE'),
    (14, 16, s_worldskills, GOLD, '02 / CHAMPIONS'),
    (16, 18, s_gold12, GOLD, '02 / CHAMPIONS'),
    (18, 20, s_56th, GOLD, '02 / CHAMPIONS'),
    (20, 22, s_timeline, GOLD, '02 / CHAMPIONS'),
    (22, 24, s_rate, VIOLET, '03 / FUTURE PATHWAYS'),
    (24, 26, s_unis, VIOLET, '03 / FUTURE PATHWAYS'),
    (26, 29, s_career, VIOLET, '03 / FUTURE PATHWAYS'),
    (29, 32, s_outro, CYAN, 'HAICHING IT'),
]
IMPACTS = [4 * BAR, 14 * BAR, 22 * BAR, 29 * BAR]
CUTS = [s[0] * BAR for s in SCENES[1:]]


def render(t):
    for sb, eb, fn, acc, lab in SCENES:
        if sb * BAR <= t < eb * BAR or eb == 32:
            break
    t0 = sb * BAR
    lt = t - t0
    grid_a = clamp(t / 3.5) if fn is s_intro else 1.0
    code_a = 0.0 if fn in (s_intro, s_title, s_outro) else 0.5
    c = background(t, acc, grid_a, code_a)
    fn(c, lt, (eb - sb) * BAR)
    hud(c, t, lab, acc)

    arr = np.asarray(c).astype(np.float32)
    # 衝擊閃光
    for it in IMPACTS:
        if 0 <= t - it < 0.5:
            k = (1 - (t - it) / 0.5) ** 2
            arr = arr + (255 - arr) * k * 0.85
    # 轉場故障 + 色差
    g = max([1 - abs(t - ct) / 0.12 for ct in CUTS] + [0])
    if g > 0:
        rng = np.random.default_rng(int(t * 1000))
        for _ in range(8):
            y0 = rng.integers(0, H - 60); h = rng.integers(8, 60)
            arr[y0:y0 + h] = np.roll(arr[y0:y0 + h], int(rng.integers(-80, 80) * g), axis=1)
        s = int(14 * g)
        arr[..., 0] = np.roll(arr[..., 0], s, axis=1)
        arr[..., 2] = np.roll(arr[..., 2], -s, axis=1)
    arr *= POST
    # 開頭淡入 / 結尾淡出
    fade = clamp(t / 0.4) * clamp((DUR - t) / 1.2)
    arr *= fade
    return arr.clip(0, 255).astype(np.uint8)


# ============================================================
def render_part(k, n, path):
    from moviepy import VideoClip
    total = int(DUR * FPS)
    f0, f1 = total * k // n, total * (k + 1) // n
    t0 = f0 / FPS
    clip = VideoClip(lambda t: render(t0 + t), duration=(f1 - f0) / FPS)
    clip.write_videofile(path, fps=FPS, codec='libx264', audio=False, preset='medium',
                         ffmpeg_params=['-crf', '16', '-pix_fmt', 'yuv420p'], logger=None)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--still', type=float)
    ap.add_argument('--part', type=int)
    ap.add_argument('--parts', type=int, default=4)
    args = ap.parse_args()
    if args.still is not None:
        p = os.path.join(HERE, f'still_{args.still:05.2f}.png')
        Image.fromarray(render(args.still)).save(p); print(p); return
    tmp = os.path.join(HERE, 'parts'); os.makedirs(tmp, exist_ok=True)
    if args.part is not None:
        render_part(args.part, args.parts, os.path.join(tmp, f'part{args.part}.mp4')); return
    procs = [subprocess.Popen([sys.executable, __file__, '--part', str(k), '--parts', str(args.parts)]) for k in range(args.parts)]
    if any(p.wait() for p in procs):
        sys.exit('render failed')
    lst = os.path.join(tmp, 'list.txt')
    with open(lst, 'w') as f:
        for k in range(args.parts):
            f.write(f"file 'part{k}.mp4'\n")
    subprocess.check_call(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst,
                           '-i', AUDIO, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                           '-af', 'loudnorm=I=-12:TP=-1:LRA=9', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
                           '-shortest', '-movflags', '+faststart', OUT])
    print('done →', OUT)


if __name__ == '__main__':
    main()
