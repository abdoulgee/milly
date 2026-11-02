/**
 * Floating virtual joystick for the bottom-left of the screen. Touching
 * anywhere in its zone re-centres the stick under the thumb (more
 * comfortable than a fixed stick); it returns to its resting spot on
 * release. Writes straight to `runtime.input.joystick` — no re-renders.
 */
import { useEffect, useRef, type PointerEvent } from 'react'
import { runtime } from '../../store/runtime'

const BASE = 132
const KNOB = 58
const RANGE = 46
const DEAD_ZONE = 0.12

export function VirtualJoystick() {
  const zone = useRef<HTMLDivElement>(null)
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const pointer = useRef<number | null>(null)
  const origin = useRef({ x: 0, y: 0 })

  const rest = () => {
    const z = zone.current!.getBoundingClientRect()
    return { x: 34 + BASE / 2, y: z.height - 34 - BASE / 2 }
  }
  const place = (x: number, y: number, kx = 0, ky = 0, active = false) => {
    base.current!.style.transform = `translate(${x - BASE / 2}px, ${y - BASE / 2}px)`
    base.current!.style.opacity = active ? '1' : '0.7'
    knob.current!.style.transform = `translate(${kx}px, ${ky}px)`
  }
  const release = () => {
    pointer.current = null
    const j = runtime.input.joystick
    j.x = j.y = 0
    j.active = false
    const r = rest()
    place(r.x, r.y)
  }

  useEffect(() => {
    release()
    const onResize = () => pointer.current === null && release()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      const j = runtime.input.joystick
      j.x = j.y = 0
      j.active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const local = (e: PointerEvent) => {
    const z = zone.current!.getBoundingClientRect()
    return { x: e.clientX - z.left, y: e.clientY - z.top, w: z.width, h: z.height }
  }

  const move = (e: PointerEvent) => {
    const p = local(e)
    let dx = p.x - origin.current.x
    let dy = p.y - origin.current.y
    const len = Math.hypot(dx, dy)
    if (len > RANGE) {
      dx = (dx / len) * RANGE
      dy = (dy / len) * RANGE
    }
    place(origin.current.x, origin.current.y, dx, dy, true)
    // Normalise with a small dead zone, keeping full range at the edge
    const n = Math.min(1, len / RANGE)
    const scaled = n < DEAD_ZONE ? 0 : (n - DEAD_ZONE) / (1 - DEAD_ZONE)
    const cl = Math.hypot(dx, dy) || 1
    const j = runtime.input.joystick
    j.x = (dx / cl) * scaled
    j.y = (-dy / cl) * scaled
    j.active = true
  }

  return (
    <div
      ref={zone}
      className="absolute bottom-0 left-0 z-10 h-[62%] w-[48%] touch-none"
      onPointerDown={(e) => {
        if (pointer.current !== null) return
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* synthetic events can't be captured */
        }
        pointer.current = e.pointerId
        const p = local(e)
        // Keep the whole base on-screen
        origin.current = {
          x: Math.max(BASE / 2 + 8, Math.min(p.w - BASE / 2, p.x)),
          y: Math.max(BASE / 2, Math.min(p.h - BASE / 2 - 8, p.y)),
        }
        move(e)
      }}
      onPointerMove={(e) => e.pointerId === pointer.current && move(e)}
      onPointerUp={(e) => e.pointerId === pointer.current && release()}
      onPointerCancel={(e) => e.pointerId === pointer.current && release()}
    >
      <div
        ref={base}
        className="glass pointer-events-none absolute top-0 left-0 flex items-center justify-center rounded-full transition-opacity duration-200"
        style={{ width: BASE, height: BASE }}
      >
        <div className="absolute inset-3 rounded-full border border-white/70" />
        <div
          ref={knob}
          className="btn-rose rounded-full border-2 border-white/90"
          style={{ width: KNOB, height: KNOB }}
        />
      </div>
    </div>
  )
}
