/**
 * The museum hall itself: floor, walls with wainscoting and mouldings,
 * pilasters, ceiling with skylights, chandeliers, rugs and the arched
 * window. One continuous room built procedurally.
 */
import { useMemo } from 'react'
import { Instance, Instances } from '@react-three/drei'
import * as THREE from 'three'
import { materials } from '../../lib/materials'
import { marbleTexture, radialTexture, roundRugTexture, runnerTexture, skyTexture } from '../../lib/textures'
import { LANDMARKS, PILASTER_Z, ROOM, SECTIONS } from './MuseumLayout'

const H = ROOM.height
const W = ROOM.halfWidth
const L = ROOM.halfLength

export function MuseumEnvironment() {
  return (
    <group>
      <Floor />
      <Ceiling />
      <Wall length={L * 2} position={[-W, 0, 0]} rotY={Math.PI / 2} />
      <Wall length={L * 2} position={[W, 0, 0]} rotY={-Math.PI / 2} />
      <Wall length={W * 2} position={[0, 0, -L]} rotY={0} material={materials.wallBlush} />
      <Wall length={W * 2} position={[0, 0, L]} rotY={Math.PI} />
      <AccentPaint />
      <Pilasters />
      <ArchedWindow />
      <Rugs />
      <Chandeliers />
    </group>
  )
}

function Floor() {
  const map = useMemo(() => {
    const t = marbleTexture().clone()
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set((W * 2) / 3, (L * 2) / 3)
    t.needsUpdate = true
    return t
  }, [])
  return (
    <mesh rotation-x={-Math.PI / 2}>
      <planeGeometry args={[W * 2, L * 2]} />
      <meshStandardMaterial map={map} roughness={0.32} metalness={0.02} envMapIntensity={0.8} />
    </mesh>
  )
}

function Wall({
  length,
  position,
  rotY,
  material = materials.wall,
}: {
  length: number
  position: [number, number, number]
  rotY: number
  material?: THREE.Material
}) {
  return (
    <group position={position} rotation-y={rotY}>
      <mesh position-y={H / 2} material={material}>
        <planeGeometry args={[length, H]} />
      </mesh>
      {/* Wainscot panel, chair rail, skirting, crown moulding */}
      <mesh position={[0, 0.53, 0.015]} material={materials.wainscot}>
        <boxGeometry args={[length, 1.06, 0.03]} />
      </mesh>
      <mesh position={[0, 1.08, 0.035]} material={materials.roseGold}>
        <boxGeometry args={[length, 0.06, 0.05]} />
      </mesh>
      <mesh position={[0, 0.08, 0.04]} material={materials.trim}>
        <boxGeometry args={[length, 0.16, 0.05]} />
      </mesh>
      <mesh position={[0, H - 0.12, 0.07]} material={materials.trim}>
        <boxGeometry args={[length, 0.24, 0.14]} />
      </mesh>
      <mesh position={[0, H - 0.27, 0.05]} material={materials.gold}>
        <boxGeometry args={[length, 0.035, 0.1]} />
      </mesh>
    </group>
  )
}

/** Lavender walls in the special corner, blush in the birthday corner. */
function AccentPaint() {
  const zone = (from: number, to: number, material: THREE.Material) => {
    const len = from - to
    const z = (from + to) / 2
    return [-1, 1].map((side) => (
      <mesh key={`${z}${side}`} position={[side * (W - 0.004), (H + 1.11) / 2 - 0.15, z]} rotation-y={(-side * Math.PI) / 2} material={material}>
        <planeGeometry args={[len, H - 1.41]} />
      </mesh>
    ))
  }
  return (
    <>
      {zone(SECTIONS.special.from, SECTIONS.special.to, materials.wallLavender)}
      {zone(SECTIONS.birthday.from, SECTIONS.birthday.to, materials.wallBlush)}
    </>
  )
}

function Pilasters() {
  const spots = PILASTER_Z.flatMap((z) => [-1, 1].map((side) => ({ x: side * (W - 0.09), z })))
  return (
    <>
      <Instances limit={spots.length} material={materials.trim}>
        <boxGeometry args={[0.18, H - 0.5, 0.5]} />
        {spots.map((s, i) => (
          <Instance key={i} position={[s.x, (H - 0.5) / 2 + 0.1, s.z]} />
        ))}
      </Instances>
      <Instances limit={spots.length * 2} material={materials.roseGold}>
        <boxGeometry args={[0.24, 0.16, 0.62]} />
        {spots.map((s, i) => (
          <Instance key={`b${i}`} position={[s.x, 0.18, s.z]} />
        ))}
        {spots.map((s, i) => (
          <Instance key={`c${i}`} position={[s.x, H - 0.48, s.z]} />
        ))}
      </Instances>
    </>
  )
}

function Ceiling() {
  const beams = [-18.5, -14.75, -10.25, -5.75, -0.25, 4.25, 8.75, 13.25, 17.75]
  const skylights = [
    { z: 11, len: 8 },
    { z: -3, len: 8 },
    { z: -12.5, len: 3.6 },
  ]
  return (
    <group>
      <mesh position-y={H} rotation-x={Math.PI / 2} material={materials.ceiling}>
        <planeGeometry args={[W * 2, L * 2]} />
      </mesh>
      <Instances limit={beams.length} material={materials.trim}>
        <boxGeometry args={[W * 2, 0.22, 0.32]} />
        {beams.map((z) => (
          <Instance key={z} position={[0, H - 0.11, z]} />
        ))}
      </Instances>
      {skylights.map((s) => (
        <group key={s.z} position={[0, H - 0.01, s.z]}>
          <mesh rotation-x={Math.PI / 2}>
            <planeGeometry args={[5, s.len]} />
            <meshBasicMaterial color="#fff9f0" toneMapped={false} />
          </mesh>
          <mesh position-y={-0.06} material={materials.gold}>
            <boxGeometry args={[5.2, 0.08, 0.1]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** Decorative arched window on the entrance wall (sky gradient, no exterior). */
function ArchedWindow() {
  const { glass, frame } = useMemo(() => {
    const make = (w: number, rect: number) => {
      const s = new THREE.Shape()
      s.moveTo(-w / 2, 0)
      s.lineTo(w / 2, 0)
      s.lineTo(w / 2, rect)
      s.absarc(0, rect, w / 2, 0, Math.PI, false)
      s.lineTo(-w / 2, 0)
      const g = new THREE.ShapeGeometry(s, 24)
      // Normalise UVs to 0..1 so the sky gradient fills the window
      const uv = g.attributes.uv
      const pos = g.attributes.position
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w / 2) / w, pos.getY(i) / (rect + w / 2))
      return g
    }
    return { glass: make(4, 2.6), frame: make(4.36, 2.78) }
  }, [])
  return (
    <group position={[0, 1.0, L - 0.02]} rotation-y={Math.PI}>
      <mesh geometry={frame} material={materials.gold} position={[0, -0.18, -0.005]} />
      <mesh geometry={glass}>
        <meshBasicMaterial map={skyTexture()} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.3, 0.02]} material={materials.gold}>
        <boxGeometry args={[0.06, 4.6, 0.04]} />
      </mesh>
      {[1.3, 2.6].map((y) => (
        <mesh key={y} position={[0, y, 0.02]} material={materials.gold}>
          <boxGeometry args={[4, 0.06, 0.04]} />
        </mesh>
      ))}
      {/* Sill */}
      <mesh position={[0, -0.12, 0.12]} material={materials.trim}>
        <boxGeometry args={[4.6, 0.12, 0.3]} />
      </mesh>
    </group>
  )
}

function Rugs() {
  const runners = useMemo(() => {
    const make = (from: number, to: number) => {
      const t = runnerTexture().clone()
      t.repeat.set(1, (from - to) / 2.6)
      t.needsUpdate = true
      return { z: (from + to) / 2, len: from - to, map: t }
    }
    return [make(21.2, LANDMARKS.fountain.z + LANDMARKS.fountain.radius + 0.35), make(LANDMARKS.fountain.z - LANDMARKS.fountain.radius - 0.35, -7.3)]
  }, [])
  const special = roundRugTexture('special', '#d9cdf0', '#f3e7c8', '#ead9f5')
  const birthday = roundRugTexture('birthday', '#f3c1cd', '#f7e3bd', '#fbd9e2')
  return (
    <group>
      {runners.map((r) => (
        <mesh key={r.z} rotation-x={-Math.PI / 2} position={[0, 0.006, r.z]}>
          <planeGeometry args={[2.6, r.len]} />
          <meshStandardMaterial map={r.map} roughness={1} polygonOffset polygonOffsetFactor={-1} />
        </mesh>
      ))}
      <mesh rotation-x={-Math.PI / 2} position={[LANDMARKS.heartSculpture.x, 0.007, LANDMARKS.heartSculpture.z]}>
        <circleGeometry args={[3.1, 48]} />
        <meshStandardMaterial map={special} roughness={1} transparent polygonOffset polygonOffsetFactor={-1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[LANDMARKS.cake.x, 0.007, LANDMARKS.cake.z]}>
        <circleGeometry args={[3.5, 48]} />
        <meshStandardMaterial map={birthday} roughness={1} transparent polygonOffset polygonOffsetFactor={-1} />
      </mesh>
    </group>
  )
}

/** Gold ring chandeliers with glowing bulbs (2 instanced draws + 1 points draw). */
function Chandeliers() {
  const spots = [16.6, LANDMARKS.fountain.z, LANDMARKS.heartSculpture.z, LANDMARKS.cake.z]
  const bulbs = useMemo(() => {
    const out: [number, number, number][] = []
    for (const z of spots) {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2
        out.push([Math.cos(a) * 0.62, H - 1.72, z + Math.sin(a) * 0.62])
      }
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + 0.3
        out.push([Math.cos(a) * 0.34, H - 1.35, z + Math.sin(a) * 0.34])
      }
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const glow = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(bulbs.flat(), 3))
    return g
  }, [bulbs])

  return (
    <group>
      <Instances limit={spots.length * 2} material={materials.gold}>
        <torusGeometry args={[0.62, 0.028, 8, 48]} />
        {spots.map((z) => (
          <Instance key={z} position={[0, H - 1.78, z]} rotation-x={Math.PI / 2} />
        ))}
        {spots.map((z) => (
          <Instance key={`s${z}`} position={[0, H - 1.41, z]} rotation-x={Math.PI / 2} scale={0.55} />
        ))}
      </Instances>
      <Instances limit={spots.length} material={materials.gold}>
        <cylinderGeometry args={[0.014, 0.014, 1.5, 6]} />
        {spots.map((z) => (
          <Instance key={z} position={[0, H - 0.95, z]} />
        ))}
      </Instances>
      <Instances limit={bulbs.length} material={materials.bulb}>
        <sphereGeometry args={[0.045, 10, 8]} />
        {bulbs.map((b, i) => (
          <Instance key={i} position={b} />
        ))}
      </Instances>
      <points geometry={glow}>
        <pointsMaterial
          map={radialTexture()}
          color="#ffd9a8"
          size={0.42}
          transparent
          opacity={0.75}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </points>
    </group>
  )
}
