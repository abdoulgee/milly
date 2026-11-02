/**
 * The two characters, sculpted in code with SDF "clay" (see lib/sdf.ts) and
 * bound to a skeleton. Modelled after female_ref.jpeg / male_ref.jpeg:
 *
 *   Her: maroon hijab wrapped round the face and draped over the chest,
 *        maroon scrubs (short sleeves over long sleeves) with a name badge,
 *        navy trousers, white clogs.
 *   Him: white kaftan to the knee (collar, placket, chest pocket), white
 *        trousers, embroidered cap, bare feet in leather sandals.
 *
 * Everything is in metres, character facing +Z, left side +X, feet at y = 0.
 */
import * as THREE from 'three'
import type { ProceduralAppearance } from '../../../data/museumConfig'
import { capTexture } from '../../../lib/characterTextures'
import { add3, buildPart, cappedCone, clip, displace, ellipsoid, lerp3, partToGeometry, roundCone, squash, type PartArrays, type Prim, type V3 } from '../../../lib/sdf'

export const B = {
  root: 0,
  hips: 1,
  spine: 2,
  chest: 3,
  neck: 4,
  head: 5,
  thighL: 6,
  shinL: 7,
  footL: 8,
  thighR: 9,
  shinR: 10,
  footR: 11,
  upperArmL: 12,
  forearmL: 13,
  handL: 14,
  upperArmR: 15,
  forearmR: 16,
  handR: 17,
} as const
const BONE_COUNT = 18
/** Head size relative to the sculpt (cartoon proportions) */
export const HEAD_SCALE = 1.17

export interface Body {
  hipY: number
  hipX: number
  thigh: number
  shin: number
  /** Ankle joint height above the floor */
  ankle: number
  spine: number
  chest: number
  neck: number
  head: number
  /** Head centre above the head joint */
  headCenter: number
  shoulder: [x: number, y: number]
  upperArm: number
  forearm: number
  /** A-pose angle the arms are sculpted (and bound) in */
  armRest: number
  hand: number
}

export const FEMALE_BODY: Body = {
  hipY: 0.88,
  hipX: 0.08,
  thigh: 0.41,
  shin: 0.4,
  ankle: 0.07,
  spine: 0.1,
  chest: 0.17,
  neck: 0.22,
  head: 0.07,
  headCenter: 0.1,
  shoulder: [0.138, 0.165],
  upperArm: 0.27,
  forearm: 0.235,
  armRest: 0.13,
  hand: 1,
}

export const MALE_BODY: Body = {
  hipY: 0.95,
  hipX: 0.088,
  thigh: 0.445,
  shin: 0.43,
  ankle: 0.075,
  spine: 0.1,
  chest: 0.19,
  neck: 0.24,
  head: 0.06,
  headCenter: 0.105,
  shoulder: [0.168, 0.18],
  upperArm: 0.295,
  forearm: 0.26,
  armRest: 0.12,
  hand: 1.13,
}

export interface FaceRefs {
  eyeL: THREE.Object3D
  eyeR: THREE.Object3D
  lidL: THREE.Object3D
  lidR: THREE.Object3D
  brows: THREE.Object3D
  jaw: THREE.Object3D
  inner: THREE.Object3D
}

export interface CharacterRig {
  group: THREE.Group
  bones: THREE.Bone[]
  face: FaceRefs
  body: Body
  dispose: () => void
}

type JointFn = (bone: number, local?: V3) => V3

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

function makeSkeleton(d: Body) {
  const bones = Array.from({ length: BONE_COUNT }, () => new THREE.Bone())
  const at = (i: number, parent: number, x: number, y: number, z = 0) => {
    bones[i].position.set(x, y, z)
    bones[parent].add(bones[i])
  }
  at(B.hips, B.root, 0, d.hipY)
  at(B.spine, B.hips, 0, d.spine)
  at(B.chest, B.spine, 0, d.chest)
  at(B.neck, B.chest, 0, d.neck)
  at(B.head, B.neck, 0, d.head)
  for (const [s, thigh, shin, foot, ua, fa, hand] of [
    [1, B.thighL, B.shinL, B.footL, B.upperArmL, B.forearmL, B.handL],
    [-1, B.thighR, B.shinR, B.footR, B.upperArmR, B.forearmR, B.handR],
  ] as const) {
    at(thigh, B.hips, s * d.hipX, 0)
    at(shin, thigh, 0, -d.thigh)
    at(foot, shin, 0, -d.shin)
    at(ua, B.chest, s * d.shoulder[0], d.shoulder[1])
    bones[ua].rotation.z = s * d.armRest
    at(fa, ua, 0, -d.upperArm)
    at(hand, fa, 0, -d.forearm)
  }
  bones.forEach((b, i) => (b.name = Object.keys(B)[i]))
  bones[B.root].updateMatrixWorld(true)
  const v = new THREE.Vector3()
  /** World (rest pose) position of a point given in a bone's local frame */
  const J: JointFn = (bone, local = [0, 0, 0]) => {
    v.set(...local)
    bones[bone].localToWorld(v)
    return [v.x, v.y, v.z]
  }
  return { bones, J }
}

/**
 * Tops that hang from the hips (scrub top, kaftan) follow the legs towards
 * the hem. `base` is how much of the leg motion the back of the hem follows.
 */
const skirtBind = (hipY: number, len: number, base: number) => (x: number, y: number, z: number): [number, number][] => {
  const drop = Math.min(1, Math.max(0, (hipY + 0.03 - y) / len))
  const r = Math.hypot(x, z) || 1
  const front = Math.max(0, z / r)
  const side = Math.abs(x / r)
  const f = Math.pow(drop, 0.8) * Math.min(1, base + (1 - base) * Math.max(front, side * 0.7))
  const wl = smooth(-0.05, 0.05, x)
  return [
    [B.hips, 1 - f],
    [B.thighL, f * wl],
    [B.thighR, f * (1 - wl)],
  ]
}

// ─────────────────────────────────────────────────────────────────────────

function faceShapes(hc: V3, male: boolean, skin: string): Prim[] {
  const P = (x: number, y: number, z: number): V3 => add3(hc, [x, y, z])
  const o = { color: skin, bind: B.head }
  return [
    ellipsoid(P(0, 0.012, -0.008), [male ? 0.104 : 0.103, male ? 0.12 : 0.118, 0.112], o),
    ellipsoid(P(0, -0.04, 0.012), [male ? 0.092 : 0.088, 0.08, 0.096], { ...o, k: 0.04 }),
    ellipsoid(P(0.045, -0.035, 0.058), [0.04, 0.035, 0.04], { ...o, k: 0.03 }),
    ellipsoid(P(-0.045, -0.035, 0.058), [0.04, 0.035, 0.04], { ...o, k: 0.03 }),
    ellipsoid(P(0, -0.098, 0.05), [male ? 0.036 : 0.031, 0.026, 0.034], { ...o, k: 0.03 }),
    ellipsoid(P(0, -0.062, 0.08), [0.03, 0.022, 0.026], { ...o, k: 0.018 }),
    roundCone(P(0, 0.002, 0.096), P(0, -0.028, 0.114), 0.008, male ? 0.015 : 0.0125, { ...o, k: 0.012 }),
    ellipsoid(P(male ? 0.013 : 0.011, -0.031, 0.106), [male ? 0.011 : 0.009, 0.008, 0.008], { ...o, k: 0.008 }),
    ellipsoid(P(male ? -0.013 : -0.011, -0.031, 0.106), [male ? 0.011 : 0.009, 0.008, 0.008], { ...o, k: 0.008 }),
    // Eye sockets for the separate eyeballs
    ellipsoid(P(0.04, 0.008, 0.078), [0.029, 0.029, 0.029], { op: 'sub', k: 0.012 }),
    ellipsoid(P(-0.04, 0.008, 0.078), [0.029, 0.029, 0.029], { op: 'sub', k: 0.012 }),
    // Neck
    roundCone(P(0, -0.07, -0.012), P(0, -0.21, -0.006), 0.042, 0.047, { color: skin, bind: B.neck, k: 0.03 }),
  ]
}

function femaleParts(J: JointFn, d: Body, ap: ProceduralAppearance) {
  const top = ap.outfit
  const pants = ap.outfitAccent
  const body: Prim[] = []
  for (const [thigh, shin, foot, ua, fa, hand] of [
    [B.thighL, B.shinL, B.footL, B.upperArmL, B.forearmL, B.handL],
    [B.thighR, B.shinR, B.footR, B.upperArmR, B.forearmR, B.handR],
  ] as const) {
    const hip = J(thigh)
    const knee = J(shin)
    const ankle = J(foot)
    body.push(
      roundCone(add3(hip, [0, -0.035, 0]), knee, 0.066, 0.051, { color: pants, bind: thigh, k: 0.015 }),
      cappedCone(knee, add3(ankle, [0, -0.012, 0]), 0.05, 0.054, 0.006, { color: pants, bind: shin, k: 0.02 }),
      ellipsoid(knee, [0.049, 0.058, 0.051], { color: pants, bind: () => [[thigh, 0.5], [shin, 0.5]], k: 0.03 }),
      ellipsoid(J(foot, [0, -0.032, 0.036]), [0.047, 0.04, 0.104], { color: ap.shoes, bind: foot, k: 0.006 }),
      ellipsoid(J(foot, [0, -0.058, 0.036]), [0.051, 0.014, 0.11], { color: '#dcdcd8', bind: foot, k: 0.004 }),
    )
    const sh = J(ua)
    const el = J(fa)
    const wr = J(hand)
    body.push(
      roundCone(sh, lerp3(sh, el, 0.48), 0.052, 0.05, { color: top, bind: ua, k: 0.03 }),
      roundCone(sh, el, 0.04, 0.034, { color: top, bind: ua, k: 0.01 }),
      roundCone(el, wr, 0.034, 0.027, { color: top, bind: fa, k: 0.015 }),
    )
  }
  const sy = J(B.chest)[1] + d.shoulder[1]
  body.push(
    ellipsoid([0, d.hipY - 0.01, 0], [0.135, 0.1, 0.105], { color: pants, bind: B.hips, k: 0.03 }),
    squash(cappedCone([0, d.hipY + 0.11, 0], [0, d.hipY - 0.19, 0], 0.135, 0.168, 0.008, { color: top, bind: skirtBind(d.hipY, 0.2, 0.7) }), [0, 0, 0], [1, 1, 0.78]),
    squash(roundCone([0, d.hipY + 0.06, 0], [0, d.hipY + 0.25, 0], 0.11, 0.116, { color: top, bind: B.spine, k: 0.02 }), [0, 0, 0], [1.15, 1, 0.78]),
    squash(roundCone([0, d.hipY + 0.25, 0], [0, sy - 0.04, 0], 0.118, 0.11, { color: top, bind: B.chest, k: 0.03 }), [0, 0, 0], [1.18, 1, 0.8]),
    ellipsoid([0, sy - 0.11, 0.035], [0.105, 0.06, 0.06], { color: top, bind: B.chest, k: 0.04 }),
    roundCone([-0.11, sy, -0.005], [0.11, sy, -0.005], 0.048, 0.048, { color: top, bind: B.chest, k: 0.045 }),
  )

  // Head
  const hc = J(B.head, [0, d.headCenter, 0])
  const head = faceShapes(hc, false, ap.skin)

  // Hijab: a hood with an oval opening for the face, a fuller back, and a
  // drape over the shoulders that hangs lower over the chest.
  const H = (x: number, y: number, z: number): V3 => add3(hc, [x, y, z])
  const hy = hc[1]
  const neckY = J(B.neck)[1]
  const hood = { color: ap.headwear, bind: B.head }
  const drapeBind = (_x: number, y: number): [number, number][] => {
    const t = smooth(neckY - 0.01, neckY + 0.07, y)
    return [
      [B.head, 0.7 * t],
      [B.neck, 0.3 * t + 0.35 * (1 - t)],
      [B.chest, 0.65 * (1 - t)],
    ]
  }
  const folds = (x: number, y: number, z: number) =>
    0.0016 * Math.sin(Math.atan2(x, z + 0.01) * 9) * smooth(hy - 0.14, hy - 0.3, y)
  const hijab: Prim[] = [
    ellipsoid(H(0, 0.02, -0.02), [0.118, 0.136, 0.128], hood),
    ellipsoid(H(0, -0.005, -0.068), [0.1, 0.115, 0.095], { ...hood, k: 0.03 }),
    // Drape: slopes over the shoulders, then falls with a soft rounded hem
    squash(cappedCone(H(0, -0.09, -0.012), H(0, -0.2, -0.008), 0.072, 0.168, 0.02, { color: ap.headwear, bind: drapeBind, k: 0.035 }), H(0, 0, -0.01), [1, 1, 0.74]),
    displace(
      squash(cappedCone(H(0, -0.19, -0.008), H(0, -0.3, -0.004), 0.17, 0.176, 0.035, { color: ap.headwear, bind: drapeBind, k: 0.03 }), H(0, 0, -0.01), [1, 1, 0.7]),
      folds,
      0.003,
    ),
    ellipsoid(H(0, -0.28, 0.05), [0.13, 0.09, 0.06], { color: ap.headwear, bind: drapeBind, k: 0.07 }),
    ellipsoid(H(0, -0.015, 0.108), [0.07, 0.094, 0.085], { op: 'sub', k: 0.012 }),
  ]

  return { body, head, hijab }
}

function maleParts(J: JointFn, d: Body, ap: ProceduralAppearance) {
  const kaftan = ap.outfit
  const pants = ap.outfitAccent
  const body: Prim[] = []
  for (const [thigh, shin, foot, ua, fa, hand] of [
    [B.thighL, B.shinL, B.footL, B.upperArmL, B.forearmL, B.handL],
    [B.thighR, B.shinR, B.footR, B.upperArmR, B.forearmR, B.handR],
  ] as const) {
    const hip = J(thigh)
    const knee = J(shin)
    const ankle = J(foot)
    body.push(
      roundCone(add3(hip, [0, -0.04, 0]), knee, 0.074, 0.06, { color: pants, bind: thigh, k: 0.015 }),
      cappedCone(knee, add3(ankle, [0, 0.022, 0]), 0.058, 0.056, 0.006, { color: pants, bind: shin, k: 0.02 }),
      ellipsoid(knee, [0.057, 0.066, 0.059], { color: pants, bind: () => [[thigh, 0.5], [shin, 0.5]], k: 0.03 }),
      // Ankle and bare foot
      roundCone(add3(ankle, [0, 0.04, 0]), J(foot, [0, -0.03, 0.01]), 0.032, 0.034, { color: ap.skin, bind: foot, k: 0.01 }),
      ellipsoid(J(foot, [0, -0.046, 0.045]), [0.043, 0.026, 0.1], { color: ap.skin, bind: foot, k: 0.02 }),
      // Sandal: sole and strap
      ellipsoid(J(foot, [0, -0.07, 0.04]), [0.05, 0.008, 0.118], { color: ap.shoes, bind: foot, k: 0.002 }),
      roundCone(J(foot, [-0.042, -0.05, 0.07]), J(foot, [0.042, -0.05, 0.07]), 0.009, 0.009, { color: ap.shoes, bind: foot, k: 0.003 }),
    )
    const sh = J(ua)
    const el = J(fa)
    const wr = J(hand)
    body.push(
      roundCone(sh, el, 0.056, 0.05, { color: kaftan, bind: ua, k: 0.02 }),
      cappedCone(el, J(hand, [0, 0.005, 0]), 0.049, 0.051, 0.006, { color: kaftan, bind: fa, k: 0.015 }),
      cappedCone(lerp3(el, wr, 0.9), J(hand, [0, 0.004, 0]), 0.053, 0.053, 0.004, { color: kaftan, bind: fa, k: 0.004 }),
    )
  }
  const sy = J(B.chest)[1] + d.shoulder[1]
  const neckY = J(B.neck)[1]
  body.push(
    ellipsoid([0, d.hipY - 0.01, 0], [0.148, 0.1, 0.11], { color: pants, bind: B.hips, k: 0.03 }),
    squash(cappedCone([0, d.hipY + 0.07, 0], [0, d.hipY - 0.48, 0], 0.15, 0.198, 0.01, { color: kaftan, bind: skirtBind(d.hipY, 0.5, 0.25) }), [0, 0, 0], [1, 1, 0.76]),
    squash(roundCone([0, d.hipY + 0.04, 0], [0, d.hipY + 0.26, 0], 0.152, 0.158, { color: kaftan, bind: B.spine, k: 0.02 }), [0, 0, 0], [1.08, 1, 0.74]),
    squash(roundCone([0, d.hipY + 0.26, 0], [0, sy - 0.03, 0], 0.16, 0.14, { color: kaftan, bind: B.chest, k: 0.03 }), [0, 0, 0], [1.1, 1, 0.76]),
    roundCone([-0.135, sy, -0.005], [0.135, sy, -0.005], 0.058, 0.058, { color: kaftan, bind: B.chest, k: 0.05 }),
    // Mandarin collar
    cappedCone([0, neckY - 0.03, 0.004], [0, neckY + 0.02, 0.008], 0.058, 0.055, 0.004, { color: kaftan, bind: B.neck, k: 0.008 }),
  )

  const hc = J(B.head, [0, d.headCenter, 0])
  const P = (x: number, y: number, z: number): V3 => add3(hc, [x, y, z])
  const head = faceShapes(hc, true, ap.skin)
  const ear = { color: ap.skin, bind: B.head, k: 0.01 }
  head.push(
    ellipsoid(P(0.102, -0.012, -0.008), [0.016, 0.03, 0.022], ear),
    ellipsoid(P(-0.102, -0.012, -0.008), [0.016, 0.03, 0.022], ear),
    ellipsoid(P(0.113, -0.012, -0.004), [0.008, 0.017, 0.011], { op: 'sub', k: 0.004 }),
    ellipsoid(P(-0.113, -0.012, -0.004), [0.008, 0.017, 0.011], { op: 'sub', k: 0.004 }),
    // Short hair: a thin shell behind a slanted hairline, stopping above the ears
    clip(ellipsoid(P(0, 0.016, -0.014), [0.108, 0.125, 0.117], { color: ap.hair, bind: B.head, k: 0.003 }), (_x, y, z) =>
      Math.max(z - hc[2] - (0.032 + 0.6 * (y - hc[1] - 0.02)), -(y - hc[1] + 0.028)),
    ),
  )
  return { body, head, hijab: null as Prim[] | null }
}

/** Relaxed hand at the side, palm facing the thigh. */
function handShapes(J: JointFn, d: Body, side: 1 | -1, skin: string): Prim[] {
  const hand = side === 1 ? B.handL : B.handR
  const fa = side === 1 ? B.forearmL : B.forearmR
  const k = d.hand
  const L = (x: number, y: number, z: number) => J(hand, [x * k, y * k, z * k])
  const o = { color: skin, bind: hand, k: 0.004 }
  const s = side
  const prims: Prim[] = [
    roundCone(J(fa, [0, -d.forearm + 0.035, 0]), L(0, -0.012, 0), 0.023 * k, 0.021 * k, { color: skin, bind: fa }),
    ellipsoid(L(0, -0.042, 0), [0.0125 * k, 0.04 * k, 0.034 * k], { ...o, k: 0.012 }),
  ]
  const zs = [0.024, 0.008, -0.008, -0.022]
  const lens = [0.062, 0.068, 0.064, 0.05]
  zs.forEach((z, i) => {
    const kn = L(-s * 0.001, -0.075, z)
    const mid = L(-s * 0.005, -0.075 - lens[i] * 0.55, z * 1.02)
    const tip = L(-s * 0.012, -0.075 - lens[i], z * 1.04)
    prims.push(roundCone(kn, mid, 0.0088 * k, 0.0078 * k, o), roundCone(mid, tip, 0.0078 * k, 0.0066 * k, o))
  })
  const t0 = L(-s * 0.004, -0.024, 0.028)
  const t1 = L(-s * 0.012, -0.05, 0.043)
  const t2 = L(-s * 0.017, -0.07, 0.048)
  prims.push(roundCone(t0, t1, 0.0108 * k, 0.0092 * k, { ...o, k: 0.008 }), roundCone(t1, t2, 0.0092 * k, 0.0076 * k, o))
  return prims
}

// ── Face features (separate meshes so they can blink and talk) ───────────

function faceFeatures(headBone: THREE.Bone, d: Body, ap: ProceduralAppearance, male: boolean, skinMat: THREE.Material): FaceRefs {
  const face = new THREE.Group()
  face.position.y = d.headCenter
  headBone.add(face)
  const sphere = new THREE.SphereGeometry(1, 24, 16)
  const low = new THREE.SphereGeometry(1, 14, 10)
  const half = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)
  const lash = new THREE.TorusGeometry(1, 0.075, 6, 18, Math.PI)
  const capsule = new THREE.CapsuleGeometry(1, 1, 4, 10)
  const smile = new THREE.TorusGeometry(1, 0.13, 6, 20, Math.PI)
  const M = (geo: THREE.BufferGeometry, mat: THREE.Material, p: V3, s: V3 | number, parent: THREE.Object3D = face, r?: V3) => {
    const m = new THREE.Mesh(geo, mat)
    m.position.set(...p)
    if (typeof s === 'number') m.scale.setScalar(s)
    else m.scale.set(...s)
    if (r) m.rotation.set(...r)
    parent.add(m)
    return m
  }
  const sclera = new THREE.MeshStandardMaterial({ color: '#fbf8f3', roughness: 0.2 })
  const iris = new THREE.MeshPhysicalMaterial({ color: ap.eyes, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.04 })
  const pupil = new THREE.MeshBasicMaterial({ color: '#0a0605' })
  const glint = new THREE.MeshBasicMaterial({ color: '#ffffff' })
  const liner = new THREE.MeshStandardMaterial({ color: '#160e0c', roughness: 0.5 })
  const brow = new THREE.MeshStandardMaterial({ color: ap.hair, roughness: 0.85 })
  const lips = new THREE.MeshPhysicalMaterial({ color: ap.lips, roughness: 0.4, clearcoat: male ? 0.1 : 0.5 })
  const mouth = new THREE.MeshBasicMaterial({ color: '#3a1216' })
  const teeth = new THREE.MeshBasicMaterial({ color: '#f6efe6' })

  const eye = (side: 1 | -1) => {
    const er = 0.0262
    const g = new THREE.Group()
    g.position.set(side * 0.04, 0.008, 0.078)
    g.rotation.y = side * 0.14
    face.add(g)
    const ball = new THREE.Group()
    g.add(ball)
    M(sphere, sclera, [0, 0, 0], er, ball)
    M(sphere, iris, [0, 0, er * 0.66], [er * 0.68, er * 0.7, er * 0.36], ball)
    M(low, pupil, [0, 0, er * 0.84], [er * 0.31, er * 0.33, er * 0.16], ball)
    M(low, glint, [er * 0.22, er * 0.26, er * 0.93], er * 0.12, ball)
    M(low, glint, [-er * 0.16, -er * 0.18, er * 0.94], er * 0.055, ball)
    const lid = new THREE.Group()
    g.add(lid)
    M(half, skinMat, [0, 0, 0], [er * 1.07, er * 1.07, er * 1.07], lid)
    M(lash, liner, [0, 0, 0], [er * 1.08, er * 1.08, er * (male ? 0.9 : 1.8)], lid, [Math.PI / 2, 0, 0])
    if (!male) M(low, liner, [side * er * 1.02, 0, er * 0.25], [er * 0.3, er * 0.06, er * 0.05], lid, [0, 0, side * 0.45])
    return { ball, lid }
  }
  const L = eye(1)
  const R = eye(-1)

  const brows = new THREE.Group()
  face.add(brows)
  for (const sx of [1, -1]) {
    M(capsule, brow, [sx * 0.041, 0.046, 0.095], [male ? 0.0042 : 0.0028, male ? 0.0125 : 0.0135, 0.0025], brows, [0, sx * 0.4, sx * (male ? -1.56 : -1.6)])
  }

  const mouthG = new THREE.Group()
  mouthG.position.set(0, -0.061, 0.103)
  face.add(mouthG)
  const inner = M(low, mouth, [0, -0.002, 0.002], [0.016, 0.0005, 0.006], mouthG)
  M(low, teeth, [0, 0.0015, 0.004], [0.012, 0.003, 0.004], mouthG)
  M(low, lips, [0, 0.0045, 0.002], [male ? 0.021 : 0.019, male ? 0.0048 : 0.005, 0.0085], mouthG)
  const jaw = new THREE.Group()
  mouthG.add(jaw)
  M(low, lips, [0, -0.0052, 0.0015], [male ? 0.019 : 0.017, male ? 0.0058 : 0.0064, 0.0085], jaw)
  M(smile, mouth, [0, 0.006, 0.008], [0.0215, 0.0065, 0.012], mouthG, [0, 0, Math.PI])

  return { eyeL: L.ball, eyeR: R.ball, lidL: L.lid, lidR: R.lid, brows, jaw, inner }
}

// ── Assembly ─────────────────────────────────────────────────────────────

/**
 * The heavy part: sculpt and polygonise every piece of a character. Pure
 * data in, typed arrays out, so it can run in a Web Worker.
 */
export function sculptGeometry(ap: ProceduralAppearance): PartArrays[] {
  const male = ap.body === 'male'
  const d = male ? MALE_BODY : FEMALE_BODY
  const { J } = makeSkeleton(d)
  const parts = male ? maleParts(J, d, ap) : femaleParts(J, d, ap)
  const out = [buildPart(parts.body, 0.0086, BONE_COUNT), buildPart(parts.head, 0.0039, BONE_COUNT)]
  if (parts.hijab) out.push(buildPart(parts.hijab, 0.0066, BONE_COUNT))
  out.push(buildPart(handShapes(J, d, 1, ap.skin), 0.0033, BONE_COUNT), buildPart(handShapes(J, d, -1, ap.skin), 0.0033, BONE_COUNT))
  return out
}

/** Builds the skinned character from sculpted mesh data. */
export function buildCharacter(ap: ProceduralAppearance, data: PartArrays[]): CharacterRig {
  const male = ap.body === 'male'
  const d = male ? MALE_BODY : FEMALE_BODY
  const { bones } = makeSkeleton(d)

  const group = new THREE.Group()
  group.add(bones[B.root])
  const skeleton = new THREE.Skeleton(bones)
  const clay = new THREE.MeshPhysicalMaterial({
    vertexColors: true,
    roughness: 0.66,
    sheen: 0.12,
    sheenColor: new THREE.Color('#ffffff'),
    sheenRoughness: 0.6,
  })
  const geometries = data.map(partToGeometry)
  for (const geo of geometries) {
    const mesh = new THREE.SkinnedMesh(geo, clay)
    mesh.frustumCulled = false
    group.add(mesh)
    mesh.bind(skeleton)
  }
  // Cartoon proportions: a bigger head (applied after binding, so it scales the sculpt)
  bones[B.head].scale.setScalar(HEAD_SCALE)

  const skinMat = new THREE.MeshPhysicalMaterial({ color: ap.skin, roughness: 0.62, sheen: 0.12, sheenColor: new THREE.Color('#ffffff'), sheenRoughness: 0.55 })
  const face = faceFeatures(bones[B.head], d, ap, male, skinMat)

  if (male) {
    // Embroidered cap
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.104, 0.108, 0.086, 40, 1), [
      new THREE.MeshStandardMaterial({ map: capTexture(ap.headwear, ap.headwearPattern), roughness: 0.75 }),
      new THREE.MeshStandardMaterial({ color: ap.headwear, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ color: ap.headwear, roughness: 0.8 }),
    ])
    cap.position.set(0, d.headCenter + 0.092, -0.01)
    cap.rotation.x = -0.06
    bones[B.head].add(cap)
    // Placket buttons and pocket on the chest
    const trim = new THREE.MeshStandardMaterial({ color: ap.outfitPattern, roughness: 0.7 })
    const button = new THREE.MeshStandardMaterial({ color: '#9fa0a8', roughness: 0.35 })
    const chest = bones[B.chest]
    const box = new THREE.BoxGeometry(1, 1, 1)
    const sph = new THREE.SphereGeometry(1, 10, 8)
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, p: V3, s: V3, rx = 0) => {
      const m = new THREE.Mesh(geo, mat)
      m.position.set(...p)
      m.scale.set(...s)
      m.rotation.x = rx
      chest.add(m)
    }
    add(box, trim, [0, 0.13, 0.113], [0.022, 0.15, 0.004], -0.12)
    for (let i = 0; i < 4; i++) add(sph, button, [0, 0.19 - i * 0.04, 0.116 + i * 0.004], [0.006, 0.006, 0.003])
    add(box, trim, [0.075, 0.075, 0.104], [0.07, 0.066, 0.003], -0.06)
  } else {
    // Name badge on the scrub top
    const chest = bones[B.chest]
    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.016, 0.004), new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.4 }))
    badge.position.set(0.062, -0.03, 0.098)
    badge.rotation.x = -0.12
    chest.add(badge)
    const text = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.004, 0.002), new THREE.MeshStandardMaterial({ color: '#3a2a5a' }))
    text.position.set(0, 0, 0.0025)
    badge.add(text)
  }

  return {
    group,
    bones,
    face,
    body: d,
    dispose: () => {
      geometries.forEach((g) => g.dispose())
      clay.dispose()
    },
  }
}
