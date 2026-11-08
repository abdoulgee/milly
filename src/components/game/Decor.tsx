/**
 * Repeated decorative props — potted plants, velvet benches and flower
 * plinths. Everything that repeats is instanced (one draw call per part).
 */
import { useMemo } from 'react'
import { Instance, Instances, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { materials } from '../../lib/materials'
import { radialTexture } from '../../lib/textures'
import { BENCH_DROP, PLACEMENTS } from './MuseumLayout'

export function Decor() {
  return (
    <>
      <Plants />
      <Benches />
      <FlowerPlinths />
    </>
  )
}

const potGeometry = () =>
  new THREE.LatheGeometry(
    [
      [0.01, 0],
      [0.22, 0],
      [0.26, 0.04],
      [0.31, 0.46],
      [0.35, 0.5],
      [0.35, 0.56],
      [0.3, 0.56],
      [0.29, 0.5],
      [0.01, 0.5],
    ].map(([x, y]) => new THREE.Vector2(x, y)),
    20,
  )

// Foliage blob layout for one plant (relative positions & radii)
const BLOBS: [number, number, number, number][] = [
  [0, 1.42, 0, 0.3],
  [0.2, 1.2, 0.08, 0.26],
  [-0.18, 1.22, 0.1, 0.25],
  [0.05, 1.18, -0.2, 0.26],
  [-0.08, 1.02, 0.14, 0.22],
  [0.16, 0.98, -0.1, 0.2],
  [-0.15, 1.0, -0.12, 0.21],
  [0.02, 1.66, 0.02, 0.2],
]

function Plants() {
  const pot = useMemo(potGeometry, [])
  const plants = PLACEMENTS.plants
  return (
    <>
      <Instances limit={plants.length} geometry={pot} material={materials.pot}>
        {plants.map((p, i) => (
          <Instance key={i} position={[p.x, 0, p.z]} scale={p.s} />
        ))}
      </Instances>
      <Instances limit={plants.length} material={materials.gold}>
        <torusGeometry args={[0.35, 0.02, 6, 24]} />
        {plants.map((p, i) => (
          <Instance key={i} position={[p.x, 0.53 * p.s, p.z]} rotation-x={Math.PI / 2} scale={p.s} />
        ))}
      </Instances>
      <Instances limit={plants.length} material={materials.brass}>
        <cylinderGeometry args={[0.03, 0.04, 0.6, 6]} />
        {plants.map((p, i) => (
          <Instance key={i} position={[p.x, 0.8 * p.s, p.z]} scale={p.s} />
        ))}
      </Instances>
      <Instances limit={plants.length * BLOBS.length} material={materials.tintable}>
        <icosahedronGeometry args={[1, 1]} />
        {plants.flatMap((p, i) =>
          BLOBS.map(([x, y, z, r], j) => (
            <Instance
              key={`${i}-${j}`}
              position={[p.x + x * p.s, y * p.s, p.z + z * p.s]}
              scale={r * p.s}
              color={j % 3 === 0 ? '#6f9f7e' : j % 3 === 1 ? '#86b592' : '#7aa988'}
            />
          )),
        )}
      </Instances>
      {/* Little blossoms on every other plant */}
      <Instances limit={plants.length * 7} material={materials.tintable}>
        <sphereGeometry args={[0.055, 8, 6]} />
        {plants.flatMap((p, i) =>
          i % 2 === 0
            ? BLOBS.slice(0, 7).map(([x, y, z, r], j) => (
                <Instance
                  key={`${i}-${j}`}
                  position={[p.x + (x + Math.sign(x || 1) * r * 0.75) * p.s, (y + r * 0.45) * p.s, p.z + (z + Math.sign(z || 1) * r * 0.6) * p.s]}
                  scale={p.s}
                  color={j % 2 ? '#f8c9d6' : '#fff0f3'}
                />
              ))
            : [],
        )}
      </Instances>
    </>
  )
}

function Benches() {
  const legs = PLACEMENTS.benches.flatMap((b) =>
    [
      [-0.22, -0.78],
      [0.22, -0.78],
      [-0.22, 0.78],
      [0.22, 0.78],
    ].map(([dx, dz]) => [b.x + dx, 0.2 - BENCH_DROP, b.z + dz] as [number, number, number]),
  )
  return (
    <>
      {PLACEMENTS.benches.map((b, i) => (
        <group key={i} position={[b.x, -BENCH_DROP, b.z]}>
          {/* Soft contact shadow under the bench (baked, so it never flickers) */}
          <mesh rotation-x={-Math.PI / 2} position-y={BENCH_DROP + 0.02} scale={[1, 2.6, 1]} renderOrder={1}>
            <planeGeometry args={[1.05, 1.05]} />
            <meshBasicMaterial map={radialTexture()} color="#5e4048" transparent opacity={0.3} depthWrite={false} />
          </mesh>
          <RoundedBox args={[0.64, 0.17, 1.9]} radius={0.07} smoothness={3} position-y={0.47} material={b.z < -5 ? materials.velvetLavender : materials.velvet} />
          <mesh position-y={0.37} material={materials.gold}>
            <boxGeometry args={[0.6, 0.04, 1.8]} />
          </mesh>
          {/* Button tufting */}
          {[-0.6, -0.2, 0.2, 0.6].map((z) => (
            <mesh key={z} position={[0, 0.557, z]} material={materials.gold} scale={[1, 0.4, 1]}>
              <sphereGeometry args={[0.018, 8, 6]} />
            </mesh>
          ))}
        </group>
      ))}
      <Instances limit={legs.length} material={materials.gold}>
        <cylinderGeometry args={[0.025, 0.018, 0.4, 8]} />
        {legs.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
    </>
  )
}

function FlowerPlinths() {
  const vase = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          [0.01, 0],
          [0.1, 0],
          [0.16, 0.12],
          [0.15, 0.26],
          [0.08, 0.36],
          [0.09, 0.42],
          [0.01, 0.4],
        ].map(([x, y]) => new THREE.Vector2(x, y)),
        18,
      ),
    [],
  )
  const spots = PLACEMENTS.vasePlinths
  const flowers = useMemo(() => {
    const out: { p: [number, number, number]; c: string }[] = []
    spots.forEach((s, i) => {
      for (let k = 0; k < 9; k++) {
        const a = k * 2.4 + i
        const r = k === 0 ? 0 : 0.09 + (k % 3) * 0.04
        out.push({
          p: [s.x + Math.cos(a) * r, 1.62 + (k % 4) * 0.05 - r * 0.4, s.z + Math.sin(a) * r],
          c: ['#f7b6c8', '#fff3f5', '#e8c6f2', '#f9d1b8'][(k + i) % 4],
        })
      }
    })
    return out
  }, [spots])
  return (
    <>
      <Instances limit={spots.length} material={materials.marble}>
        <cylinderGeometry args={[0.24, 0.27, 1.05, 20]} />
        {spots.map((s, i) => (
          <Instance key={i} position={[s.x, 0.525, s.z]} />
        ))}
      </Instances>
      <Instances limit={spots.length * 2} material={materials.gold}>
        <cylinderGeometry args={[0.31, 0.31, 0.06, 20]} />
        {spots.map((s, i) => (
          <Instance key={i} position={[s.x, 1.08, s.z]} />
        ))}
        {spots.map((s, i) => (
          <Instance key={`b${i}`} position={[s.x, 0.03, s.z]} />
        ))}
      </Instances>
      <Instances limit={spots.length} geometry={vase} material={materials.roseGold}>
        {spots.map((s, i) => (
          <Instance key={i} position={[s.x, 1.11, s.z]} />
        ))}
      </Instances>
      <Instances limit={flowers.length} material={materials.tintable}>
        <icosahedronGeometry args={[0.075, 1]} />
        {flowers.map((f, i) => (
          <Instance key={i} position={f.p} color={f.c} />
        ))}
      </Instances>
      <Instances limit={spots.length * 5} material={materials.leafDark}>
        <sphereGeometry args={[1, 8, 6]} />
        {spots.flatMap((s, i) =>
          [0, 1, 2, 3, 4].map((k) => {
            const a = (k / 5) * Math.PI * 2 + i
            return <Instance key={`${i}${k}`} position={[s.x + Math.cos(a) * 0.15, 1.52, s.z + Math.sin(a) * 0.15]} scale={[0.07, 0.03, 0.12]} rotation-y={-a} />
          }),
        )}
      </Instances>
    </>
  )
}
