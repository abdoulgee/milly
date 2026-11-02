/**
 * Player movement: reads joystick / keyboard input, moves the character
 * relative to the camera with smooth acceleration, resolves collisions and
 * turns the character to face where she is going.
 */
import { useEffect, useRef, type RefObject, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { CharacterConfig } from '../data/museumConfig'
import { BENCH_SEATS, resolveCollisions } from '../components/game/MuseumLayout'
import type { MotionState } from '../components/game/characters/motion'
import { angleDelta, clamp, damp, dampAngle, easeInOutCubic } from '../lib/math'
import { isInputBlocked, useGameStore } from '../store/gameStore'
import { pushTrail, runtime } from '../store/runtime'
import { triggerInteraction } from './useInteractions'

export const PLAYER_RADIUS = 0.3
const ACCEL = 8 // how quickly she reaches full speed
const DECEL = 10 // how quickly she stops
const TURN = 11 // how quickly she turns to face the input direction

const input = { x: 0, y: 0 }
const next = new THREE.Vector3()

/** Combined movement input (x = right, y = forward), length ≤ 1. */
export function readMoveInput(out: { x: number; y: number }) {
  const { keys, joystick } = runtime.input
  if (joystick.active) {
    out.x = joystick.x
    out.y = joystick.y
  } else {
    out.x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0)
    out.y = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0)
  }
  const len = Math.hypot(out.x, out.y)
  if (len > 1) {
    out.x /= len
    out.y /= len
  }
  return out
}

export function usePlayerControls(
  root: RefObject<THREE.Group | null>,
  motion: MutableRefObject<MotionState>,
  config: CharacterConfig,
) {
  const state = useRef({ turnRate: 0, sit: 0, seatTime: 0 })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    if (dt <= 0 || !root.current) return
    const p = runtime.player
    const cam = runtime.camera

    readMoveInput(input)
    if (isInputBlocked() || cam.intro < 0.7) input.x = input.y = 0
    const mag = Math.hypot(input.x, input.y)

    if (runtime.seat.phase !== 'none') {
      seatedFrame(root.current, motion.current, state.current, mag, dt)
      return
    }
    state.current.sit = 0
    motion.current.sit = 0

    // Camera-relative direction (camera yaw 0 looks towards -Z)
    const fx = -Math.sin(cam.yaw)
    const fz = -Math.cos(cam.yaw)
    const rx = Math.cos(cam.yaw)
    const rz = -Math.sin(cam.yaw)
    const dx = (rx * input.x + fx * input.y) * config.maxSpeed
    const dz = (rz * input.x + fz * input.y) * config.maxSpeed

    const k = mag > 0.01 ? ACCEL : DECEL
    p.velocity.x = damp(p.velocity.x, dx, k, dt)
    p.velocity.z = damp(p.velocity.z, dz, k, dt)

    next.set(p.position.x + p.velocity.x * dt, 0, p.position.z + p.velocity.z * dt)
    resolveCollisions(next, PLAYER_RADIUS)
    const moved = Math.hypot(next.x - p.position.x, next.z - p.position.z)
    p.position.copy(next)
    p.speed = moved / dt
    if (p.speed < 0.02) p.velocity.multiplyScalar(0.5) // pressed against a wall

    // Face the input direction (feels more responsive than facing velocity)
    const prevYaw = p.yaw
    if (mag > 0.08) p.yaw = dampAngle(p.yaw, Math.atan2(dx, dz), TURN, dt)
    state.current.turnRate = damp(state.current.turnRate, angleDelta(prevYaw, p.yaw) / dt, 10, dt)

    p.idleTime = p.speed > 0.15 ? 0 : p.idleTime + dt
    if (p.speed > 0.05) pushTrail(p.position)

    root.current.position.copy(p.position)
    root.current.rotation.y = p.yaw

    const m = motion.current
    m.speed = damp(m.speed, p.speed, 14, dt)
    m.turnRate = state.current.turnRate
    chatPose(m, p.position, p.yaw, runtime.companion.position, 'her', p.idleTime > 0.4)

    if (p.speed > 0.6 && !useGameStore.getState().hasMoved) useGameStore.getState().markMoved()
  })
}

const toSeat = new THREE.Vector3()

/**
 * Bench routine: walk to the spot in front of her seat (round the end of
 * the bench if she's behind it), turn her back to it, sit, and get up again
 * when she moves the joystick or taps "Stand up".
 */
function seatedFrame(
  root: THREE.Group,
  m: MotionState,
  st: { turnRate: number; sit: number; seatTime: number },
  inputMag: number,
  dt: number,
) {
  const p = runtime.player
  const seat = runtime.seat
  const bench = BENCH_SEATS[seat.bench]
  const sp = bench.seats[seat.herSeat]
  const ap = bench.approach[seat.herSeat]
  const prevYaw = p.yaw
  let speed = 0

  if (seat.phase === 'approach') {
    if (inputMag > 0.35) {
      useGameStore.getState().standUp()
    } else {
      // Behind the bench? Go round its nearer end first.
      const front = (p.position.x - bench.x) * bench.fx
      let tx = ap.x
      let tz = ap.z
      if (front < 0.2 && Math.abs(p.position.z - bench.z) < 1.25) {
        tx = bench.x + bench.fx * 0.2
        tz = bench.z + (p.position.z >= bench.z ? 1.35 : -1.35)
      }
      const dx = tx - p.position.x
      const dz = tz - p.position.z
      const dist = Math.hypot(dx, dz)
      const v = Math.min(1.7, dist * 4)
      toSeat.set(p.position.x + (dx / (dist || 1)) * v * dt, 0, p.position.z + (dz / (dist || 1)) * v * dt)
      resolveCollisions(toSeat, PLAYER_RADIUS)
      speed = toSeat.distanceTo(p.position) / dt
      p.position.copy(toSeat)
      if (dist > 0.05) p.yaw = dampAngle(p.yaw, Math.atan2(dx, dz), 9, dt)
      pushTrail(p.position)
      st.seatTime += dt
      if (Math.hypot(ap.x - p.position.x, ap.z - p.position.z) < 0.1 || st.seatTime > 7) {
        seat.phase = 'sitting'
        st.seatTime = 0
      }
    }
  } else if (seat.phase === 'sitting' || seat.phase === 'seated') {
    st.seatTime += dt
    p.yaw = dampAngle(p.yaw, bench.yaw, 8, dt)
    // Start lowering once she has mostly turned round
    if (Math.abs(angleDelta(p.yaw, bench.yaw)) < 0.6) st.sit = Math.min(1, st.sit + dt / 0.8)
    if (seat.phase === 'sitting' && st.sit >= 1) {
      seat.phase = 'seated'
      runtime.camera.recenter = true
    }
    if (seat.phase === 'seated' && inputMag > 0.35 && st.seatTime > 0.8) useGameStore.getState().standUp()
  } else if (seat.phase === 'rising') {
    st.sit = Math.max(0, st.sit - dt / 0.65)
    if (st.sit <= 0) {
      seat.phase = 'none'
      seat.bench = -1
      st.seatTime = 0
      p.idleTime = 0
      useGameStore.getState().clearSeated()
    }
  }

  if (seat.phase === 'sitting' || seat.phase === 'seated' || seat.phase === 'rising') {
    const k = easeInOutCubic(clamp(st.sit, 0, 1))
    p.position.set(ap.x + (sp.x - ap.x) * k, 0, ap.z + (sp.z - ap.z) * k)
  }

  p.velocity.set(0, 0, 0)
  p.speed = speed
  p.idleTime = speed > 0.15 ? 0 : p.idleTime + dt
  st.turnRate = damp(st.turnRate, angleDelta(prevYaw, p.yaw) / dt, 10, dt)
  root.position.copy(p.position)
  root.rotation.y = p.yaw
  m.speed = damp(m.speed, speed, 14, dt)
  m.turnRate = st.turnRate
  m.sit = st.sit
  chatPose(m, p.position, p.yaw, runtime.companion.position, 'her', speed < 0.2)
}

/**
 * Speech: open the mouth while speaking and turn the head towards the
 * other one (fully when standing still or seated, a glance when walking).
 */
export function chatPose(
  m: MotionState,
  self: THREE.Vector3,
  yaw: number,
  other: THREE.Vector3,
  me: 'her' | 'him',
  still: boolean,
) {
  const speaker = runtime.chat.speaker
  m.talking = speaker === me
  if (!speaker) {
    m.lookYaw = 0
    return
  }
  const rel = angleDelta(yaw, Math.atan2(other.x - self.x, other.z - self.z))
  m.lookYaw = still ? rel : speaker === me ? rel * 0.4 : 0
}

const KEYMAP: Record<string, keyof typeof runtime.input.keys> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
}

/** Desktop keyboard: WASD / arrows to move, E to interact, Esc for menus. */
export function useKeyboardControls(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const keys = runtime.input.keys
    const down = (e: KeyboardEvent) => {
      const k = KEYMAP[e.code]
      if (k) {
        keys[k] = true
        e.preventDefault()
        return
      }
      if (e.repeat) return
      const s = useGameStore.getState()
      if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') {
        if (s.viewingMemoryId) s.closeMemory()
        else if (s.celebration === 'message') s.closeBirthdayMessage()
        else if (!s.paused) triggerInteraction()
        e.preventDefault()
      } else if (e.code === 'Escape') {
        if (s.viewingMemoryId) s.closeMemory()
        else if (s.celebration === 'message') s.closeBirthdayMessage()
        else s.setPaused(!s.paused)
      } else if (e.code === 'KeyR') {
        runtime.camera.recenter = true
      }
    }
    const up = (e: KeyboardEvent) => {
      const k = KEYMAP[e.code]
      if (k) keys[k] = false
    }
    const clear = () => {
      keys.forward = keys.back = keys.left = keys.right = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
      clear()
    }
  }, [enabled])
}
