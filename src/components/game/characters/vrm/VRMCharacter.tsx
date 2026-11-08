/**
 * A VRM avatar (see vrmOutfit.ts for how it's dressed) animated
 * procedurally from MotionState (see vrmMotion.ts).
 */
import { useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type * as THREE from 'three'
import type { CharacterConfig } from '../../../../data/museumConfig'
import type { MotionState } from '../motion'
import { readVRM } from './loadVRM'
import { animateVRM, createAnimState, makeRig, SEAT_HIP_Y, type Gait } from './vrmMotion'
import { dressVRM } from './vrmOutfit'

const GAIT: Record<'female' | 'male', Gait> = {
  female: { stride: 1.18, legSwing: 0.44, armSwing: 0.3, armRest: 1.24, female: true },
  male: { stride: 1.34, legSwing: 0.46, armSwing: 0.34, armRest: 1.2, female: false },
}

/** Speech-bubble anchor (above the head) and how far it drops when seated. */
export const VRM_BUBBLE = {
  female: { height: 1.92, sitDrop: 0.91 - SEAT_HIP_Y },
  male: { height: 2.08, sitDrop: 1.01 - SEAT_HIP_Y },
}

export function VRMCharacter({ config, motion }: { config: CharacterConfig; motion: MutableRefObject<MotionState> }) {
  const vrm = readVRM(config.vrm!)
  const rig = useMemo(() => {
    dressVRM(vrm, config.appearance)
    return makeRig(vrm)
  }, [vrm, config.appearance])
  const gait = GAIT[config.appearance.body]
  const scale = config.appearance.height
  const anim = useRef(createAnimState())
  const group = useRef<THREE.Group>(null!)

  useFrame((state, dt) => {
    animateVRM(vrm, rig, gait, motion.current, anim.current, state.clock.elapsedTime, dt, scale)
    group.current.rotation.z = -anim.current.lean
    vrm.update(Math.min(dt, 0.05))
  })

  return (
    <group ref={group} scale={scale}>
      <primitive object={vrm.scene} />
    </group>
  )
}
