/**
 * Stylised, Pixar-inspired versions of the two of us, built entirely from
 * primitives with a hand-written rig (nested joint groups) and procedural
 * animation driven by MotionState: walk, idle, turn-lean, blinking eyelids,
 * a talking mouth, head turns towards each other, and a seated pose.
 *
 *   Her: white hijab over a long red/gold Ankara dress, sandals.
 *   Him: royal-blue kaftan and trousers, embroidered hula cap.
 *
 * Long garments (her dress, his kaftan) are "cloth" meshes deformed on the
 * CPU each frame: they swing with the legs when walking and drape over the
 * lap when seated (the seated shape is precomputed once).
 *
 * Conventions: faces +Z, left side is +X, feet at y = 0, metres.
 */
import { useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ProceduralAppearance } from '../../../data/museumConfig'
import { ankaraTexture, capTexture, laceTexture, weaveTexture } from '../../../lib/characterTextures'
import { clamp, damp } from '../../../lib/math'
import type { MotionState } from './motion'

/** Hip-joint height when seated (bench cushions are 0.465 m high). */
export const SEAT_HIP_Y = 0.54
/** Where speech bubbles float (standing) and how far they drop when seated. */
export const BUBBLE = {
  female: { height: 1.88, sitDrop: 0.88 - SEAT_HIP_Y },
  male: { height: 2.02, sitDrop: 0.945 - SEAT_HIP_Y },
}

type Profile = [r: number, y: number][]

interface Dims {
  hipY: number
  hipX: number
  thigh: [r: number, len: number]
  shin: [r: number, len: number]
  /** Ankle joint height above the sole */
  foot: number
  waist: number
  shoulder: [x: number, y: number]
  upperArm: [r: number, len: number]
  forearm: [r: number, len: number]
  hand: number
  armSpread: number
  neckTop: number
  headR: number
  stride: number
  legSwing: number
  armSwing: number
  torso: Profile
  torsoScale: [x: number, z: number]
  /** Long garment hanging from the hips (her dress / his kaftan skirt) */
  cloth: Profile
}

const FEMALE: Dims = {
  hipY: 0.88,
  hipX: 0.08,
  thigh: [0.058, 0.41],
  shin: [0.048, 0.4],
  foot: 0.07,
  waist: 0.06,
  shoulder: [0.16, 0.355],
  upperArm: [0.05, 0.25],
  forearm: [0.044, 0.22],
  hand: 0.042,
  armSpread: 0.14,
  neckTop: 0.45,
  headR: 0.125,
  stride: 1.15,
  legSwing: 0.3,
  armSwing: 0.32,
  torso: [
    [0.108, -0.02],
    [0.112, 0.08],
    [0.135, 0.2],
    [0.142, 0.3],
    [0.125, 0.36],
    [0.07, 0.41],
    [0.04, 0.43],
  ],
  torsoScale: [1.12, 0.8],
  cloth: [
    [0.118, 0.07],
    [0.15, -0.02],
    [0.168, -0.12],
    [0.19, -0.3],
    [0.225, -0.52],
    [0.262, -0.72],
    [0.29, -0.83],
  ],
}

const MALE: Dims = {
  hipY: 0.945,
  hipX: 0.09,
  thigh: [0.074, 0.44],
  shin: [0.062, 0.43],
  foot: 0.075,
  waist: 0.06,
  shoulder: [0.182, 0.385],
  upperArm: [0.06, 0.27],
  forearm: [0.056, 0.24],
  hand: 0.05,
  armSpread: 0.1,
  neckTop: 0.49,
  headR: 0.128,
  stride: 1.3,
  legSwing: 0.42,
  armSwing: 0.42,
  torso: [
    [0.15, -0.03],
    [0.155, 0.08],
    [0.17, 0.22],
    [0.186, 0.33],
    [0.17, 0.4],
    [0.1, 0.455],
    [0.055, 0.48],
  ],
  torsoScale: [1.12, 0.78],
  cloth: [
    [0.158, 0.07],
    [0.178, -0.04],
    [0.19, -0.18],
    [0.205, -0.36],
    [0.222, -0.52],
    [0.235, -0.62],
  ],
}

const v2 = (p: Profile) => p.map(([r, y]) => new THREE.Vector2(r, y))
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/**
 * Cloth = a lathe mesh plus its rest pose, the seated pose, and each
 * vertex's distance down the garment (used for the walking swing).
 */
function makeCloth(profile: Profile, d: Dims) {
  const geo = new THREE.LatheGeometry(v2(profile), 30)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const rest = Float32Array.from(pos.array as Float32Array)
  const seated = new Float32Array(rest.length)
  const along = new Float32Array(pos.count)

  // Arc length of each profile point from the waistband
  const arc: number[] = [0]
  for (let j = 1; j < profile.length; j++) {
    arc.push(arc[j - 1] + Math.hypot(profile[j][0] - profile[j - 1][0], profile[j][1] - profile[j - 1][1]))
  }

  // Seated: the garment's axis bends forward over the thighs, runs to the
  // knees, then bends down again and hangs in front of the shins.
  const a = Math.asin(clamp((SEAT_HIP_Y - d.shin[1] - d.foot) / d.thigh[1], -0.5, 0.5))
  const kneeZ = d.thigh[1] * Math.cos(a)
  const B1 = 0.1
  const B2 = 0.09
  const lapLen = kneeZ - 0.02
  const SK = B1 + lapLen
  const top = profile[0][1]
  const axis = (s: number) => {
    let cz = 0
    let cy = top
    let th = 0
    const steps = 48
    const ds = s / steps
    for (let k = 0; k < steps; k++) {
      const u = (k + 0.5) * ds
      th = (Math.PI / 2) * (smooth(0, B1, u) - smooth(SK, SK + B2, u))
      const stretch = u > SK ? 1.35 : 1
      cz += Math.sin(th) * ds * stretch
      cy -= Math.cos(th) * ds * stretch
    }
    const flat = smooth(0, B1, s) // squashed over the lap
    const hang = smooth(SK, SK + B2, s) // narrower panel over the shins
    return { cz, cy, th, zScale: 1 - 0.55 * flat * (1 - hang) - 0.42 * hang, xScale: 1 - 0.06 * flat + 0.04 * hang }
  }

  const segs = 31
  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < profile.length; j++) {
      const idx = i * profile.length + j
      const x = rest[idx * 3]
      const z = rest[idx * 3 + 2]
      along[idx] = arc[j]
      const ax = axis(arc[j])
      const zo = z * ax.zScale
      seated[idx * 3] = x * ax.xScale
      seated[idx * 3 + 1] = Math.max(ax.cy + zo * Math.sin(ax.th), -SEAT_HIP_Y + 0.015)
      seated[idx * 3 + 2] = ax.cz + zo * Math.cos(ax.th)
    }
  }
  return { geo, rest, seated, along }
}

type Cloth = ReturnType<typeof makeCloth>

/** Writes the cloth pose for this frame: walk swing blended with seated drape. */
function poseCloth(c: Cloth, sit: number, swingL: number, swingR: number) {
  const pos = c.geo.attributes.position as THREE.BufferAttribute
  const arr = pos.array as Float32Array
  const { rest, seated, along } = c
  for (let i = 0; i < pos.count; i++) {
    const x = rest[i * 3]
    const z = rest[i * 3 + 2]
    const r = Math.hypot(x, z) || 1e-4
    const wL = clamp(0.5 + (x / r) * 0.9, 0, 1)
    const swing = swingR + (swingL - swingR) * wL
    const wz = z + swing * along[i] * 0.55
    arr[i * 3] = x + (seated[i * 3] - x) * sit
    arr[i * 3 + 1] = rest[i * 3 + 1] + (seated[i * 3 + 1] - rest[i * 3 + 1]) * sit
    arr[i * 3 + 2] = wz + (seated[i * 3 + 2] - wz) * sit
  }
  pos.needsUpdate = true
  c.geo.computeVertexNormals()
}

interface Props {
  appearance: ProceduralAppearance
  motion: MutableRefObject<MotionState>
}

export function ProceduralCharacter({ appearance: ap, motion }: Props) {
  const female = ap.body === 'female'
  const d = female ? FEMALE : MALE
  const hr = d.headR

  const mats = useMemo(() => {
    const skin = new THREE.MeshPhysicalMaterial({
      color: ap.skin,
      roughness: 0.52,
      sheen: 0.35,
      sheenColor: new THREE.Color(ap.skin).lerp(new THREE.Color('#ffb59a'), 0.5),
      sheenRoughness: 0.5,
    })
    const fabric = (color: string, map?: THREE.Texture, side: THREE.Side = THREE.FrontSide) =>
      new THREE.MeshPhysicalMaterial({
        color: map ? '#ffffff' : color,
        map,
        roughness: 0.78,
        sheen: 0.35,
        sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.35),
        sheenRoughness: 0.7,
        side,
      })
    const print = female ? ankaraTexture(ap.outfit, ap.outfitPattern, ap.outfitAccent) : weaveTexture(ap.outfit, ap.outfitPattern)
    return {
      skin,
      outfit: fabric(ap.outfit, print),
      cloth: fabric(ap.outfit, print, THREE.DoubleSide),
      headwear: female ? fabric(ap.headwear, laceTexture(ap.headwear, ap.headwearPattern), THREE.DoubleSide) : fabric(ap.headwear, capTexture(ap.headwear, ap.headwearPattern)),
      headwearPlain: fabric(ap.headwear, undefined, female ? THREE.DoubleSide : THREE.FrontSide),
      trousers: fabric(ap.outfitAccent),
      leggings: fabric('#2c2433'),
      embroidery: new THREE.MeshStandardMaterial({ color: ap.outfitPattern, roughness: 0.5 }),
      shoes: new THREE.MeshStandardMaterial({ color: ap.shoes, roughness: 0.45 }),
      hair: new THREE.MeshStandardMaterial({ color: ap.hair, roughness: 0.6 }),
      sclera: new THREE.MeshStandardMaterial({ color: '#fbf8f3', roughness: 0.25 }),
      iris: new THREE.MeshStandardMaterial({ color: ap.eyes, roughness: 0.25 }),
      pupil: new THREE.MeshBasicMaterial({ color: '#0b0706' }),
      glint: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
      liner: new THREE.MeshStandardMaterial({ color: '#140d0b', roughness: 0.5 }),
      brow: new THREE.MeshStandardMaterial({ color: ap.hair, roughness: 0.8 }),
      lips: new THREE.MeshPhysicalMaterial({ color: ap.lips, roughness: 0.35, clearcoat: female ? 0.4 : 0 }),
      mouth: new THREE.MeshBasicMaterial({ color: '#3a1216' }),
      teeth: new THREE.MeshBasicMaterial({ color: '#f6efe6' }),
    }
  }, [ap, female])

  const geo = useMemo(() => {
    const cap = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 6, 14)
    const half = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2)
    return {
      sphere: new THREE.SphereGeometry(1, 28, 20),
      lowSphere: new THREE.SphereGeometry(1, 14, 10),
      half,
      thigh: cap(...d.thigh),
      shin: cap(...d.shin),
      upperArm: cap(d.upperArm[0], d.upperArm[1]),
      forearm: female
        ? new THREE.CylinderGeometry(d.forearm[0] * 0.95, d.forearm[0] * 1.15, d.forearm[1], 14, 1, true)
        : new THREE.CylinderGeometry(d.forearm[0], d.forearm[0] * 1.3, d.forearm[1], 14, 1, true),
      wrist: cap(d.forearm[0] * 0.62, d.forearm[1] * 0.5),
      torso: new THREE.LatheGeometry(v2(d.torso), 30),
      neck: new THREE.CylinderGeometry(0.042, 0.048, 0.12, 12),
      lash: new THREE.TorusGeometry(1, 0.075, 6, 18, Math.PI),
      brow: cap(1, 2.5),
      hijabCape: new THREE.LatheGeometry(
        v2([
          [0.04, 0.47],
          [0.075, 0.43],
          [0.14, 0.385],
          [0.188, 0.33],
          [0.208, 0.22],
          [0.218, 0.08],
          [0.222, -0.02],
          [0.21, -0.04],
        ]),
        30,
      ),
      cap: new THREE.CylinderGeometry(hr * 0.93, hr * 1.02, hr * 0.68, 30, 1),
      hairShell: new THREE.SphereGeometry(1, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.45),
      neckline: new THREE.TorusGeometry(0.07, 0.009, 6, 24),
      smile: new THREE.TorusGeometry(1, 0.13, 6, 20, Math.PI),
      faceRim: new THREE.TorusGeometry(1, 0.12, 10, 36),
    }
  }, [d, female, hr])

  const cloth = useMemo(() => makeCloth(d.cloth, d), [d])

  // Joints
  const lean = useRef<THREE.Group>(null!)
  const hips = useRef<THREE.Group>(null!)
  const torso = useRef<THREE.Group>(null!)
  const head = useRef<THREE.Group>(null!)
  const legL = useRef<THREE.Group>(null!)
  const legR = useRef<THREE.Group>(null!)
  const kneeL = useRef<THREE.Group>(null!)
  const kneeR = useRef<THREE.Group>(null!)
  const footL = useRef<THREE.Group>(null!)
  const footR = useRef<THREE.Group>(null!)
  const armL = useRef<THREE.Group>(null!)
  const armR = useRef<THREE.Group>(null!)
  const elbowL = useRef<THREE.Group>(null!)
  const elbowR = useRef<THREE.Group>(null!)
  // Face
  const lidL = useRef<THREE.Group>(null!)
  const lidR = useRef<THREE.Group>(null!)
  const eyeL = useRef<THREE.Group>(null!)
  const eyeR = useRef<THREE.Group>(null!)
  const brows = useRef<THREE.Group>(null!)
  const jaw = useRef<THREE.Group>(null!)
  const inner = useRef<THREE.Mesh>(null!)

  const anim = useRef({ phase: 0, walk: 0, turnStep: 0, lean: 0, blinkIn: 2, blink: 0, open: 0, look: 0, gesture: 0 })

  const seatA = Math.asin(clamp((SEAT_HIP_Y - d.shin[1] - d.foot) / d.thigh[1], -0.5, 0.5))

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const m = motion.current
    const a = anim.current
    const t = state.clock.elapsedTime + (female ? 0 : 1.7)
    const sit = m.sit * m.sit * (3 - 2 * m.sit)
    const stand = 1 - sit

    a.walk = damp(a.walk, clamp(m.speed / 1.4, 0, 1.25) * stand, 9, dt)
    a.turnStep = damp(a.turnStep, clamp(Math.abs(m.turnRate) / 5, 0, 0.45) * (1 - clamp(a.walk, 0, 1)) * stand, 8, dt)
    const g = Math.max(a.walk, a.turnStep)
    const g1 = Math.min(g, 1)
    const idle = (1 - g1) * stand
    a.phase += dt * (m.speed / d.stride + a.turnStep * 2.4) * Math.PI * 2
    const s = Math.sin(a.phase)
    const c = Math.cos(a.phase)
    const amp = d.legSwing * Math.min(g, 1.15)
    const L = (sv: number, st: number) => sv * stand + st * sit // blend standing → seated

    // ── Legs ──
    legL.current.rotation.x = L(-s * amp, -Math.PI / 2 + seatA)
    legR.current.rotation.x = L(s * amp, -Math.PI / 2 + seatA)
    kneeL.current.rotation.x = L((0.04 + 0.9 * Math.max(0, c)) * g1, Math.PI / 2 - seatA)
    kneeR.current.rotation.x = L((0.04 + 0.9 * Math.max(0, -c)) * g1, Math.PI / 2 - seatA)
    footL.current.rotation.x = -(legL.current.rotation.x + kneeL.current.rotation.x) * L(0.55, 1)
    footR.current.rotation.x = -(legR.current.rotation.x + kneeR.current.rotation.x) * L(0.55, 1)
    legL.current.rotation.z = 0.03 * sit
    legR.current.rotation.z = -0.03 * sit

    // ── Body ──
    hips.current.position.y = L(d.hipY + (Math.abs(c) - 0.6) * 0.04 * g1, SEAT_HIP_Y)
    hips.current.position.x = idle * Math.sin(t * 0.7) * 0.01
    hips.current.rotation.y = -s * 0.09 * g1
    torso.current.rotation.y = s * 0.14 * g1
    const forward = 0.07 * Math.min(g, 1.2)
    torso.current.rotation.x = forward + idle * Math.sin(t * 0.9) * 0.01 + sit * 0.06
    torso.current.scale.y = 1 + Math.sin(t * 2.1) * 0.01 * (1 - g1)

    // ── Talking: mouth flaps, little nods, raised brows, a hand gesture ──
    const talk = m.talking ? 1 : 0
    const chatter = Math.abs(Math.sin(t * 11.5) * 0.7 + Math.sin(t * 6.7) * 0.5)
    a.open = damp(a.open, talk * (0.25 + 0.75 * clamp(chatter, 0, 1)), 18, dt)
    a.gesture = damp(a.gesture, talk * (1 - g1) * (0.5 + 0.5 * Math.sin(t * 1.6)), 3, dt)
    jaw.current.position.y = -a.open * hr * 0.075
    inner.current.scale.y = 0.004 + a.open * hr * 0.085
    brows.current.position.y = talk * hr * 0.025 * (0.6 + 0.4 * Math.sin(t * 2.3))

    // ── Arms ──
    const sway = Math.sin(t * 1.3) * 0.03 * idle
    const armAmp = d.armSwing * Math.min(g, 1.15)
    armL.current.rotation.x = L(s * armAmp + sway, -0.55)
    armR.current.rotation.x = L(-s * armAmp - sway - a.gesture * 0.55, -0.55 - a.gesture * 0.2)
    armL.current.rotation.z = L(d.armSpread + idle * Math.sin(t * 0.9) * 0.015, 0.08)
    armR.current.rotation.z = -L(d.armSpread + idle * Math.sin(t * 0.9) * 0.015, 0.08)
    elbowL.current.rotation.x = L(-(0.16 + 0.34 * g1 + 0.22 * g1 * Math.max(0, -s)), -0.75)
    elbowR.current.rotation.x = L(-(0.16 + 0.34 * g1 + 0.22 * g1 * Math.max(0, s)) - a.gesture * 0.9, -0.75 - a.gesture * 0.6)

    // ── Head: turn towards whoever they're chatting with, else look around ──
    a.look = damp(a.look, clamp(m.lookYaw, -1.0, 1.0), 4, dt)
    const wander = 1 - clamp(Math.abs(a.look) * 3, 0, 1)
    head.current.rotation.y = a.look * 0.75 + (idle + sit) * wander * Math.sin(t * 0.43) * 0.2
    head.current.rotation.x = -forward * 0.6 + idle * Math.sin(t * 0.61) * 0.04 + talk * Math.sin(t * 5.2) * 0.035 + sit * 0.04
    head.current.rotation.z = (idle + sit) * Math.sin(t * 0.33) * 0.04 - a.look * 0.06
    const eyeTurn = a.look * 0.28
    eyeL.current.rotation.y = eyeTurn
    eyeR.current.rotation.y = eyeTurn

    // Lean into turns
    a.lean = damp(a.lean, clamp(m.turnRate * 0.035, -0.12, 0.12) * Math.min(1, g + 0.25) * stand, 6, dt)
    lean.current.rotation.z = -a.lean

    // Cloth: follows the legs, drapes when seated
    poseCloth(cloth, sit, -legL.current.rotation.x * stand, -legR.current.rotation.x * stand)

    // Blink every few seconds (eyelids sweep down)
    a.blinkIn -= dt
    if (a.blinkIn <= 0) {
      a.blink = 0.14
      a.blinkIn = 2.2 + Math.random() * 3.5
    }
    a.blink -= dt
    const lid = a.blink > 0 ? 1.35 : -0.78 - talk * 0.08 + sit * 0.1
    lidL.current.rotation.x = lid
    lidR.current.rotation.x = lid
  })

  // ── Pieces ──────────────────────────────────────────────────────────

  const Leg = (side: 1 | -1, ref: typeof legL, knee: typeof kneeL, foot: typeof footL) => (
    <group ref={ref} position={[side * d.hipX, 0, 0]}>
      <mesh geometry={geo.thigh} material={female ? mats.leggings : mats.trousers} position-y={-d.thigh[1] / 2} />
      <group ref={knee} position-y={-d.thigh[1]}>
        <mesh geometry={geo.shin} material={female ? mats.leggings : mats.trousers} position-y={-d.shin[1] / 2} />
        <group ref={foot} position-y={-d.shin[1]}>
          {female ? (
            <>
              {/* Bare foot on a sandal */}
              <mesh geometry={geo.lowSphere} material={mats.skin} position={[0, -0.035, 0.035]} scale={[0.045, 0.035, 0.1]} />
              <mesh geometry={geo.lowSphere} material={mats.shoes} position={[0, -0.064, 0.035]} scale={[0.052, 0.012, 0.11]} />
              <mesh geometry={geo.lowSphere} material={mats.shoes} position={[0, -0.03, 0.06]} scale={[0.047, 0.012, 0.022]} />
            </>
          ) : (
            <mesh geometry={geo.lowSphere} material={mats.shoes} position={[0, -0.045, 0.04]} scale={[0.058, 0.04, 0.125]} />
          )}
        </group>
      </group>
    </group>
  )

  const Arm = (side: 1 | -1, ref: typeof armL, elbow: typeof elbowL) => (
    <group ref={ref} position={[side * d.shoulder[0], d.shoulder[1], 0]}>
      <mesh geometry={geo.lowSphere} material={mats.outfit} scale={d.upperArm[0] * 1.05} />
      <mesh geometry={geo.upperArm} material={mats.outfit} position-y={-d.upperArm[1] / 2} />
      <group ref={elbow} position-y={-d.upperArm[1]}>
        <mesh geometry={geo.forearm} material={mats.cloth} position-y={-d.forearm[1] / 2} />
        <mesh geometry={geo.wrist} material={mats.skin} position-y={-d.forearm[1] * 0.7} />
        {/* Mitten-style hand with a thumb */}
        <group position-y={-d.forearm[1] - d.hand * 0.6}>
          <mesh geometry={geo.lowSphere} material={mats.skin} scale={[d.hand * 0.72, d.hand * 1.15, d.hand * 0.95]} />
          <mesh geometry={geo.lowSphere} material={mats.skin} position={[-side * d.hand * 0.1, d.hand * 0.2, d.hand * 0.75]} scale={[d.hand * 0.3, d.hand * 0.55, d.hand * 0.3]} rotation-x={0.5} />
        </group>
      </group>
    </group>
  )

  const Eye = (side: 1 | -1, eyeRef: typeof eyeL, lidRef: typeof lidL) => {
    const er = hr * 0.235
    return (
      <group position={[side * hr * 0.37, hr * 0.04, hr * 0.79]} rotation-y={side * 0.18}>
        <group ref={eyeRef}>
          <mesh geometry={geo.sphere} material={mats.sclera} scale={[er, er, er * 0.85]} />
          <mesh geometry={geo.sphere} material={mats.iris} position-z={er * 0.6} scale={[er * 0.7, er * 0.74, er * 0.32]} />
          <mesh geometry={geo.lowSphere} material={mats.pupil} position-z={er * 0.76} scale={[er * 0.34, er * 0.36, er * 0.16]} />
          <mesh geometry={geo.lowSphere} material={mats.glint} position={[er * 0.2, er * 0.24, er * 0.86]} scale={er * 0.13} />
          <mesh geometry={geo.lowSphere} material={mats.glint} position={[-er * 0.18, -er * 0.16, er * 0.86]} scale={er * 0.06} />
        </group>
        {/* Upper eyelid (skin shell) with a lash line on its edge */}
        <group ref={lidRef}>
          <mesh geometry={geo.half} material={mats.skin} scale={[er * 1.04, er * 1.04, er * 0.92]} />
          <mesh
            geometry={geo.lash}
            material={mats.liner}
            rotation-x={Math.PI / 2}
            scale={[er * 1.08, er * 0.97, er * (female ? 1.8 : 1.1)]}
          />
          {female && (
            <mesh geometry={geo.lowSphere} material={mats.liner} position={[side * er * 1.02, 0, er * 0.2]} rotation-z={side * 0.5} scale={[er * 0.28, er * 0.06, er * 0.06]} />
          )}
        </group>
      </group>
    )
  }

  const Face = (
    <>
      {/* Head: cranium + softer cheeks/jaw */}
      <mesh geometry={geo.sphere} material={mats.skin} scale={[hr, hr * 1.06, hr]} />
      <mesh geometry={geo.sphere} material={mats.skin} position={[0, -hr * 0.36, hr * 0.12]} scale={[hr * 0.84, hr * 0.68, hr * 0.84]} />
      {Eye(1, eyeL, lidL)}
      {Eye(-1, eyeR, lidR)}
      <group ref={brows}>
        {[1, -1].map((sx) => (
          <mesh
            key={sx}
            geometry={geo.brow}
            material={mats.brow}
            position={[sx * hr * 0.38, hr * 0.37, hr * 0.9]}
            rotation={[0, sx * 0.35, sx * (female ? -1.72 : -1.66)]}
            scale={[hr * (female ? 0.03 : 0.042), hr * 0.072, hr * 0.022]}
          />
        ))}
      </group>
      {/* Nose */}
      <mesh geometry={geo.lowSphere} material={mats.skin} position={[0, -hr * 0.16, hr * 1.0]} scale={[hr * 0.13, hr * 0.11, hr * 0.11]} />
      {[1, -1].map((sx) => (
        <mesh key={sx} geometry={geo.lowSphere} material={mats.skin} position={[sx * hr * 0.1, -hr * 0.2, hr * 0.95]} scale={hr * 0.07} />
      ))}
      {/* Mouth: lips, dark interior and teeth; the jaw drops when talking */}
      <group position={[0, -hr * 0.47, hr * 0.9]}>
        <mesh ref={inner} geometry={geo.lowSphere} material={mats.mouth} position={[0, -hr * 0.02, hr * 0.02]} scale={[hr * 0.15, 0.004, hr * 0.05]} />
        <mesh geometry={geo.lowSphere} material={mats.teeth} position={[0, hr * 0.005, hr * 0.03]} scale={[hr * 0.11, hr * 0.025, hr * 0.03]} />
        <mesh geometry={geo.lowSphere} material={mats.lips} position-y={hr * 0.035} scale={[hr * 0.19, hr * (female ? 0.045 : 0.03), hr * 0.07]} />
        <group ref={jaw}>
          <mesh geometry={geo.lowSphere} material={mats.lips} position-y={-hr * 0.04} scale={[hr * 0.165, hr * (female ? 0.055 : 0.038), hr * 0.07]} />
        </group>
        {/* Smile line with lifted corners */}
        <mesh geometry={geo.smile} material={mats.mouth} position={[0, hr * 0.05, hr * 0.06]} rotation-z={Math.PI} scale={[hr * 0.21, hr * 0.07, hr * 0.12]} />
      </group>
    </>
  )

  return (
    <group scale={ap.height}>
      <group ref={lean}>
        <group ref={hips} position-y={d.hipY}>
          {Leg(1, legL, kneeL, footL)}
          {Leg(-1, legR, kneeR, footR)}
          <mesh geometry={cloth.geo} material={mats.cloth} />

          <group ref={torso} position-y={d.waist}>
            <mesh geometry={geo.torso} material={mats.outfit} scale={[d.torsoScale[0], 1, d.torsoScale[1]]} />
            {female ? (
              // Hijab drape over the shoulders and chest
              <mesh geometry={geo.hijabCape} material={mats.headwear} scale={[1.02, 1, 0.86]} position-z={0.01} />
            ) : (
              // Kaftan neckline embroidery and chest pocket
              <>
                <mesh geometry={geo.neckline} material={mats.embroidery} position={[0, d.neckTop - 0.035, 0.02]} rotation-x={Math.PI / 2 - 0.35} scale={[1.05, 1, 1]} />
                <mesh geometry={geo.lowSphere} material={mats.embroidery} position={[0, 0.33, 0.128]} rotation-x={-0.25} scale={[0.012, 0.08, 0.01]} />
              </>
            )}
            <mesh geometry={geo.neck} material={mats.skin} position-y={d.neckTop - 0.02} />
            {Arm(1, armL, elbowL)}
            {Arm(-1, armR, elbowR)}

            <group ref={head} position-y={d.neckTop}>
              <group position-y={hr * 0.98}>
                {Face}
                {female ? (
                  // Hijab hood: a sphere set back from the face so the face shows through
                  <>
                    <mesh geometry={geo.sphere} material={mats.headwear} position={[0, hr * 0.2, -hr * 0.3]} scale={[hr * 1.2, hr * 1.24, hr * 1.2]} />
                    {/* Soft fold framing the face */}
                    <mesh geometry={geo.faceRim} material={mats.headwear} position={[0, -hr * 0.05, hr * 0.62]} rotation-x={-0.32} scale={[hr * 0.86, hr * 1.02, hr * 0.7]} />
                  </>
                ) : (
                  <>
                    {/* Short hair, ears and the embroidered cap */}
                    <mesh geometry={geo.hairShell} material={mats.hair} position={[0, hr * 0.02, -hr * 0.04]} rotation-x={-0.5} scale={hr * 1.045} />
                    {[1, -1].map((sx) => (
                      <mesh key={sx} geometry={geo.lowSphere} material={mats.skin} position={[sx * hr * 0.97, -hr * 0.08, -hr * 0.05]} scale={[hr * 0.12, hr * 0.22, hr * 0.15]} />
                    ))}
                    <mesh
                      geometry={geo.cap}
                      material={[mats.headwear, mats.headwearPlain, mats.headwearPlain]}
                      position={[0, hr * 0.78, -hr * 0.06]}
                      rotation-x={-0.16}
                    />
                  </>
                )}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  )
}
