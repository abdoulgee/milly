/**
 * Gallery lighting, tuned for a more realistic look while staying cheap on
 * phones:
 *  - a procedural RoomEnvironment for soft image-based light + reflections
 *  - a low hemisphere fill (so shapes keep their shading instead of going flat)
 *  - one warm "skylight" key that casts soft real-time shadows; its small
 *    shadow box follows her around, so only the area near the two of us
 *    pays for shadows (only characters cast them)
 *  - a cool, shadowless bounce from the other side
 *  - a few local accent lights
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { runtime } from '../../store/runtime'
import { LANDMARKS, ROOM } from './MuseumLayout'

const KEY_OFFSET = new THREE.Vector3(3.2, 9, 4.5)

export function Lighting() {
  const { gl, scene } = useThree()
  const key = useRef<THREE.DirectionalLight>(null!)
  const target = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.55
    gl.toneMappingExposure = 0.86
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])

  useFrame(() => {
    // Snap to a coarse grid so the shadow map doesn't shimmer as she walks
    const p = runtime.player.position
    const sx = Math.round(p.x * 8) / 8
    const sz = Math.round(p.z * 8) / 8
    key.current.position.set(sx + KEY_OFFSET.x, KEY_OFFSET.y, sz + KEY_OFFSET.z)
    target.position.set(sx, 0, sz)
    target.updateMatrixWorld()
  })

  return (
    <>
      <color attach="background" args={['#e8ddd2']} />
      <fog attach="fog" args={['#ebe0d5', 26, 72]} />
      <hemisphereLight args={["#fff4ea", "#bfa89c", 0.5]} />
      <primitive object={target} />
      <directionalLight
        ref={key}
        target={target}
        intensity={1.9}
        color="#ffeedd"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={4.5}
        shadow-camera-bottom={-4.5}
        shadow-camera-near={1}
        shadow-camera-far={22}
        shadow-bias={-0.0005}
        shadow-normalBias={0.025}
        shadow-radius={4}
      />
      <directionalLight position={[-8, 7, -10]} intensity={0.45} color="#e6e4ff" />

      {/* Accent lights */}
      <pointLight position={[LANDMARKS.fountain.x, 2.6, LANDMARKS.fountain.z]} intensity={6} distance={9} decay={1.6} color="#dff0ff" />
      <pointLight position={[LANDMARKS.heartSculpture.x, 3.2, LANDMARKS.heartSculpture.z]} intensity={8} distance={10} decay={1.6} color="#ffc1d6" />
      {/* (the cake's light lives in BirthdayCorner so it can flash) */}
      <pointLight position={[0, ROOM.height - 1, 17]} intensity={4} distance={10} decay={1.5} color="#ffe6cc" />
    </>
  )
}
