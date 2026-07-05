#!/usr/bin/env python3
"""目ハイライト(選択式)の確認。 python3 eye_experiment.py dragon_01 kitsune_01 ..."""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import pixelize as P

OUT = os.path.join(P.ROOT, 'pixel')


def add_eye_sparkle(img, dark=85, max_eyes=2):
    """上半分の内側にある小さな暗い塊(=目)を最大2つ選び、白ハイライトを1px足す"""
    arr = np.array(img)
    h, w = arr.shape[:2]
    op = arr[:, :, 3] > 0
    lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    darkmask = op & (lum < dark)
    ys, xs = np.where(op)
    if len(ys) == 0:
        return img
    top, bottom = ys.min(), ys.max()
    eye_limit = top + (bottom - top) * 0.6  # 上60%
    seen = np.zeros((h, w), bool)
    blobs = []
    for y in range(h):
        for x in range(w):
            if not darkmask[y, x] or seen[y, x]:
                continue
            stack, comp, touch = [(y, x)], [], False
            seen[y, x] = True
            while stack:
                cy, cx = stack.pop()
                comp.append((cy, cx))
                if cy in (0, h - 1) or cx in (0, w - 1):
                    touch = True
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and darkmask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((ny, nx))
            cy_mean = sum(p[0] for p in comp) / len(comp)
            if 1 <= len(comp) <= 12 and not touch and cy_mean <= eye_limit:
                blobs.append(comp)
    # サイズが大きい順に最大 max_eyes 個 = 両目
    blobs.sort(key=len, reverse=True)
    out = arr.copy()
    for comp in blobs[:max_eyes]:
        ty, tx = min(comp)  # 塊の左上に1px
        out[ty, tx] = (255, 255, 255, 255)
    return Image.fromarray(out, 'RGBA')


def build(name, sparkle):
    src = os.path.join(P.ROOT, 'source', name + '.png')
    nobg = P.remove_bg(Image.open(src))
    base = P.punchy(P.square_pad(nobg.crop(nobg.split()[3].getbbox())))
    small = P.downscale(base, 32)
    pal = small.convert('RGB').quantize(colors=6, method=Image.MEDIANCUT)
    q = P.keep_alpha(small, small.convert('RGB').quantize(palette=pal, dither=Image.Dither.NONE))
    q = P.despeckle(q)
    if sparkle:
        q = add_eye_sparkle(q)
    return P.add_outline(q)


def main():
    names = sys.argv[1:] or ['dragon_01', 'kitsune_01', 'phoenix_adult_01', 'unicorn_01', 'kraken_01']
    scale, pad = 260, 24
    W = len(names) * (scale + pad) + pad
    H = 2 * (scale + pad) + 60
    sheet = Image.new('RGBA', (W, H), (250, 250, 250, 255))
    d = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 18)
    except Exception:
        font = ImageFont.load_default()
    for row, sp in enumerate([False, True]):
        d.text((pad, pad + row * (scale + pad) - 2), '現行' if not sp else '目ハイライト', fill=(30, 30, 30), font=font)
        for i, name in enumerate(names):
            im = build(name, sp).resize((scale, scale), Image.NEAREST)
            chk = Image.new('RGBA', (scale, scale), (255, 255, 255, 255))
            cd = ImageDraw.Draw(chk)
            for yy in range(0, scale, 20):
                for xx in range(0, scale, 20):
                    if (xx // 20 + yy // 20) % 2:
                        cd.rectangle([xx, yy, xx + 20, yy + 20], fill=(232, 232, 232, 255))
            chk.alpha_composite(im)
            x = pad + i * (scale + pad)
            y = pad + 18 + row * (scale + pad)
            sheet.paste(chk, (x, y))
            if row == 0:
                d.text((x, y - 2), name.replace('_01', '').replace('_adult', ''), fill=(90, 90, 90), font=font)
    outp = os.path.join(OUT, '_eyes_check.png')
    sheet.save(outp)
    print('出力:', outp)


if __name__ == '__main__':
    main()
