#!/usr/bin/env python3
"""
生き物イラスト(source/)を 32x32 のクリーンなドット絵に変換する。
処理: 白背景除去 → 彩度/コントラスト強調(punchy) → 縮小 → 共通パレットで減色
      → 孤立ピクセル除去(despeckle) → シルエットに輪郭線。

ファイル名の規則:
    <key>_<frame>.png       … 成体(adult)  例 dragon_01.png
    <key>_baby_<frame>.png  … 幼体(baby)
    <key>_egg_<frame>.png   … 卵(egg)
    <frame> は 01/02/03(アニメ3コマ)。同じ(key,state)の3コマは
    共通の切り抜き範囲+共通パレットで変換し、位置・色が揃う。

使い方:
    python3 avatars/tools/pixelize.py                 # 全部
    python3 avatars/tools/pixelize.py --only dragon   # 1体だけ
    python3 avatars/tools/pixelize.py --size 32 --colors 6

出力(pixel/):
    <key>_<state>_<frame>.png / @10.png / .json, sheet_<key>.png, contact_sheet.png
"""
import os
import re
import json
import glob
import argparse
from collections import defaultdict
import numpy as np
from PIL import Image, ImageChops, ImageEnhance, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATES = ('egg', 'baby', 'adult')
FRAME_RE = re.compile(r'^(?P<key>.+?)(?:_(?P<state>egg|baby))?_(?P<frame>\d+)$')
OUTLINE = (40, 36, 46)


def parse_name(stem):
    m = FRAME_RE.match(stem)
    if not m:
        return None
    return m.group('key'), (m.group('state') or 'adult'), int(m.group('frame'))


def remove_bg(img, thresh=50):
    """四隅から白背景をフラッドフィルで透過に(内側の白は残す)"""
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


def alpha_bbox(img):
    return img.split()[3].getbbox()


def union(b1, b2):
    if b1 is None:
        return b2
    if b2 is None:
        return b1
    return (min(b1[0], b2[0]), min(b1[1], b2[1]), max(b1[2], b2[2]), max(b1[3], b2[3]))


def square_pad(img):
    w, h = img.size
    s = max(w, h)
    c = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    c.paste(img, ((s - w) // 2, (s - h) // 2))
    return c


def punchy(img, sat=1.5, con=1.3):
    rgb = img.convert('RGB')
    rgb = ImageEnhance.Color(rgb).enhance(sat)
    rgb = ImageEnhance.Contrast(rgb).enhance(con)
    return Image.merge('RGBA', (*rgb.split(), img.split()[3]))


def downscale(img, size, pad_ratio=0.1):
    """輪郭線のはみ出し防止に余白を残して縮小"""
    inner = max(1, round(size * (1 - 2 * pad_ratio)))
    small = img.resize((inner, inner), Image.LANCZOS)
    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    off = (size - inner) // 2
    canvas.paste(small, (off, off))
    return canvas


def despeckle(img, dark=80, light=230):
    """孤立ピクセルを周囲の最頻色へ。ただし暗い(目)・明るい(ハイライト)は保護して消さない"""
    arr = np.array(img)
    h, w = arr.shape[:2]
    out = arr.copy()
    for y in range(h):
        for x in range(w):
            if arr[y, x, 3] == 0:
                continue
            l = 0.299 * arr[y, x, 0] + 0.587 * arr[y, x, 1] + 0.114 * arr[y, x, 2]
            if l < dark or l > light:
                continue
            neigh, same = {}, 0
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
                out[y, x, :3] = max(neigh, key=neigh.get)
    return Image.fromarray(out, 'RGBA')


def add_eye_sparkle(img, dark=85, max_eyes=2):
    """上半分の内側にある小さな暗い塊(=目)を最大2つ選び、白ハイライトを1px足す"""
    arr = np.array(img)
    h, w = arr.shape[:2]
    op = arr[:, :, 3] > 0
    lum = 0.299 * arr[:, :, 0] + 0.587 * arr[:, :, 1] + 0.114 * arr[:, :, 2]
    darkmask = op & (lum < dark)
    ys, _ = np.where(op)
    if len(ys) == 0:
        return img
    eye_limit = ys.min() + (ys.max() - ys.min()) * 0.6
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
    blobs.sort(key=len, reverse=True)
    out = arr.copy()
    for comp in blobs[:max_eyes]:
        ty, tx = min(comp)
        out[ty, tx] = (255, 255, 255, 255)
    return Image.fromarray(out, 'RGBA')


def add_outline(img):
    arr = np.array(img)
    h, w = arr.shape[:2]
    opaque = arr[:, :, 3] > 0
    out = arr.copy()
    for y in range(h):
        for x in range(w):
            if opaque[y, x]:
                continue
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and opaque[ny, nx]:
                    out[y, x] = (*OUTLINE, 255)
                    break
    return Image.fromarray(out, 'RGBA')


def keep_alpha(small, q):
    q = q.convert('RGBA')
    q.putalpha(small.split()[3].point(lambda v: 0 if v < 128 else 255))
    return q


def to_grid(img):
    px = img.load()
    return [
        [None if px[x, y][3] < 128 else '#%02x%02x%02x' % px[x, y][:3] for x in range(img.width)]
        for y in range(img.height)
    ]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--size', type=int, default=32)
    ap.add_argument('--colors', type=int, default=6)
    ap.add_argument('--only', default=None, help='この key のみ変換')
    ap.add_argument('--in', dest='src', default=os.path.join(ROOT, 'source'))
    ap.add_argument('--out', dest='out', default=os.path.join(ROOT, 'pixel'))
    args = ap.parse_args()
    SIZE, COLORS, SRC, OUT = args.size, args.colors, args.src, args.out
    os.makedirs(OUT, exist_ok=True)

    groups = defaultdict(dict)
    for f in sorted(glob.glob(os.path.join(SRC, '*'))):
        if not f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp')):
            continue
        parsed = parse_name(os.path.splitext(os.path.basename(f))[0])
        if not parsed:
            continue
        key, state, frame = parsed
        if args.only and key != args.only:
            continue
        groups[(key, state)][frame] = f

    if not groups:
        print('対象画像がありません。')
        return

    per_creature = defaultdict(dict)
    for (key, state), frames in sorted(groups.items()):
        # 白背景除去 → 共通の切り抜き範囲
        nobg = {fr: remove_bg(Image.open(p)) for fr, p in frames.items()}
        bbox = None
        for im in nobg.values():
            bbox = union(bbox, alpha_bbox(im))
        smalls = {}
        for fr, im in nobg.items():
            crop = im.crop(bbox) if bbox else im
            crop = punchy(square_pad(crop))
            smalls[fr] = downscale(crop, SIZE)
        # 共通パレット
        montage = Image.new('RGB', (SIZE * len(smalls), SIZE))
        for i, fr in enumerate(sorted(smalls)):
            montage.paste(smalls[fr].convert('RGB'), (i * SIZE, 0))
        pal = montage.quantize(colors=COLORS, method=Image.MEDIANCUT)

        for fr in sorted(smalls):
            small = smalls[fr]
            q = keep_alpha(small, small.convert('RGB').quantize(palette=pal, dither=Image.Dither.NONE))
            q = add_outline(add_eye_sparkle(despeckle(q)))
            b = f'{key}_{state}_{fr:02d}'
            q.save(os.path.join(OUT, f'{b}.png'))
            q.resize((SIZE * 10, SIZE * 10), Image.NEAREST).save(os.path.join(OUT, f'{b}@10.png'))
            with open(os.path.join(OUT, f'{b}.json'), 'w') as jf:
                json.dump({'key': key, 'state': state, 'frame': fr, 'size': SIZE, 'grid': to_grid(q)}, jf)
            per_creature[key].setdefault(state, {})[fr] = q.resize((SIZE * 10, SIZE * 10), Image.NEAREST)
        print(f'  {key}/{state}: {len(smalls)}コマ')

    cell = SIZE * 10
    for key, states in sorted(per_creature.items()):
        rows = [s for s in STATES if s in states]
        ncol = max(len(fr) for fr in states.values())
        sheet = Image.new('RGBA', (ncol * cell, len(rows) * cell), (245, 245, 245, 255))
        for ri, s in enumerate(rows):
            for ci, fr in enumerate(sorted(states[s])):
                sheet.paste(states[s][fr], (ci * cell, ri * cell), states[s][fr])
        sheet.save(os.path.join(OUT, f'sheet_{key}.png'))

    if not args.only:
        keys = sorted(per_creature)
        cols = 5
        rows_n = (len(keys) + cols - 1) // cols
        contact = Image.new('RGBA', (cols * cell, rows_n * cell), (245, 245, 245, 255))
        for i, key in enumerate(keys):
            states = per_creature[key]
            s = 'adult' if 'adult' in states else next(iter(states))
            img = states[s][sorted(states[s])[0]]
            contact.paste(img, ((i % cols) * cell, (i // cols) * cell), img)
        contact.save(os.path.join(OUT, 'contact_sheet.png'))
    print('完了')


if __name__ == '__main__':
    main()
