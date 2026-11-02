/**
 * Central tiered marble fountain with an animated water curtain, ripples
 * and a gentle sparkle of spray.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sparkles } from '@react-three/drei'
import * as THREE from 'three'
import { materials } from '../../lib/materials'
import { waterStreakTexture } from '../../lib/textures'
import { LANDMARKS } from './MuseumLayout'

const lathe = (pts: number[][], seg = 40) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg)

export function Fountain() {
  const { x, z } = LANDMARKS.fountain
  const geo = useMemo(
    () => ({
      basin: lathe([
        [1.88, 0.0],
        [2.1, 0.0],
        [2.16, 0.07],
        [2.1, 0.42],
        [2.2, 0.47],
        [2.2, 0.56],
        [1.95, 0.58],
        [1.9, 0.5],
        [1.88, 0.1],
      ]),
      column: lathe(
        [
          [0.0, 0.0],
          [0.42, 0.0],
          [0.42, 0.12],
          [0.26, 0.2],
          [0.2, 0.6],
          [0.24, 0.9],
          [0.18, 1.2],
          [0.3, 1.32],
          [0.0, 1.32],
        ],
        28,
      ),
      bowl: lathe([
        [0.0, 0.0],
        [0.28, 0.0],
        [0.82, 0.16],
        [0.96, 0.27],
        [0.94, 0.31],
        [0.84, 0.25],
        [0.0, 0.16],
      ]),
      finial: lathe(
        [
          [0.0, 0.0],
          [0.12, 0.0],
          [0.08, 0.1],
          [0.06, 0.3],
          [0.12, 0.36],
          [0.0, 0.42],
        ],
        20,
      ),
    }),
    [],
  )

  const streaks = useMemo(() => {
    const t = waterStreakTexture().clone()
    t.repeat.set(6, 1)
    t.needsUpdate = true
    return t
  }, [])
  const ripples = useRef<THREE.Mesh[]>([])

  useFrame((state, dt) => {
    streaks.offset.y += dt * 0.9
    const t = state.clock.elapsedTime
    ripples.current.forEach((m, i) => {
      if (!m) return
      const k = ((t * 0.35 + i / ripples.current.length) % 1 + 1) % 1
      m.scale.setScalar(1.0 + k * 0.85)
      ;(m.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.35
    })
  })

  return (
    <group position={[x, 0, z]}>
      <mesh geometry={geo.basin} material={materials.marble} />
      <mesh position-y={0.42} rotation-x={-Math.PI / 2} material={materials.water}>
        <circleGeometry args={[1.9, 48]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh
          key={i}
          ref={(m) => {
            if (m) ripples.current[i] = m
          }}
          position-y={0.43}
          rotation-x={-Math.PI / 2}
        >
          <ringGeometry args={[0.98, 1.02, 48]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
        </mesh>
      ))}
      <mesh geometry={geo.column} material={materials.marble} />
      <group position-y={1.3}>
        <mesh geometry={geo.bowl} material={materials.marble} />
        <mesh position-y={0.24} rotation-x={-Math.PI / 2} material={materials.water}>
          <circleGeometry args={[0.85, 32]} />
        </mesh>
        <mesh geometry={geo.finial} material={materials.roseGold} position-y={0.2} />
        <mesh position-y={0.72} material={materials.roseGold}>
          <sphereGeometry args={[0.1, 20, 16]} />
        </mesh>
      </group>
      {/* Falling water curtain */}
      <mesh position-y={0.98}>
        <cylinderGeometry args={[0.95, 1.18, 1.15, 40, 1, true]} />
        <meshBasicMaterial
          map={streaks}
          color="#e8f6ff"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <Sparkles count={36} scale={[2.4, 1.6, 2.4]} position-y={1.2} size={2.2} speed={0.5} color="#ffffff" opacity={0.8} />
    </group>
  )
}
