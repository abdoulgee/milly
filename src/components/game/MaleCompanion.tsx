import { useRef } from 'react'
import type { Group } from 'three'
import type { CharacterConfig } from '../../data/museumConfig'
import { useCompanionFollow } from '../../hooks/useCompanionFollow'
import { CharacterVisual } from './characters/CharacterVisual'
import { createMotionState } from './characters/motion'
import { BUBBLE } from './characters/ProceduralCharacter'
import { SpeechBubble } from './characters/SpeechBubble'

/** The autonomous companion who follows the player. */
export function MaleCompanion({ config }: { config: CharacterConfig }) {
  const root = useRef<Group>(null)
  const motion = useRef(createMotionState(config.maxSpeed))
  useCompanionFollow(root, motion, config)
  return (
    <group ref={root} position={config.position} rotation-y={Math.PI}>
      <CharacterVisual config={config} motion={motion} />
      <SpeechBubble who="him" motion={motion} height={BUBBLE.male.height * config.appearance.height} sitDrop={BUBBLE.male.sitDrop} />
    </group>
  )
}
