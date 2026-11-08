import { useRef } from 'react'
import type { Group } from 'three'
import type { CharacterConfig } from '../../data/museumConfig'
import { useCompanionFollow } from '../../hooks/useCompanionFollow'
import { bubbleFor, CharacterVisual } from './characters/CharacterVisual'
import { createMotionState } from './characters/motion'
import { SpeechBubble } from './characters/SpeechBubble'

/** The autonomous companion who follows the player. */
export function MaleCompanion({ config }: { config: CharacterConfig }) {
  const root = useRef<Group>(null)
  const motion = useRef(createMotionState(config.maxSpeed))
  useCompanionFollow(root, motion, config)
  return (
    <group ref={root} position={config.position} rotation-y={Math.PI}>
      <CharacterVisual config={config} motion={motion} />
      <SpeechBubble who="him" motion={motion} {...bubbleFor(config)} />
    </group>
  )
}
