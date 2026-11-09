/**
 * Per-frame game state that changes every frame (positions, input, camera).
 *
 * This deliberately lives OUTSIDE React/Zustand: writing to plain mutable
 * objects inside `useFrame` avoids re-rendering React 60 times a second.
 * UI-level state (menus, prompts, progress) lives in `gameStore.ts`.
 */
import { Vector3 } from 'three'
import { characters } from '../data/museumConfig'

const TRAIL_MAX = 160

export type SeatPhase = 'none' | 'approach' | 'sitting' | 'seated' | 'rising'
export type Speaker = 'her' | 'him'

export const runtime = {
  input: {
    keys: { forward: false, back: false, left: false, right: false },
    /** Virtual joystick: x = right, y = forward, both in -1..1 */
    joystick: { x: 0, y: 0, active: false },
    /** Look/zoom deltas accumulated by gestures; consumed by the camera each frame */
    look: { dx: 0, dy: 0, zoom: 0 },
  },
  player: {
    position: new Vector3(...characters.player.position),
    velocity: new Vector3(),
    /** Facing angle around Y (0 = facing +Z) */
    yaw: Math.PI,
    speed: 0,
    idleTime: 0,
    /** Breadcrumb trail of recent walkable positions (oldest first) */
    trail: [] as Vector3[],
  },
  companion: {
    position: new Vector3(...characters.companion.position),
    yaw: Math.PI,
  },
  /** Sitting together on a bench (driven by the player & companion controllers) */
  seat: {
    /** Index into BENCH_SEATS, -1 when not sitting */
    bench: -1,
    /** Which of the bench's two seats is hers (his is the other) */
    herSeat: 0,
    phase: 'none' as SeatPhase,
    /** Bumped on every reset so the companion can drop its own seat state */
    epoch: 0,
  },
  /** Who is currently speaking (mirrors the chat store for per-frame reads) */
  chat: { speaker: null as Speaker | null },
  /** Screen position (CSS px) of the speech-bubble anchor above each head */
  bubbles: {
    her: { x: 0, y: 0, visible: false },
    him: { x: 0, y: 0, visible: false },
  } as Record<Speaker, { x: number; y: number; visible: boolean }>,
  camera: {
    yaw: 0,
    pitch: 0.36,
    distance: 4.6,
    targetDistance: 4.6,
    recenter: false,
    /** 0 → 1 while the entrance fly-in plays */
    intro: 1,
  },
}

export function pushTrail(p: Vector3) {
  const trail = runtime.player.trail
  const last = trail[trail.length - 1]
  if (last && last.distanceToSquared(p) < 0.25 * 0.25) return
  trail.push(p.clone())
  if (trail.length > TRAIL_MAX) trail.shift()
}

/** Put everyone back at the entrance (used when (re)entering the museum). */
export function resetRuntime() {
  const r = runtime
  r.player.position.set(...characters.player.position)
  r.player.velocity.set(0, 0, 0)
  r.player.yaw = Math.PI
  r.player.speed = 0
  r.player.idleTime = 0
  r.player.trail.length = 0
  r.companion.position.set(...characters.companion.position)
  r.companion.yaw = Math.PI
  r.seat.bench = -1
  r.seat.phase = 'none'
  r.seat.epoch++
  r.chat.speaker = null
  r.camera.yaw = 0
  r.camera.pitch = 0.36
  r.camera.targetDistance = 4.6
  r.camera.distance = 4.6
  r.camera.recenter = false
  r.camera.intro = 0
  r.input.joystick.x = r.input.joystick.y = 0
  r.input.joystick.active = false
  r.input.look.dx = r.input.look.dy = r.input.look.zoom = 0
}
