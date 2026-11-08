import { Suspense, type MutableRefObject } from 'react'
import type { CharacterConfig } from '../../../data/museumConfig'
import { ErrorBoundary } from '../../ErrorBoundary'
import { BlobShadow } from './BlobShadow'
import { GLBCharacter } from './GLBCharacter'
import type { MotionState } from './motion'
import { BUBBLE, ProceduralCharacter } from './ProceduralCharacter'
import { VRM_BUBBLE, VRMCharacter } from './vrm/VRMCharacter'

/** Where a character's speech bubble floats, for whichever visual it uses. */
export function bubbleFor(config: CharacterConfig) {
  const b = (config.vrm ? VRM_BUBBLE : BUBBLE)[config.appearance.body]
  return { height: b.height * config.appearance.height, sitDrop: b.sitDrop }
}

/**
 * Chooses how a character looks: the VRM avatar if `config.vrm` is set,
 * else a GLB model if `config.model` is set, otherwise (or if loading
 * fails) the sculpted procedural character.
 */
export function CharacterVisual({ config, motion }: { config: CharacterConfig; motion: MutableRefObject<MotionState> }) {
  const procedural = (
    <Suspense fallback={null}>
      <ProceduralCharacter appearance={config.appearance} motion={motion} />
    </Suspense>
  )
  let visual = procedural
  if (config.vrm) {
    visual = (
      <ErrorBoundary fallback={procedural}>
        <Suspense fallback={null}>
          <VRMCharacter config={config} motion={motion} />
        </Suspense>
      </ErrorBoundary>
    )
  } else if (config.model) {
    visual = (
      <ErrorBoundary fallback={procedural}>
        <Suspense fallback={procedural}>
          <GLBCharacter config={config} motion={motion} />
        </Suspense>
      </ErrorBoundary>
    )
  }
  return (
    <>
      <BlobShadow opacity={config.vrm ? 0.2 : 0.32} size={config.vrm ? 0.7 : 0.9} />
      {visual}
    </>
  )
}
