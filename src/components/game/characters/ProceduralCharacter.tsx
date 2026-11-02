/**
 * The two of us as sculpted, skinned characters (built in `sculpt.ts`, in a
 * worker via `characterCache.ts`), animated procedurally from MotionState:
 * walk, idle, turn-lean, blinking, a talking mouth, head turns towards each
 * other and a seated pose. Everything is driven by rotating the bones.
 */
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { ProceduralAppearance } from '../../../data/museumConfig'
import { clamp, damp } from '../../../lib/math'
import type { MotionState } from './motion'
import { readCharacter } from './characterCache'
import { B, buildCharacter, FEMALE_BODY, MALE_BODY } from './sculpt'

/** Hip-joint height when seated (bench cushions are 0.465 m high). */
export const SEAT_HIP_Y = 0.54

/** Where speech bubbles float (standing) and how far they drop when seated. */
export const BUBBLE = {
  female: { height: 1.93, sitDrop: FEMALE_BODY.hipY - SEAT_HIP_Y },
  male: { height: 2.07, sitDrop: MALE_BODY.hipY - SEAT_HIP_Y },
}

interface Props {
  appearance: ProceduralAppearance
  motion: MutableRefObject<MotionState>
}

const STRIDE = { female: 1.2, male: 1.32 }
const LEG_SWING = { female: 0.42, male: 0.44 }
const ARM_SWING = { female: 0.3, male: 0.34 }

export function ProceduralCharacter({ appearance, motion }: Props) {
  const data = readCharacter(appearance)
  const rig = useMemo(() => buildCharacter(appearance, data), [appearance, data])
  useEffect(() => () => rig.dispose(), [rig])

  const female = appearance.body === 'female'
  const d = rig.body
  const bones = rig.bones
  const f = rig.face
  const anim = useRef({ phase: 0, walk: 0, turnStep: 0, lean: 0, blinkIn: 2, blink: 0, open: 0, look: 0, gesture: 0 })
  const seatA = Math.asin(clamp((SEAT_HIP_Y - d.shin - d.ankle) / d.thigh, -0.5, 0.5))
  const stride = female ? STRIDE.female : STRIDE.male
  const legSwing = female ? LEG_SWING.female : LEG_SWING.male
  const armSwing = female ? ARM_SWING.female : ARM_SWING.male

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const m = motion.current
    const a = anim.current
    const t = state.clock.elapsedTime + (female ? 0 : 1.7)
    const sit = m.sit * m.sit * (3 - 2 * m.sit)
    const stand = 1 - sit
    const L = (sv: number, st: number) => sv * stand + st * sit // blend standing → seated

    a.walk = damp(a.walk, clamp(m.speed / 1.4, 0, 1.25) * stand, 9, dt)
    a.turnStep = damp(a.turnStep, clamp(Math.abs(m.turnRate) / 5, 0, 0.45) * (1 - clamp(a.walk, 0, 1)) * stand, 8, dt)
    const g = Math.max(a.walk, a.turnStep)
    const g1 = Math.min(g, 1)
    const idle = (1 - g1) * stand
    a.phase += dt * (m.speed / stride + a.turnStep * 2.4) * Math.PI * 2
    const s = Math.sin(a.phase)
    const c = Math.cos(a.phase)
    const amp = legSwing * Math.min(g, 1.15)

    // ── Legs ──
    const thL = bones[B.thighL]
    const thR = bones[B.thighR]
    thL.rotation.x = L(-s * amp, -Math.PI / 2 + seatA)
    thR.rotation.x = L(s * amp, -Math.PI / 2 + seatA)
    thL.rotation.z = 0.04 * sit
    thR.rotation.z = -0.04 * sit
    bones[B.shinL].rotation.x = L((0.04 + 0.95 * Math.max(0, c)) * g1, Math.PI / 2 - seatA)
    bones[B.shinR].rotation.x = L((0.04 + 0.95 * Math.max(0, -c)) * g1, Math.PI / 2 - seatA)
    bones[B.footL].rotation.x = -(thL.rotation.x + bones[B.shinL].rotation.x) * L(0.55, 1)
    bones[B.footR].rotation.x = -(thR.rotation.x + bones[B.shinR].rotation.x) * L(0.55, 1)

    // ── Body ──
    const hips = bones[B.hips]
    hips.position.y = L(d.hipY + (Math.abs(c) - 0.6) * 0.035 * g1, SEAT_HIP_Y)
    hips.position.x = idle * Math.sin(t * 0.7) * 0.008
    hips.rotation.y = -s * 0.08 * g1
    const spine = bones[B.spine]
    spine.rotation.y = s * 0.1 * g1
    const forward = 0.05 * Math.min(g, 1.2)
    spine.rotation.x = forward + idle * Math.sin(t * 0.9) * 0.008 + sit * 0.04
    bones[B.chest].rotation.y = s * 0.04 * g1
    bones[B.chest].scale.setScalar(1 + Math.sin(t * 2.1) * 0.006 * (1 - g1))

    // ── Talking: mouth, little nods, raised brows, a hand gesture ──
    const talk = m.talking ? 1 : 0
    const chatter = Math.abs(Math.sin(t * 11.5) * 0.7 + Math.sin(t * 6.7) * 0.5)
    a.open = damp(a.open, talk * (0.25 + 0.75 * clamp(chatter, 0, 1)), 18, dt)
    a.gesture = damp(a.gesture, talk * (1 - g1) * (0.5 + 0.5 * Math.sin(t * 1.6)), 3, dt)
    f.jaw.position.y = -a.open * 0.0075
    f.inner.scale.y = 0.0005 + a.open * 0.0085
    f.brows.position.y = talk * 0.0028 * (0.6 + 0.4 * Math.sin(t * 2.3))

    // ── Arms (bound in an A-pose of d.armRest) ──
    const sway = Math.sin(t * 1.3) * 0.022 * idle
    const armAmp = armSwing * Math.min(g, 1.15)
    const uaL = bones[B.upperArmL]
    const uaR = bones[B.upperArmR]
    uaL.rotation.x = L(s * armAmp + sway, -0.42)
    uaR.rotation.x = L(-s * armAmp - sway - a.gesture * 0.45, -0.42 - a.gesture * 0.2)
    const spread = d.armRest - 0.03 + idle * Math.sin(t * 0.9) * 0.01
    uaL.rotation.z = L(spread, 0.1)
    uaR.rotation.z = -L(spread, 0.1)
    bones[B.forearmL].rotation.x = L(-(0.1 + 0.3 * g1 + 0.2 * g1 * Math.max(0, -s)), -0.95)
    bones[B.forearmR].rotation.x = L(-(0.1 + 0.3 * g1 + 0.2 * g1 * Math.max(0, s)) - a.gesture * 0.85, -0.95 - a.gesture * 0.5)
    bones[B.handL].rotation.z = L(0, -0.25)
    bones[B.handR].rotation.z = L(0, 0.25)

    // ── Head: turn towards whoever they're chatting with, else look around ──
    a.look = damp(a.look, clamp(m.lookYaw, -1.0, 1.0), 4, dt)
    const wander = 1 - clamp(Math.abs(a.look) * 3, 0, 1)
    const head = bones[B.head]
    const neck = bones[B.neck]
    const yaw = a.look * 0.75 + (idle + sit) * wander * Math.sin(t * 0.43) * 0.18
    neck.rotation.y = yaw * 0.35
    head.rotation.y = yaw * 0.65
    head.rotation.x = -forward * 0.6 + idle * Math.sin(t * 0.61) * 0.03 + talk * Math.sin(t * 5.2) * 0.03 + sit * 0.05
    head.rotation.z = (idle + sit) * Math.sin(t * 0.33) * 0.03 - a.look * 0.05
    f.eyeL.rotation.y = a.look * 0.28
    f.eyeR.rotation.y = a.look * 0.28

    a.lean = damp(a.lean, clamp(m.turnRate * 0.035, -0.12, 0.12) * Math.min(1, g + 0.25) * stand, 6, dt)
    bones[B.root].rotation.z = -a.lean

    // Blink every few seconds (eyelids sweep down)
    a.blinkIn -= dt
    if (a.blinkIn <= 0) {
      a.blink = 0.14
      a.blinkIn = 2.2 + Math.random() * 3.5
    }
    a.blink -= dt
    const lid = a.blink > 0 ? 1.35 : -0.85 - talk * 0.08 + sit * 0.12
    f.lidL.rotation.x = lid
    f.lidR.rotation.x = lid
  })

  return (
    <group scale={appearance.height}>
      <primitive object={rig.group} />
    </group>
  )
}
