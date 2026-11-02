/**
 * Reusable character entry point.
 *
 *   <Character type="player" />                                   // config defaults
 *   <Character type="player" model="/characters/female.glb" />    // custom GLB
 *   <Character type="companion" model="/characters/male.glb" scale={0.01}
 *              animations={{ idle: 'Idle', walk: 'Walking' }} />
 *
 * The movement, camera, companion and interaction systems never touch the
 * model directly — they only talk through MotionState — so swapping the GLB
 * requires no other code changes.
 */
import { useMemo } from 'react'
import { characters, type CharacterAnimationConfig, type CharacterConfig } from '../../data/museumConfig'
import { FemalePlayer } from './FemalePlayer'
import { MaleCompanion } from './MaleCompanion'

export interface CharacterProps {
  type: 'player' | 'companion'
  /** GLB/glTF URL (overrides museumConfig). `null` forces the procedural character. */
  model?: string | null
  scale?: number
  position?: [number, number, number]
  animations?: Partial<CharacterAnimationConfig>
}

export function Character({ type, model, scale, position, animations }: CharacterProps) {
  const base = characters[type]
  const config = useMemo<CharacterConfig>(
    () => ({
      ...base,
      model: model === undefined ? base.model : model,
      scale: scale ?? base.scale,
      position: position ?? base.position,
      animations: { ...base.animations, ...animations },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, model, scale, position?.join(','), JSON.stringify(animations)],
  )
  return type === 'player' ? <FemalePlayer config={config} /> : <MaleCompanion config={config} />
}
