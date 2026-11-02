/**
 * A framed memory on the wall: frame + mat + photo, a brass picture light
 * with a soft wall-wash, a museum label, and a glow when she's close
 * enough to interact.
 */
import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import type { FrameStyle, Memory } from '../../data/memories'
import { fonts } from '../../lib/fonts'
import { materials } from '../../lib/materials'
import { damp } from '../../lib/math'
import { usePhotoTexture } from '../../lib/photoTexture'
import { lightPoolTexture, radialTexture } from '../../lib/textures'
import { useGameStore } from '../../store/gameStore'

const STYLES: Record<FrameStyle, { border: number; mat: number; depth: number; material: THREE.Material; inner?: THREE.Material }> = {
  gold: { border: 0.1, mat: 0.12, depth: 0.08, material: materials.gold },
  rose: { border: 0.065, mat: 0.1, depth: 0.07, material: materials.roseGold },
  ivory: { border: 0.075, mat: 0.14, depth: 0.07, material: materials.ivoryFrame, inner: materials.gold },
  ornate: { border: 0.17, mat: 0.13, depth: 0.1, material: materials.gold, inner: materials.roseGold },
}

const glowColor = new THREE.Color('#ffb3c9')

export function PhotoFrame({ memory, index }: { memory: Memory; index: number }) {
  const [w, h] = memory.size
  const style = STYLES[memory.frame ?? 'gold']
  const fit = memory.fit ?? 'cover'
  const photo = usePhotoTexture(memory.image, memory.title, w / h, fit)
  const near = useGameStore((s) => s.nearby?.id === memory.id)
  const viewed = useGameStore((s) => s.viewed.includes(memory.id))
  const glow = useRef<THREE.MeshBasicMaterial>(null!)

  useFrame((state, dt) => {
    const target = near ? 0.55 + Math.sin(state.clock.elapsedTime * 3) * 0.15 : 0
    glow.current.opacity = damp(glow.current.opacity, target, 6, dt)
    glow.current.visible = glow.current.opacity > 0.01
  })

  // Photo plane size (letterboxed inside the mat when fit = contain)
  let pw = w
  let ph = h
  if (fit === 'contain' && photo) {
    if (photo.aspect > w / h) ph = w / photo.aspect
    else pw = h * photo.aspect
  }

  const FW = w + 2 * (style.mat + style.border)
  const FH = h + 2 * (style.mat + style.border)
  const front = style.depth + (style.inner ? 0.03 : 0) + 0.004
  const barLen = Math.min(FW * 0.55, 1.2)

  return (
    <group position={memory.position} rotation={memory.rotation}>
      {/* Warm wall-wash from the picture light */}
      <mesh position={[0, FH * 0.14, 0.003]}>
        <planeGeometry args={[FW * 1.7, FH * 1.45]} />
        <meshBasicMaterial map={lightPoolTexture()} transparent opacity={0.6} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      {/* Proximity glow */}
      <mesh position-z={0.006}>
        <planeGeometry args={[FW + 0.9, FH + 0.9]} />
        <meshBasicMaterial ref={glow} map={radialTexture()} color={glowColor} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Frame */}
      <mesh position-z={style.depth / 2} material={style.material}>
        <boxGeometry args={[FW, FH, style.depth]} />
      </mesh>
      {style.inner && (
        <mesh position-z={(style.depth + 0.03) / 2} material={style.inner}>
          <boxGeometry args={[FW - style.border * 1.1, FH - style.border * 1.1, style.depth + 0.03]} />
        </mesh>
      )}
      <mesh position-z={front} material={materials.photoMat}>
        <planeGeometry args={[w + style.mat * 2, h + style.mat * 2]} />
      </mesh>
      <mesh position-z={front + 0.002}>
        <planeGeometry args={[pw, ph]} />
        {/* Keyed so the material is rebuilt (not patched) once the photo arrives */}
        {photo ? (
          <meshBasicMaterial key="photo" map={photo.texture} color="#ffffff" toneMapped={false} />
        ) : (
          <meshBasicMaterial key="loading" color="#efe3ea" />
        )}
      </mesh>

      {/* Picture light */}
      <group position={[0, FH / 2 + 0.16, 0]}>
        <mesh position={[0, 0, 0.15]} rotation-x={Math.PI / 2} material={materials.brass}>
          <cylinderGeometry args={[0.014, 0.014, 0.3, 6]} />
        </mesh>
        <mesh position={[0, -0.02, 0.3]} rotation-z={Math.PI / 2} material={materials.brass}>
          <cylinderGeometry args={[0.035, 0.035, barLen, 12]} />
        </mesh>
        <mesh position={[0, -0.05, 0.3]} material={materials.bulb}>
          <boxGeometry args={[barLen * 0.9, 0.012, 0.03]} />
        </mesh>
      </group>

      {/* Museum label */}
      <group position={[(memory.labelSide === 'left' ? -1 : 1) * (FW / 2 + 0.34), -FH / 2 + 0.3, 0.012]}>
        <mesh material={materials.ivoryFrame}>
          <boxGeometry args={[0.52, 0.34, 0.02]} />
        </mesh>
        <Text
          font={fonts.sans}
          fontSize={0.032}
          color="#b58796"
          anchorX="left"
          anchorY="top"
          position={[-0.22, 0.13, 0.012]}
          letterSpacing={0.08}
        >
          {`No. ${String(index + 1).padStart(2, '0')}${memory.date ? `  ·  ${memory.date.toUpperCase()}` : ''}`}
        </Text>
        <Text
          font={fonts.serif}
          fontSize={0.05}
          maxWidth={0.44}
          lineHeight={1.1}
          color="#6f4a57"
          anchorX="left"
          anchorY="top"
          position={[-0.22, 0.08, 0.012]}
        >
          {memory.title}
        </Text>
        {/* Turns pink once the memory has been viewed */}
        <mesh position={[0.2, -0.12, 0.012]}>
          <circleGeometry args={[0.018, 16]} />
          <meshBasicMaterial color={viewed ? '#ef7f9d' : '#e3cfa3'} />
        </mesh>
      </group>
    </group>
  )
}
