#!/usr/bin/env python3
"""
ドット絵の「モザイク感」を減らす編集を試す。
色数を絞る + 孤立ピクセル除去(despeckle) + シルエットに輪郭線を付ける。
使い方: python3 avatars/tools/clean_experiment.py dragon_01
出力: avatars/pixel/_clean_<name>.png
"""
import os
import sys
import numpy as np
from PIL import Image, ImageChops, ImageEnhance, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'source')
OUT = os.path.join(ROOT, 'pixel')
OUTLINE = (40, 36, 46)


def remove_bg(img, thresh=50):
    """四隅から白背景をフラッドフィルで透過にする(内側の白は残す)"""
    rgb = img.convert('RGB').copy()
    sent = (255, 0, 255)
    w, h = rgb.size
    for corner in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        ImageDraw.floodfill(rgb, corner, sent, thresh=thresh)
    arr = np.array(rgb)
    mask = (arr[:, :, 0] == 255) & (arr[:, :, 1] == 0) & (arr[:, :, 2] == 255)
    rgba = np.array(img.convert('RGBA'))
    rgba[mask, 3] = 0
    return Image.fromarray(rgba, 'RGBA')


def trim_square(img):
    rgba = img.convert('RGBA')
    a = rgba.split()[3]
    bbox = a.getbbox() if a.getextrema()[0] < 255 else \
        ImageChops.difference(rgba.convert('RGB'), Image.new('RGB', rgba.size, (255, 255, 255))).getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    w, h = rgba.size
    s = max(w, h)
    c = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    c.paste(rgba, ((s - w) // 2, (s - h) // 2))
    return c


def punchy(img, sat=1.5, con=1.3):
    rgb = img.convert('RGB')
    rgb = ImageEnhance.Color(rgb).enhance(sat)
    rgb = ImageEnhance.Contrast(rgb).enhance(con)
    return Image.merge('RGBA', (*rgb.split(), img.split()[3]))


def downscale(img, size, pad_ratio=0.12):
    """余白を少し残して縮小(輪郭線のはみ出し防止)"""
    inner = round(size * (1 - pad_ratio * 2))
    small = img.resize((inner, inner), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    off = (size - inner) // 2
    canvas.paste(small, (off, off))
    return canvas


def quantize(img, colors):
    q = img.convert('RGB').quantize(colors=colors, method=Image.MEDIANCUT).convert('RGBA')
    a = img.split()[3].point(lambda v: 0 if v < 128 else 255)
    q.putalpha(a)
    return q


def despeckle(img):
    """周囲8マスと色が違う孤立ピクセルを、周囲の最頻色に置換"""
    arr = np.array(img)
    h, w = arr.shape[:2]
    out = arr.copy()
    for y in range(h):
        for x in range(w):
            if arr[y, x, 3] == 0:
                continue
            neigh = {}
            same = 0
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    if dx == 0 and dy == 0:
                        continue
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < h and 0 <= nx < w and arr[ny, nx, 3] > 0:
                        key = tuple(arr[ny, nx, :3])
                        neigh[key] = neigh.get(key, 0) + 1
                        if key == tuple(arr[y, x, :3]):
                            same += 1
            if same == 0 and neigh:
                best = max(neigh, key=neigh.get)
                out[y, x, :3] = best
    return Image.fromarray(out, 'RGBA')


def add_outline(img):
    """不透明シルエットの外周1pxに輪郭線を付ける"""
    arr = np.array(img)
    h, w = arr.shape[:2]
    alpha = arr[:, :, 3] > 0
    out = arr.copy()
    for y in range(h):
        for x in range(w):
            if alpha[y, x]:
                continue
            # 4近傍に不透明があれば輪郭
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and alpha[ny, nx]:
                    out[y, x] = (*OUTLINE, 255)
                    break
    return Image.fromarray(out, 'RGBA')


def label_cell(sheet, im, x, y, scale, text, font, draw):
    big = im.resize((scale, scale), Image.NEAREST)
    check = Image.new('RGBA', (scale, scale), (255, 255, 255, 255))
    cd = ImageDraw.Draw(check)
    for yy in range(0, scale, 20):
        for xx in range(0, scale, 20):
            if (xx // 20 + yy // 20) % 2:
                cd.rectangle([xx, yy, xx + 20, yy + 20], fill=(232, 232, 232, 255))
    check.alpha_composite(big)
    sheet.paste(check, (x, y))
    draw.text((x, y + scale + 2), text, fill=(30, 30, 30), font=font)


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else 'dragon_01'
    path = os.path.join(SRC, name + '.png')
    if not os.path.exists(path):
        print('見つかりません:', path)
        return
    base = punchy(trim_square(remove_bg(Image.open(path))))

    SIZE = 32
    cur = quantize(downscale(base, SIZE, 0), 12)               # 現行相当
    q8 = quantize(downscale(base, SIZE), 8)
    v_despeckle = despeckle(q8)
    v_outline = add_outline(despeckle(q8))
    v_outline10 = add_outline(despeckle(quantize(downscale(base, SIZE), 10)))
    v_bold = add_outline(despeckle(quantize(downscale(base, SIZE), 6)))

    variants = [
        ('A) 現行 32px/12c', cur),
        ('B) 8c + despeckle', v_despeckle),
        ('C) 8c + despeckle + 輪郭', v_outline),
        ('D) 10c + despeckle + 輪郭', v_outline10),
        ('E) 6c + despeckle + 輪郭(bold)', v_bold),
    ]
    scale, pad, cols = 300, 30, 3
    rows = (len(variants) + cols - 1) // cols
    W = cols * (scale + pad) + pad
    H = rows * (scale + pad + 24) + pad
    sheet = Image.new('RGBA', (W, H), (250, 250, 250, 255))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 20)
    except Exception:
        font = ImageFont.load_default()
    for i, (lab, im) in enumerate(variants):
        c, r = i % cols, i // cols
        label_cell(sheet, im, pad + c * (scale + pad), pad + r * (scale + pad + 24), scale, lab, font, draw)
    outp = os.path.join(OUT, f'_clean_{name}.png')
    sheet.save(outp)
    print('出力:', outp)


if __name__ == '__main__':
    main()
