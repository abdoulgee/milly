import { useRef } from 'react'
import type { Group } from 'three'
import type { CharacterConfig } from '../../data/museumConfig'
import { usePlayerControls } from '../../hooks/usePlayerControls'
import { CharacterVisual } from './characters/CharacterVisual'
import { createMotionState } from './characters/motion'
import { BUBBLE } from './characters/ProceduralCharacter'
import { SpeechBubble } from './characters/SpeechBubble'

/** The player-controlled character (joystick / WASD). */
export function FemalePlayer({ config }: { config: CharacterConfig }) {
  const root = useRef<Group>(null)
  const motion = useRef(createMotionState(config.maxSpeed))
  usePlayerControls(root, motion, config)
  return (
    <group ref={root} position={config.position} rotation-y={Math.PI}>
      <CharacterVisual config={config} motion={motion} />
      <SpeechBubble who="her" motion={motion} height={BUBBLE.female.height * config.appearance.height} sitDrop={BUBBLE.female.sitDrop} />
    </group>
  )
}
