/**
 * Loads a GLB/glTF character and drives its animation clips from
 * MotionState: idle ↔ walk ↔ run with cross-fades, and playback speed
 * matched to ground speed so feet don't slide.
 *
 * Models without a skeleton or clips (e.g. straight from an image-to-3D
 * tool) get a "figurine" motion instead: a stepping bob, side-to-side sway,
 * forward lean with speed, a lean into turns, and gentle breathing at rest.
 */
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js'
import type { CharacterConfig } from '../../../data/museumConfig'
import { assetUrl } from '../../../lib/assets'
import { clamp, damp } from '../../../lib/math'
import type { MotionState } from './motion'

interface Props {
  config: CharacterConfig
  motion: MutableRefObject<MotionState>
}

function findClip(names: string[], wanted: string | undefined, pattern: RegExp) {
  if (wanted && names.includes(wanted)) return wanted
  return names.find((n) => pattern.test(n))
}

export function GLBCharacter({ config, motion }: Props) {
  const { scene, animations } = useGLTF(assetUrl(config.model!))
  // Clone so two characters can share one file without fighting over bones
  const model = useMemo(() => SkeletonUtils.clone(scene), [scene])
  const group = useRef<THREE.Group>(null!)
  const body = useRef<THREE.Group>(null!)
  const figurine = useRef({ phase: 0, walk: 0, lean: 0, roll: 0 })
  const { actions, names } = useAnimations(animations, group)
  const current = useRef<string | undefined>(undefined)

  const clips = useMemo(
    () => ({
      idle: findClip(names, config.animations.idle, /idle|stand|breath/i),
      walk: findClip(names, config.animations.walk, /walk/i),
      run: findClip(names, config.animations.run, /run|jog/i),
    }),
    [names, config.animations],
  )

  useEffect(() => {
    model.traverse((o) => {
      // Skinned meshes are often culled incorrectly once animated
      if ((o as THREE.SkinnedMesh).isSkinnedMesh) o.frustumCulled = false
    })
    if (!clips.idle && !clips.walk) {
      console.info(`[museum] "${config.model}" has no idle/walk clips (found: ${names.join(', ') || 'none'}), using figurine motion`)
    }
  }, [model, clips, names, config.model])

  useFrame((state, dt) => {
    if (!clips.idle && !clips.walk) {
      animateFigurine(body.current, figurine.current, motion.current, state.clock.elapsedTime, dt)
      return
    }
    const speed = motion.current.speed
    const { walkSpeed, runSpeed } = config.animations
    let want = clips.idle ?? clips.walk
    if (speed > 0.15) {
      want = clips.run && speed > (walkSpeed + runSpeed) / 2 ? clips.run : (clips.walk ?? clips.idle)
    }
    if (want && want !== current.current) {
      if (current.current) actions[current.current]?.fadeOut(0.25)
      actions[want]?.reset().fadeIn(0.25).play()
      current.current = want
    }
    const action = want ? actions[want] : undefined
    if (action) {
      if (want === clips.run) action.timeScale = clamp(speed / runSpeed, 0.6, 1.6)
      else if (want === clips.walk && speed > 0.15) action.timeScale = clamp(speed / walkSpeed, 0.5, 2.2)
      else action.timeScale = 1
    }
  })

  return (
    <group ref={group} scale={config.scale} rotation-y={config.rotationOffset} position-y={config.yOffset}>
      <group ref={body}>
        <primitive object={model} />
      </group>
    </group>
  )
}

const STRIDE = 0.42 // metres per step

function animateFigurine(
  body: THREE.Group,
  f: { phase: number; walk: number; lean: number; roll: number },
  motion: MotionState,
  time: number,
  dt: number,
) {
  const speed = motion.speed
  f.walk = damp(f.walk, clamp(speed / 1.2, 0, 1), 8, dt)
  // One full phase cycle = two steps
  f.phase += (speed / STRIDE) * Math.PI * dt
  f.lean = damp(f.lean, clamp(speed / motion.maxSpeed, 0, 1) * 0.09, 6, dt)
  f.roll = damp(f.roll, clamp(-motion.turnRate * 0.05, -0.12, 0.12), 6, dt)

  const step = Math.sin(f.phase)
  const breathe = Math.sin(time * 1.9) * (1 - f.walk)
  body.position.y = Math.abs(step) * 0.016 * f.walk
  body.rotation.x = f.lean
  body.rotation.z = step * 0.055 * f.walk + f.roll
  body.rotation.y = step * 0.07 * f.walk
  body.scale.set(1 - breathe * 0.004, 1 + breathe * 0.008, 1 - breathe * 0.004)
}
