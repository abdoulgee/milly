import { Suspense, type MutableRefObject } from 'react'
import type { CharacterConfig } from '../../../data/museumConfig'
import { ErrorBoundary } from '../../ErrorBoundary'
import { BlobShadow } from './BlobShadow'
import { GLBCharacter } from './GLBCharacter'
import type { MotionState } from './motion'
import { ProceduralCharacter } from './ProceduralCharacter'

/**
 * Chooses how a character looks: a GLB model if `config.model` is set,
 * otherwise (or while loading / if loading fails) the procedural character.
 */
export function CharacterVisual({ config, motion }: { config: CharacterConfig; motion: MutableRefObject<MotionState> }) {
  const procedural = (
    <Suspense fallback={null}>
      <ProceduralCharacter appearance={config.appearance} motion={motion} />
    </Suspense>
  )
  return (
    <>
      <BlobShadow />
      {config.model ? (
        <ErrorBoundary fallback={procedural}>
          <Suspense fallback={procedural}>
            <GLBCharacter config={config} motion={motion} />
          </Suspense>
        </ErrorBoundary>
      ) : (
        procedural
      )}
    </>
  )
}
