/**
 * Proximity-based interactions (photos and the birthday cake).
 *
 * Detection runs ~10×/second inside the render loop and only touches the
 * Zustand store when the nearest interactable actually changes.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { memories } from '../data/memories'
import { museumConfig } from '../data/museumConfig'
import { BENCH_SEATS, LANDMARKS } from '../components/game/MuseumLayout'
import { audio } from '../lib/audio'
import { isInputBlocked, useGameStore, type InteractableKind } from '../store/gameStore'
import { runtime } from '../store/runtime'

interface Interactable {
  id: string
  kind: InteractableKind
  x: number
  z: number
  /** Activation distance (m) */
  radius: number
  /** Outward normal (photos only): she must stand in front of the frame */
  nx?: number
  nz?: number
  /** Half-extents (benches): distance is measured to this box, not its centre */
  box?: [hx: number, hz: number]
}

export const interactables: Interactable[] = [
  ...memories.map((m) => ({
    id: m.id,
    kind: 'memory' as const,
    x: m.position[0],
    z: m.position[2],
    radius: 3.1,
    nx: Math.sin(m.rotation[1]),
    nz: Math.cos(m.rotation[1]),
  })),
  { id: 'cake', kind: 'cake', x: LANDMARKS.cake.x, z: LANDMARKS.cake.z, radius: 2.7 },
  ...BENCH_SEATS.map((b, i) => ({ id: `bench-${i}`, kind: 'bench' as const, x: b.x, z: b.z, radius: 0.85, box: [0.32, 0.95] as [number, number] })),
]

const STAND = { id: 'stand', kind: 'stand' as const, label: 'Stand up' }

function labelFor(it: Interactable): string {
  if (it.kind === 'cake') {
    const { celebration } = useGameStore.getState()
    return celebration === 'done' ? museumConfig.birthday.cakeReplayLabel : museumConfig.birthday.cakeActionLabel
  }
  if (it.kind === 'bench') return 'Sit together'
  return 'View memory'
}

export function useProximityDetection() {
  const timer = useRef(0)
  const fountainTimer = useRef(0)

  useFrame((_, dt) => {
    const p = runtime.player.position

    // Fountain ambience follows distance (cheap, 4×/s)
    fountainTimer.current += dt
    if (fountainTimer.current > 0.25) {
      fountainTimer.current = 0
      const d = Math.hypot(p.x - LANDMARKS.fountain.x, p.z - LANDMARKS.fountain.z)
      audio.setFountainProximity(Math.max(0, 1 - (d - 2) / 10))
    }

    timer.current += dt
    if (timer.current < 0.1) return
    timer.current = 0

    const s = useGameStore.getState()
    if (s.seated && !isInputBlocked(s)) {
      if (s.nearby?.id !== STAND.id) s.setNearby(STAND)
      return
    }
    if (isInputBlocked(s) || s.celebration === 'celebrating') {
      if (s.nearby && s.phase !== 'playing') s.setNearby(null)
      if (s.celebration === 'celebrating' && s.nearby?.kind === 'cake') s.setNearby(null)
      return
    }

    let best: Interactable | null = null
    let bestD = Infinity
    for (const it of interactables) {
      const dx = p.x - it.x
      const dz = p.z - it.z
      const d = it.box
        ? Math.hypot(Math.max(0, Math.abs(dx) - it.box[0]), Math.max(0, Math.abs(dz) - it.box[1]))
        : Math.hypot(dx, dz)
      if (d > it.radius || d >= bestD) continue
      if (it.nx !== undefined && dx * it.nx! + dz * it.nz! < 0.4) continue
      best = it
      bestD = d
    }

    const label = best ? labelFor(best) : ''
    if (best?.id !== s.nearby?.id || (best && label !== s.nearby?.label)) {
      s.setNearby(best ? { id: best.id, kind: best.kind, label } : null)
    }
  })
}

/** Called by the interaction button / E key. */
export function triggerInteraction() {
  const s = useGameStore.getState()
  if (!s.nearby || isInputBlocked(s)) return
  if (s.nearby.kind === 'memory') s.openMemory(s.nearby.id)
  else if (s.nearby.kind === 'cake') {
    s.startCelebration()
    s.setNearby(null)
  } else if (s.nearby.kind === 'bench') s.sitDown(Number(s.nearby.id.split('-')[1]))
  else if (s.nearby.kind === 'stand') s.standUp()
}
