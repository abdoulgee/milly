/**
 * Speech bubble that floats above a character's head (DOM via drei <Html>,
 * so text stays crisp and readable on phones). It lowers when seated.
 */
import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { AnimatePresence, motion } from 'framer-motion'
import * as THREE from 'three'
import { clamp } from '../../../lib/math'
import { useChatStore } from '../../../store/chatStore'
import type { Speaker } from '../../../store/runtime'
import type { MotionState } from './motion'

const STYLE: Record<Speaker, { border: string; text: string; bg: string }> = {
  her: { border: '#f2a1ba', text: '#7b2f4d', bg: '#fff7fa' },
  him: { border: '#9fb6ee', text: '#22397a', bg: '#f6f8ff' },
}

const v = new THREE.Vector3()

/** Screen position of the anchor, kept far enough from the edges that the bubble stays fully visible. */
function keepOnScreen(el: THREE.Object3D, camera: THREE.Camera, size: { width: number; height: number }): number[] {
  v.setFromMatrixPosition(el.matrixWorld).project(camera)
  const x = (v.x * 0.5 + 0.5) * size.width
  const y = (-v.y * 0.5 + 0.5) * size.height
  const half = Math.min(113, size.width / 2 - 8)
  return [clamp(x, half + 8, size.width - half - 8), clamp(y, 130, size.height - 20)]
}

interface Props {
  who: Speaker
  motion: MutableRefObject<MotionState>
  /** Bubble height above the floor when standing / how much lower when seated */
  height: number
  sitDrop: number
}

export function SpeechBubble({ who, motion: m, height, sitDrop }: Props) {
  const line = useChatStore((s) => (s.line?.who === who ? s.line : null))
  const anchor = useRef<THREE.Group>(null!)
  const c = STYLE[who]

  useFrame(() => {
    anchor.current.position.y = height - m.current.sit * sitDrop
  })

  return (
    <group ref={anchor} position-y={height}>
      <Html zIndexRange={[8, 0]} calculatePosition={keepOnScreen} style={{ pointerEvents: 'none' }}>
        <div style={{ transform: 'translate(-50%, -100%)' }}>
          <AnimatePresence>
            {line && (
              <motion.div
                key={line.key}
                initial={{ opacity: 0, scale: 0.4, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.7, y: -6, transition: { duration: 0.18 } }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                className="relative w-max max-w-[210px] rounded-2xl px-3.5 py-2 text-center font-sans text-[14px] leading-snug font-semibold shadow-lg select-none"
                style={{ background: c.bg, color: c.text, border: `2px solid ${c.border}`, transformOrigin: '50% 100%' }}
              >
                {line.text}
                <span
                  className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45"
                  style={{ bottom: -7, background: c.bg, borderRight: `2px solid ${c.border}`, borderBottom: `2px solid ${c.border}` }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Html>
    </group>
  )
}
