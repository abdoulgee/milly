/**
 * Tiny "digital clay" toolkit for sculpting characters in code.
 *
 * Shapes are signed distance functions (SDFs) that are blended together with
 * smooth unions, so limbs, faces and clothes flow into each other like a
 * sculpted model instead of looking like stacked primitives. A part is then
 * turned into a triangle mesh with Surface Nets, and every vertex gets:
 *   - a normal from the field gradient (smooth shading),
 *   - a colour from the nearest shape, darkened by baked ambient occlusion,
 *   - skin weights (up to 4 bones) from the nearest shapes' bones,
 * so the result can be a THREE.SkinnedMesh driven by a skeleton.
 */
import * as THREE from 'three'

export type V3 = [number, number, number]
/** A bone index, or a function giving [bone, weight] pairs at a point. */
export type Binding = number | ((x: number, y: number, z: number) => [number, number][])

export interface Prim {
  sd: (x: number, y: number, z: number) => number
  min: V3
  max: V3
  /** Smooth-blend radius with the shapes before it (0 = hard edge) */
  k: number
  op: 'add' | 'sub'
  color: THREE.Color | null
  bind: Binding
}

export interface PrimOpts {
  k?: number
  color?: THREE.ColorRepresentation | null
  bind?: Binding
  op?: 'add' | 'sub'
}

function make(sd: Prim['sd'], min: V3, max: V3, o: PrimOpts): Prim {
  return {
    sd,
    min,
    max,
    k: o.k ?? 0,
    op: o.op ?? 'add',
    color: o.color == null ? null : new THREE.Color(o.color),
    bind: o.bind ?? 0,
  }
}

export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
export const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]

export function ellipsoid(c: V3, r: V3, o: PrimOpts): Prim {
  const [cx, cy, cz] = c
  const [rx, ry, rz] = r
  return make(
    (x, y, z) => {
      const px = x - cx
      const py = y - cy
      const pz = z - cz
      const k0 = Math.hypot(px / rx, py / ry, pz / rz)
      const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz))
      return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1
    },
    [cx - rx, cy - ry, cz - rz],
    [cx + rx, cy + ry, cz + rz],
    o,
  )
}

/** Capsule whose radius changes from r1 (at a) to r2 (at b). */
export function roundCone(a: V3, b: V3, r1: number, r2: number, o: PrimOpts): Prim {
  const bax = b[0] - a[0]
  const bay = b[1] - a[1]
  const baz = b[2] - a[2]
  const l2 = bax * bax + bay * bay + baz * baz
  const rr = r1 - r2
  const a2 = l2 - rr * rr
  const il2 = 1 / l2
  return make(
    (x, y, z) => {
      const pax = x - a[0]
      const pay = y - a[1]
      const paz = z - a[2]
      const yy = pax * bax + pay * bay + paz * baz
      const zz = yy - l2
      const qx = pax * l2 - bax * yy
      const qy = pay * l2 - bay * yy
      const qz = paz * l2 - baz * yy
      const x2 = qx * qx + qy * qy + qz * qz
      const y2 = yy * yy * l2
      const z2 = zz * zz * l2
      const k = Math.sign(rr) * rr * rr * x2
      if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2
      if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1
    },
    [Math.min(a[0] - r1, b[0] - r2), Math.min(a[1] - r1, b[1] - r2), Math.min(a[2] - r1, b[2] - r2)],
    [Math.max(a[0] + r1, b[0] + r2), Math.max(a[1] + r1, b[1] + r2), Math.max(a[2] + r1, b[2] + r2)],
    o,
  )
}

/** Truncated cone with flat (slightly rounded) ends — sleeves, hems, trouser legs. */
export function cappedCone(a: V3, b: V3, ra: number, rb: number, round: number, o: PrimOpts): Prim {
  ra -= round
  rb -= round
  const bax = b[0] - a[0]
  const bay = b[1] - a[1]
  const baz = b[2] - a[2]
  const baba = bax * bax + bay * bay + baz * baz
  const rba = rb - ra
  const kk = rba * rba + baba
  const R = Math.max(ra, rb) + round
  return make(
    (x, y, z) => {
      const pax = x - a[0]
      const pay = y - a[1]
      const paz = z - a[2]
      const papa = pax * pax + pay * pay + paz * paz
      const paba = (pax * bax + pay * bay + paz * baz) / baba
      const xx = Math.sqrt(Math.max(0, papa - paba * paba * baba))
      const cax = Math.max(0, xx - (paba < 0.5 ? ra : rb))
      const cay = Math.abs(paba - 0.5) - 0.5
      const f = Math.min(1, Math.max(0, (rba * (xx - ra) + paba * baba) / kk))
      const cbx = xx - ra - f * rba
      const cby = paba - f
      const s = cbx < 0 && cay < 0 ? -1 : 1
      return s * Math.sqrt(Math.min(cax * cax + cay * cay * baba, cbx * cbx + cby * cby * baba)) - round
    },
    [Math.min(a[0], b[0]) - R, Math.min(a[1], b[1]) - R, Math.min(a[2], b[2]) - R],
    [Math.max(a[0], b[0]) + R, Math.max(a[1], b[1]) + R, Math.max(a[2], b[2]) + R],
    o,
  )
}

/** Non-uniform scale about `c` (e.g. an oval torso cross-section). */
export function squash(p: Prim, c: V3, s: V3): Prim {
  const m = Math.min(s[0], s[1], s[2])
  return {
    ...p,
    sd: (x, y, z) => p.sd((x - c[0]) / s[0] + c[0], (y - c[1]) / s[1] + c[1], (z - c[2]) / s[2] + c[2]) * m,
    min: [c[0] + (p.min[0] - c[0]) * s[0], c[1] + (p.min[1] - c[1]) * s[1], c[2] + (p.min[2] - c[2]) * s[2]],
    max: [c[0] + (p.max[0] - c[0]) * s[0], c[1] + (p.max[1] - c[1]) * s[1], c[2] + (p.max[2] - c[2]) * s[2]],
  }
}

/** Adds surface detail (folds, ridges). `amp` is the largest displacement. */
export function displace(p: Prim, f: (x: number, y: number, z: number) => number, amp: number): Prim {
  return {
    ...p,
    sd: (x, y, z) => p.sd(x, y, z) + f(x, y, z),
    min: [p.min[0] - amp, p.min[1] - amp, p.min[2] - amp],
    max: [p.max[0] + amp, p.max[1] + amp, p.max[2] + amp],
  }
}

/** Keeps only the part of a shape on the negative side of `cut` (an SDF-like plane function). */
export function clip(p: Prim, cut: (x: number, y: number, z: number) => number): Prim {
  return { ...p, sd: (x, y, z) => Math.max(p.sd(x, y, z), cut(x, y, z)) }
}

const smin = (a: number, b: number, k: number) => {
  if (k <= 0) return a < b ? a : b
  const h = Math.max(k - Math.abs(a - b), 0) / k
  return Math.min(a, b) - h * h * k * 0.25
}
const smax = (a: number, b: number, k: number) => -smin(-a, -b, k)

const EDGES = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [1, 3], [4, 6], [5, 7],
  [0, 4], [1, 5], [2, 6], [3, 7],
]

/** Raw mesh data for one sculpted part (transferable from a worker). */
export interface PartArrays {
  position: Float32Array
  normal: Float32Array
  color: Float32Array
  skinIndex: Uint16Array
  skinWeight: Float32Array
  index: Uint32Array
}

export function partToGeometry(p: PartArrays): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(p.position, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(p.normal, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(p.color, 3))
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(p.skinIndex, 4))
  geo.setAttribute('skinWeight', new THREE.BufferAttribute(p.skinWeight, 4))
  const count = p.position.length / 3
  geo.setIndex(new THREE.BufferAttribute(count > 65535 ? p.index : Uint16Array.from(p.index), 1))
  geo.computeBoundingSphere()
  return geo
}

/**
 * Polygonises a set of shapes into skinnable mesh data.
 * `h` is the voxel size in metres (smaller = more detail).
 */
export function buildPart(prims: Prim[], h: number, boneCount: number): PartArrays {
  // ── Field bounds ──
  const lo: V3 = [Infinity, Infinity, Infinity]
  const hi: V3 = [-Infinity, -Infinity, -Infinity]
  for (const p of prims) {
    if (p.op !== 'add') continue
    for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], p.min[i] - p.k)
      hi[i] = Math.max(hi[i], p.max[i] + p.k)
    }
  }
  const pad = 3 * h
  const x0 = lo[0] - pad
  const y0 = lo[1] - pad
  const z0 = lo[2] - pad
  const nx = Math.ceil((hi[0] - lo[0] + 2 * pad) / h) + 1
  const ny = Math.ceil((hi[1] - lo[1] + 2 * pad) / h) + 1
  const nz = Math.ceil((hi[2] - lo[2] + 2 * pad) / h) + 1
  const field = new Float32Array(nx * ny * nz).fill(1)
  const G = (x: number, y: number, z: number) => x + nx * (y + ny * z)

  // ── Splat every shape into the field, only inside its own bounds ──
  for (const p of prims) {
    const m = p.k + 3 * h
    const ix0 = Math.max(0, Math.floor((p.min[0] - m - x0) / h))
    const iy0 = Math.max(0, Math.floor((p.min[1] - m - y0) / h))
    const iz0 = Math.max(0, Math.floor((p.min[2] - m - z0) / h))
    const ix1 = Math.min(nx - 1, Math.ceil((p.max[0] + m - x0) / h))
    const iy1 = Math.min(ny - 1, Math.ceil((p.max[1] + m - y0) / h))
    const iz1 = Math.min(nz - 1, Math.ceil((p.max[2] + m - z0) / h))
    const sub = p.op === 'sub'
    for (let z = iz0; z <= iz1; z++) {
      const wz = z0 + z * h
      for (let y = iy0; y <= iy1; y++) {
        const wy = y0 + y * h
        let i = G(ix0, y, z)
        for (let x = ix0; x <= ix1; x++, i++) {
          const d = p.sd(x0 + x * h, wy, wz)
          field[i] = sub ? smax(field[i], -d, p.k) : smin(field[i], d, p.k)
        }
      }
    }
  }

  // ── Surface Nets: one vertex per cell crossing the surface ──
  const cx = nx - 1
  const cy = ny - 1
  const cz = nz - 1
  const cellVert = new Int32Array(cx * cy * cz).fill(-1)
  const pos: number[] = []
  const c = new Float32Array(8)
  for (let z = 0; z < cz; z++) {
    for (let y = 0; y < cy; y++) {
      for (let x = 0; x < cx; x++) {
        let mask = 0
        for (let i = 0; i < 8; i++) {
          const v = field[G(x + (i & 1), y + ((i >> 1) & 1), z + ((i >> 2) & 1))]
          c[i] = v
          if (v < 0) mask |= 1 << i
        }
        if (mask === 0 || mask === 255) continue
        let sx = 0
        let sy = 0
        let sz = 0
        let n = 0
        for (const [a, b] of EDGES) {
          const va = c[a]
          const vb = c[b]
          if (va < 0 === vb < 0) continue
          const t = va / (va - vb)
          sx += (a & 1) + ((b & 1) - (a & 1)) * t
          sy += ((a >> 1) & 1) + (((b >> 1) & 1) - ((a >> 1) & 1)) * t
          sz += ((a >> 2) & 1) + (((b >> 2) & 1) - ((a >> 2) & 1)) * t
          n++
        }
        cellVert[x + cx * (y + cy * z)] = pos.length / 3
        pos.push(x0 + (x + sx / n) * h, y0 + (y + sy / n) * h, z0 + (z + sz / n) * h)
      }
    }
  }

  // ── Faces: a quad for every grid edge that crosses the surface ──
  const index: number[] = []
  const cell = (x: number, y: number, z: number) => cellVert[x + cx * (y + cy * z)]
  const quad = (a: number, b: number, cc: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || cc < 0 || d < 0) return
    if (flip) index.push(a, b, cc, a, cc, d)
    else index.push(a, cc, b, a, d, cc)
  }
  for (let z = 0; z < nz; z++) {
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const in0 = field[G(x, y, z)] < 0
        if (x < cx && y > 0 && z > 0 && y < cy && z < cz) {
          if (in0 !== field[G(x + 1, y, z)] < 0) quad(cell(x, y - 1, z - 1), cell(x, y, z - 1), cell(x, y, z), cell(x, y - 1, z), in0)
        }
        if (y < cy && z > 0 && x > 0 && z < cz && x < cx) {
          if (in0 !== field[G(x, y + 1, z)] < 0) quad(cell(x - 1, y, z - 1), cell(x - 1, y, z), cell(x, y, z), cell(x, y, z - 1), in0)
        }
        if (z < cz && x > 0 && y > 0 && x < cx && y < cy) {
          if (in0 !== field[G(x, y, z + 1)] < 0) quad(cell(x - 1, y - 1, z), cell(x, y - 1, z), cell(x, y, z), cell(x - 1, y, z), in0)
        }
      }
    }
  }

  // ── Field sampling (trilinear) for normals and ambient occlusion ──
  const sample = (px: number, py: number, pz: number) => {
    const fx = Math.min(Math.max((px - x0) / h, 0), nx - 1.001)
    const fy = Math.min(Math.max((py - y0) / h, 0), ny - 1.001)
    const fz = Math.min(Math.max((pz - z0) / h, 0), nz - 1.001)
    const ix = fx | 0
    const iy = fy | 0
    const iz = fz | 0
    const tx = fx - ix
    const ty = fy - iy
    const tz = fz - iz
    const i = G(ix, iy, iz)
    const sy = nx
    const sz = nx * ny
    const c00 = field[i] + (field[i + 1] - field[i]) * tx
    const c10 = field[i + sy] + (field[i + sy + 1] - field[i + sy]) * tx
    const c01 = field[i + sz] + (field[i + sz + 1] - field[i + sz]) * tx
    const c11 = field[i + sz + sy] + (field[i + sz + sy + 1] - field[i + sz + sy]) * tx
    const c0 = c00 + (c10 - c00) * ty
    const c1 = c01 + (c11 - c01) * ty
    return c0 + (c1 - c0) * tz
  }

  const count = pos.length / 3
  const normals = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const skinIndex = new Uint16Array(count * 4)
  const skinWeight = new Float32Array(count * 4)
  const boneAcc = new Float32Array(boneCount)
  const dist = new Float32Array(prims.length)
  const adds = prims.map((p, i) => (p.op === 'add' ? i : -1)).filter((i) => i >= 0)
  const NEAR = 0.03

  for (let v = 0; v < count; v++) {
    const px = pos[v * 3]
    const py = pos[v * 3 + 1]
    const pz = pos[v * 3 + 2]

    // Normal from the gradient
    let nxv = sample(px + h, py, pz) - sample(px - h, py, pz)
    let nyv = sample(px, py + h, pz) - sample(px, py - h, pz)
    let nzv = sample(px, py, pz + h) - sample(px, py, pz - h)
    const nl = Math.hypot(nxv, nyv, nzv) || 1
    nxv /= nl
    nyv /= nl
    nzv /= nl
    normals[v * 3] = nxv
    normals[v * 3 + 1] = nyv
    normals[v * 3 + 2] = nzv

    // Ambient occlusion: how much the field closes in along the normal
    let occ = 0
    let wsum = 0
    for (let s = 1; s <= 4; s++) {
      const dd = s * 0.009
      const f = sample(px + nxv * dd, py + nyv * dd, pz + nzv * dd)
      const w = 1 / s
      occ += (Math.max(0, dd - f) / dd) * w
      wsum += w
    }
    const ao = Math.min(1, Math.max(0.42, 1 - (occ / wsum) * 1.15))

    // Distances to nearby shapes
    let dmin = Infinity
    for (const i of adds) {
      const p = prims[i]
      if (px < p.min[0] - NEAR || px > p.max[0] + NEAR || py < p.min[1] - NEAR || py > p.max[1] + NEAR || pz < p.min[2] - NEAR || pz > p.max[2] + NEAR) {
        dist[i] = Infinity
        continue
      }
      const d = Math.abs(p.sd(px, py, pz))
      dist[i] = d
      if (d < dmin) dmin = d
    }

    // Colour: soft blend of the nearest painting shapes
    let r = 0
    let g = 0
    let b = 0
    let cw = 0
    let cmin = Infinity
    for (const i of adds) if (prims[i].color && dist[i] < cmin) cmin = dist[i]
    for (const i of adds) {
      const col = prims[i].color
      if (!col || dist[i] > cmin + 0.006) continue
      const w = Math.exp(-(dist[i] - cmin) / 0.0018)
      r += col.r * w
      g += col.g * w
      b += col.b * w
      cw += w
    }
    if (cw > 0) {
      colors[v * 3] = (r / cw) * ao
      colors[v * 3 + 1] = (g / cw) * ao
      colors[v * 3 + 2] = (b / cw) * ao
    }

    // Skin weights from the nearest shapes' bones
    boneAcc.fill(0)
    for (const i of adds) {
      const d = dist[i]
      if (d > dmin + 0.022) continue
      const w = (1 - (d - dmin) / 0.022) ** 2
      const bind = prims[i].bind
      if (typeof bind === 'number') boneAcc[bind] += w
      else for (const [bone, bw] of bind(px, py, pz)) boneAcc[bone] += w * bw
    }
    let total = 0
    for (let k = 0; k < 4; k++) {
      let best = 0
      let bw = -1
      for (let j = 0; j < boneCount; j++) {
        if (boneAcc[j] > bw) {
          bw = boneAcc[j]
          best = j
        }
      }
      skinIndex[v * 4 + k] = best
      skinWeight[v * 4 + k] = Math.max(0, bw)
      total += Math.max(0, bw)
      boneAcc[best] = -1
    }
    for (let k = 0; k < 4; k++) skinWeight[v * 4 + k] = total > 0 ? skinWeight[v * 4 + k] / total : k === 0 ? 1 : 0
  }

  // Make sure triangles face outwards (compare with the gradient normals)
  let agree = 0
  for (let t = 0; t < Math.min(index.length, 600); t += 3) {
    const a = index[t] * 3
    const b = index[t + 1] * 3
    const cc = index[t + 2] * 3
    const ux = pos[b] - pos[a]
    const uy = pos[b + 1] - pos[a + 1]
    const uz = pos[b + 2] - pos[a + 2]
    const wx = pos[cc] - pos[a]
    const wy = pos[cc + 1] - pos[a + 1]
    const wz = pos[cc + 2] - pos[a + 2]
    const fx = uy * wz - uz * wy
    const fy = uz * wx - ux * wz
    const fz = ux * wy - uy * wx
    agree += Math.sign(fx * normals[a] + fy * normals[a + 1] + fz * normals[a + 2])
  }
  if (agree < 0) {
    for (let t = 0; t < index.length; t += 3) {
      const tmp = index[t + 1]
      index[t + 1] = index[t + 2]
      index[t + 2] = tmp
    }
  }

  return {
    position: Float32Array.from(pos),
    normal: normals,
    color: colors,
    skinIndex,
    skinWeight,
    index: Uint32Array.from(index),
  }
}
