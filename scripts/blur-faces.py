#!/usr/bin/env python3
"""
Blurs his face in the couple photos so it isn't recognisable.
Reads the untouched originals from photos-original/ and writes public/memories/.

  python3 scripts/blur-faces.py
"""
import os
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# file → list of face ellipses (centre x, centre y, radius x, radius y) in pixels
FACES = {
    'photo-005.jpg': [(465, 458, 60, 74)],
    'photo-006.jpg': [(447, 540, 47, 51)],
}

for name, faces in FACES.items():
    src = os.path.join(ROOT, 'photos-original', name)
    dst = os.path.join(ROOT, 'public', 'memories', name)
    im = Image.open(src).convert('RGB')
    # heavy blur + mosaic so no features survive
    small = im.resize((max(1, im.width // 14), max(1, im.height // 14)), Image.BILINEAR)
    blurred = small.resize(im.size, Image.BILINEAR).filter(ImageFilter.GaussianBlur(10))
    mask = Image.new('L', im.size, 0)
    d = ImageDraw.Draw(mask)
    for cx, cy, rx, ry in faces:
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(9))  # soft edge
    Image.composite(blurred, im, mask).save(dst, 'JPEG', quality=92)
    print('blurred', name)
