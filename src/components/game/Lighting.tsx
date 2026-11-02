/**
 * Efficient, warm lighting: hemisphere + one directional key + three local
 * accent point lights. No real-time shadow maps (characters use blob
 * shadows). A procedural RoomEnvironment gives metals their soft sheen
 * without downloading an HDRI.
 */
import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { LANDMARKS, ROOM } from './MuseumLayout'

export function Lighting() {
  const { gl, scene } = useThree()

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.6
    return () => {
      scene.environment = null
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])

  return (
    <>
      <color attach="background" args={['#f3e3dc']} />
      <fog attach="fog" args={['#f4e4dc', 22, 62]} />
      <hemisphereLight args={['#fff3ea', '#dcbcb8', 0.95]} />
      <ambientLight intensity={0.12} color="#ffe9dc" />
      <directionalLight position={[6, 12, 8]} intensity={1.0} color="#ffeedd" />
      <directionalLight position={[-8, 9, -12]} intensity={0.45} color="#efe2ff" />

      {/* Accent lights */}
      <pointLight position={[LANDMARKS.fountain.x, 2.6, LANDMARKS.fountain.z]} intensity={6} distance={9} decay={1.6} color="#dff0ff" />
      <pointLight position={[LANDMARKS.heartSculpture.x, 3.2, LANDMARKS.heartSculpture.z]} intensity={8} distance={10} decay={1.6} color="#ffc1d6" />
      {/* (the cake's light lives in BirthdayCorner so it can flash) */}
      <pointLight position={[0, ROOM.height - 1, 17]} intensity={4} distance={10} decay={1.5} color="#ffe6cc" />
    </>
  )
}
