/**
 * Fabric prints for the stylised characters, drawn on <canvas> once and
 * cached: her Ankara dress, hijab lace, his kaftan weave and cap embroidery.
 */
import * as THREE from 'three'

const cache = new Map<string, THREE.CanvasTexture>()

function make(key: string, size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, repeat: [number, number]) {
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = c.height = size
  draw(c.getContext('2d')!, size)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(...repeat)
  tex.anisotropy = 4
  cache.set(key, tex)
  return tex
}

function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

/** Gold/cream pinstripes with big red starbursts and navy hearts (photo-012). */
export function ankaraTexture(base: string, print: string, centre: string) {
  return make(`ankara${base}${print}${centre}`, 512, (g, s) => {
    g.fillStyle = base
    g.fillRect(0, 0, s, s)
    // Thin multicolour pinstripes
    const stripes = ['#f5d58a', '#c98a2e', '#f2e6c4', '#b5562d', '#7d5aa8']
    for (let x = 0; x < s; x += 9) {
      g.fillStyle = stripes[(x / 9) % stripes.length]
      g.globalAlpha = 0.28
      g.fillRect(x, 0, 2, s)
    }
    g.globalAlpha = 1
    const r = rng(11)
    const burst = (cx: number, cy: number, R: number) => {
      g.save()
      g.translate(cx, cy)
      g.rotate(r() * Math.PI)
      g.fillStyle = print
      g.beginPath()
      const n = 9
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * Math.PI * 2
        const rr = i % 2 ? R * 0.32 : R * (0.85 + r() * 0.25)
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
      }
      g.closePath()
      g.fill()
      g.fillStyle = centre
      g.beginPath()
      g.arc(0, 0, R * 0.22, 0, Math.PI * 2)
      g.fill()
      g.restore()
    }
    // Two staggered rows, wrapped so the texture tiles seamlessly
    for (const [cx, cy] of [
      [s * 0.25, s * 0.25],
      [s * 0.75, s * 0.75],
      [s * 0.78, s * 0.2],
      [s * 0.22, s * 0.72],
    ]) {
      const R = s * 0.17
      for (const ox of [-s, 0, s]) for (const oy of [-s, 0, s]) burst(cx + ox, cy + oy, R)
    }
  }, [3, 2])
}

/** Soft white with a faint lavender lace-dot pattern. */
export function laceTexture(base: string, dots: string) {
  return make(`lace${base}${dots}`, 256, (g, s) => {
    g.fillStyle = base
    g.fillRect(0, 0, s, s)
    g.fillStyle = dots
    for (let y = 8; y < s; y += 16) {
      for (let x = (y / 16) % 2 ? 8 : 0; x < s; x += 16) {
        g.globalAlpha = 0.45
        g.beginPath()
        g.arc(x, y, 1.8, 0, Math.PI * 2)
        g.fill()
      }
    }
    g.globalAlpha = 1
  }, [4, 3])
}

/** Fine self-stripe weave for the kaftan. */
export function weaveTexture(base: string, stripe: string) {
  return make(`weave${base}${stripe}`, 256, (g, s) => {
    g.fillStyle = base
    g.fillRect(0, 0, s, s)
    g.fillStyle = stripe
    g.globalAlpha = 0.35
    for (let x = 0; x < s; x += 6) g.fillRect(x, 0, 2, s)
    g.globalAlpha = 1
  }, [6, 3])
}

/** Hula cap embroidery: rows of white zig-zags and diamonds on navy. */
export function capTexture(base: string, thread: string) {
  return make(`cap${base}${thread}`, 256, (g, s) => {
    g.fillStyle = base
    g.fillRect(0, 0, s, s)
    g.strokeStyle = thread
    g.fillStyle = thread
    g.lineWidth = 3
    const rows = 5
    const h = s / rows
    for (let row = 0; row < rows; row++) {
      const y = row * h + h / 2
      if (row % 2 === 0) {
        g.beginPath()
        for (let x = 0; x <= s; x += 16) g.lineTo(x, y + ((x / 16) % 2 ? -h * 0.28 : h * 0.28))
        g.stroke()
      } else {
        for (let x = 8; x < s; x += 32) {
          g.beginPath()
          g.moveTo(x, y - h * 0.3)
          g.lineTo(x + 8, y)
          g.lineTo(x, y + h * 0.3)
          g.lineTo(x - 8, y)
          g.closePath()
          g.fill()
        }
      }
    }
  }, [3, 1])
}
