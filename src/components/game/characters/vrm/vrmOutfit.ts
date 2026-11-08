/**
 * Dresses the VRoid base avatars as the two of us. Everything here is
 * generated from the avatar's own measurements, so it fits any VRoid body:
 *
 *   her  – a hijab (hood framing the face + drape over the shoulders),
 *          skinned to head / neck / upper chest so it turns with her head
 *          but stays on her shoulders
 *   him  – the knee-length lower half of his senator top (skinned to the
 *          hips and thighs so it moves as he walks) and an embroidered cap
 *
 * The clothes use MToon (the avatar's own toon/PBR-ish shader) so they are
 * lit exactly like the rest of the body.
 */
import * as THREE from 'three'
import { MToonMaterial, type VRM, type VRMHumanBoneName } from '@pixiv/three-vrm'
import type { ProceduralAppearance } from '../../../../data/museumConfig'

/* ─── measurements ──────────────────────────────────────────────────────── */

interface Measure {
  /** world-space bounding boxes by material keyword */
  box: (key: string) => THREE.Box3
  bone: (name: VRMHumanBoneName) => THREE.Vector3
}

function matName(m: THREE.Material | THREE.Material[]) {
  return (Array.isArray(m) ? m[0] : m).name
}

function measure(vrm: VRM): Measure {
  vrm.scene.updateMatrixWorld(true)
  const boxes = new Map<string, THREE.Box3>()
  const v = new THREE.Vector3()
  vrm.scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const name = matName(mesh.material)
    const pos = mesh.geometry.attributes.position
    const idx = mesh.geometry.index
    const b = new THREE.Box3()
    const n = idx ? idx.count : pos.count
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(mesh.matrixWorld)
      b.expandByPoint(v)
    }
    const prev = boxes.get(name)
    boxes.set(name, prev ? prev.union(b) : b)
  })
  return {
    box: (key) => {
      const out = new THREE.Box3()
      for (const [name, b] of boxes) if (name.includes(key)) out.union(b)
      return out
    },
    bone: (name) => vrm.humanoid.getRawBoneNode(name)!.getWorldPosition(new THREE.Vector3()),
  }
}

/* ─── a lofted tube (stack of horizontal rings, optionally with a front opening) ─ */

interface Ring {
  y: number
  /** centre z */
  cz: number
  rx: number
  /** front / back half-depth */
  rzF: number
  rzB: number
  /** half-angle of the front opening (0 = closed ring) */
  open: number
}

const smooth = (t: number) => t * t * (3 - 2 * t)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

/** Interpolate ring parameters through keyframes ordered top → bottom (Catmull-Rom). */
function keyed(keys: [number, number, number, number, number][], y: number) {
  // keys: [y, rx, rzF, rzB, cz]
  if (y >= keys[0][0]) return keys[0]
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    if (y <= a[0] && y >= b[0]) {
      const t = (a[0] - y) / (a[0] - b[0])
      const p0 = keys[Math.max(0, i - 1)]
      const p3 = keys[Math.min(keys.length - 1, i + 2)]
      const t2 = t * t
      const t3 = t2 * t
      return a.map((av, k) => {
        if (k === 0) return y
        const m1 = (b[k] - p0[k]) * 0.5
        const m2 = (p3[k] - av) * 0.5
        return (2 * t3 - 3 * t2 + 1) * av + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * b[k] + (t3 - t2) * m2
      }) as [number, number, number, number, number]
    }
  }
  return keys[keys.length - 1]
}

function loft(rings: Ring[], seg: number, fold: (a: number, ringIndex: number) => number) {
  const pos: number[] = []
  const uv: number[] = []
  const index: number[] = []
  const cols = seg + 1
  rings.forEach((r, i) => {
    const a0 = r.open
    const a1 = Math.PI * 2 - r.open
    for (let j = 0; j <= seg; j++) {
      const a = a0 + ((a1 - a0) * j) / seg
      let f = 1 + fold(a, i)
      // tuck the edge of the opening in towards the face, like folded fabric
      if (r.open > 0 && (j === 0 || j === seg)) f *= 0.955
      else if (r.open > 0 && (j === 1 || j === seg - 1)) f *= 0.985
      const c = Math.cos(a)
      pos.push(r.rx * Math.sin(a) * f, r.y, r.cz + (c > 0 ? r.rzF : r.rzB) * c * f)
      uv.push(j / seg, 1 - i / (rings.length - 1))
    }
  })
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * cols + j
      const b = a + 1
      const c = a + cols
      const d = c + 1
      index.push(a, c, b, b, c, d)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(index)
  return g
}

/** Average normals across the vertical seam / identical points so no crease shows. */
function smoothNormals(g: THREE.BufferGeometry) {
  g.computeVertexNormals()
  const pos = g.attributes.position
  const nor = g.attributes.normal
  const key = (i: number) => `${pos.getX(i).toFixed(4)},${pos.getY(i).toFixed(4)},${pos.getZ(i).toFixed(4)}`
  const groups = new Map<string, number[]>()
  for (let i = 0; i < pos.count; i++) {
    const k = key(i)
    const arr = groups.get(k)
    if (arr) arr.push(i)
    else groups.set(k, [i])
  }
  const n = new THREE.Vector3()
  for (const ids of groups.values()) {
    if (ids.length < 2) continue
    n.set(0, 0, 0)
    for (const i of ids) n.x += nor.getX(i), n.y += nor.getY(i), n.z += nor.getZ(i)
    n.normalize()
    for (const i of ids) nor.setXYZ(i, n.x, n.y, n.z)
  }
}

/* ─── skinning onto the avatar's skeleton ───────────────────────────────── */

function mainSkinnedMesh(vrm: VRM): THREE.SkinnedMesh {
  let best: THREE.SkinnedMesh | null = null
  vrm.scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh
    if (m.isSkinnedMesh && /Body/.test(matName(m.material)) && (!best || m.skeleton.bones.length > best.skeleton.bones.length)) best = m
  })
  if (!best) throw new Error('VRM has no body mesh')
  return best
}

/**
 * Turns a world-space geometry into a SkinnedMesh bound to the avatar's
 * skeleton. `weigh(p)` returns up to 4 [bone, weight] pairs per vertex.
 */
function skin(vrm: VRM, g: THREE.BufferGeometry, material: THREE.Material, weigh: (p: THREE.Vector3) => [VRMHumanBoneName, number][]) {
  const body = mainSkinnedMesh(vrm)
  const bones = body.skeleton.bones
  const idxOf = (n: VRMHumanBoneName) => {
    const i = bones.indexOf(vrm.humanoid.getRawBoneNode(n) as THREE.Bone)
    if (i < 0) throw new Error(`bone ${n} not in skeleton`)
    return i
  }
  const pos = g.attributes.position
  const si = new Uint16Array(pos.count * 4)
  const sw = new Float32Array(pos.count * 4)
  const p = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i)
    const w = weigh(p).filter(([, x]) => x > 1e-4).slice(0, 4)
    const total = w.reduce((s, [, x]) => s + x, 0) || 1
    w.forEach(([n, x], k) => {
      si[i * 4 + k] = idxOf(n)
      sw[i * 4 + k] = x / total
    })
  }
  // world → the body mesh's local space (VRM0 bodies live in a 180°-turned frame)
  const toLocal = new THREE.Matrix4().copy(body.matrixWorld).invert()
  g.applyMatrix4(toLocal)
  g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4))
  g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4))
  const mesh = new THREE.SkinnedMesh(g, material)
  body.parent!.add(mesh)
  mesh.position.copy(body.position)
  mesh.quaternion.copy(body.quaternion)
  mesh.scale.copy(body.scale)
  mesh.updateMatrixWorld(true)
  mesh.bind(body.skeleton, body.bindMatrix)
  mesh.castShadow = true
  mesh.receiveShadow = false
  mesh.frustumCulled = false
  return mesh
}

/* ─── materials ─────────────────────────────────────────────────────────── */

function findMToon(vrm: VRM, key: string): MToonMaterial | null {
  let found: MToonMaterial | null = null
  vrm.scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || found) return
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const mt = m as MToonMaterial
      if (mt.isMToonMaterial && !mt.isOutline && mt.name.includes(key)) found = mt
    }
  })
  return found
}

function clothMaterial(vrm: VRM, colour: string, map: THREE.Texture | null = null) {
  const src = findMToon(vrm, 'Tops')
  const c = new THREE.Color(colour)
  if (!src) return new THREE.MeshStandardMaterial({ color: c, map, roughness: 0.9, side: THREE.DoubleSide })
  const m = src.clone() as MToonMaterial
  m.map = map
  m.shadeMultiplyTexture = map
  m.normalMap = null
  m.color = c
  // shaded side = the same fabric, darker (MToon mixes lit ↔ shade colours)
  m.shadeColorFactor = c.clone().multiplyScalar(0.62)
  m.shadingToonyFactor = 0.35
  m.shadingShiftFactor = 0
  // no anime rim/matcap sheen on the new clothes (it washes dark fabric out to grey)
  m.matcapTexture = null
  m.matcapFactor = new THREE.Color(0, 0, 0)
  m.parametricRimColorFactor = new THREE.Color(0, 0, 0)
  m.rimMultiplyTexture = null
  m.side = THREE.DoubleSide
  m.name = 'Outfit_CLOTH'
  m.needsUpdate = true
  return m
}

/** Fine woven-cloth noise so plain fabric doesn't look like plastic. */
function weaveTexture(seed: number) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.fillRect(0, 0, 128, 128)
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  for (let i = 0; i < 2600; i++) {
    const v = 238 + Math.floor(rnd() * 17)
    g.fillStyle = `rgb(${v},${v},${v})`
    g.fillRect(Math.floor(rnd() * 128), Math.floor(rnd() * 128), 1 + Math.floor(rnd() * 3), 1)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(10, 8)
  return t
}

/** White cap with rows of grey Hausa-style embroidery (diamonds + zigzags). */
function capTexture(base: string, thread: string) {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 128
  const g = c.getContext('2d')!
  g.fillStyle = base
  g.fillRect(0, 0, 512, 128)
  g.strokeStyle = thread
  g.fillStyle = thread
  g.lineWidth = 2
  // zigzag bands
  for (const y of [16, 104]) {
    g.beginPath()
    for (let x = 0; x <= 512; x += 8) g.lineTo(x, y + ((x / 8) % 2 ? 5 : -5))
    g.stroke()
  }
  // diamonds row
  for (let x = 8; x < 512; x += 32) {
    g.beginPath()
    g.moveTo(x + 8, 40)
    g.lineTo(x + 16, 60)
    g.lineTo(x + 8, 80)
    g.lineTo(x, 60)
    g.closePath()
    g.stroke()
    g.beginPath()
    g.arc(x + 8, 60, 2.5, 0, Math.PI * 2)
    g.fill()
  }
  // tiny eyelet dots
  for (let x = 0; x < 512; x += 6) {
    g.fillRect(x, 28, 2, 2)
    g.fillRect(x + 3, 92, 2, 2)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

/* ─── her: hijab ───────────────────────────────────────────────────────── */

function addHijab(vrm: VRM, colour: string) {
  const M = measure(vrm)
  const hair = M.box('HAIR')
  const face = M.box('Face_00_SKIN')
  const brow = M.box('FaceBrow')
  const mouth = M.box('FaceMouth')
  const tops = M.box('Tops')
  const neck = M.bone('neck')
  const upperChest = M.bone('upperChest')
  const shoulder = M.bone('leftUpperArm')

  const top = hair.max.y + 0.014
  const chin = mouth.min.y - 0.026
  const headCY = (top + chin) / 2 + 0.01
  const czH = (hair.min.z + face.max.z) / 2 - 0.004
  const AX = Math.max(face.max.x, hair.max.x) + 0.016
  const AZF = face.max.z - czH + 0.012
  const AZB = czH - hair.min.z + 0.016
  const ay = top - headCY

  const shoulderY = shoulder.y
  const chestFront = tops.max.z
  const sx = shoulder.x // shoulder joint (upper arm root)
  const nz = neck.z
  const keys: [number, number, number, number, number][] = [
    [headCY, AX, AZF, AZB, czH],
    [chin + 0.03, AX * 0.94, AZF * 0.86, AZB * 0.97, czH],
    [chin - 0.014, AX * 0.8, AZF * 0.74, AZB * 0.9, czH - 0.004],
    [neck.y + 0.012, AX * 0.8, AZF * 0.68, AZB * 0.84, czH - 0.01],
    // falls over the slope of the shoulders
    [shoulderY + 0.045, sx + 0.035, chestFront - nz - 0.005, AZB * 0.95, nz + 0.004],
    [shoulderY + 0.012, sx + 0.075, chestFront - nz + 0.012, AZB * 1.05, nz + 0.006],
    [shoulderY - 0.03, sx + 0.085, chestFront - nz + 0.024, AZB * 1.1, nz + 0.008],
    [upperChest.y - 0.09, sx + 0.07, chestFront - nz + 0.03, AZB * 1.1, nz + 0.008],
  ]
  const bottom = keys[keys.length - 1][0]

  // face opening: from just under the chin to just above the brows
  const openTop = brow.max.y + 0.014
  const openBot = chin + 0.006
  const yo = (openTop + openBot) / 2
  const ho = (openTop - openBot) / 2
  const W = 0.86

  const rings: Ring[] = []
  // dome
  const DOME = 14
  for (let k = 0; k <= DOME; k++) {
    const phi = (k / DOME) * (Math.PI / 2)
    const s = Math.sin(phi)
    const y = headCY + ay * Math.cos(phi)
    rings.push({ y, cz: czH, rx: AX * Math.max(s, 0.001), rzF: AZF * Math.max(s, 0.001), rzB: AZB * Math.max(s, 0.001), open: 0 })
  }
  // from the head's equator down over the shoulders
  const STEPS = 44
  for (let k = 1; k <= STEPS; k++) {
    const y = headCY - ((headCY - bottom) * k) / STEPS
    const [, rx, rzF, rzB, cz] = keyed(keys, y)
    let open = 0
    if (y < openTop && y > openBot) open = W * Math.sqrt(Math.max(0, 1 - ((y - yo) / ho) ** 2))
    rings.push({ y, cz, rx, rzF, rzB, open })
  }
  // add rings above the equator that intersect the forehead opening
  for (const r of rings) {
    if (r.open === 0 && r.y < openTop && r.y > openBot) r.open = W * Math.sqrt(Math.max(0, 1 - ((r.y - yo) / ho) ** 2))
  }

  const nRings = rings.length
  const drapeStart = rings.findIndex((r) => r.y < neck.y)
  const g = loft(rings, 72, (a, i) => {
    if (i < drapeStart) return 0
    const t = (i - drapeStart) / Math.max(1, nRings - 1 - drapeStart)
    // soft vertical folds, deeper towards the hem; fewer at the front so it falls straight
    return t * (0.035 * Math.sin(a * 9 + 0.6) + 0.02 * Math.sin(a * 5 + 1.7))
  })
  // a rounded hem: lowest at the front, a little shorter at the back, and
  // curving up over the arms at the sides
  {
    const pos = g.attributes.position
    const below = shoulderY + 0.02
    const span = below - bottom
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      if (y >= below) continue
      const t = (below - y) / span
      const dx = pos.getX(i) / (sx + 0.08)
      const dz = (pos.getZ(i) - nz) / (chestFront - nz + 0.03)
      const side = Math.min(1, dx * dx)
      const front = Math.max(0, dz)
      pos.setY(i, y + span * (0.3 * t * t * side - 0.22 * t * front * front + 0.06 * t * t * Math.max(0, -dz)))
    }
  }
  smoothNormals(g)

  const chinBand = chin - 0.004
  const lowBand = shoulderY + 0.025
  const mat = clothMaterial(vrm, colour, weaveTexture(11))
  const mesh = skin(vrm, g, mat, (p) => {
    if (p.y >= chinBand) return [['head', 1]]
    if (p.y <= lowBand) return [['upperChest', 1]]
    const t = (chinBand - p.y) / (chinBand - lowBand)
    const h = Math.max(0, 1 - 2 * t)
    const c = Math.max(0, 2 * t - 1)
    return [
      ['head', h],
      ['neck', 1 - h - c],
      ['upperChest', c],
    ]
  })
  mesh.name = 'Hijab'

  // Hair is hidden under the hijab
  vrm.scene.traverse((o) => {
    const m = o as THREE.Mesh
    if (m.isMesh && /HAIR/.test(matName(m.material))) m.visible = false
  })
}

/* ─── him: kaftan hem + cap ─────────────────────────────────────────────── */

function addKaftan(vrm: VRM, colour: string) {
  const M = measure(vrm)
  const tops = M.box('Tops')
  const bottoms = M.box('Bottoms')
  const hips = M.bone('hips')
  const knee = M.bone('leftLowerLeg')

  const y0 = tops.min.y + 0.085
  const y1 = knee.y - 0.03 // senator top: ends just over the knee
  const hx = M.bone('leftUpperLeg').x + 0.078
  const hzF = THREE.MathUtils.clamp(bottoms.max.z - hips.z, 0.1, 0.125)
  const hzB = THREE.MathUtils.clamp(hips.z - bottoms.min.z, 0.1, 0.125)

  const rings: Ring[] = []
  const N = 30
  for (let k = 0; k <= N; k++) {
    const t = k / N
    const y = y0 + (y1 - y0) * t
    const flare = 1 + 0.07 * t ** 1.3
    rings.push({ y, cz: hips.z, rx: hx * flare, rzF: hzF * (1 + 0.12 * t ** 1.2), rzB: hzB * (1 + 0.1 * t ** 1.2), open: 0 })
  }
  const g = loft(rings, 64, (a, i) => {
    const t = i / N
    return t * (0.012 * Math.sin(a * 8) + 0.006 * Math.sin(a * 13 + 0.8))
  })
  smoothNormals(g)
  const mat = clothMaterial(vrm, colour, weaveTexture(5))
  const legX = M.bone('leftUpperLeg').x
  const mesh = skin(vrm, g, mat, (p) => {
    const t = clamp01((y0 - p.y) / (y0 - y1))
    // the front panel follows the thighs (so it lies on the lap when seated),
    // the back panel hangs more from the hips
    const front = clamp01((p.z - hips.z) / hzF * 0.5 + 0.5)
    const leg = smooth(clamp01(t / 0.6)) * (0.55 + 0.42 * front)
    const side = THREE.MathUtils.clamp(p.x / (legX * 1.6), -1, 1) // +x = his left
    return [
      ['hips', 1 - leg],
      ['leftUpperLeg', leg * (0.5 + 0.5 * side)],
      ['rightUpperLeg', leg * (0.5 - 0.5 * side)],
    ]
  })
  mesh.name = 'KaftanHem'
}

function addCap(vrm: VRM, base: string, thread: string) {
  const M = measure(vrm)
  const hair = M.box('HAIR')
  const brow = M.box('FaceBrow')
  const head = vrm.humanoid.getRawBoneNode('head')!

  const rx = hair.max.x + 0.008
  const rz = (hair.max.z - hair.min.z) / 2 + 0.01
  const cz = (hair.max.z + hair.min.z) / 2 - 0.006
  const h = 0.09
  // a soft cylinder: straight sides, gently rounded top edge, flat crown
  const profile: [number, number][] = []
  for (let i = 0; i <= 8; i++) profile.push([1 - 0.01 * i, (h * 0.86 * i) / 8])
  for (let i = 1; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2)
    profile.push([0.93 + 0.06 * Math.cos(a), h * 0.86 + h * 0.14 * Math.sin(a)])
  }
  profile.push([0.6, h + 0.002], [0.25, h + 0.004], [0.001, h + 0.004])
  const seg = 56
  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  profile.forEach(([r, y], i) => {
    for (let j = 0; j <= seg; j++) {
      const a = (j / seg) * Math.PI * 2
      pos.push(Math.sin(a) * rx * r, y, Math.cos(a) * rz * r)
      uv.push(j / seg, Math.min(1, y / (h * 0.86)))
    }
    if (i > 0) {
      for (let j = 0; j < seg; j++) {
        const a = (i - 1) * (seg + 1) + j
        const c = a + seg + 1
        idx.push(a, c, a + 1, a + 1, c, c + 1)
      }
    }
  })
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  smoothNormals(g)
  // sit it on the crown, tilted back so the front rests just above the brows
  const tilt = -0.24
  const baseFront = brow.max.y + 0.03
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(0, baseFront - Math.sin(-tilt) * rz * 0.9, cz),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(tilt, 0, 0)),
    new THREE.Vector3(1, 1, 1),
  )
  g.applyMatrix4(m)
  // world → head-bone space, so the cap simply rides along with the head
  vrm.scene.updateMatrixWorld(true)
  g.applyMatrix4(new THREE.Matrix4().copy(head.matrixWorld).invert())
  const mat = clothMaterial(vrm, '#ffffff', capTexture(base, thread))
  const cap = new THREE.Mesh(g, mat)
  cap.name = 'Cap'
  cap.castShadow = true
  cap.frustumCulled = false
  head.add(cap)
}

/* ─── public ────────────────────────────────────────────────────────────── */

const dressed = new WeakSet<VRM>()

export function dressVRM(vrm: VRM, ap: ProceduralAppearance) {
  if (dressed.has(vrm)) return
  dressed.add(vrm)
  // Softer, more natural shading than the default anime look
  vrm.scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    for (const m of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      const mt = m as MToonMaterial
      if (!mt.isMToonMaterial) continue
      // No anime ink outlines: they're drawn as an inside-out copy of the body,
      // which pokes through as black lines/patches at bent knees and elbows
      if (mt.isOutline) mt.visible = false
    }
    // No self-shadowing on the characters (avoids flickering dark stripes,
    // "shadow acne", especially on phone GPUs). They still cast shadows.
    mesh.receiveShadow = false
  })
  if (ap.body === 'female') {
    addHijab(vrm, ap.headwear)
  } else {
    addKaftan(vrm, ap.outfit)
    addCap(vrm, ap.headwear, ap.headwearPattern)
  }
}
