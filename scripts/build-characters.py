#!/usr/bin/env python3
"""
Bakes our two characters from the CC0 VRoid base avatars.

  python3 scripts/build-characters.py

Inputs : characters-src/Base_Female.vrm, characters-src/Base_Male.vrm
         (VRoid Studio alpha sample models, released by the VRoid Project
         under CC0: https://opengameart.org/content/vroid-studio-cc0-models)
Outputs: public/characters/her.vrm, public/characters/him.vrm

What it does (textures only; the hijab, cap and kaftan hem are added as
geometry at runtime in `vrmOutfit.ts`):
  * re-tones all skin (face + body) to the configured skin colour
  * paints long sleeves / trousers straight onto the body skin texture,
    using the skin weights to find which texels belong to which limb
  * re-colours tops, bottoms, shoes, irises and hair, keeping the folds
  * shrinks textures for phones and drops the 2048² thumbnail
"""
import json
import os
import struct
import sys
from io import BytesIO

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'characters-src')
OUT = os.path.join(ROOT, 'public', 'characters')


def hexrgb(h):
    h = h.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], dtype=np.float32)


# ─── Looks (keep in sync with the colours in src/data/museumConfig.ts) ─────
HER = dict(
    src='Base_Female.vrm', out='her.vrm',
    skin=hexrgb('#8a5539'),
    iris=hexrgb('#3a2216'),
    hair=hexrgb('#16100e'),
    top=hexrgb('#6a1d30'),       # maroon scrubs
    sleeve=hexrgb('#5e1a2b'),    # long sleeves under the scrubs
    bottoms=hexrgb('#6a1d30'),   # the skirt becomes the scrub tunic's hem
    legs=hexrgb('#1f2a4a'),      # navy trousers
    shoes=hexrgb('#ecebe6'),     # white clogs
    hips=hexrgb('#1f2a4a'),
    drop_tie=True,
)
HIM = dict(
    src='Base_Male.vrm', out='him.vrm',
    skin=hexrgb('#5a3522'),
    iris=hexrgb('#24150d'),
    hair=hexrgb('#120d0c'),
    # Senator wear: fitted long top + matching trousers, embroidered placket & cuffs
    style='senator',
    top=hexrgb('#2d3039'),       # deep charcoal
    sleeve=hexrgb('#2d3039'),
    bottoms=hexrgb('#2d3039'),
    legs=hexrgb('#2d3039'),
    hips=hexrgb('#2d3039'),
    shoes=hexrgb('#2b1e17'),     # dark brown leather
    embroidery=hexrgb('#a7a8b1'),  # silver-grey thread
    drop_tie=True,
)

MAX_TEX = 1024


# ─── GLB I/O ───────────────────────────────────────────────────────────────
def read_glb(path):
    b = open(path, 'rb').read()
    jlen = struct.unpack('<I', b[12:16])[0]
    j = json.loads(b[20:20 + jlen])
    boff = 20 + jlen
    blen = struct.unpack('<I', b[boff:boff + 4])[0]
    binc = b[boff + 8:boff + 8 + blen]
    return j, binc


def view_bytes(j, binc, vi):
    bv = j['bufferViews'][vi]
    o = bv.get('byteOffset', 0)
    return binc[o:o + bv['byteLength']]


def write_glb(path, j, views):
    """views: list of bytes, one per bufferView (rebuilds the BIN chunk)."""
    out = bytearray()
    for i, data in enumerate(views):
        while len(out) % 4:
            out.append(0)
        j['bufferViews'][i]['byteOffset'] = len(out)
        j['bufferViews'][i]['byteLength'] = len(data)
        out += data
    while len(out) % 4:
        out.append(0)
    j['buffers'] = [{'byteLength': len(out)}]
    js = json.dumps(j, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    while len(js) % 4:
        js += b' '
    total = 12 + 8 + len(js) + 8 + len(out)
    with open(path, 'wb') as f:
        f.write(struct.pack('<III', 0x46546C67, 2, total))
        f.write(struct.pack('<II', len(js), 0x4E4F534A))
        f.write(js)
        f.write(struct.pack('<II', len(out), 0x004E4942))
        f.write(out)


DTYPES = {5126: np.float32, 5123: np.uint16, 5125: np.uint32, 5121: np.uint8}
NCOMP = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}


def accessor(j, binc, ai):
    a = j['accessors'][ai]
    bv = j['bufferViews'][a['bufferView']]
    dt = DTYPES[a['componentType']]
    n = NCOMP[a['type']]
    off = bv.get('byteOffset', 0) + a.get('byteOffset', 0)
    stride = bv.get('byteStride', 0)
    itemsize = np.dtype(dt).itemsize * n
    if stride and stride != itemsize:
        raw = np.frombuffer(binc, dtype=np.uint8, count=stride * a['count'], offset=off).reshape(a['count'], stride)
        arr = raw[:, :itemsize].copy().view(dt).reshape(a['count'], n)
    else:
        arr = np.frombuffer(binc, dtype=dt, count=a['count'] * n, offset=off).reshape(a['count'], n)
    return arr


# ─── Image helpers ─────────────────────────────────────────────────────────
def to_np(im):
    return np.asarray(im.convert('RGBA'), dtype=np.float32) / 255


def from_np(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


def lum(a):
    return a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114


def fabric(a, colour, radius=18, contrast=1.0, mask=None):
    """Re-colour keeping the folds: colour × (local luminance / blurred luminance)."""
    L = lum(a)
    Li = Image.fromarray((np.clip(L, 0, 1) * 255).astype(np.uint8))
    base = np.asarray(Li.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255
    ratio = np.clip((L + 0.02) / (base + 0.02), 0.45, 1.6) ** contrast
    out = a.copy()
    rgb = colour[None, None, :] * ratio[..., None]
    if mask is None:
        out[..., :3] = rgb
    else:
        m = mask[..., None]
        out[..., :3] = rgb * m + a[..., :3] * (1 - m)
    return out


def skin_tone(a, target, ref):
    """Per-channel ratio re-tone (keeps blush, shading and lips relative)."""
    out = a.copy()
    out[..., :3] = np.clip(a[..., :3] / ref[None, None, :] * target[None, None, :], 0, 1)
    return out


def shrink(im, limit=MAX_TEX):
    if max(im.size) > limit:
        s = limit / max(im.size)
        im = im.resize((max(8, int(im.width * s)), max(8, int(im.height * s))), Image.LANCZOS)
    return im


def png(im):
    buf = BytesIO()
    im.save(buf, 'PNG', optimize=True)
    return buf.getvalue()


# ─── Limb masks from skin weights ──────────────────────────────────────────
def limb_label(name):
    n = name.lower()
    if 'upperarm' in n or 'shoulder' in n:
        return 'upperArm'
    if 'lowerarm' in n:
        return 'lowerArm'
    if any(k in n for k in ('hand', 'thumb', 'index', 'middle', 'ring', 'little')):
        return 'hand'
    if 'upperleg' in n or 'skirt' in n:
        return 'upperLeg'
    if 'lowerleg' in n:
        return 'lowerLeg'
    if 'foot' in n or 'toe' in n:
        return 'foot'
    if 'hips' in n:
        return 'hips'
    if 'neck' in n or 'head' in n:
        return 'neck'
    return 'torso'


def limb_masks(j, binc, prim_ids, size):
    """Rasterise each SKIN-body triangle into UV space, labelled by its dominant bone."""
    mesh = next(m for m in j['meshes'] if m['name'].startswith('Body'))
    node = next(n for n in j['nodes'] if n.get('mesh') == j['meshes'].index(mesh))
    joints = j['skins'][node['skin']]['joints']
    names = [j['nodes'][ji]['name'] for ji in joints]
    labels = {}
    W, H = size
    canv = {}
    for pi in prim_ids:
        pr = mesh['primitives'][pi]
        uv = accessor(j, binc, pr['attributes']['TEXCOORD_0'])
        J = accessor(j, binc, pr['attributes']['JOINTS_0'])
        Wt = accessor(j, binc, pr['attributes']['WEIGHTS_0'])
        idx = accessor(j, binc, pr['indices']).reshape(-1, 3)
        dom = J[np.arange(len(J)), np.argmax(Wt, axis=1)]
        for tri in idx:
            # vote: the label most of the three corners agree on
            ls = [limb_label(names[dom[v]]) for v in tri]
            lab = max(set(ls), key=ls.count)
            if lab not in canv:
                im = Image.new('L', (W, H), 0)
                canv[lab] = (im, ImageDraw.Draw(im))
            pts = [(float(uv[v, 0] * W), float(uv[v, 1] * H)) for v in tri]
            canv[lab][1].polygon(pts, fill=255)
    for lab, (im, _) in canv.items():
        # grow a little so mip-mapping never shows the old texel colours at seams
        labels[lab] = np.asarray(im.filter(ImageFilter.MaxFilter(5)), dtype=np.float32) / 255
    return labels


# ─── Painting by 3D position ───────────────────────────────────────────────
def node_world_positions(j):
    """Rest-pose world positions of every node (VRoid nodes only translate)."""
    parent = {}
    for i, n in enumerate(j['nodes']):
        for c in n.get('children', []):
            parent[c] = i
    cache = {}

    def pos(i):
        if i in cache:
            return cache[i]
        t = np.array(j['nodes'][i].get('translation', [0, 0, 0]), np.float32)
        p = t + (pos(parent[i]) if i in parent else 0)
        cache[i] = p
        return p

    return {n.get('name'): pos(i) for i, n in enumerate(j['nodes'])}


def paint3d(j, binc, prim_ids, a, fn, bounds):
    """
    Composite fn(P) (P = N×3 file-space positions, front of the body is -Z)
    onto texture `a` (H×W×4), by rasterising the primitives' triangles in UV
    space and interpolating their 3D positions per texel. fn returns
    (rgb N×3, alpha N). Triangles outside `bounds` (min xyz, max xyz) are skipped.
    """
    mesh = next(m for m in j['meshes'] if m['name'].startswith('Body'))
    H, W = a.shape[:2]
    lo, hi = np.array(bounds[0], np.float32), np.array(bounds[1], np.float32)
    for pi in prim_ids:
        pr = mesh['primitives'][pi]
        P = accessor(j, binc, pr['attributes']['POSITION']).astype(np.float32)
        uv = accessor(j, binc, pr['attributes']['TEXCOORD_0']).astype(np.float32) * np.array([W, H], np.float32)
        idx = accessor(j, binc, pr['indices']).reshape(-1, 3)
        for tri in idx:
            tp = P[tri]
            if (tp.max(0) < lo).any() or (tp.min(0) > hi).any():
                continue
            t = uv[tri]
            x0, y0 = np.floor(t.min(0)).astype(int)
            x1, y1 = np.ceil(t.max(0)).astype(int)
            x0, y0 = max(x0, 0), max(y0, 0)
            x1, y1 = min(x1, W - 1), min(y1, H - 1)
            if x1 < x0 or y1 < y0:
                continue
            xs, ys = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            (ax, ay), (bx, by), (cx, cy) = t
            den = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy)
            if abs(den) < 1e-9:
                continue
            w0 = ((by - cy) * (xs - cx) + (cx - bx) * (ys - cy)) / den
            w1 = ((cy - ay) * (xs - cx) + (ax - cx) * (ys - cy)) / den
            w2 = 1 - w0 - w1
            inside = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
            if not inside.any():
                continue
            pts = w0[inside, None] * tp[0] + w1[inside, None] * tp[1] + w2[inside, None] * tp[2]
            rgb, alpha = fn(pts)
            iy = ys[inside].astype(int)
            ix = xs[inside].astype(int)
            al = alpha[:, None]
            a[iy, ix, :3] = a[iy, ix, :3] * (1 - al) + rgb * al
    return a


def flat_fabric(a, colour, radius=5, k=0.9, seed=3):
    """Plain dyed cloth: the colour, keeping only fine creases (no printed pattern / panels)."""
    L = lum(a)
    Li = Image.fromarray((np.clip(L, 0, 1) * 255).astype(np.uint8))
    base = np.asarray(Li.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255
    detail = np.clip(L - base, -0.12, 0.12)
    rng = np.random.default_rng(seed)
    weave = (rng.random(L.shape, dtype=np.float32) - 0.5) * 0.04
    out = a.copy()
    out[..., :3] = np.clip(colour[None, None, :] * (1 + k * 2.2 * detail[..., None] + weave[..., None]), 0, 1)
    return out


def frac(x):
    return x - np.floor(x)


def embroidery_placket(top_y, bottom_y, colour):
    """A vertical band of chained diamonds between two borders, down the centre front."""
    half = 0.021

    def fn(P):
        x, y, z = P[:, 0], P[:, 1], P[:, 2]
        front = z < 0.0
        inband = front & (y < top_y) & (y > bottom_y) & (np.abs(x) < half + 0.003)
        ax = np.abs(x)
        border = (ax > half - 0.0042) & (ax < half)
        f = frac((top_y - y) / 0.03)
        d = ax / 0.0135 + np.abs(f - 0.5) * 2
        diamond = np.abs(d - 0.78) < 0.13
        dot = d < 0.2
        # pointed end
        tip = (y < bottom_y + 0.03) & (ax < (y - bottom_y) * 0.7 + 0.002) & (ax > (y - bottom_y) * 0.7 - 0.004)
        alpha = (inband & (border | diamond | dot)) | (front & (y <= bottom_y + 0.03) & (y > bottom_y - 0.001) & tip)
        rgb = np.broadcast_to(colour, (len(P), 3))
        return rgb, alpha.astype(np.float32) * 0.95

    return fn


def embroidery_cuffs(wrist_l, wrist_r, colour):
    """Two thin rings and a dotted line around each sleeve, just above the wrist."""

    def fn(P):
        out = np.zeros(len(P), np.float32)
        for w in (wrist_l, wrist_r):
            # distance along the (horizontal, T-pose) arm from the wrist
            dx = np.abs(P[:, 0] - w[0])
            near = (np.abs(P[:, 1] - w[1]) < 0.08) & (np.abs(P[:, 2] - w[2]) < 0.08)
            ring = ((dx > 0.035) & (dx < 0.039)) | ((dx > 0.068) & (dx < 0.072))
            dots = (dx > 0.049) & (dx < 0.057) & (frac(np.arctan2(P[:, 1] - w[1], P[:, 2] - w[2]) / (2 * np.pi) * 18) < 0.4)
            out = np.maximum(out, (near & (ring | dots)).astype(np.float32))
        return np.broadcast_to(colour, (len(P), 3)), out * 0.95

    return fn


# ─── Strip unused face morph targets and compact the buffers ───────────────
def strip_morphs(j):
    """Keep only morph targets that a VRM expression actually uses."""
    vrm = j['extensions']['VRM']
    groups = vrm.get('blendShapeMaster', {}).get('blendShapeGroups', [])
    used = {}
    for g in groups:
        for b in g.get('binds', []):
            used.setdefault(b['mesh'], set()).add(b['index'])
    for mi, mesh in enumerate(j['meshes']):
        if not any('targets' in p for p in mesh['primitives']):
            continue
        keep = sorted(used.get(mi, set()))
        remap = {old: new for new, old in enumerate(keep)}
        for p in mesh['primitives']:
            if 'targets' in p:
                p['targets'] = [p['targets'][i] for i in keep]
                if not p['targets']:
                    del p['targets']
        if 'weights' in mesh:
            mesh['weights'] = [mesh['weights'][i] for i in keep]
        names = mesh.get('extras', {}).get('targetNames')
        if names:
            mesh['extras']['targetNames'] = [names[i] for i in keep]
        for p in mesh['primitives']:
            pn = p.get('extras', {}).get('targetNames')
            if pn:
                p['extras']['targetNames'] = [pn[i] for i in keep]
        for g in groups:
            for b in g.get('binds', []):
                if b['mesh'] == mi:
                    b['index'] = remap[b['index']]


def compact(j, views):
    """Drop accessors / bufferViews nothing references any more; returns new views."""
    acc_used = set()
    for mesh in j['meshes']:
        for p in mesh['primitives']:
            acc_used.update(p['attributes'].values())
            if 'indices' in p:
                acc_used.add(p['indices'])
            for t in p.get('targets', []):
                acc_used.update(t.values())
    for sk in j.get('skins', []):
        if 'inverseBindMatrices' in sk:
            acc_used.add(sk['inverseBindMatrices'])
    for an in j.get('animations', []):
        for sm in an['samplers']:
            acc_used.update((sm['input'], sm['output']))
    acc_map = {old: new for new, old in enumerate(sorted(acc_used))}
    j['accessors'] = [j['accessors'][i] for i in sorted(acc_used)]
    for mesh in j['meshes']:
        for p in mesh['primitives']:
            p['attributes'] = {k: acc_map[v] for k, v in p['attributes'].items()}
            if 'indices' in p:
                p['indices'] = acc_map[p['indices']]
            if 'targets' in p:
                p['targets'] = [{k: acc_map[v] for k, v in t.items()} for t in p['targets']]
    for sk in j.get('skins', []):
        if 'inverseBindMatrices' in sk:
            sk['inverseBindMatrices'] = acc_map[sk['inverseBindMatrices']]
    for an in j.get('animations', []):
        for sm in an['samplers']:
            sm['input'] = acc_map[sm['input']]
            sm['output'] = acc_map[sm['output']]
    bv_used = {a['bufferView'] for a in j['accessors'] if 'bufferView' in a}
    bv_used.update(im['bufferView'] for im in j.get('images', []) if 'bufferView' in im)
    bv_map = {old: new for new, old in enumerate(sorted(bv_used))}
    j['bufferViews'] = [j['bufferViews'][i] for i in sorted(bv_used)]
    for a in j['accessors']:
        if 'bufferView' in a:
            a['bufferView'] = bv_map[a['bufferView']]
    for im in j.get('images', []):
        if 'bufferView' in im:
            im['bufferView'] = bv_map[im['bufferView']]
    return [views[i] for i in sorted(bv_used)]


# ─── Build one character ───────────────────────────────────────────────────
def build(cfg):
    j, binc = read_glb(os.path.join(SRC, cfg['src']))
    views = [view_bytes(j, binc, i) for i in range(len(j['bufferViews']))]
    vrm = j['extensions']['VRM']
    mats = j['materials']
    mprops = vrm['materialProperties']

    def tex_of(mat_name, prop='_MainTex'):
        mp = next(m for m in mprops if m['name'] == mat_name)
        return mp['textureProperties'].get(prop)

    def image_index(tex_i):
        return j['textures'][tex_i]['source']

    def load(img_i):
        return Image.open(BytesIO(views[j['images'][img_i]['bufferView']]))

    def store(img_i, im):
        # Opaque textures go in as JPEG (much smaller); cut-outs keep PNG alpha
        rgba = im.convert('RGBA')
        opaque = rgba.getextrema()[3][0] == 255
        if opaque and max(im.size) >= 128:
            buf = BytesIO()
            rgba.convert('RGB').save(buf, 'JPEG', quality=88, optimize=True, subsampling=0)
            views[j['images'][img_i]['bufferView']] = buf.getvalue()
            j['images'][img_i]['mimeType'] = 'image/jpeg'
        else:
            views[j['images'][img_i]['bufferView']] = png(im)
            j['images'][img_i]['mimeType'] = 'image/png'

    done = set()

    def edit(mat_suffix, fn):
        for m in mats:
            if m['name'].endswith(mat_suffix):
                ii = image_index(tex_of(m['name']))
                if ii in done:
                    return
                done.add(ii)
                store(ii, shrink(fn(load(ii))))
                return

    # Reference skin colour = median of the face texture's opaque skin
    face_mat = next(m['name'] for m in mats if m['name'].endswith('Face_00_SKIN'))
    face_np = to_np(load(image_index(tex_of(face_mat))))
    opaque = face_np[..., 3] > 0.9
    ref = np.median(face_np[opaque][:, :3], axis=0)

    edit('Face_00_SKIN', lambda im: from_np(skin_tone(to_np(im), cfg['skin'], ref)))
    edit('FaceMouth_00_FACE', lambda im: from_np(skin_tone(to_np(im), cfg['skin'], ref)))

    # Body: skin re-tone, then paint clothes by limb
    body_mat = next(m['name'] for m in mats if m['name'].endswith('Body_00_SKIN'))
    body_img = image_index(tex_of(body_mat))
    mesh = next(m for m in j['meshes'] if m['name'].startswith('Body'))
    skin_prims = [i for i, p in enumerate(mesh['primitives']) if mats[p['material']]['name'] == body_mat]
    im = load(body_img)
    a0 = to_np(im)
    masks = limb_masks(j, binc, skin_prims, im.size)
    zero = np.zeros(a0.shape[:2], np.float32)
    # The body texture is lighter than the face: use its own hands/neck as the reference
    sk = (masks.get('hand', zero) + masks.get('neck', zero)) > 0.5
    body_ref = np.median(a0[sk & (a0[..., 3] > 0.9)][:, :3], axis=0)
    a = skin_tone(a0, cfg['skin'], body_ref)

    def paint(colour, *labs, radius=10):
        nonlocal a
        m = np.clip(sum((masks.get(l, zero) for l in labs), zero), 0, 1)
        # cloth gets a subtle weave so it never looks like painted skin
        rng = np.random.default_rng(7)
        weave = 1 + (rng.random(m.shape, dtype=np.float32) - 0.5) * 0.05
        rgb = colour[None, None, :] * weave[..., None]
        # keep the body's own shading (muscle/joint shadows) lightly
        L = lum(a)
        Lb = np.asarray(Image.fromarray((np.clip(L, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(radius)), np.float32) / 255
        shade = np.clip((L + 0.02) / (Lb + 0.02), 0.8, 1.2)
        rgb = rgb * shade[..., None]
        a[..., :3] = rgb * m[..., None] + a[..., :3] * (1 - m[..., None])

    paint(cfg['sleeve'], 'upperArm', 'lowerArm')
    paint(cfg['top'], 'torso')
    paint(cfg['hips'], 'hips')
    paint(cfg['legs'], 'upperLeg', 'lowerLeg')
    paint(cfg['shoes'] * 0.9, 'foot')
    nodes = node_world_positions(j)
    if cfg.get('style') == 'senator':
        wl, wr = nodes['J_Bip_L_Hand'], nodes['J_Bip_R_Hand']
        a = paint3d(j, binc, skin_prims, a, embroidery_cuffs(wl, wr, cfg['embroidery']),
                    (np.minimum(wl, wr) - 0.2, np.maximum(wl, wr) + 0.2))
    store(body_img, shrink(from_np(a)))
    done.add(body_img)

    if cfg.get('style') == 'senator':
        tops_mat = next(m['name'] for m in mats if m['name'].endswith('Tops_01_CLOTH'))
        tops_prims = [i for i, p in enumerate(mesh['primitives']) if mats[p['material']]['name'] == tops_mat]
        neck_y = nodes['J_Bip_C_Neck'][1]
        chest_y = nodes['J_Bip_C_UpperChest'][1]

        def senator_top(im):
            t = flat_fabric(to_np(im), cfg['top'])
            return from_np(paint3d(j, binc, tops_prims, t, embroidery_placket(neck_y - 0.035, chest_y - 0.16, cfg['embroidery']),
                                   ((-0.05, chest_y - 0.2, -0.3), (0.05, neck_y + 0.05, 0.02))))

        edit('Tops_01_CLOTH', senator_top)
        edit('Bottoms_01_CLOTH', lambda im: from_np(flat_fabric(to_np(im), cfg['bottoms'])))
    else:
        edit('Tops_01_CLOTH', lambda im: from_np(fabric(to_np(im), cfg['top'], radius=24, contrast=0.9)))
    edit('Bottoms_01_CLOTH', lambda im: from_np(fabric(to_np(im), cfg['bottoms'], radius=20, contrast=0.8)))
    edit('Shoes_01_CLOTH', lambda im: from_np(fabric(to_np(im), cfg['shoes'], radius=12, contrast=1.0)))

    def iris(im):
        a = to_np(im)
        L = lum(a)
        a[..., :3] = np.clip(cfg['iris'][None, None, :] * (0.55 + 1.6 * L[..., None]), 0, 1)
        return from_np(a)

    edit('EyeIris_00_EYE', iris)

    # Hair & brows are white/grey textures tinted by the MToon colour
    for mp in mprops:
        if mp['name'].endswith('_HAIR') or mp['name'].endswith('FaceBrow_00_FACE') or mp['name'].endswith('FaceEyelash_00_FACE') or mp['name'].endswith('FaceEyeline_00_FACE'):
            c = cfg['hair'] if mp['name'].endswith('_HAIR') else cfg['hair'] * 1.4
            mp['vectorProperties']['_Color'] = [float(c[0]), float(c[1]), float(c[2]), 1]
            mp['vectorProperties']['_ShadeColor'] = [float(c[0] * 0.7), float(c[1] * 0.7), float(c[2] * 0.7), 1]
        if mp['name'].endswith('_SKIN') or mp['name'].endswith('_CLOTH'):
            # neutral, slightly warm shade (the original pink tints white cloth)
            warm = [0.80, 0.74, 0.72] if mp['name'].endswith('_SKIN') else [0.78, 0.76, 0.76]
            mp['vectorProperties']['_ShadeColor'] = warm + [1]
    for m in mats:
        if m['name'].endswith('_HAIR') or m['name'].endswith('FaceBrow_00_FACE'):
            pbr = m.setdefault('pbrMetallicRoughness', {})
            c = cfg['hair'] if m['name'].endswith('_HAIR') else cfg['hair'] * 1.4
            pbr['baseColorFactor'] = [float(c[0]), float(c[1]), float(c[2]), 1]

    # Drop the tie / bow
    if cfg['drop_tie']:
        mesh['primitives'] = [p for p in mesh['primitives'] if 'Accessory_Tie' not in mats[p['material']]['name']]

    # Everything else: just shrink. The thumbnail becomes a tiny swatch.
    for ii, img in enumerate(j['images']):
        if ii in done:
            continue
        im = load(ii)
        if img.get('name') == 'Thumbnail':
            im = Image.new('RGBA', (8, 8), tuple(int(c * 255) for c in cfg['top']) + (255,))
        store(ii, shrink(im))

    vrm['meta']['title'] = cfg['out'].replace('.vrm', '')
    vrm['meta']['author'] = 'VRoid Project (CC0), restyled for Our Little World'
    strip_morphs(j)
    views = compact(j, views)
    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, cfg['out'])
    write_glb(out, j, views)
    print(f"{cfg['out']}: {os.path.getsize(out) / 1e6:.1f} MB")


if __name__ == '__main__':
    which = sys.argv[1:] or ['her', 'him']
    for w in which:
        build(HER if w == 'her' else HIM)
