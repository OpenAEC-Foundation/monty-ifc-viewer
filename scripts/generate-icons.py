#!/usr/bin/env python3
"""
Generate application icons for Monty IFC Viewer.

Design: Bold geometric "IFC" text on a blue-to-green gradient
rounded square.  Rendered at 2x and downsampled for crisp edges.
"""

import io
import os
import struct

import numpy as np
from PIL import Image, ImageDraw

LANCZOS = getattr(Image, 'Resampling', Image).LANCZOS

BLUE  = np.array([37, 99, 235], dtype=np.float64)   # #2563EB
GREEN = np.array([16, 185, 129], dtype=np.float64)   # #10B981


def create_icon(size=1024):
    """Create the app icon at *size* px (use 2048 for super-sampling)."""

    def s(v):
        """Scale a 1024-base coordinate to the actual render size."""
        return int(v * size / 1024)

    # ── Gradient background ──────────────────────────────────────────
    y, x = np.mgrid[0:size, 0:size]
    t = np.clip(
        (x.astype(np.float64) + y.astype(np.float64)) / (2.0 * max(size - 1, 1)),
        0, 1,
    )[..., np.newaxis]

    grad = (BLUE * (1 - t) + GREEN * t).astype(np.uint8)
    alpha = np.full((size, size, 1), 255, dtype=np.uint8)
    grad_img = Image.fromarray(np.concatenate([grad, alpha], axis=2), 'RGBA')

    # Rounded-rectangle mask
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [(0, 0), (size - 1, size - 1)],
        radius=max(s(225), 1), fill=255,
    )

    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    img.paste(grad_img, (0, 0), mask)

    draw = ImageDraw.Draw(img, 'RGBA')

    # ── Letter parameters (designed at 1024 base) ─────────────────
    white = (255, 255, 255)
    w  = s(68)                # stroke width
    r  = max(s(12), 1)       # corner radius for rounded strokes

    top = s(282)              # cap line
    bot = s(743)              # baseline
    mid = s(500)              # F middle-bar Y

    i_serif_w  = s(140)       # total width of I serifs
    letter_w   = s(190)       # width of F / C horizontal bars
    f_mid_w    = s(142)       # F middle bar (shorter)
    gap        = s(48)        # spacing between letters

    total_w = i_serif_w + gap + letter_w + gap + letter_w
    sx = (size - total_w) // 2

    # ── I  (serifed) ──────────────────────────────────────────────
    ic = sx + i_serif_w // 2              # center of I stem
    # top serif
    draw.rounded_rectangle(
        [(sx, top), (sx + i_serif_w, top + w)],
        radius=r, fill=white,
    )
    # vertical stem
    draw.rounded_rectangle(
        [(ic - w // 2, top), (ic + w // 2, bot)],
        radius=r, fill=white,
    )
    # bottom serif
    draw.rounded_rectangle(
        [(sx, bot - w), (sx + i_serif_w, bot)],
        radius=r, fill=white,
    )

    # ── F ─────────────────────────────────────────────────────────
    fx = sx + i_serif_w + gap
    # vertical stem
    draw.rounded_rectangle(
        [(fx, top), (fx + w, bot)],
        radius=r, fill=white,
    )
    # top bar
    draw.rounded_rectangle(
        [(fx, top), (fx + letter_w, top + w)],
        radius=r, fill=white,
    )
    # middle bar (shorter)
    draw.rounded_rectangle(
        [(fx, mid), (fx + f_mid_w, mid + w)],
        radius=r, fill=white,
    )

    # ── C ─────────────────────────────────────────────────────────
    cx = fx + letter_w + gap
    # vertical stem
    draw.rounded_rectangle(
        [(cx, top), (cx + w, bot)],
        radius=r, fill=white,
    )
    # top bar
    draw.rounded_rectangle(
        [(cx, top), (cx + letter_w, top + w)],
        radius=r, fill=white,
    )
    # bottom bar
    draw.rounded_rectangle(
        [(cx, bot - w), (cx + letter_w, bot)],
        radius=r, fill=white,
    )

    return img


def save_icns(master, path):
    """Write an ICNS file with PNG payloads (macOS 10.7+)."""
    chunks = []
    for tag, sz in [(b'icp4', 16), (b'icp5', 32), (b'icp6', 64),
                    (b'ic07', 128), (b'ic08', 256), (b'ic09', 512),
                    (b'ic10', 1024)]:
        buf = io.BytesIO()
        master.resize((sz, sz), LANCZOS).save(buf, format='PNG')
        png = buf.getvalue()
        chunks.append(tag + struct.pack('>I', len(png) + 8) + png)
    body = b''.join(chunks)
    with open(path, 'wb') as f:
        f.write(b'icns' + struct.pack('>I', 8 + len(body)) + body)


def main():
    root    = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icons   = os.path.join(root, 'src-tauri', 'icons')
    public  = os.path.join(root, 'public')

    # Render at 2× for anti-aliased edges, then downsample
    print('Rendering at 2048x2048 (2x super-sample)...')
    master_hq = create_icon(2048)
    master = master_hq.resize((1024, 1024), LANCZOS)

    master.save(os.path.join(icons, 'icon.png'))
    print('  icon.png')

    for name, sz in [('32x32.png', 32), ('64x64.png', 64),
                     ('128x128.png', 128), ('128x128@2x.png', 256)]:
        master.resize((sz, sz), LANCZOS).save(os.path.join(icons, name))
        print(f'  {name}')

    for name, sz in [('StoreLogo.png', 50), ('Square30x30Logo.png', 30),
                     ('Square44x44Logo.png', 44), ('Square71x71Logo.png', 71),
                     ('Square89x89Logo.png', 89), ('Square107x107Logo.png', 107),
                     ('Square142x142Logo.png', 142), ('Square150x150Logo.png', 150),
                     ('Square284x284Logo.png', 284), ('Square310x310Logo.png', 310)]:
        master.resize((sz, sz), LANCZOS).save(os.path.join(icons, name))
        print(f'  {name}')

    master.save(os.path.join(icons, 'icon.ico'), format='ICO',
                sizes=[(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)])
    print('  icon.ico')

    save_icns(master, os.path.join(icons, 'icon.icns'))
    print('  icon.icns')

    master.resize((128, 128), LANCZOS).save(os.path.join(public, 'app-icon.png'))
    print('  public/app-icon.png')

    print('\nDone.')


if __name__ == '__main__':
    main()
