/**
 * MuseumLayout — the single source of truth for the museum's floor plan.
 *
 * The museum is ONE continuous rectangular hall. Everything (entrance,
 * gallery, fountain, special corner, birthday corner) lives inside the same
 * room; "sections" are just ranges along the hall's length (the Z axis).
 *
 *   +Z (south)  ── entrance / spawn
 *        │        main memories gallery + central fountain
 *        │        special memories corner
 *   -Z (north)  ── birthday surprise corner
 *
 * Colliders are simple 2D shapes on the floor plane (XZ). They are cheap to
 * test every frame and good enough for a walking-only experience.
 */
import type { Vector3 } from 'three'

export const ROOM = {
  halfWidth: 11, // X extent: -11 .. 11
  halfLength: 22, // Z extent: -22 .. 22
  height: 6.5,
} as const

/** Highest the camera may go (keeps it under the chandeliers). */
export const CAMERA_MAX_Y = 4.35

/** Z positions of key landmarks (handy for placing decor). */
export const LANDMARKS = {
  spawn: { x: 0, z: 17.6 },
  companionSpawn: { x: 1.1, z: 18.6 },
  archZ: 13,
  fountain: { x: 0, z: 4.25, radius: 2.15 },
  heartSculpture: { x: 0, z: -10.25 },
  cake: { x: 0, z: -18.4 },
} as const

/** Wall-mounted pilasters (Z positions), shared by both long walls. */
export const PILASTER_Z = [17.75, 13.25, 8.75, 4.25, -0.25, -4.75, -14.75, -18.5]

export const SECTIONS = {
  entrance: { from: 22, to: 13 },
  gallery: { from: 13, to: -5.75 },
  special: { from: -5.75, to: -14.75 },
  birthday: { from: -14.75, to: -22 },
} as const

// ---------------------------------------------------------------------------
// Colliders
// ---------------------------------------------------------------------------

export type Collider =
  | { kind: 'circle'; x: number; z: number; r: number; /** blocks camera below this height */ h?: number }
  | { kind: 'box'; minX: number; maxX: number; minZ: number; maxZ: number; h?: number }

const circle = (x: number, z: number, r: number, h?: number): Collider => ({ kind: 'circle', x, z, r, h })
const box = (cx: number, cz: number, hx: number, hz: number, h?: number): Collider => ({
  kind: 'box',
  minX: cx - hx,
  maxX: cx + hx,
  minZ: cz - hz,
  maxZ: cz + hz,
  h,
})

/** Furniture & decor positions (consumed by the scene components too). */
export const PLACEMENTS = {
  archPillars: [
    { x: -2.45, z: LANDMARKS.archZ },
    { x: 2.45, z: LANDMARKS.archZ },
  ],
  welcomeSign: { x: 3.9, z: 15.6, rotY: -0.5 },
  benches: [
    { x: -6.7, z: 4.25 },
    { x: 6.7, z: 4.25 },
    { x: -6.7, z: -10.25 },
    { x: 6.7, z: -10.25 },
  ],
  plants: [
    { x: -9.7, z: 20.9, s: 1.1 },
    { x: 9.7, z: 20.9, s: 1.1 },
    { x: -3.55, z: 13.0, s: 0.85 },
    { x: 3.55, z: 13.0, s: 0.85 },
    { x: -10.1, z: 8.75, s: 0.95 },
    { x: 10.1, z: 8.75, s: 0.95 },
    { x: -10.1, z: -0.25, s: 0.95 },
    { x: 10.1, z: -0.25, s: 0.95 },
    { x: -10.0, z: -14.75, s: 1.05 },
    { x: 10.0, z: -14.75, s: 1.05 },
    { x: -9.8, z: -21.0, s: 1.15 },
    { x: 9.8, z: -21.0, s: 1.15 },
  ],
  vasePlinths: [
    { x: -4.3, z: 8.9 },
    { x: 4.3, z: 8.9 },
    { x: -4.3, z: -0.4 },
    { x: 4.3, z: -0.4 },
  ],
  presents: [
    { x: -2.2, z: -19.3, w: 0.55, h: 0.45, d: 0.55, color: '#f4b6c8', ribbon: '#fff4f0', rot: 0.3 },
    { x: -2.75, z: -18.55, w: 0.4, h: 0.36, d: 0.4, color: '#d9c6f2', ribbon: '#e9c27a', rot: -0.4 },
    { x: -2.35, z: -19.3, w: 0.32, h: 0.28, d: 0.32, color: '#fff1e6', ribbon: '#e89ab0', rot: 0.9, stackOn: 0 },
    { x: 2.3, z: -19.2, w: 0.6, h: 0.42, d: 0.5, color: '#fbd5c4', ribbon: '#c98aa0', rot: -0.25 },
    { x: 2.85, z: -18.35, w: 0.36, h: 0.4, d: 0.36, color: '#f7c9d8', ribbon: '#ffffff', rot: 0.5 },
    { x: 1.75, z: -20.2, w: 0.42, h: 0.32, d: 0.42, color: '#e7dcf8', ribbon: '#f29fb5', rot: 0.1 },
  ],
  balloonClusters: [
    { x: -5.6, z: -19.6 },
    { x: 5.6, z: -19.6 },
    { x: -9.2, z: -16.3 },
    { x: 9.2, z: -16.3 },
  ],
} as const

/** Height of the bench cushions (benches are sunk 9 cm into the floor). */
export const BENCH_DROP = 0.09

/**
 * Two seats per bench, facing the nearest long wall (towards the photos).
 * `approach` is where a character stands, back to the bench, before sitting.
 */
export const BENCH_SEATS = PLACEMENTS.benches.map((b) => {
  const yaw = b.x < 0 ? -Math.PI / 2 : Math.PI / 2
  const fx = Math.sin(yaw)
  const seats = [-0.45, 0.45].map((dz) => ({ x: b.x + fx * 0.03, z: b.z + dz }))
  return {
    x: b.x,
    z: b.z,
    yaw,
    fx,
    seats,
    approach: seats.map((s) => ({ x: s.x + fx * 0.66, z: s.z })),
  }
})

export const COLLIDERS: Collider[] = [
  // Entrance arch pillars (tall — they block the camera too)
  ...PLACEMENTS.archPillars.map((p) => box(p.x, p.z, 0.38, 0.38, 3.2)),
  circle(PLACEMENTS.welcomeSign.x, PLACEMENTS.welcomeSign.z, 0.55),
  // Central fountain
  circle(LANDMARKS.fountain.x, LANDMARKS.fountain.z, LANDMARKS.fountain.radius, 1.2),
  // Benches (long axis along Z)
  ...PLACEMENTS.benches.map((b) => box(b.x, b.z, 0.32, 0.95)),
  // Plants & plinths
  ...PLACEMENTS.plants.map((p) => circle(p.x, p.z, 0.42 * p.s)),
  ...PLACEMENTS.vasePlinths.map((p) => circle(p.x, p.z, 0.33)),
  // Wall pilasters (both long walls)
  ...PILASTER_Z.flatMap((z) => [box(-ROOM.halfWidth + 0.1, z, 0.12, 0.3), box(ROOM.halfWidth - 0.1, z, 0.12, 0.3)]),
  // Special corner sculpture
  circle(LANDMARKS.heartSculpture.x, LANDMARKS.heartSculpture.z, 0.8, 1.0),
  // Birthday corner
  circle(LANDMARKS.cake.x, LANDMARKS.cake.z, 1.2, 1.0),
  ...PLACEMENTS.presents.filter((p) => !('stackOn' in p)).map((p) => circle(p.x, p.z, Math.max(p.w, p.d) * 0.6)),
  ...PLACEMENTS.balloonClusters.map((b) => circle(b.x, b.z, 0.45)),
]

/** Walkable bounds = room minus a small wall margin. */
const WALL_MARGIN = 0.05

/**
 * Push a point out of all colliders (mutates `p`). Returns true if it moved.
 * `radius` is the character's body radius.
 */
export function resolveCollisions(p: Vector3, radius: number): boolean {
  const ox = p.x
  const oz = p.z
  for (let iter = 0; iter < 2; iter++) {
    for (const c of COLLIDERS) {
      if (c.kind === 'circle') {
        const dx = p.x - c.x
        const dz = p.z - c.z
        const min = c.r + radius
        const d2 = dx * dx + dz * dz
        if (d2 < min * min) {
          const d = Math.sqrt(d2) || 0.0001
          p.x = c.x + (dx / d) * min
          p.z = c.z + (dz / d) * min
        }
      } else {
        const cx = Math.max(c.minX, Math.min(p.x, c.maxX))
        const cz = Math.max(c.minZ, Math.min(p.z, c.maxZ))
        const dx = p.x - cx
        const dz = p.z - cz
        const d2 = dx * dx + dz * dz
        if (d2 > 0 && d2 < radius * radius) {
          const d = Math.sqrt(d2)
          p.x = cx + (dx / d) * radius
          p.z = cz + (dz / d) * radius
        } else if (d2 === 0) {
          // Centre is inside the box: push out along the shallowest axis.
          const pushL = p.x - c.minX + radius
          const pushR = c.maxX - p.x + radius
          const pushB = p.z - c.minZ + radius
          const pushF = c.maxZ - p.z + radius
          const m = Math.min(pushL, pushR, pushB, pushF)
          if (m === pushL) p.x -= pushL
          else if (m === pushR) p.x += pushR
          else if (m === pushB) p.z -= pushB
          else p.z += pushF
        }
      }
    }
    // Room walls
    const maxX = ROOM.halfWidth - radius - WALL_MARGIN
    const maxZ = ROOM.halfLength - radius - WALL_MARGIN
    p.x = Math.max(-maxX, Math.min(maxX, p.x))
    p.z = Math.max(-maxZ, Math.min(maxZ, p.z))
  }
  return p.x !== ox || p.z !== oz
}

/** True if a character of `radius` could stand at (x, z). */
export function isWalkable(x: number, z: number, radius: number, scratch: Vector3): boolean {
  scratch.set(x, 0, z)
  resolveCollisions(scratch, radius)
  return Math.abs(scratch.x - x) < 0.02 && Math.abs(scratch.z - z) < 0.02
}

/**
 * How far a camera can travel from `o` along unit direction `d` before
 * hitting a wall, the ceiling/floor, or a tall object. Used by the camera to
 * avoid clipping into geometry.
 */
export function cameraRayLimit(o: Vector3, d: Vector3, maxDist: number): number {
  const m = 0.3 // keep the near plane off the wall surface
  let t = maxDist
  const axis = (origin: number, dir: number, min: number, max: number) => {
    if (dir > 1e-6) t = Math.min(t, (max - origin) / dir)
    else if (dir < -1e-6) t = Math.min(t, (min - origin) / dir)
  }
  axis(o.x, d.x, -ROOM.halfWidth + m, ROOM.halfWidth - m)
  axis(o.z, d.z, -ROOM.halfLength + m, ROOM.halfLength - m)
  // Stay below the chandeliers (they hang down to ~4.6 m)
  axis(o.y, d.y, 0.35, CAMERA_MAX_Y)

  const lenXZ = Math.hypot(d.x, d.z)
  if (lenXZ < 1e-5) return Math.max(0.5, t)
  for (const c of COLLIDERS) {
    if (c.h === undefined) continue
    let hit = Infinity
    if (c.kind === 'circle') {
      // Ray–circle in XZ (ray parametrised by full 3D t)
      const fx = o.x - c.x
      const fz = o.z - c.z
      const a = d.x * d.x + d.z * d.z
      const b = 2 * (fx * d.x + fz * d.z)
      const cc = fx * fx + fz * fz - (c.r + 0.25) ** 2
      const disc = b * b - 4 * a * cc
      if (disc >= 0 && cc > 0) {
        const t0 = (-b - Math.sqrt(disc)) / (2 * a)
        if (t0 > 0) hit = t0
      }
    } else {
      // Slab test in XZ
      let tmin = 0
      let tmax = Infinity
      const slabs: [number, number, number, number][] = [
        [o.x, d.x, c.minX - 0.25, c.maxX + 0.25],
        [o.z, d.z, c.minZ - 0.25, c.maxZ + 0.25],
      ]
      let ok = true
      for (const [oo, dd, mn, mx] of slabs) {
        if (Math.abs(dd) < 1e-6) {
          if (oo < mn || oo > mx) ok = false
        } else {
          let t1 = (mn - oo) / dd
          let t2 = (mx - oo) / dd
          if (t1 > t2) [t1, t2] = [t2, t1]
          tmin = Math.max(tmin, t1)
          tmax = Math.min(tmax, t2)
        }
      }
      if (ok && tmin <= tmax && tmin > 0) hit = tmin
    }
    if (hit < t && o.y + d.y * hit < c.h) t = hit
  }
  return Math.max(0.6, t)
}
