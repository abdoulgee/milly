/**
 * Special memories corner: a hanging title sign, a slowly turning
 * rose-gold heart sculpture and floating sparkles. The large ornate frames
 * themselves come from `data/memories.ts` (section: 'special').
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox, Sparkles, Text } from '@react-three/drei'
import * as THREE from 'three'
import { museumConfig } from '../../data/museumConfig'
import { fonts } from '../../lib/fonts'
import { materials } from '../../lib/materials'
import { LANDMARKS, ROOM, SECTIONS } from './MuseumLayout'

export function heartGeometry(depth = 0.22) {
  const s = new THREE.Shape()
  s.moveTo(0.25, 0.25)
  s.bezierCurveTo(0.25, 0.25, 0.2, 0, 0, 0)
  s.bezierCurveTo(-0.3, 0, -0.3, 0.35, -0.3, 0.35)
  s.bezierCurveTo(-0.3, 0.55, -0.1, 0.77, 0.25, 0.95)
  s.bezierCurveTo(0.6, 0.77, 0.8, 0.55, 0.8, 0.35)
  s.bezierCurveTo(0.8, 0.35, 0.8, 0, 0.5, 0)
  s.bezierCurveTo(0.35, 0, 0.25, 0.25, 0.25, 0.25)
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 5,
    curveSegments: 24,
  })
  g.center()
  g.rotateZ(Math.PI) // the classic path is drawn point-up
  return g
}

export function SpecialCorner() {
  const { x, z } = LANDMARKS.heartSculpture
  const heart = useMemo(() => heartGeometry(), [])
  const heartRef = useRef<THREE.Mesh>(null!)
  const signZ = SECTIONS.special.from - 0.1

  useFrame((state) => {
    const t = state.clock.elapsedTime
    heartRef.current.rotation.y = t * 0.45
    heartRef.current.position.y = 1.85 + Math.sin(t * 1.2) * 0.06
  })

  return (
    <group>
      {/* Hanging title sign, seen when walking from the gallery */}
      <group position={[0, 4.7, signZ]}>
        {[-2.3, 2.3].map((cx) => (
          <mesh key={cx} position={[cx, 0.43 + (ROOM.height - 5.13) / 2, 0]} material={materials.gold}>
            <cylinderGeometry args={[0.012, 0.012, ROOM.height - 5.13, 6]} />
          </mesh>
        ))}
        <RoundedBox args={[5.4, 0.86, 0.06]} radius={0.04} smoothness={2} material={materials.gold} />
        <RoundedBox args={[5.25, 0.72, 0.07]} radius={0.035} smoothness={2} material={materials.wallLavender} />
        <Text font={fonts.serifItalic} fontSize={0.3} position={[0, 0.02, 0.04]} color="#8a6a9c" anchorX="center" anchorY="middle" letterSpacing={0.02}>
          {museumConfig.specialCornerTitle}
        </Text>
        <Text font={fonts.serifItalic} fontSize={0.3} position={[0, 0.02, -0.04]} rotation-y={Math.PI} color="#8a6a9c" anchorX="center" anchorY="middle" letterSpacing={0.02}>
          {museumConfig.specialCornerTitle}
        </Text>
      </group>

      {/* Heart sculpture on a marble pedestal */}
      <group position={[x, 0, z]}>
        <mesh position-y={0.5} material={materials.marble}>
          <cylinderGeometry args={[0.5, 0.58, 1.0, 32]} />
        </mesh>
        <mesh position-y={1.03} material={materials.gold}>
          <cylinderGeometry args={[0.62, 0.62, 0.06, 32]} />
        </mesh>
        <mesh position-y={0.04} material={materials.gold}>
          <cylinderGeometry args={[0.7, 0.72, 0.08, 32]} />
        </mesh>
        <mesh ref={heartRef} geometry={heart} material={materials.roseGold} scale={0.95} position-y={1.85} />
        <Sparkles count={40} scale={[2.2, 2.2, 2.2]} position-y={1.9} size={3} speed={0.35} color="#ffc4d6" />
      </group>

      {/* Floating sparkles filling the whole corner */}
      <Sparkles
        count={90}
        scale={[ROOM.halfWidth * 2 - 1, 4.5, SECTIONS.special.from - SECTIONS.special.to]}
        position={[0, 2.6, (SECTIONS.special.from + SECTIONS.special.to) / 2]}
        size={3.5}
        speed={0.25}
        opacity={0.8}
        color="#e9d6ff"
      />
    </group>
  )
}
