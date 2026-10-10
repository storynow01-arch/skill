"""範本廣G「證書的旅程」：水彩紙底＋水彩暈染背景（做一次當靜態層，已產生好放在 remotion/src/art/，隨畫面程式一起打包）。
輸出 bg1～bg6.jpg（跨頁 1680×900）與 grain.png（蠟筆顆粒遮罩，可平鋪）：
  bg1 房間角落（開場）、bg2～bg4 第 1～3 道門、bg6 第 4 道門、bg5 塗鴉牆（最後一頁）。
原作：02_試做/廣告30風格 src/ads/ad16/gen_art.py（bg1～bg5、grain 照原作；bg6 為範本新增）。
用法：python engine/gen_art.py（只有想改背景時才需要重跑；make_ad.py 不會呼叫它）
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter, zoom

HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "remotion", "src", "art")
W, H = 1680, 900


def fbm(h, w, scales, amps, seed):
    r = np.random.default_rng(seed); out = np.zeros((h, w))
    for s, a in zip(scales, amps):
        g = r.standard_normal((h // s + 4, w // s + 4))
        out += a * zoom(g, s, order=3)[:h, :w]
    return out / (out.std() + 1e-9)


def hexc(c):
    c = c.lstrip('#'); return np.array([int(c[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def paper(seed=1):
    base = hexc('#fdf8ee')
    img = np.ones((H, W, 3)) * base
    g = fbm(H, W, (40, 9, 3), (0.3, 0.5, 1.0), seed) * 0.018
    fib = gaussian_filter(np.random.default_rng(seed + 9).standard_normal((H, W)), (0.6, 3)) * 0.03
    img *= (1 + g + fib)[..., None]
    return img


def mask_poly(polys, ellipses=()):
    im = Image.new('L', (W, H), 0); d = ImageDraw.Draw(im)
    for p in polys: d.polygon([tuple(map(float, q)) for q in p], fill=255)
    for e in ellipses: d.ellipse(e, fill=255)
    return np.asarray(im, dtype=float) / 255


def wash(img, m, color, strength=0.6, seed=0, rough=0.22, soft=5, grad=None):
    m = gaussian_filter(m, soft)
    n = fbm(H, W, (110, 36, 12), (1, 0.5, 0.25), seed)
    a = np.clip((m + rough * n * 0.5 - 0.5) * 5 + 0.5, 0, 1)
    a = gaussian_filter(a, 1.2)
    v = np.clip(0.78 + 0.22 * fbm(H, W, (180, 60), (1, 0.6), seed + 3), 0.4, 1.2)
    e = np.clip(a - gaussian_filter(a, 9), 0, 1) * 1.6                 # 邊緣積色
    gran = fbm(H, W, (3, 2), (1, 0.6), seed + 7) * 0.07
    al = strength * a * (v + e + gran)
    if grad is not None: al = al * grad
    al = np.clip(al, 0, 1)[..., None]
    c = hexc(color)
    return img * (1 - al * (1 - c))


yy, xx = np.mgrid[0:H, 0:W]


def hill(y0, amp, wl, ph, x0=0, x1=W):
    xs = np.linspace(x0, x1, 120)
    ys = y0 - amp * np.sin(xs / wl + ph) - amp * 0.4 * np.sin(xs / (wl * 0.43) + ph * 2)
    return [(x, y) for x, y in zip(xs, ys)] + [(x1, H + 20), (x0, H + 20)]


def cloud(cx, cy, s):
    return [(cx - 70 * s, cy - 30 * s, cx + 10 * s, cy + 30 * s), (cx - 30 * s, cy - 55 * s, cx + 50 * s, cy + 20 * s),
            (cx + 10 * s, cy - 35 * s, cx + 90 * s, cy + 30 * s), (cx - 100 * s, cy - 5 * s, cx + 120 * s, cy + 35 * s)]


def save(img, name):
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).save(os.path.join(HERE, name), quality=90)
    print('寫出', name)


def sky(img, seed, top='#a9d4f0', strength=0.55):
    g = np.clip(1.15 - yy / (H * 0.75), 0, 1)
    return wash(img, mask_poly([[(0, 0), (W, 0), (W, H * 0.8), (0, H * 0.8)]]), top, strength, seed, 0.5, 30, g)


# 1：積木角落（奶油黃牆、薄荷綠地板、粉紅地毯、右頁窗戶）
img = paper(1)
img = wash(img, mask_poly([[(0, 0), (W, 0), (W, 560), (0, 560)]]), '#fbe7a8', 0.42, 11, 0.35, 12)
img = wash(img, mask_poly([[(0, 540), (W, 520), (W, H), (0, H)]]), '#bfe6cf', 0.5, 12, 0.4, 8)
img = wash(img, mask_poly([], [(150, 650, 820, 860)]), '#f6bfcf', 0.5, 13, 0.3, 6)
img = wash(img, mask_poly([[(1130, 250), (1500, 250), (1500, 560), (1130, 560)]]), '#a9d4f0', 0.65, 14, 0.18, 3)
img = wash(img, mask_poly([], cloud(1300, 360, 0.7)), '#ffffff', 0.0, 15)
img = wash(img, mask_poly([], [(1340, 290, 1420, 370)]), '#fff1a0', 0.6, 16, 0.2, 3)   # 窗外太陽
img = wash(img, mask_poly([hill(560, 25, 60, 1.0, 1130, 1500)]) * (yy < 560), '#9fd9a6', 0.6, 17, 0.2, 2)
save(img, 'bg1.jpg')

# 2：天空＋綠色山丘（第一道門）
img = sky(paper(2), 21)
for k, (cx, cy, s) in enumerate([(260, 190, 1.0), (1180, 140, 0.8), (1500, 260, 0.6)]):
    img = wash(img, mask_poly([], cloud(cx, cy, s)), '#eef6fb', 0.5, 22 + k, 0.3, 6)
img = wash(img, mask_poly([hill(600, 40, 180, 0.3)]), '#bfe6b5', 0.55, 25, 0.3, 6)
img = wash(img, mask_poly([hill(700, 30, 130, 2.0)]), '#93d3a0', 0.5, 26, 0.3, 6)
img = wash(img, mask_poly([[(0, 780), (500, 740), (980, 700), (1100, 720), (700, 790), (0, 860)]]), '#fbe7a8', 0.55, 27, 0.3, 5)
save(img, 'bg2.jpg')

# 3：粉色黃昏、粉紅山丘（第二道門）
img = paper(3)
g = np.clip(1.1 - yy / (H * 0.8), 0, 1)
img = wash(img, mask_poly([[(0, 0), (W, 0), (W, 700), (0, 700)]]), '#ffd2c2', 0.5, 31, 0.5, 30, g)
img = wash(img, mask_poly([], [(1360, 120, 1540, 300)]), '#ffe9a0', 0.55, 32, 0.25, 6)
img = wash(img, mask_poly([hill(620, 45, 160, 1.4)]), '#f7c3d4', 0.55, 33, 0.3, 6)
img = wash(img, mask_poly([hill(720, 30, 110, 0.2)]), '#e7b7e0', 0.42, 34, 0.3, 6)
img = wash(img, mask_poly([[(0, 800), (600, 760), (1000, 720), (1100, 740), (700, 820), (0, 880)]]), '#fbe7a8', 0.5, 35, 0.3, 5)
save(img, 'bg3.jpg')

# 4：晴空＋彩虹淡淡＋薄荷山丘（第三道門＋幼兒園）
img = sky(paper(4), 41, '#b8dcf3', 0.5)
for k, c in enumerate(['#f7b9c4', '#fbe2a0', '#c5ecc0', '#bcdcf5']):
    r0 = 760 - k * 34
    m = ((xx - 1180) ** 2 + (yy - 820) ** 2 < r0 ** 2) & ((xx - 1180) ** 2 + (yy - 820) ** 2 > (r0 - 32) ** 2)
    img = wash(img, m.astype(float), c, 0.35, 42 + k, 0.2, 4)
img = wash(img, mask_poly([hill(640, 35, 200, 2.2)]), '#c5ecc0', 0.55, 46, 0.3, 6)
img = wash(img, mask_poly([hill(740, 25, 120, 0.7)]), '#9fd9b2', 0.5, 47, 0.3, 6)
save(img, 'bg4.jpg')

# 6：薄荷晨光、淡紫山丘（第四道門，範本新增）
img = paper(6)
g = np.clip(1.1 - yy / (H * 0.8), 0, 1)
img = wash(img, mask_poly([[(0, 0), (W, 0), (W, 700), (0, 700)]]), '#cfeee2', 0.5, 61, 0.5, 30, g)
img = wash(img, mask_poly([], [(180, 110, 340, 270)]), '#ffe9a0', 0.55, 62, 0.25, 6)
for k, (cx, cy, s) in enumerate([(700, 170, 0.8), (1350, 230, 0.7)]):
    img = wash(img, mask_poly([], cloud(cx, cy, s)), '#f4faf7', 0.5, 63 + k, 0.3, 6)
img = wash(img, mask_poly([hill(630, 40, 170, 0.9)]), '#d9c8ef', 0.55, 65, 0.3, 6)
img = wash(img, mask_poly([hill(730, 28, 120, 2.6)]), '#b9dcc0', 0.5, 66, 0.3, 6)
img = wash(img, mask_poly([[(0, 790), (560, 750), (990, 712), (1100, 732), (700, 805), (0, 870)]]), '#fbe7a8', 0.5, 67, 0.3, 5)
save(img, 'bg6.jpg')

# 5：塗鴉牆（奶油牆、天藍腰帶、軟木板色塊）
img = paper(5)
img = wash(img, mask_poly([[(0, 0), (W, 0), (W, H), (0, H)]]), '#fff0c4', 0.3, 51, 0.4, 20)
img = wash(img, mask_poly([[(60, 40), (W - 60, 40), (W - 60, 850), (60, 850)]]), '#f3d6a6', 0.45, 52, 0.25, 8)
img = wash(img, mask_poly([[(0, 850), (W, 850), (W, H), (0, H)]]), '#bfe6cf', 0.5, 53, 0.3, 4)
for k in range(26):
    r = np.random.default_rng(500 + k)
    cx, cy = r.uniform(80, W - 80), r.uniform(60, 840)
    rr = r.uniform(18, 46)
    col = ['#f6bfcf', '#fbe7a8', '#bfe6cf', '#a9d4f0'][k % 4]
    img = wash(img, mask_poly([], [(cx - rr, cy - rr, cx + rr, cy + rr)]), col, 0.35, 60 + k, 0.4, 3)
save(img, 'bg5.jpg')

# 蠟筆顆粒（白＝顯示、透明＝紙面露出）
r = np.random.default_rng(99)
gsz = 256
n = r.random((gsz, gsz))
n = gaussian_filter(n, (0.5, 1.8), mode='wrap')
n = (n - n.min()) / (n.max() - n.min())
a = np.clip((n - 0.28) * 3.2, 0, 1) * 0.85 + 0.15
rgba = np.zeros((gsz, gsz, 4), np.uint8); rgba[..., :3] = 255; rgba[..., 3] = (a * 255).astype(np.uint8)
Image.fromarray(rgba, 'RGBA').save(os.path.join(HERE, 'grain.png'))
print('寫出 grain.png')
