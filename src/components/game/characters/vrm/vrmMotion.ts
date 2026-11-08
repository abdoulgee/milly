/**
 * Procedural animation for VRM avatars, driven by MotionState (the same
 * contract the movement controllers write): walk cycle matched to ground
 * speed, idle breathing and weight shifts, turning steps, sitting on a
 * bench, talking (mouth + small hand gesture + nods), blinking and turning
 * the head towards whoever they're chatting with.
 *
 * Works on the *normalized* humanoid bones (three-vrm), whose rest pose is
 * a T-pose with world-aligned axes. For VRM 0.x avatars that frame faces -Z:
 *   upperLeg.x  +  → leg swings forward      lowerLeg.x  −  → knee bends
 *   upperArm.z  +L/−R → arm lowers            upperArm.x  +  → arm swings forward
 *   lowerArm.y  −L/+R → elbow bends forward   spine.x     −  → lean forward
 *   head.y      +  → look to her/his left
 */
import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm'
import * as THREE from 'three'
import { clamp, damp } from '../../../../lib/math'
import type { MotionState } from '../motion'

/** Hip-joint height when seated (bench cushions are 0.465 m high). */
export const SEAT_HIP_Y = 0.55

export interface Gait {
  stride: number
  legSwing: number
  armSwing: number
  /** arms' rest angle down from the T-pose (rad) */
  armRest: number
  female: boolean
}

export interface AnimState {
  phase: number
  walk: number
  turnStep: number
  lean: number
  blinkIn: number
  blink: number
  open: number
  look: number
  gesture: number
  admire: number
}

export const createAnimState = (): AnimState => ({ phase: 0, walk: 0, turnStep: 0, lean: 0, blinkIn: 2, blink: 0, open: 0, look: 0, gesture: 0, admire: 0 })

export interface Rig {
  hipsRestY: number
  thigh: number
  shin: number
  ankle: number
  bone: (n: VRMHumanBoneName) => THREE.Object3D
}

export function makeRig(vrm: VRM): Rig {
  const h = vrm.humanoid
  const raw = (n: VRMHumanBoneName) => h.getRawBoneNode(n)!.getWorldPosition(new THREE.Vector3())
  vrm.scene.updateMatrixWorld(true)
  const hip = raw('leftUpperLeg')
  const knee = raw('leftLowerLeg')
  const foot = raw('leftFoot')
  const cache = new Map<VRMHumanBoneName, THREE.Object3D>()
  return {
    hipsRestY: h.getNormalizedBoneNode('hips')!.position.y,
    thigh: hip.distanceTo(knee),
    shin: knee.distanceTo(foot),
    ankle: foot.y,
    bone: (n) => {
      let b = cache.get(n)
      if (!b) {
        b = h.getNormalizedBoneNode(n) ?? new THREE.Object3D()
        cache.set(n, b)
      }
      return b
    },
  }
}

export function animateVRM(vrm: VRM, rig: Rig, gait: Gait, m: MotionState, a: AnimState, time: number, rawDt: number, scale: number) {
  const dt = Math.min(rawDt, 0.05)
  const B = rig.bone
  const t = time + (gait.female ? 0 : 1.7)
  const sit = m.sit * m.sit * (3 - 2 * m.sit)
  const stand = 1 - sit
  const L = (sv: number, st: number) => sv * stand + st * sit

  a.walk = damp(a.walk, clamp(m.speed / 1.4, 0, 1.25) * stand, 9, dt)
  a.turnStep = damp(a.turnStep, clamp(Math.abs(m.turnRate) / 5, 0, 0.45) * (1 - clamp(a.walk, 0, 1)) * stand, 8, dt)
  const g = Math.max(a.walk, a.turnStep)
  const g1 = Math.min(g, 1)
  const idle = (1 - g1) * stand
  a.phase += dt * (m.speed / gait.stride + a.turnStep * 2.4) * Math.PI * 2
  const s = Math.sin(a.phase)
  const c = Math.cos(a.phase)
  const amp = gait.legSwing * Math.min(g, 1.15)

  // Seated: thighs forward (slightly down to the cushion), shins down
  const hipSeat = SEAT_HIP_Y / scale
  const seatA = Math.asin(clamp((hipSeat - rig.shin - rig.ankle) / rig.thigh, -0.5, 0.5))
  const thighSeat = Math.PI / 2 - seatA

  // ── Legs ──
  const thL = B('leftUpperLeg')
  const thR = B('rightUpperLeg')
  thL.rotation.set(L(s * amp, thighSeat), 0, L(0, -0.05))
  thR.rotation.set(L(-s * amp, thighSeat), 0, L(0, 0.05))
  const knL = L(-(0.05 + 0.95 * Math.max(0, c)) * g1, -thighSeat)
  const knR = L(-(0.05 + 0.95 * Math.max(0, -c)) * g1, -thighSeat)
  B('leftLowerLeg').rotation.set(knL, 0, 0)
  B('rightLowerLeg').rotation.set(knR, 0, 0)
  B('leftFoot').rotation.set(-(thL.rotation.x + knL) * L(0.6, 1), 0, 0)
  B('rightFoot').rotation.set(-(thR.rotation.x + knR) * L(0.6, 1), 0, 0)

  // ── Hips & spine ──
  const hips = B('hips')
  const bob = (Math.abs(c) - 0.6) * 0.03 * g1
  hips.position.y = L(rig.hipsRestY + bob - 0.006 * idle, hipSeat)
  hips.position.x = idle * Math.sin(t * 0.7) * 0.012
  hips.rotation.set(0, -s * 0.09 * g1, idle * Math.sin(t * 0.7) * 0.025 + c * 0.03 * g1)
  const forward = 0.06 * Math.min(g, 1.2)
  B('spine').rotation.set(-forward - idle * Math.sin(t * 0.9) * 0.01 - sit * 0.05, s * 0.1 * g1, -idle * Math.sin(t * 0.7) * 0.02)
  // breathing
  B('chest').rotation.set(-Math.sin(t * 2.1) * 0.012 * (1 - g1 * 0.6), s * 0.04 * g1, 0)
  B('upperChest').rotation.set(-Math.sin(t * 2.1 + 0.4) * 0.008, 0, 0)

  // ── Talking ──
  const talk = m.talking ? 1 : 0
  const chatter = Math.abs(Math.sin(t * 11.5) * 0.7 + Math.sin(t * 6.7) * 0.5)
  a.open = damp(a.open, talk * (0.2 + 0.6 * clamp(chatter, 0, 1)), 18, dt)
  a.gesture = damp(a.gesture, talk * (1 - g1) * (1 - a.admire) * (0.5 + 0.5 * Math.sin(t * 1.6)), 3, dt)

  // ── Arms ──
  const sway = Math.sin(t * 1.3) * 0.025 * idle
  const armAmp = gait.armSwing * Math.min(g, 1.15)
  const rest = gait.armRest + idle * Math.sin(t * 0.9) * 0.012
  B('leftShoulder').rotation.set(0, 0, L(0.04, 0.06))
  B('rightShoulder').rotation.set(0, 0, -L(0.04, 0.06))
  B('leftUpperArm').rotation.set(L(-s * armAmp - sway, 0.28), 0, L(rest, 1.3))
  B('rightUpperArm').rotation.set(L(s * armAmp + sway + a.gesture * 0.5, 0.28 + a.gesture * 0.3), 0, -L(rest - a.gesture * 0.12, 1.3))
  const elbow = 0.18 + 0.32 * g1
  B('leftLowerArm').rotation.set(0, -L(elbow + 0.22 * g1 * Math.max(0, -s), 0.75), 0)
  B('rightLowerArm').rotation.set(0, L(elbow + 0.22 * g1 * Math.max(0, s) + a.gesture * 0.9, 0.75 + a.gesture * 0.5), 0)
  // ── Admiring a photo: hands softly clasped in front, a little sway ──
  a.admire = damp(a.admire, (m.admire ?? 0) * stand * (1 - g1), 3, dt)
  const ad = a.admire
  if (ad > 0.001) {
    const mixRot = (n: VRMHumanBoneName, x: number, y: number, z: number) => {
      const r = B(n).rotation
      r.set(r.x + (x - r.x) * ad, r.y + (y - r.y) * ad, r.z + (z - r.z) * ad)
    }
    const sw = Math.sin(t * 0.8) * 0.03
    mixRot('leftUpperArm', 0.34 + sw, -0.5, 1.24)
    mixRot('rightUpperArm', 0.34 + sw, 0.5, -1.24)
    mixRot('leftLowerArm', 0, -1.55, 0)
    mixRot('rightLowerArm', 0, 1.55, 0)
  }

  // relaxed hands: slight curl, palms towards the thighs
  B('leftHand').rotation.set(0, 0, L(0.12, 0.25))
  B('rightHand').rotation.set(0, 0, -L(0.12, 0.25))
  for (const side of ['left', 'right'] as const) {
    const k = side === 'left' ? 1 : -1
    for (const f of ['Index', 'Middle', 'Ring', 'Little'] as const) {
      const curl = 0.25 + (f === 'Little' ? 0.15 : f === 'Ring' ? 0.08 : 0)
      B(`${side}${f}Proximal` as VRMHumanBoneName).rotation.set(0, 0, curl * k)
      B(`${side}${f}Intermediate` as VRMHumanBoneName).rotation.set(0, 0, curl * 1.1 * k)
      B(`${side}${f}Distal` as VRMHumanBoneName).rotation.set(0, 0, curl * 0.8 * k)
    }
    B(`${side}ThumbProximal` as VRMHumanBoneName).rotation.set(0, 0.2 * k, 0)
  }

  // ── Head: turn towards whoever they're chatting with, else look around ──
  a.look = damp(a.look, clamp(m.lookYaw, -1.0, 1.0), 4, dt)
  const wander = 1 - clamp(Math.abs(a.look) * 3, 0, 1)
  const yaw = a.look * 0.75 + (idle + sit) * wander * Math.sin(t * 0.43) * 0.2
  B('neck').rotation.set(forward * 0.3, yaw * 0.35, 0)
  B('head').rotation.set(
    forward * 0.5 + idle * Math.sin(t * 0.61) * 0.03 + talk * Math.sin(t * 5.2) * 0.035 - sit * 0.04 + ad * 0.16,
    yaw * 0.65,
    (idle + sit) * Math.sin(t * 0.33) * 0.035 - a.look * 0.06 + ad * Math.sin(t * 0.5) * 0.07,
  )

  // lean into turns (applied by the caller on the outer group)
  a.lean = damp(a.lean, clamp(m.turnRate * 0.035, -0.12, 0.12) * Math.min(1, g + 0.25) * stand, 6, dt)

  // ── Face ──
  a.blinkIn -= dt
  if (a.blinkIn <= 0) {
    a.blink = 0.16
    a.blinkIn = 2.2 + Math.random() * 3.5
  }
  a.blink -= dt
  const em = vrm.expressionManager
  if (em) {
    const b = a.blink > 0 ? Math.sin((1 - a.blink / 0.16) * Math.PI) : 0
    em.setValue('blink', b)
    em.setValue('aa', a.open * 0.7)
    em.setValue('ih', a.open * 0.2 * Math.max(0, Math.sin(t * 7.3)))
    em.setValue('happy', 0.12 + talk * 0.1 + ad * 0.08)
    em.setValue('relaxed', ad * 0.45)
  }
}
