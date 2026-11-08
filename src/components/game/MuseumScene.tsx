/**
 * The 3D canvas. Lazy-loaded by App so the welcome screen appears
 * instantly while Three.js and the scene download/compile behind it.
 */
import { Suspense, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { PerformanceMonitor, useProgress } from '@react-three/drei'
import { useGameStore } from '../../store/gameStore'
import { BirthdayCorner } from './BirthdayCorner'
import { ChatDirector } from './ChatDirector'
import { Character } from './Character'
import { Decor } from './Decor'
import { EntranceArea } from './EntranceArea'
import { Fountain } from './Fountain'
import { InteractionManager } from './InteractionManager'
import { Lighting } from './Lighting'
import { MemoryGallery } from './MemoryGallery'
import { MuseumEnvironment } from './MuseumEnvironment'
import { SpecialCorner } from './SpecialCorner'
import { ThirdPersonCamera } from './ThirdPersonCamera'
import { loadCharacter } from './characters/characterCache'
import { loadVRM } from './characters/vrm/loadVRM'
import { characters, type CharacterConfig } from '../../data/museumConfig'

// Start loading (VRM) or sculpting (fallback) the characters as soon as the 3D scene code arrives
const prepare = (c: CharacterConfig) => (c.vrm ? loadVRM(c.vrm).catch(() => loadCharacter(c.appearance)) : loadCharacter(c.appearance))
const charactersReady = Promise.all([prepare(characters.player), prepare(characters.companion)])

/**
 * Furniture & props near the floor cast soft shadows too (benches, plants,
 * pedestals…) so nothing looks like it floats. Big architecture, wall art
 * and see-through things are skipped. The key light's shadow box only
 * covers the area around the two of us, so this stays cheap.
 */
function enablePropShadows(scene: THREE.Object3D) {
  const box = new THREE.Box3()
  const size = new THREE.Vector3()
  scene.updateMatrixWorld(true)
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    if (mats.some((m) => m.transparent || (m as THREE.MeshBasicMaterial).isMeshBasicMaterial)) return
    if ((mesh as THREE.InstancedMesh).isInstancedMesh) {
      mesh.geometry.computeBoundingBox()
      box.copy(mesh.geometry.boundingBox!)
      if (box.getSize(size).y > 3 || box.max.y > 3) return
      mesh.castShadow = true
      return
    }
    box.setFromObject(mesh)
    box.getSize(size)
    if (size.x > 3 || size.z > 3 || size.y > 3.2 || box.min.y > 2.4 || size.y < 0.04) return
    mesh.castShadow = true
  })
}

/** Pre-compiles shaders once everything has loaded, then flags the scene ready. */
function Ready() {
  const { gl, scene, camera } = useThree()
  const get = useThree((s) => s.get)
  const setSceneReady = useGameStore((s) => s.setSceneReady)
  useEffect(() => {
    let live = true
    // Wait for the sculpted characters so she never sees them pop in
    charactersReady
      .catch(() => undefined)
      .then(() => new Promise((r) => setTimeout(r, 50)))
      .then(() => {
        if (!live) return
        enablePropShadows(scene)
        gl.compile(scene, camera)
        setSceneReady()
      })
    // Dev-only handle for debugging from the browser console
    if (import.meta.env.DEV) (window as unknown as { __museum: unknown }).__museum = { get }
    return () => {
      live = false
    }
  }, [gl, scene, camera, setSceneReady, get])
  return null
}

/** Mirrors three.js loading progress into the store for the welcome screen. */
function ProgressReporter() {
  const progress = useProgress((s) => s.progress)
  const setProgress = useGameStore((s) => s.setProgress)
  useEffect(() => setProgress(progress), [progress, setProgress])
  return null
}

export default function MuseumScene() {
  const playing = useGameStore((s) => s.phase === 'playing')
  const setLowPower = useGameStore((s) => s.setLowPower)
  const maxDpr = Math.min(window.devicePixelRatio || 1, 1.75)
  const [dpr, setDpr] = useState(Math.min(maxDpr, 1.5))

  return (
    <>
    <ProgressReporter />
    <Canvas
      className="!fixed inset-0 touch-none"
      dpr={dpr}
      shadows={{ type: THREE.PCFShadowMap }}
      frameloop={playing ? 'always' : 'demand'}
      gl={{ antialias: true, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 55, near: 0.1, far: 90, position: [0, 5.4, 21.4] }}
    >
      <PerformanceMonitor
        onDecline={() => {
          setDpr(1)
          setLowPower(true)
        }}
        onIncline={() => setDpr(maxDpr)}
      />
      <Lighting />
      <Suspense fallback={null}>
        <MuseumEnvironment />
        <Decor />
        <Fountain />
        <EntranceArea />
        <MemoryGallery />
        <SpecialCorner />
        <BirthdayCorner />
        <Ready />
      </Suspense>
      <Character type="player" />
      <Character type="companion" />
      <ThirdPersonCamera />
      <InteractionManager />
      <ChatDirector />
    </Canvas>
    </>
  )
}
