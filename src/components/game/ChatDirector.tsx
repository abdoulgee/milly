/**
 * Decides when the two of them chat and plays conversations line by line
 * into the chat store (one bubble at a time, alternating speakers).
 *
 * Priorities (a higher one interrupts a lower one):
 *   6 after the birthday celebration · 5 welcome after the fly-in
 *   4 standing at a photo / at the cake · 3 sitting on a bench
 *   2 reaching the fountain, special corner, birthday corner · 1 walking
 * Everything goes quiet while a photo, menu or the birthday letter is open.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { benchChats, genericMemoryChat, memoryChats, moments, walkingChats, type Conversation } from '../../data/chats'
import { museumConfig } from '../../data/museumConfig'
import { useChatStore } from '../../store/chatStore'
import { useGameStore } from '../../store/gameStore'
import { runtime } from '../../store/runtime'
import { LANDMARKS, SECTIONS } from './MuseumLayout'

const GAP = 0.45 // pause between lines
const fill = (t: string) => t.replace(/\{name\}/g, museumConfig.birthday.recipientName)
const duration = (t: string) => Math.min(5.5, Math.max(2.3, 1.5 + t.length * 0.06))

interface Playing {
  id: string
  priority: number
  lines: Conversation
  index: number
  timer: number
  speaking: boolean
}

interface Candidate {
  id: string
  priority: number
  lines: Conversation
}

const shuffle = (n: number) => {
  const a = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function ChatDirector() {
  const st = useRef({
    playing: null as Playing | null,
    done: new Set<string>(),
    cooldown: 6,
    walkOrder: shuffle(walkingChats.length),
    walkNext: 0,
    benchNext: 0,
    seatedFor: 0,
    tick: 0,
    visit: -1,
  })

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1)
    const s = st.current
    const g = useGameStore.getState()
    const chat = useChatStore.getState()

    if (g.visit !== s.visit) {
      s.visit = g.visit
      s.done.clear()
      s.playing = null
      s.cooldown = 6
      chat.clear()
    }

    const blocked =
      g.phase !== 'playing' || g.paused || g.viewingMemoryId !== null || g.celebration === 'message' || g.celebration === 'celebrating'
    if (blocked) {
      if (s.playing) stop(s, chat)
      return
    }

    s.cooldown -= dt
    s.seatedFor = runtime.seat.phase === 'seated' ? s.seatedFor + dt : 0

    // ── Advance the current conversation ──
    const pl = s.playing
    if (pl) {
      pl.timer -= dt
      if (pl.timer <= 0) {
        if (pl.speaking) {
          chat.clear()
          pl.speaking = false
          pl.timer = GAP
          pl.index++
          if (pl.index >= pl.lines.length) {
            s.playing = null
            s.cooldown = pl.priority >= 3 ? 7 : 9 + Math.random() * 8
          }
        } else {
          const [who, text] = pl.lines[pl.index]
          chat.say(who, fill(text))
          pl.speaking = true
          pl.timer = duration(text)
        }
      }
    }

    // ── Look for something to talk about (5×/s) ──
    s.tick += dt
    if (s.tick < 0.2) return
    s.tick = 0
    const next = pick(s, g)
    if (next && (!s.playing || next.priority > s.playing.priority)) {
      if (s.playing) stop(s, chat)
      if (!next.id.startsWith('walk') && !next.id.startsWith('bench')) s.done.add(next.id)
      s.playing = { ...next, index: 0, timer: 0.2, speaking: false }
    }
  })

  return null
}

type DirectorState = {
  playing: Playing | null
  done: Set<string>
  cooldown: number
  walkOrder: number[]
  walkNext: number
  benchNext: number
  seatedFor: number
}

/** Stop mid-conversation; one-off chats that didn't finish may replay later. */
function stop(s: DirectorState, chat: { clear: () => void }) {
  const pl = s.playing!
  if (pl.index < pl.lines.length - (pl.speaking ? 1 : 0)) s.done.delete(pl.id)
  s.playing = null
  chat.clear()
}

function pick(s: DirectorState, g: ReturnType<typeof useGameStore.getState>): Candidate | null {
  const p = runtime.player
  const once = (id: string, priority: number, lines: Conversation) => (s.done.has(id) ? null : { id, priority, lines })

  if (g.celebration === 'done') {
    const c = once('after', 6, moments.afterCelebration)
    if (c) return c
  }
  if (runtime.camera.intro >= 1) {
    const c = once('welcome', 5, moments.welcome)
    if (c) return c
  }
  if (g.nearby?.kind === 'memory' && p.idleTime > 0.9) {
    const c = once(`mem-${g.nearby.id}`, 4, memoryChats[g.nearby.id] ?? genericMemoryChat)
    if (c) return c
  }
  if (g.nearby?.kind === 'cake' && g.celebration === 'idle' && p.idleTime > 1.5) {
    const c = once('cake', 4, moments.cake)
    if (c) return c
  }
  if (runtime.seat.phase === 'seated' && !s.playing && s.seatedFor > 1.2 && (s.cooldown <= 0 || s.seatedFor < 1.45)) {
    const i = s.benchNext++ % benchChats.length
    return { id: `bench-${i}`, priority: 3, lines: benchChats[i] }
  }
  if (Math.hypot(p.position.x - LANDMARKS.fountain.x, p.position.z - LANDMARKS.fountain.z) < 4.6) {
    const c = once('fountain', 2, moments.fountain)
    if (c) return c
  }
  if (p.position.z < SECTIONS.birthday.from) {
    const c = once('birthday', 2, moments.birthday)
    if (c) return c
  } else if (p.position.z < SECTIONS.special.from) {
    const c = once('special', 2, moments.special)
    if (c) return c
  }
  if (p.speed > 0.5 && s.cooldown <= 0 && !s.playing && runtime.seat.phase === 'none') {
    const i = s.walkOrder[s.walkNext++ % s.walkOrder.length]
    return { id: `walk-${i}`, priority: 1, lines: walkingChats[i] }
  }
  return null
}
