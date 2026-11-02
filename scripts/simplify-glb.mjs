// Simplifies a single-mesh image-to-3D GLB (e.g. Tripo) for phones.
// usage: node scripts/simplify-glb.mjs in.glb out.glb targetTris textureDir   (run extract-textures.py first)
// FLAGS=Permissive lets the simplifier collapse across UV seams (needed for Tripo meshes).
import { readFileSync, writeFileSync } from 'node:fs'
import { MeshoptSimplifier } from 'meshoptimizer'
const [, , inp, out, targetTris, texDir] = process.argv
const f = readFileSync(inp)
const jl = f.readUInt32LE(12)
const j = JSON.parse(f.subarray(20, 20 + jl).toString())
const bin0 = 20 + jl + 8
const view = (acc, Ctor, n) => {
  const a = j.accessors[acc], bv = j.bufferViews[a.bufferView]
  const off = bin0 + bv.byteOffset + (a.byteOffset || 0)
  return new Ctor(f.buffer.slice(f.byteOffset + off, f.byteOffset + off + a.count * n * Ctor.BYTES_PER_ELEMENT))
}
const p = j.meshes[0].primitives[0]
const pos = view(p.attributes.POSITION, Float32Array, 3)
const nrm = view(p.attributes.NORMAL, Float32Array, 3)
const uv = view(p.attributes.TEXCOORD_0, Float32Array, 2)
const idx = view(p.indices, Uint32Array, 1)
const nv = pos.length / 3
await MeshoptSimplifier.ready
const attrs = new Float32Array(nv * 5)
for (let i = 0; i < nv; i++) { attrs.set(nrm.subarray(i * 3, i * 3 + 3), i * 5); attrs.set(uv.subarray(i * 2, i * 2 + 2), i * 5 + 3) }
const t0 = Date.now()
const [simp, err] = MeshoptSimplifier.simplifyWithAttributes(idx, pos, 3, attrs, 5, [0.3, 0.3, 0.3, 1, 1], null, Number(targetTris) * 3, 1, (process.env.FLAGS||'').split(',').filter(Boolean))
console.log('simplified', idx.length / 3, '->', simp.length / 3, 'tris, err', err, (Date.now() - t0) + 'ms')
// compact vertices
const remap = new Int32Array(nv).fill(-1); let k = 0
const ni = new Uint32Array(simp.length)
for (let i = 0; i < simp.length; i++) { const v = simp[i]; if (remap[v] < 0) remap[v] = k++; ni[i] = remap[v] }
const P = new Float32Array(k * 3), N = new Float32Array(k * 3), U = new Float32Array(k * 2)
for (let v = 0; v < nv; v++) { const r = remap[v]; if (r < 0) continue; P.set(pos.subarray(v * 3, v * 3 + 3), r * 3); N.set(nrm.subarray(v * 3, v * 3 + 3), r * 3); U.set(uv.subarray(v * 2, v * 2 + 2), r * 2) }
console.log('verts', nv, '->', k)
const idxArr = k < 65536 ? Uint16Array.from(ni) : ni
const imgs = ['normal', 'basecolor', 'rm'].map((n) => readFileSync(`${texDir}/${n}.jpg`))
const chunks = [P, N, U, idxArr, ...imgs].map((c) => Buffer.from(c.buffer ?? c, c.byteOffset ?? 0, c.byteLength))
const bufferViews = []; let off = 0; const parts = []
chunks.forEach((c, i) => { const pad = (4 - (off % 4)) % 4; if (pad) { parts.push(Buffer.alloc(pad)); off += pad }
  bufferViews.push({ buffer: 0, byteOffset: off, byteLength: c.length, ...(i < 3 ? { target: 34962 } : i === 3 ? { target: 34963 } : {}) }); parts.push(c); off += c.length })
const pad = (4 - (off % 4)) % 4; if (pad) { parts.push(Buffer.alloc(pad)); off += pad }
let mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]
for (let i = 0; i < k; i++) for (let a = 0; a < 3; a++) { mn[a] = Math.min(mn[a], P[i * 3 + a]); mx[a] = Math.max(mx[a], P[i * 3 + a]) }
const g = {
  asset: { version: '2.0', generator: 'Tripo (simplified for Our Little World)' },
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, name: 'female' }],
  meshes: [{ name: 'female', primitives: [{ attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 }, indices: 3, material: 0 }] }],
  materials: [{ ...j.materials[0], name: 'female' }],
  textures: j.textures, samplers: j.samplers,
  images: imgs.map((_, i) => ({ bufferView: 4 + i, mimeType: 'image/jpeg', name: ['normal', 'basecolor', 'rm'][i] })),
  accessors: [
    { bufferView: 0, componentType: 5126, count: k, type: 'VEC3', min: mn, max: mx },
    { bufferView: 1, componentType: 5126, count: k, type: 'VEC3' },
    { bufferView: 2, componentType: 5126, count: k, type: 'VEC2' },
    { bufferView: 3, componentType: k < 65536 ? 5123 : 5125, count: ni.length, type: 'SCALAR' },
  ],
  bufferViews, buffers: [{ byteLength: off }],
}
let js = Buffer.from(JSON.stringify(g)); const jp = (4 - (js.length % 4)) % 4; js = Buffer.concat([js, Buffer.alloc(jp, 0x20)])
const bin = Buffer.concat(parts)
const head = Buffer.alloc(12); head.writeUInt32LE(0x46546c67, 0); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8)
const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b }
writeFileSync(out, Buffer.concat([head, ch(js.length, 0x4e4f534a), js, ch(bin.length, 0x004e4942), bin]))
console.log('wrote', out, (12 + 16 + js.length + bin.length) / 1024 | 0, 'KB')
