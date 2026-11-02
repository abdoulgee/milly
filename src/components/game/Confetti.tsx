/**
 * Confetti burst — one InstancedMesh, simulated only while active.
 * Pieces flutter down and settle on the floor.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 280
const COLORS = ['#f7a8bf', '#ffd6e0', '#d8c4f5', '#f6d48f', '#ffffff', '#f49ab3', '#bfe3f5']

interface Piece {
  p: THREE.Vector3
  v: THREE.Vector3
  rot: THREE.Euler
  spin: THREE.Vector3
  phase: number
  landed: boolean
}

const m = new THREE.Matrix4()
const q = new THREE.Quaternion()
const one = new THREE.Vector3(1, 1, 1)

export function Confetti({ origin, trigger }: { origin: [number, number, number]; trigger: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null!)
  const pieces = useMemo<Piece[]>(
    () =>
      Array.from({ length: COUNT }, () => ({
        p: new THREE.Vector3(0, -10, 0),
        v: new THREE.Vector3(),
        rot: new THREE.Euler(),
        spin: new THREE.Vector3(),
        phase: Math.random() * Math.PI * 2,
        landed: true,
      })),
    [],
  )
  const active = useRef(false)

  useEffect(() => {
    const c = new THREE.Color()
    for (let i = 0; i < COUNT; i++) mesh.current.setColorAt(i, c.set(COLORS[i % COLORS.length]))
    mesh.current.instanceColor!.needsUpdate = true
    // Park all pieces out of sight until the first burst
    for (let i = 0; i < COUNT; i++) {
      m.makeTranslation(0, -10, 0)
      mesh.current.setMatrixAt(i, m)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  }, [])

  useEffect(() => {
    if (!trigger) return
    for (const pc of pieces) {
      pc.p.set(origin[0] + (Math.random() - 0.5) * 0.4, origin[1], origin[2] + (Math.random() - 0.5) * 0.4)
      const a = Math.random() * Math.PI * 2
      const out = 1.2 + Math.random() * 3.2
      pc.v.set(Math.cos(a) * out, 4 + Math.random() * 4.5, Math.sin(a) * out)
      pc.rot.set(Math.random() * 6, Math.random() * 6, Math.random() * 6)
      pc.spin.set((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14)
      pc.landed = false
    }
    active.current = true
  }, [trigger, origin, pieces])

  useFrame((state, rawDt) => {
    if (!active.current) return
    const dt = Math.min(rawDt, 0.05)
    const t = state.clock.elapsedTime
    let flying = 0
    for (let i = 0; i < COUNT; i++) {
      const pc = pieces[i]
      if (!pc.landed) {
        flying++
        pc.v.y -= 6.5 * dt
        // Paper flutter: strong drag once falling, plus side-to-side sway
        if (pc.v.y < -1.1) pc.v.y = -1.1
        pc.v.x *= 1 - 0.9 * dt
        pc.v.z *= 1 - 0.9 * dt
        pc.p.addScaledVector(pc.v, dt)
        pc.p.x += Math.sin(t * 3 + pc.phase) * 0.35 * dt
        pc.rot.x += pc.spin.x * dt
        pc.rot.y += pc.spin.y * dt
        pc.rot.z += pc.spin.z * dt
        if (pc.p.y <= 0.012 && pc.v.y < 0) {
          pc.p.y = 0.012
          pc.rot.set(-Math.PI / 2, 0, pc.rot.z)
          pc.landed = true
        }
      }
      q.setFromEuler(pc.rot)
      m.compose(pc.p, q, one)
      mesh.current.setMatrixAt(i, m)
    }
    mesh.current.instanceMatrix.needsUpdate = true
    if (flying === 0) active.current = false
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, COUNT]} frustumCulled={false}>
      <planeGeometry args={[0.055, 0.09]} />
      <meshBasicMaterial side={THREE.DoubleSide} toneMapped={false} />
    </instancedMesh>
  )
}
