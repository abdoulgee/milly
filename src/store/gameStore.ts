/**
 * Application / UI state (Zustand). Only things the 2D interface or React
 * tree needs to react to live here. Per-frame data lives in `runtime.ts`.
 */
import { create } from 'zustand'
import { audio } from '../lib/audio'
import { BENCH_SEATS } from '../components/game/MuseumLayout'
import { resetRuntime, runtime } from './runtime'

export type Phase = 'welcome' | 'playing'
export type Celebration = 'idle' | 'celebrating' | 'message' | 'done'
export type InteractableKind = 'memory' | 'cake' | 'bench' | 'stand'

export interface NearbyTarget {
  id: string
  kind: InteractableKind
  label: string
}

interface GameState {
  phase: Phase
  /** Increments every time the museum is entered (restarts the intro) */
  visit: number
  sceneReady: boolean
  /** 0–100 asset loading progress */
  progress: number
  paused: boolean
  muted: boolean
  hasMoved: boolean
  nearby: NearbyTarget | null
  viewingMemoryId: string | null
  viewed: string[]
  celebration: Celebration
  celebrations: number
  lowPower: boolean
  /** True from the moment she heads for a bench until she gets up */
  seated: boolean

  setSceneReady: () => void
  setProgress: (p: number) => void
  enter: () => void
  exitToWelcome: () => void
  setPaused: (p: boolean) => void
  toggleMute: () => void
  markMoved: () => void
  setNearby: (n: NearbyTarget | null) => void
  openMemory: (id: string) => void
  closeMemory: () => void
  startCelebration: () => void
  closeBirthdayMessage: () => void
  setLowPower: (v: boolean) => void
  sitDown: (bench: number) => void
  standUp: () => void
  /** Called by the player controller once she is back on her feet */
  clearSeated: () => void
}

let celebrationTimer: number | undefined

export const useGameStore = create<GameState>()((set, get) => ({
  phase: 'welcome',
  visit: 0,
  sceneReady: false,
  progress: 0,
  paused: false,
  muted: audio.muted,
  hasMoved: false,
  nearby: null,
  viewingMemoryId: null,
  viewed: [],
  celebration: 'idle',
  celebrations: 0,
  lowPower: false,
  seated: false,

  setSceneReady: () => set({ sceneReady: true }),
  setProgress: (progress) => set({ progress }),

  enter: () => {
    audio.start()
    resetRuntime()
    set((s) => ({ phase: 'playing', visit: s.visit + 1, paused: false, hasMoved: false, nearby: null, seated: false }))
  },

  exitToWelcome: () => {
    audio.stop()
    window.clearTimeout(celebrationTimer)
    set({ phase: 'welcome', paused: false, nearby: null, viewingMemoryId: null, celebration: 'idle' })
  },

  setPaused: (paused) => set({ paused }),

  toggleMute: () => {
    const muted = !get().muted
    audio.setMuted(muted)
    set({ muted })
  },

  markMoved: () => set({ hasMoved: true }),

  setNearby: (nearby) => {
    if (nearby && nearby.id !== get().nearby?.id) audio.blip()
    set({ nearby })
  },

  openMemory: (id) => {
    audio.chime()
    set((s) => ({
      viewingMemoryId: id,
      viewed: s.viewed.includes(id) ? s.viewed : [...s.viewed, id],
    }))
  },

  closeMemory: () => {
    audio.tap()
    set({ viewingMemoryId: null })
  },

  startCelebration: () => {
    if (get().celebration === 'celebrating') return
    audio.blow()
    window.setTimeout(() => audio.celebrate(), 450)
    set((s) => ({ celebration: 'celebrating', celebrations: s.celebrations + 1 }))
    window.clearTimeout(celebrationTimer)
    celebrationTimer = window.setTimeout(() => set({ celebration: 'message' }), 3200)
  },

  closeBirthdayMessage: () => {
    audio.tap()
    set({ celebration: 'done' })
  },

  setLowPower: (lowPower) => set({ lowPower }),

  sitDown: (bench) => {
    const b = BENCH_SEATS[bench]
    if (!b) return
    const p = runtime.player.position
    // Take the seat on her side; he gets the other one
    const d = (i: number) => Math.hypot(b.approach[i].x - p.x, b.approach[i].z - p.z)
    runtime.seat.bench = bench
    runtime.seat.herSeat = d(0) <= d(1) ? 0 : 1
    runtime.seat.phase = 'approach'
    audio.tap()
    set({ seated: true, nearby: null })
  },

  standUp: () => {
    const seat = runtime.seat
    if (seat.phase === 'approach') {
      seat.phase = 'none'
      seat.bench = -1
    } else if (seat.phase === 'sitting' || seat.phase === 'seated') {
      seat.phase = 'rising'
    }
    set({ seated: false, nearby: null })
  },

  clearSeated: () => set({ seated: false }),
}))

/** True when the player shouldn't be able to walk around. */
export function isInputBlocked(s: GameState = useGameStore.getState()): boolean {
  return s.phase !== 'playing' || s.paused || s.viewingMemoryId !== null || s.celebration === 'message'
}
