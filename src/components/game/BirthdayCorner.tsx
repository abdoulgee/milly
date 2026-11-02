/**
 * Birthday surprise corner — the emotional finale.
 *
 * A three-tier cake with flickering candles, presents, balloon bouquets,
 * bunting, fairy lights and the birthday message on the wall. Interacting
 * with the cake blows out the candles and triggers confetti, floating
 * hearts, released balloons and a light flash, followed by the final
 * on-screen birthday letter (BirthdayMessage.tsx).
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Instance, Instances, Sparkles, Text } from '@react-three/drei'
import * as THREE from 'three'
import { museumConfig } from '../../data/museumConfig'
import { fonts } from '../../lib/fonts'
import { materials } from '../../lib/materials'
import { damp } from '../../lib/math'
import { radialTexture } from '../../lib/textures'
import { useGameStore } from '../../store/gameStore'
import { Confetti } from './Confetti'
import { LANDMARKS, PLACEMENTS, ROOM } from './MuseumLayout'
import { heartGeometry } from './SpecialCorner'

const CX = LANDMARKS.cake.x
const CZ = LANDMARKS.cake.z
const TIERS = [
  { r: 0.5, h: 0.3, base: 0.99, color: '#fff4ec', drip: '#f6b9c9' },
  { r: 0.37, h: 0.26, base: 1.29, color: '#f8cad6', drip: '#fff4ec' },
  { r: 0.25, h: 0.22, base: 1.55, color: '#fff4ec', drip: '#f6b9c9' },
]
const CAKE_TOP = 1.77
const CANDLES: [number, number][] = [[0, 0], ...Array.from({ length: 6 }, (_, i) => [Math.cos((i / 6) * Math.PI * 2) * 0.165, Math.sin((i / 6) * Math.PI * 2) * 0.165] as [number, number])]

export function BirthdayCorner() {
  const celebrations = useGameStore((s) => s.celebrations)
  const celebration = useGameStore((s) => s.celebration)
  return (
    <group>
      <WallMessage />
      <Bunting />
      <group position={[CX, 0, CZ]}>
        <CakeTable />
        <Cake />
        <Candles lit={celebration === 'idle' || celebration === 'done'} />
        <CakeLight trigger={celebrations} />
        <NearGlow />
        <FloatingHearts active={celebration === 'celebrating' || celebration === 'message'} />
        <Sparkles
          visible={celebration !== 'idle'}
          count={110}
          scale={[5, 3.5, 5]}
          position-y={2}
          size={4}
          speed={0.6}
          color="#ffd0dc"
        />
      </group>
      <Presents />
      <Balloons releaseTrigger={celebrations} />
      <Confetti origin={[CX, CAKE_TOP + 0.3, CZ]} trigger={celebrations} />
    </group>
  )
}

function WallMessage() {
  const b = museumConfig.birthday
  const z = -ROOM.halfLength + 0.04
  return (
    <group position={[0, 0, z]}>
      <Text font={fonts.script} fontSize={1.3} position={[0, 4.55, 0]} color="#c96884" anchorX="center" anchorY="middle" outlineWidth={0.015} outlineColor="#fff4f0">
        {b.wallHeadline}
        <meshBasicMaterial toneMapped={false} />
      </Text>
      <Text font={fonts.script} fontSize={0.66} position={[0, 3.45, 0]} color="#b9758d" anchorX="center" anchorY="middle">
        {b.recipientName}
        <meshBasicMaterial toneMapped={false} />
      </Text>
      <Text font={fonts.serifItalic} fontSize={0.24} position={[0, 2.82, 0]} color="#9b6a80" anchorX="center" anchorY="middle" letterSpacing={0.03}>
        {b.wallSubtitle}
      </Text>
      {/* Gold flourish lines */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 2.6, 2.82, 0]} material={materials.gold}>
          <boxGeometry args={[1.4, 0.02, 0.01]} />
        </mesh>
      ))}
    </group>
  )
}

/** Catenary-ish swag between two points */
function swag(x0: number, x1: number, y: number, sag: number, n: number) {
  return Array.from({ length: n }, (_, i) => {
    const t = (i + 0.5) / n
    return [x0 + (x1 - x0) * t, y - Math.sin(t * Math.PI) * sag] as [number, number]
  })
}

function Bunting() {
  const z = -ROOM.halfLength + 0.12
  const flag = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.18, 0, 0, 0.18, 0, 0, 0, -0.42, 0], 3))
    g.computeVertexNormals()
    return g
  }, [])
  const flags = [...swag(-10, -0.3, 5.85, 0.75, 17), ...swag(0.3, 10, 5.85, 0.75, 17)]
  const lights = swag(-10.6, 10.6, 5.25, 1.25, 46)
  const glow = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(lights.flatMap(([x, y]) => [x, y, z + 0.03]), 3))
    return g
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const colors = ['#f4a7bc', '#e6d6f7', '#fff3e8', '#f1cf8e', '#f8c2d1']
  return (
    <group>
      <Instances limit={flags.length} geometry={flag}>
        <meshBasicMaterial side={THREE.DoubleSide} />
        {flags.map(([x, y], i) => (
          <Instance key={i} position={[x, y, z]} color={colors[i % colors.length]} />
        ))}
      </Instances>
      <Instances limit={lights.length} material={materials.bulb}>
        <sphereGeometry args={[0.035, 8, 6]} />
        {lights.map(([x, y], i) => (
          <Instance key={i} position={[x, y, z + 0.03]} />
        ))}
      </Instances>
      <points geometry={glow}>
        <pointsMaterial map={radialTexture()} color="#ffd59e" size={0.32} transparent opacity={0.8} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>
    </group>
  )
}

function CakeTable() {
  return (
    <group>
      <mesh position-y={0.45}>
        <cylinderGeometry args={[1.0, 1.14, 0.9, 40, 1, true]} />
        <meshStandardMaterial color="#fff6f3" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>
      <mesh position-y={0.92}>
        <cylinderGeometry args={[1.04, 1.04, 0.04, 40]} />
        <meshStandardMaterial color="#fffaf7" roughness={0.85} />
      </mesh>
      <mesh position-y={0.04} rotation-x={Math.PI / 2} material={materials.velvet}>
        <torusGeometry args={[1.13, 0.04, 8, 48]} />
      </mesh>
      <mesh position-y={0.9} rotation-x={Math.PI / 2} material={materials.gold}>
        <torusGeometry args={[1.04, 0.018, 6, 48]} />
      </mesh>
      {/* Cake stand */}
      <mesh position-y={0.965} material={materials.gold}>
        <cylinderGeometry args={[0.6, 0.62, 0.05, 36]} />
      </mesh>
    </group>
  )
}

function Cake() {
  const pearls = useMemo(
    () =>
      TIERS.flatMap((t) => {
        const n = Math.round(t.r * 56)
        return Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2
          return [Math.cos(a) * (t.r + 0.005), t.base + 0.02, Math.sin(a) * (t.r + 0.005)] as [number, number, number]
        })
      }),
    [],
  )
  const drips = useMemo(
    () =>
      TIERS.flatMap((t) => {
        const n = Math.round(t.r * 40)
        return Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 + 0.2
          const len = 0.5 + ((i * 7) % 5) / 6
          return { p: [Math.cos(a) * (t.r + 0.004), t.base + t.h - 0.04 * len, Math.sin(a) * (t.r + 0.004)] as [number, number, number], s: len, c: t.drip }
        })
      }),
    [],
  )
  return (
    <group>
      {TIERS.map((t) => (
        <group key={t.r}>
          <mesh position-y={t.base + t.h / 2}>
            <cylinderGeometry args={[t.r, t.r, t.h, 40]} />
            <meshStandardMaterial color={t.color} roughness={0.55} />
          </mesh>
          <mesh position-y={t.base + t.h} rotation-x={Math.PI / 2}>
            <torusGeometry args={[t.r - 0.02, 0.032, 10, 40]} />
            <meshStandardMaterial color={t.drip} roughness={0.5} />
          </mesh>
        </group>
      ))}
      <Instances limit={pearls.length} material={materials.blossomWhite}>
        <sphereGeometry args={[0.022, 8, 6]} />
        {pearls.map((p, i) => (
          <Instance key={i} position={p} />
        ))}
      </Instances>
      <Instances limit={drips.length} material={materials.tintable}>
        <capsuleGeometry args={[0.022, 0.07, 4, 8]} />
        {drips.map((d, i) => (
          <Instance key={i} position={d.p} scale={[1, d.s, 1]} color={d.c} />
        ))}
      </Instances>
      {/* Little roses on the middle tier */}
      <Instances limit={8} material={materials.tintable}>
        <icosahedronGeometry args={[0.045, 1]} />
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2
          return <Instance key={i} position={[Math.cos(a) * 0.31, TIERS[1].base + TIERS[1].h + 0.02, Math.sin(a) * 0.31]} color={i % 2 ? '#e9879f' : '#fff0f3'} />
        })}
      </Instances>
    </group>
  )
}

function Candles({ lit }: { lit: boolean }) {
  const flames = useRef<THREE.Group>(null!)
  const glowMat = useRef<THREE.PointsMaterial>(null!)
  const level = useRef(1)
  const glow = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(CANDLES.flatMap(([x, z]) => [x, CAKE_TOP + 0.22, z]), 3))
    return g
  }, [])

  useFrame((state, dt) => {
    level.current = damp(level.current, lit ? 1 : 0, lit ? 2 : 9, dt)
    const t = state.clock.elapsedTime
    flames.current.children.forEach((f, i) => {
      const flicker = 1 + Math.sin(t * 17 + i * 3) * 0.08 + Math.sin(t * 29 + i) * 0.05
      f.scale.set(level.current, level.current * flicker, level.current)
      f.visible = level.current > 0.02
    })
    glowMat.current.opacity = level.current * (0.75 + Math.sin(t * 13) * 0.08)
  })

  return (
    <group>
      <Instances limit={CANDLES.length} material={materials.tintable}>
        <cylinderGeometry args={[0.015, 0.015, 0.17, 8]} />
        {CANDLES.map(([x, z], i) => (
          <Instance key={i} position={[x, CAKE_TOP + 0.085, z]} color={['#f7b6c8', '#ffffff', '#d9c6f2'][i % 3]} />
        ))}
      </Instances>
      <group ref={flames}>
        {CANDLES.map(([x, z], i) => (
          <group key={i} position={[x, CAKE_TOP + 0.175, z]}>
            <mesh position-y={0.04} scale={[0.02, 0.045, 0.02]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshBasicMaterial color="#ffc061" toneMapped={false} />
            </mesh>
            <mesh position-y={0.03} scale={[0.009, 0.022, 0.009]}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshBasicMaterial color="#fffbe8" toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>
      <points geometry={glow}>
        <pointsMaterial ref={glowMat} map={radialTexture()} color="#ffb85c" size={0.3} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>
    </group>
  )
}

/** Warm light over the cake that flashes when the candles are blown out. */
function CakeLight({ trigger }: { trigger: number }) {
  const light = useRef<THREE.PointLight>(null!)
  const flash = useRef(0)
  useEffect(() => {
    if (trigger) flash.current = 1
  }, [trigger])
  useFrame((_, dt) => {
    flash.current = Math.max(0, flash.current - dt * 0.6)
    light.current.intensity = 9 + flash.current * 14
  })
  return <pointLight ref={light} position={[0, 2.9, 0.7]} intensity={9} distance={11} decay={1.5} color="#ffd9a6" />
}

/** Soft pulsing floor ring when she's close enough to make a wish. */
function NearGlow() {
  const near = useGameStore((s) => s.nearby?.kind === 'cake')
  const mat = useRef<THREE.MeshBasicMaterial>(null!)
  useFrame((state, dt) => {
    const target = near ? 0.32 + Math.sin(state.clock.elapsedTime * 3) * 0.1 : 0
    mat.current.opacity = damp(mat.current.opacity, target, 5, dt)
  })
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.02}>
      <ringGeometry args={[1.2, 1.9, 48]} />
      <meshBasicMaterial ref={mat} color="#f29ab2" transparent opacity={0} depthWrite={false} />
    </mesh>
  )
}

function FloatingHearts({ active }: { active: boolean }) {
  const COUNT = 26
  const mesh = useRef<THREE.InstancedMesh>(null!)
  const geo = useMemo(() => heartGeometry(0.08), [])
  const hearts = useMemo(
    () =>
      Array.from({ length: COUNT }, () => ({
        x: 0,
        y: -5,
        z: 0,
        life: 99, // dead until the celebration starts
        speed: 0.55 + Math.random() * 0.4,
        a: Math.random() * Math.PI * 2,
        r: 0.4 + Math.random() * 1.8,
      })),
    [],
  )
  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const s = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    const c = new THREE.Color()
    for (let i = 0; i < COUNT; i++) mesh.current.setColorAt(i, c.set(['#f48fab', '#f9c0cf', '#e7b7f0', '#ffd7e1'][i % 4]))
    mesh.current.instanceColor!.needsUpdate = true
  }, [])

  useEffect(() => {
    if (active) hearts.forEach((h, i) => (h.life = -(i / COUNT) * 3)) // staggered start
  }, [active, hearts])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = state.clock.elapsedTime
    let any = false
    hearts.forEach((h, i) => {
      h.life += dt
      if (h.life > 4.5 && active) {
        h.life = 0
        h.a = Math.random() * Math.PI * 2
      }
      const alive = h.life > 0 && h.life < 4.5
      if (alive) any = true
      const k = alive ? h.life / 4.5 : 0
      const scale = alive ? Math.sin(Math.min(1, k * 1.2) * Math.PI) * 0.22 : 0
      p.set(Math.cos(h.a) * h.r + Math.sin(t * 1.5 + i) * 0.15, 1.2 + h.life * h.speed, Math.sin(h.a) * h.r)
      e.set(0, t * 1.2 + i, 0)
      q.setFromEuler(e)
      s.setScalar(scale)
      m.compose(p, q, s)
      mesh.current.setMatrixAt(i, m)
    })
    mesh.current.visible = any
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[geo, undefined, COUNT]} frustumCulled={false}>
      <meshStandardMaterial roughness={0.35} metalness={0.2} emissive="#ff8fb0" emissiveIntensity={0.35} />
    </instancedMesh>
  )
}

function Presents() {
  const base = PLACEMENTS.presents[0]
  return (
    <group>
      {PLACEMENTS.presents.map((p, i) => {
        const y = 'stackOn' in p ? base.h : 0
        return (
          <group key={i} position={[p.x, y, p.z]} rotation-y={p.rot}>
            <mesh position-y={p.h / 2}>
              <boxGeometry args={[p.w, p.h, p.d]} />
              <meshStandardMaterial color={p.color} roughness={0.6} />
            </mesh>
            <mesh position-y={p.h / 2}>
              <boxGeometry args={[p.w * 0.16, p.h + 0.004, p.d + 0.004]} />
              <meshStandardMaterial color={p.ribbon} roughness={0.4} />
            </mesh>
            <mesh position-y={p.h / 2}>
              <boxGeometry args={[p.w + 0.004, p.h + 0.004, p.d * 0.16]} />
              <meshStandardMaterial color={p.ribbon} roughness={0.4} />
            </mesh>
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * p.w * 0.12, p.h + 0.04, 0]} rotation={[0, 0, s * 0.6]}>
                <torusGeometry args={[p.w * 0.11, 0.018, 6, 16]} />
                <meshStandardMaterial color={p.ribbon} roughness={0.4} />
              </mesh>
            ))}
          </group>
        )
      })}
    </group>
  )
}

const BALLOON_COLORS = ['#f6a5bb', '#e3cff7', '#fff1e6', '#f3c98b', '#f9c6d3', '#cbb6ee']

/** Balloon bouquets that bob gently, plus balloons released on celebration. */
function Balloons({ releaseTrigger }: { releaseTrigger: number }) {
  const balloons = useMemo(() => {
    const out: { ax: number; az: number; x: number; y: number; z: number; phase: number; released?: boolean; ty?: number }[] = []
    PLACEMENTS.balloonClusters.forEach((c, ci) => {
      const offsets = [
        [0, 3.2, 0],
        [0.32, 2.85, 0.12],
        [-0.3, 2.9, -0.1],
        [0.12, 2.55, -0.3],
        [-0.15, 2.5, 0.3],
      ]
      offsets.forEach(([ox, oy, oz], i) => out.push({ ax: c.x, az: c.z, x: c.x + ox, y: oy, z: c.z + oz, phase: ci * 1.7 + i }))
    })
    // Released balloons start hidden behind the cake
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      out.push({ ax: CX, az: CZ, x: CX + Math.cos(a) * 3.2, y: -3, z: CZ + Math.sin(a) * 2.2 + 0.4, phase: i * 0.9, released: true, ty: 5.3 + (i % 3) * 0.3 })
    }
    return out
  }, [])

  const mesh = useRef<THREE.InstancedMesh>(null!)
  const strings = useRef<THREE.LineSegments>(null!)
  const release = useRef({ t: -1 })

  useEffect(() => {
    const c = new THREE.Color()
    balloons.forEach((_, i) => mesh.current.setColorAt(i, c.set(BALLOON_COLORS[i % BALLOON_COLORS.length])))
    mesh.current.instanceColor!.needsUpdate = true
  }, [balloons])

  useEffect(() => {
    if (releaseTrigger) release.current.t = 0
  }, [releaseTrigger])

  const m = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const p = useMemo(() => new THREE.Vector3(), [])
  const sc = useMemo(() => new THREE.Vector3(1, 1.18, 1), [])
  const hidden = useMemo(() => new THREE.Vector3(0, 0, 0), [])
  const stringGeo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(balloons.length * 6), 3))
    return g
  }, [balloons])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const t = state.clock.elapsedTime
    const pos = stringGeo.attributes.position as THREE.BufferAttribute
    const r = release.current
    if (r.t >= 0) r.t += dt
    balloons.forEach((b, i) => {
      let y = b.y + Math.sin(t * 0.9 + b.phase) * 0.06
      const x = b.x + Math.sin(t * 0.6 + b.phase) * 0.05
      const z = b.z + Math.cos(t * 0.5 + b.phase) * 0.04
      let visible = true
      if (b.released) {
        const k = r.t < 0 ? -1 : Math.min(1, Math.max(0, (r.t - 0.3 - (i % 5) * 0.12) / 3.2))
        visible = k >= 0 && r.t >= 0.3
        y = THREE.MathUtils.lerp(1.0, b.ty!, 1 - Math.pow(1 - Math.max(0, k), 3)) + Math.sin(t * 0.9 + b.phase) * 0.05
      }
      p.set(x, y, z)
      q.identity()
      m.compose(p, q, visible ? sc : hidden)
      mesh.current.setMatrixAt(i, m)
      // String: from balloon knot down to its anchor (or dangling when released)
      const ky = y - 0.24 * 1.18
      pos.setXYZ(i * 2, x, ky, z)
      if (b.released) pos.setXYZ(i * 2 + 1, x + Math.sin(t + b.phase) * 0.05, visible ? ky - 0.9 : ky, z)
      else pos.setXYZ(i * 2 + 1, b.ax, 0.08, b.az)
    })
    mesh.current.instanceMatrix.needsUpdate = true
    pos.needsUpdate = true
  })

  return (
    <group>
      <instancedMesh ref={mesh} args={[undefined, undefined, balloons.length]} frustumCulled={false}>
        <sphereGeometry args={[0.24, 20, 16]} />
        <meshStandardMaterial roughness={0.22} metalness={0.15} />
      </instancedMesh>
      <lineSegments ref={strings} geometry={stringGeo} frustumCulled={false}>
        <lineBasicMaterial color="#d9c0c6" transparent opacity={0.8} />
      </lineSegments>
      {/* Weights */}
      <Instances limit={PLACEMENTS.balloonClusters.length} material={materials.gold}>
        <cylinderGeometry args={[0.1, 0.12, 0.14, 16]} />
        {PLACEMENTS.balloonClusters.map((c, i) => (
          <Instance key={i} position={[c.x, 0.07, c.z]} />
        ))}
      </Instances>
    </group>
  )
}
