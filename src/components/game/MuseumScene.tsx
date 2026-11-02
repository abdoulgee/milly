/**
 * The 3D canvas. Lazy-loaded by App so the welcome screen appears
 * instantly while Three.js and the scene download/compile behind it.
 */
import { Suspense, useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
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
import { characters } from '../../data/museumConfig'

// Start sculpting the characters as soon as the 3D scene code arrives
const charactersReady = Promise.all([loadCharacter(characters.player.appearance), loadCharacter(characters.companion.appearance)])

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
