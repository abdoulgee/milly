/**
 * Entrance: a flower-covered arch with the museum title, and a welcome
 * easel. The title fades in with the camera fly-in on every visit.
 */
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instance, Instances, RoundedBox, Sparkles, Text } from '@react-three/drei'
import * as THREE from 'three'
import { museumConfig } from '../../data/museumConfig'
import { fonts } from '../../lib/fonts'
import { materials } from '../../lib/materials'
import { damp } from '../../lib/math'
import { runtime } from '../../store/runtime'
import { LANDMARKS, PLACEMENTS } from './MuseumLayout'

const PILLAR_H = 3.2
const ARCH_R = 2.45

export function EntranceArea() {
  return (
    <>
      <FlowerArch />
      <WelcomeSign />
    </>
  )
}

function FlowerArch() {
  const z = LANDMARKS.archZ
  const title = useRef<{ fillOpacity: number; scale: THREE.Vector3 } | null>(null)

  // Blossoms scattered along the arch curve and down the pillars
  const blossoms = useMemo(() => {
    const out: { p: [number, number, number]; s: number; c: string; leaf: boolean }[] = []
    const colors = ['#f7b3c6', '#fff1f4', '#e7cdf4', '#f9cdb8', '#f39bb4']
    let seed = 3
    const r = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (let i = 0; i < 110; i++) {
      const a = r() * Math.PI
      const spread = 0.28
      const rr = ARCH_R + (r() - 0.5) * spread
      out.push({
        p: [Math.cos(a) * rr, PILLAR_H + Math.sin(a) * rr, (r() - 0.5) * 0.42],
        s: 0.06 + r() * 0.06,
        c: colors[i % colors.length],
        leaf: i % 3 === 0,
      })
    }
    // Trailing down the outer pillar faces
    for (let i = 0; i < 30; i++) {
      const side = i % 2 ? 1 : -1
      out.push({
        p: [side * (ARCH_R + 0.36 + r() * 0.06), PILLAR_H - r() * 1.6, (r() - 0.5) * 0.5],
        s: 0.05 + r() * 0.05,
        c: colors[i % colors.length],
        leaf: i % 2 === 0,
      })
    }
    return out
  }, [])

  useFrame((_, dt) => {
    if (!title.current) return
    const target = runtime.camera.intro > 0.25 ? 1 : 0
    title.current.fillOpacity = damp(title.current.fillOpacity, target, 2.2, dt)
    const s = 0.9 + title.current.fillOpacity * 0.1
    title.current.scale.setScalar(s)
  })

  return (
    <group position={[0, 0, z]}>
      {PLACEMENTS.archPillars.map((p) => (
        <group key={p.x} position-x={p.x}>
          <mesh position-y={PILLAR_H / 2} material={materials.marble}>
            <boxGeometry args={[0.62, PILLAR_H, 0.62]} />
          </mesh>
          <mesh position-y={0.1} material={materials.gold}>
            <boxGeometry args={[0.76, 0.2, 0.76]} />
          </mesh>
          <mesh position-y={PILLAR_H - 0.08} material={materials.gold}>
            <boxGeometry args={[0.78, 0.16, 0.78]} />
          </mesh>
        </group>
      ))}
      <mesh position-y={PILLAR_H} material={materials.marble}>
        <torusGeometry args={[ARCH_R, 0.24, 16, 64, Math.PI]} />
      </mesh>
      <mesh position-y={PILLAR_H} material={materials.gold}>
        <torusGeometry args={[ARCH_R - 0.26, 0.035, 8, 64, Math.PI]} />
      </mesh>

      <Instances limit={blossoms.length} material={materials.tintable}>
        <icosahedronGeometry args={[1, 1]} />
        {blossoms.map((b, i) => (
          <Instance key={i} position={b.p} scale={b.s * 1.4} color={b.leaf ? '#8dbb98' : b.c} />
        ))}
      </Instances>

      <Text
        ref={title as never}
        font={fonts.script}
        fontSize={0.62}
        position={[0, PILLAR_H + 0.72, 0.05]}
        color="#c0677f"
        anchorX="center"
        anchorY="middle"
        fillOpacity={0}
        outlineWidth={0.012}
        outlineColor="#fff6f2"
        outlineOpacity={0.6}
      >
        {museumConfig.title}
        <meshBasicMaterial side={THREE.FrontSide} toneMapped={false} />
      </Text>
      <Text
        font={fonts.serifItalic}
        fontSize={0.2}
        position={[0, PILLAR_H + 0.72, -0.05]}
        rotation-y={Math.PI}
        color="#b98196"
        anchorX="center"
        anchorY="middle"
      >
        made with love, for you
        <meshBasicMaterial side={THREE.FrontSide} toneMapped={false} />
      </Text>
      <Sparkles count={30} scale={[5.5, 2.2, 1.2]} position-y={PILLAR_H + 1.3} size={2.5} speed={0.3} color="#ffd2de" />
    </group>
  )
}

function WelcomeSign() {
  const { x, z, rotY } = PLACEMENTS.welcomeSign
  const { title, body } = museumConfig.entranceSign
  return (
    <group position={[x, 0, z]} rotation-y={rotY}>
      {/* Easel legs */}
      {[-0.42, 0.42].map((lx) => (
        <mesh key={lx} position={[lx, 0.8, -0.05]} rotation-x={-0.1} material={materials.gold}>
          <cylinderGeometry args={[0.025, 0.03, 1.65, 8]} />
        </mesh>
      ))}
      <mesh position={[0, 0.75, -0.3]} rotation-x={0.35} material={materials.gold}>
        <cylinderGeometry args={[0.02, 0.025, 1.55, 8]} />
      </mesh>
      <group position={[0, 1.42, 0.03]} rotation-x={-0.1}>
        <RoundedBox args={[1.5, 1.02, 0.05]} radius={0.03} smoothness={2} material={materials.gold} />
        <RoundedBox args={[1.38, 0.9, 0.06]} radius={0.025} smoothness={2} material={materials.ivoryFrame} />
        <Text font={fonts.script} fontSize={0.17} position={[0, 0.25, 0.035]} color="#c0677f" anchorX="center" anchorY="middle">
          {title}
        </Text>
        <Text
          font={fonts.serif}
          fontSize={0.058}
          lineHeight={1.45}
          maxWidth={1.18}
          textAlign="center"
          position={[0, -0.08, 0.035]}
          color="#7a5563"
          anchorX="center"
          anchorY="middle"
        >
          {body}
        </Text>
      </group>
    </group>
  )
}
