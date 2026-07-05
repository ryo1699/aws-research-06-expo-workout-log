#!/usr/bin/env python3
"""
1枚の元画像に対して、複数のドット絵化パターンを並べて比較する。
使い方: python3 avatars/tools/experiment.py kitsune_01
出力: avatars/pixel/_compare_<name>.png
"""
import os
import sys
from PIL import Image, ImageChops, ImageEnhance, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'source')
OUT = os.path.join(ROOT, 'pixel')


def trim_square(img):
    rgba = img.convert('RGBA')
    a = rgba.split()[3]
    if a.getextrema()[0] < 255:
        bbox = a.getbbox()
    else:
        bg = Image.new('RGB', rgba.size, (255, 255, 255))
        bbox = ImageChops.difference(rgba.convert('RGB'), bg).getbbox()
    if bbox:
        rgba = rgba.crop(bbox)
    w, h = rgba.size
    s = max(w, h)
    c = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    c.paste(rgba, ((s - w) // 2, (s - h) // 2))
    return c


def keep_alpha(small, q):
    q = q.convert('RGBA')
    a = small.split()[3].point(lambda v: 0 if v < 128 else 255)
    q.putalpha(a)
    return q


def variant_basic(img, size, colors, resample):
    small = img.resize((size, size), resample)
    q = small.convert('RGB').quantize(colors=colors, method=Image.MEDIANCUT)
    return keep_alpha(small, q)


def variant_punchy(img, size, colors):
    """コントラスト・彩度を上げてから縮小 → くっきり"""
    im = img.convert('RGBA')
    rgb = im.convert('RGB')
    rgb = ImageEnhance.Color(rgb).enhance(1.4)
    rgb = ImageEnhance.Contrast(rgb).enhance(1.25)
    im = Image.merge('RGBA', (*rgb.split(), im.split()[3]))
    small = im.resize((size, size), Image.LANCZOS)
    q = small.convert('RGB').quantize(colors=colors, method=Image.MEDIANCUT)
    return keep_alpha(small, q)


def variant_posterize_first(img, size, colors):
    """先に全解像度で減色(フラット化) → BOXで縮小 → ベタ塗り感を維持"""
    im = img.convert('RGBA')
    flat = im.convert('RGB').quantize(colors=colors, method=Image.MEDIANCUT).convert('RGB')
    flat = Image.merge('RGBA', (*flat.split(), im.split()[3]))
    small = flat.resize((size, size), Image.BOX)
    q = small.convert('RGB').quantize(colors=colors, method=Image.MEDIANCUT)
    return keep_alpha(small, q)


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else 'kitsune_01'
    path = os.path.join(SRC, name + '.png')
    if not os.path.exists(path):
        print('見つかりません:', path)
        return
    img = trim_square(Image.open(path))

    variants = [
        ('1) 16px 16c (現行)', variant_basic(img, 16, 16, Image.LANCZOS)),
        ('2) 32px 16c', variant_basic(img, 32, 16, Image.LANCZOS)),
        ('3) 32px 12c punchy', variant_punchy(img, 32, 12)),
        ('4) 32px 16c posterize', variant_posterize_first(img, 32, 16)),
        ('5) 24px 10c punchy', variant_punchy(img, 24, 10)),
        ('6) 32px 8c punchy', variant_punchy(img, 32, 8)),
    ]

    scale = 300  # 表示セル(px)
    pad = 28
    cols = 3
    rows = (len(variants) + cols - 1) // cols
    W = cols * (scale + pad) + pad
    H = rows * (scale + pad + 22) + pad
    sheet = Image.new('RGBA', (W, H), (250, 250, 250, 255))
    draw = ImageDraw.Draw(sheet)
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 20)
    except Exception:
        font = ImageFont.load_default()

    for i, (label, im) in enumerate(variants):
        c, r = i % cols, i // cols
        x = pad + c * (scale + pad)
        y = pad + r * (scale + pad + 22)
        big = im.resize((scale, scale), Image.NEAREST)
        # 市松模様の背景(透明が分かるように)
        check = Image.new('RGBA', (scale, scale), (255, 255, 255, 255))
        cd = ImageDraw.Draw(check)
        for yy in range(0, scale, 20):
            for xx in range(0, scale, 20):
                if (xx // 20 + yy // 20) % 2:
                    cd.rectangle([xx, yy, xx + 20, yy + 20], fill=(230, 230, 230, 255))
        check.alpha_composite(big)
        sheet.paste(check, (x, y))
        draw.text((x, y + scale + 2), label, fill=(30, 30, 30), font=font)

    out = os.path.join(OUT, f'_compare_{name}.png')
    sheet.save(out)
    print('出力:', out)


if __name__ == '__main__':
    main()
