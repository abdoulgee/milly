/**
 * Companion AI: follows the player like a person walking with you.
 *
 * - While she walks, he follows her *breadcrumb trail* ~1.5 m behind. Her
 *   trail is always walkable, so he naturally goes around the fountain,
 *   benches, etc. without a navmesh.
 * - When she stops, he steps up beside her (on whichever side he's on) and
 *   looks the same way she does — e.g. at the photo she's viewing.
 * - Arrive steering + hysteresis (start/stop radii) prevent jitter.
 * - Personal-space separation keeps him from overlapping her.
 */
import { useRef, type MutableRefObject, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { CharacterConfig } from '../data/museumConfig'
import { BENCH_SEATS, isWalkable, resolveCollisions } from '../components/game/MuseumLayout'
import type { MotionState } from '../components/game/characters/motion'
import { angleDelta, clamp, damp, dampAngle, easeInOutCubic } from '../lib/math'
import { runtime, type SeatPhase } from '../store/runtime'
import { chatPose } from './usePlayerControls'

const RADIUS = 0.3
const FOLLOW_DISTANCE = 1.5 // along her trail while walking
const SIDE_OFFSET = 0.95 // beside her while she's standing
const START_RADIUS = 0.55 // begin walking when the target is this far
const STOP_RADIUS = 0.16 // stop once this close
const PERSONAL_SPACE = 0.85
const MIN_GAP = 0.62
const STROLL = 1.15 // relaxed walking pace (m/s) for small repositioning steps

const target = new THREE.Vector3()
const next = new THREE.Vector3()
const scratch = new THREE.Vector3()

/** Point `distance` metres back along the player's trail. */
function trailPoint(out: THREE.Vector3, distance: number) {
  const { position, trail, yaw } = runtime.player
  let prev = position
  let acc = 0
  for (let i = trail.length - 1; i >= 0; i--) {
    const pt = trail[i]
    const seg = Math.hypot(pt.x - prev.x, pt.z - prev.z)
    if (acc + seg >= distance) {
      const f = (distance - acc) / (seg || 1)
      return out.set(prev.x + (pt.x - prev.x) * f, 0, prev.z + (pt.z - prev.z) * f)
    }
    acc += seg
    prev = pt
  }
  // Trail too short (just spawned): aim straight behind her
  out.set(position.x - Math.sin(yaw) * distance, 0, position.z - Math.cos(yaw) * distance)
  resolveCollisions(out, RADIUS)
  return out
}

export function useCompanionFollow(
  root: RefObject<THREE.Group | null>,
  motion: MutableRefObject<MotionState>,
  config: CharacterConfig,
) {
  const s = useRef({
    moving: false,
    side: 0 as -1 | 0 | 1,
    vel: new THREE.Vector3(),
    turnRate: 0,
    speed: 0,
    // Bench routine
    seat: { phase: 'none' as SeatPhase, bench: 0, idx: 0, sit: 0, timer: 0, epoch: 0 },
  })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    if (dt <= 0 || !root.current) return
    const st = s.current
    const c = runtime.companion
    const p = runtime.player

    // ── 0. Sitting with her on a bench ────────────────────────────────
    const herSeat = runtime.seat
    const mine = st.seat
    if (mine.epoch !== herSeat.epoch) Object.assign(mine, { phase: 'none', sit: 0, epoch: herSeat.epoch })
    if (mine.phase === 'none' && herSeat.bench >= 0 && ['approach', 'sitting', 'seated'].includes(herSeat.phase)) {
      Object.assign(mine, { phase: 'approach', bench: herSeat.bench, idx: 1 - herSeat.herSeat, timer: 0 })
    }
    if (mine.phase !== 'none') {
      companionSeatFrame(st, config, dt)
      root.current.position.copy(c.position)
      root.current.rotation.y = c.yaw
      motion.current.speed = st.speed < 0.05 ? 0 : st.speed
      motion.current.turnRate = st.turnRate
      motion.current.sit = mine.sit
      chatPose(motion.current, c.position, c.yaw, p.position, 'him', st.speed < 0.2)
      return
    }
    motion.current.sit = 0

    // ── 1. Choose where to go ─────────────────────────────────────────
    const fwdX = Math.sin(p.yaw)
    const fwdZ = Math.cos(p.yaw)
    const leftX = Math.cos(p.yaw)
    const leftZ = -Math.sin(p.yaw)
    let besideHer = false

    if (p.idleTime > 0.8) {
      if (st.side === 0) {
        // Lock a side when she stops so he doesn't flip-flop
        const dot = (c.position.x - p.position.x) * leftX + (c.position.z - p.position.z) * leftZ
        st.side = dot >= 0 ? 1 : -1
      }
      for (const side of [st.side, -st.side] as (-1 | 1)[]) {
        const tx = p.position.x + leftX * side * SIDE_OFFSET - fwdX * 0.25
        const tz = p.position.z + leftZ * side * SIDE_OFFSET - fwdZ * 0.25
        if (isWalkable(tx, tz, RADIUS, scratch)) {
          target.set(tx, 0, tz)
          st.side = side
          besideHer = true
          break
        }
      }
    } else {
      st.side = 0
    }
    if (!besideHer) trailPoint(target, FOLLOW_DISTANCE)

    // ── 2. Arrive steering with hysteresis ────────────────────────────
    const tx = target.x - c.position.x
    const tz = target.z - c.position.z
    const dist = Math.hypot(tx, tz)
    if (!st.moving && dist > START_RADIUS) st.moving = true
    if (st.moving && dist < STOP_RADIUS) st.moving = false

    const toPlayerX = c.position.x - p.position.x
    const toPlayerZ = c.position.z - p.position.z
    const playerDist = Math.hypot(toPlayerX, toPlayerZ) || 0.001

    // Safety net: if he somehow gets far away (e.g. after a menu), catch up.
    if (playerDist > 14) {
      c.position.copy(trailPoint(target, FOLLOW_DISTANCE))
      st.vel.set(0, 0, 0)
    }

    // Walk at her pace: match her speed while following, stroll when stepping
    // up beside her, and only speed up a little if he has fallen behind.
    const catchUp = clamp((playerDist - 2.4) / 3, 0, 1)
    const pace = besideHer ? STROLL : Math.max(STROLL, p.speed)
    const cruise = Math.min(config.maxSpeed, pace * (1 + 0.3 * catchUp))
    const desired = st.moving ? clamp(dist * 2.4, 0, 1) * cruise : 0
    let dvx = dist > 1e-4 ? (tx / dist) * desired : 0
    let dvz = dist > 1e-4 ? (tz / dist) * desired : 0

    // Personal space: gently steer away if too close to her
    if (playerDist < PERSONAL_SPACE) {
      const push = (PERSONAL_SPACE - playerDist) * 3.5
      dvx += (toPlayerX / playerDist) * push
      dvz += (toPlayerZ / playerDist) * push
    }

    st.vel.x = damp(st.vel.x, dvx, 6, dt)
    st.vel.z = damp(st.vel.z, dvz, 6, dt)

    next.set(c.position.x + st.vel.x * dt, 0, c.position.z + st.vel.z * dt)
    // Hard minimum gap so they never overlap
    const gx = next.x - p.position.x
    const gz = next.z - p.position.z
    const g = Math.hypot(gx, gz)
    if (g < MIN_GAP && g > 1e-4) {
      next.x = p.position.x + (gx / g) * MIN_GAP
      next.z = p.position.z + (gz / g) * MIN_GAP
    }
    resolveCollisions(next, RADIUS)

    const moved = Math.hypot(next.x - c.position.x, next.z - c.position.z)
    c.position.copy(next)
    st.speed = damp(st.speed, moved / dt, 10, dt)

    // ── 3. Facing ─────────────────────────────────────────────────────
    const prevYaw = c.yaw
    if (st.speed > 0.3) {
      c.yaw = dampAngle(c.yaw, Math.atan2(st.vel.x, st.vel.z), 7, dt)
    } else if (besideHer) {
      c.yaw = dampAngle(c.yaw, p.yaw, 3, dt) // look where she's looking
    } else if (playerDist > 0.3) {
      c.yaw = dampAngle(c.yaw, Math.atan2(-toPlayerX, -toPlayerZ), 3, dt)
    }
    st.turnRate = damp(st.turnRate, angleDelta(prevYaw, c.yaw) / dt, 10, dt)

    root.current.position.copy(c.position)
    root.current.rotation.y = c.yaw
    motion.current.speed = st.speed < 0.05 ? 0 : st.speed
    motion.current.turnRate = st.turnRate
    chatPose(motion.current, c.position, c.yaw, p.position, 'him', st.speed < 0.25)
  })
}

type FollowState = {
  vel: THREE.Vector3
  turnRate: number
  speed: number
  moving: boolean
  seat: { phase: SeatPhase; bench: number; idx: number; sit: number; timer: number }
}

/** He walks to the other seat, sits once she does, and gets up with her. */
function companionSeatFrame(st: FollowState, config: CharacterConfig, dt: number) {
  const c = runtime.companion
  const p = runtime.player
  const her = runtime.seat
  const me = st.seat
  const bench = BENCH_SEATS[me.bench]
  const sp = bench.seats[me.idx]
  const ap = bench.approach[me.idx]
  const herLeaving = her.bench !== me.bench || her.phase === 'none' || her.phase === 'rising'
  const prevYaw = c.yaw
  let speed = 0
  me.timer += dt

  if (me.phase === 'approach') {
    if (herLeaving) {
      me.phase = 'none'
    } else {
      const front = (c.position.x - bench.x) * bench.fx
      let tx = ap.x
      let tz = ap.z
      if (front < 0.2 && Math.abs(c.position.z - bench.z) < 1.25) {
        tx = bench.x + bench.fx * 0.2
        tz = bench.z + (c.position.z >= bench.z ? 1.35 : -1.35)
      }
      const dx = tx - c.position.x
      const dz = tz - c.position.z
      const dist = Math.hypot(dx, dz)
      const v = Math.min(config.maxSpeed * 0.6, dist * 4)
      next.set(c.position.x + (dx / (dist || 1)) * v * dt, 0, c.position.z + (dz / (dist || 1)) * v * dt)
      const gx = next.x - p.position.x
      const gz = next.z - p.position.z
      const g = Math.hypot(gx, gz)
      if (g < MIN_GAP && g > 1e-4) {
        next.x = p.position.x + (gx / g) * MIN_GAP
        next.z = p.position.z + (gz / g) * MIN_GAP
      }
      resolveCollisions(next, RADIUS)
      speed = next.distanceTo(c.position) / dt
      c.position.copy(next)
      if (dist > 0.05) c.yaw = dampAngle(c.yaw, Math.atan2(dx, dz), 8, dt)
      if (Math.hypot(ap.x - c.position.x, ap.z - c.position.z) < 0.1 || me.timer > 8) {
        me.phase = 'sitting'
        me.timer = 0
      }
    }
  } else if (me.phase === 'sitting' || me.phase === 'seated') {
    c.yaw = dampAngle(c.yaw, bench.yaw, 8, dt)
    if (Math.abs(angleDelta(c.yaw, bench.yaw)) < 0.6) me.sit = Math.min(1, me.sit + dt / 0.85)
    if (me.sit >= 1) me.phase = 'seated'
    if (herLeaving) {
      me.phase = 'rising'
      me.timer = 0
    }
  } else if (me.phase === 'rising') {
    // A beat after she does
    if (me.timer > 0.25) me.sit = Math.max(0, me.sit - dt / 0.7)
    if (me.sit <= 0) me.phase = 'none'
  }

  if (me.phase !== 'approach' && me.phase !== 'none') {
    const k = easeInOutCubic(clamp(me.sit, 0, 1))
    c.position.set(ap.x + (sp.x - ap.x) * k, 0, ap.z + (sp.z - ap.z) * k)
  }
  st.vel.set(0, 0, 0)
  st.moving = false
  st.speed = damp(st.speed, speed, 10, dt)
  st.turnRate = damp(st.turnRate, angleDelta(prevYaw, c.yaw) / dt, 10, dt)
}
