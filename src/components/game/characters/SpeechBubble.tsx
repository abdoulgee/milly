/**
 * Invisible anchor above a character's head. Every frame it projects itself
 * to screen space (kept far enough from the edges that a bubble stays fully
 * visible) and stores the result in `runtime.bubbles[who]`; the speech
 * bubbles themselves are ordinary DOM drawn by `ui/SpeechBubbles.tsx`.
 *
 * (They used to be drei <Html> portals, but under React 19 one portal's
 * root could end up permanently empty — her bubbles never appeared.)
 */
import { useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clamp } from '../../../lib/math'
import { runtime, type Speaker } from '../../../store/runtime'
import type { MotionState } from './motion'

const v = new THREE.Vector3()

interface Props {
  who: Speaker
  motion: MutableRefObject<MotionState>
  /** Bubble height above the floor when standing / how much lower when seated */
  height: number
  sitDrop: number
}

export function SpeechBubble({ who, motion: m, height, sitDrop }: Props) {
  const anchor = useRef<THREE.Group>(null!)

  useFrame(({ camera, size }) => {
    const a = anchor.current
    a.position.y = height - m.current.sit * sitDrop
    a.updateWorldMatrix(true, false)
    v.setFromMatrixPosition(a.matrixWorld).project(camera)
    const out = runtime.bubbles[who]
    out.visible = v.z < 1 // in front of the camera
    const half = Math.min(113, size.width / 2 - 8)
    const top = size.width < 600 ? 185 : 130 // keep clear of the top HUD
    out.x = clamp((v.x * 0.5 + 0.5) * size.width, half + 8, size.width - half - 8)
    out.y = clamp((-v.y * 0.5 + 0.5) * size.height, top, size.height - 20)
  })

  return <group ref={anchor} position-y={height} />
}
