/**
 * Camera gestures: one-finger / mouse drag rotates, two-finger pinch or
 * mouse wheel zooms. Deltas are accumulated in `runtime.input.look` and
 * consumed by ThirdPersonCamera each frame (no React re-renders).
 */
import { useMemo, useRef } from 'react'
import type { PointerEvent, WheelEvent } from 'react'
import { runtime } from '../store/runtime'

export function useCameraGestures() {
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef(0)

  return useMemo(() => {
    const look = runtime.input.look
    const spread = () => {
      const [a, b] = [...pointers.current.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }
    return {
      onPointerDown(e: PointerEvent<HTMLElement>) {
        try {
          e.currentTarget.setPointerCapture(e.pointerId)
        } catch {
          /* synthetic events can't be captured */
        }
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
        if (pointers.current.size === 2) pinch.current = spread()
        runtime.camera.recenter = false
      },
      onPointerMove(e: PointerEvent<HTMLElement>) {
        const prev = pointers.current.get(e.pointerId)
        if (!prev) return
        const cur = { x: e.clientX, y: e.clientY }
        if (pointers.current.size === 1) {
          look.dx += cur.x - prev.x
          look.dy += cur.y - prev.y
        }
        pointers.current.set(e.pointerId, cur)
        if (pointers.current.size === 2) {
          const d = spread()
          if (pinch.current > 0) look.zoom += (pinch.current - d) * 0.006
          pinch.current = d
        }
      },
      onPointerUp(e: PointerEvent<HTMLElement>) {
        pointers.current.delete(e.pointerId)
        pinch.current = pointers.current.size === 2 ? spread() : 0
      },
      onPointerCancel(e: PointerEvent<HTMLElement>) {
        pointers.current.delete(e.pointerId)
        pinch.current = 0
      },
      onWheel(e: WheelEvent<HTMLElement>) {
        look.zoom += Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY), 120) * 0.0015
      },
    }
  }, [])
}
