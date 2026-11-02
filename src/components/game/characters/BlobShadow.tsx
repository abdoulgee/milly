import { radialTexture } from '../../../lib/textures'

/** Cheap soft contact shadow — avoids real-time shadow maps on mobile. */
export function BlobShadow({ size = 0.9, opacity = 0.32 }: { size?: number; opacity?: number }) {
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.012} renderOrder={1}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={radialTexture()} color="#6b4a52" transparent opacity={opacity} depthWrite={false} />
    </mesh>
  )
}
