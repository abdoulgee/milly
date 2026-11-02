"""Pull the normal / basecolor / roughness-metal textures out of a Tripo GLB and
downsize them for phones. usage: python3 scripts/extract-textures.py in.glb outDir"""
import io, json, os, struct, sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
f = open(src, 'rb').read()
jl, = struct.unpack('<I', f[12:16])
j = json.loads(f[20:20 + jl])
bin0 = 20 + jl + 8
# Tripo order: normal, basecolor, rm
for im, (name, size, q) in zip(j['images'], [('normal', 1024, 90), ('basecolor', 1024, 88), ('rm', 512, 85)]):
    bv = j['bufferViews'][im['bufferView']]
    img = Image.open(io.BytesIO(f[bin0 + bv['byteOffset']:bin0 + bv['byteOffset'] + bv['byteLength']]))
    img.convert('RGB').resize((size, size), Image.LANCZOS).save(f'{out}/{name}.jpg', quality=q, optimize=True)
    print(name, img.size, '->', size)
