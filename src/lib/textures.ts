/**
 * Procedurally generated textures (drawn on <canvas> at startup).
 * No image downloads needed for the environment, and each texture is
 * created once and cached.
 */
import * as THREE from 'three'

const cache = new Map<string, THREE.Texture>()

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, srgb = true) {
  const hit = cache.get(key)
  if (hit) return hit
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  draw(g, w, h)
  const tex = new THREE.CanvasTexture(c)
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  cache.set(key, tex)
  return tex
}

/** Seeded RNG so textures look identical on every load */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

/** Cream marble floor: 2×2 tiles per texture repeat, faint veins, gold grout. */
export function marbleTexture() {
  return make('marble', 1024, 1024, (g, w, h) => {
    const r = rng(7)
    const tile = w / 2
    for (let ty = 0; ty < 2; ty++) {
      for (let tx = 0; tx < 2; tx++) {
        const tone = 244 + Math.floor(r() * 8)
        const grad = g.createLinearGradient(tx * tile, ty * tile, (tx + 1) * tile, (ty + 1) * tile)
        grad.addColorStop(0, `rgb(${tone + 3},${tone - 3},${tone - 9})`)
        grad.addColorStop(1, `rgb(${tone - 2},${tone - 9},${tone - 14})`)
        g.fillStyle = grad
        g.fillRect(tx * tile, ty * tile, tile, tile)
        // veins
        g.save()
        g.beginPath()
        g.rect(tx * tile, ty * tile, tile, tile)
        g.clip()
        for (let v = 0; v < 5; v++) {
          g.strokeStyle = `rgba(${200 + r() * 30},${170 + r() * 30},${170 + r() * 30},${0.12 + r() * 0.18})`
          g.lineWidth = 0.6 + r() * 2.2
          g.beginPath()
          let x = tx * tile + r() * tile
          let y = ty * tile
          g.moveTo(x, y)
          for (let s = 0; s < 8; s++) {
            const nx = x + (r() - 0.35) * tile * 0.35
            const ny = y + tile / 7
            g.quadraticCurveTo(x + (r() - 0.5) * 60, (y + ny) / 2, nx, ny)
            x = nx
            y = ny
          }
          g.stroke()
        }
        g.restore()
      }
    }
    // grout
    g.strokeStyle = 'rgba(205,170,120,0.55)'
    g.lineWidth = 3
    for (let i = 0; i <= 2; i++) {
      g.beginPath()
      g.moveTo(i * tile, 0)
      g.lineTo(i * tile, h)
      g.moveTo(0, i * tile)
      g.lineTo(w, i * tile)
      g.stroke()
    }
  })
}

/** Soft radial gradient (white centre → transparent). Used for glows & shadows. */
export function radialTexture() {
  return make('radial', 128, 128, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.45, 'rgba(255,255,255,0.45)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
  })
}

/** Wall-wash cone for picture lights (bright at the top, fading down). */
export function lightPoolTexture() {
  return make('lightpool', 256, 256, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h * 0.05, 4, w / 2, h * 0.3, h * 0.75)
    grad.addColorStop(0, 'rgba(255,240,215,0.95)')
    grad.addColorStop(0.4, 'rgba(255,225,200,0.4)')
    grad.addColorStop(1, 'rgba(255,220,200,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
  })
}

/** Long carpet runner: blush field, rose-gold border, subtle diamond pattern. */
export function runnerTexture() {
  const tex = make('runner', 256, 512, (g, w, h) => {
    g.fillStyle = '#e8b4be'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(255,240,240,0.35)'
    g.lineWidth = 2
    for (let y = -w; y < h + w; y += 64) {
      g.beginPath()
      g.moveTo(40, y)
      g.lineTo(w - 40, y + (w - 80))
      g.moveTo(w - 40, y)
      g.lineTo(40, y + (w - 80))
      g.stroke()
    }
    g.fillStyle = '#d2939f'
    g.fillRect(0, 0, 26, h)
    g.fillRect(w - 26, 0, 26, h)
    g.fillStyle = '#ecd2a6'
    g.fillRect(26, 0, 6, h)
    g.fillRect(w - 32, 0, 6, h)
  })
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** Round rug with concentric rings. */
export function roundRugTexture(key: string, base: string, ring: string, inner: string) {
  return make(`rug-${key}`, 512, 512, (g, w) => {
    const c = w / 2
    g.clearRect(0, 0, w, w)
    const disc = (r: number, color: string) => {
      g.fillStyle = color
      g.beginPath()
      g.arc(c, c, r, 0, Math.PI * 2)
      g.fill()
    }
    disc(c, ring)
    disc(c - 18, base)
    disc(c - 60, ring)
    disc(c - 68, base)
    disc(c * 0.42, inner)
    g.strokeStyle = 'rgba(255,255,255,0.35)'
    g.lineWidth = 3
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2
      g.beginPath()
      g.moveTo(c + Math.cos(a) * c * 0.48, c + Math.sin(a) * c * 0.48)
      g.lineTo(c + Math.cos(a) * (c - 80), c + Math.sin(a) * (c - 80))
      g.stroke()
    }
  })
}

/** Dreamy sky gradient for the decorative arched window. */
export function skyTexture() {
  return make('sky', 256, 512, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#c9b8ef')
    grad.addColorStop(0.45, '#f6c7d6')
    grad.addColorStop(0.8, '#ffe2c8')
    grad.addColorStop(1, '#fff3e0')
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
    const r = rng(3)
    for (let i = 0; i < 9; i++) {
      const cx = r() * w
      const cy = h * 0.3 + r() * h * 0.45
      const cg = g.createRadialGradient(cx, cy, 0, cx, cy, 30 + r() * 50)
      cg.addColorStop(0, 'rgba(255,255,255,0.55)')
      cg.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = cg
      g.fillRect(0, 0, w, h)
    }
  })
}

/** Vertical streaks for falling fountain water (scrolled in the shader loop). */
export function waterStreakTexture() {
  const tex = make('water', 128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h)
    const r = rng(11)
    for (let i = 0; i < 40; i++) {
      const x = r() * w
      const y = r() * h
      const len = 20 + r() * 50
      const grad = g.createLinearGradient(x, y, x, y + len)
      grad.addColorStop(0, 'rgba(255,255,255,0)')
      grad.addColorStop(0.5, `rgba(255,255,255,${0.4 + r() * 0.5})`)
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      g.fillStyle = grad
      g.fillRect(x, y, 1.5 + r() * 2, len)
      g.fillRect(x, y - h, 1.5 + r() * 2, len)
    }
  })
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

/** Graceful fallback when a memory photo is missing. */
export function fallbackPhotoTexture(title: string) {
  return make(`fallback-${title}`, 512, 640, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h)
    grad.addColorStop(0, '#fbe3ea')
    grad.addColorStop(1, '#e6dcf7')
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#b07a92'
    g.textAlign = 'center'
    g.font = '600 34px Georgia, serif'
    g.fillText(title, w / 2, h / 2 - 8, w - 60)
    g.font = '22px sans-serif'
    g.fillStyle = '#c495aa'
    g.fillText('photo coming soon ♡', w / 2, h / 2 + 34)
  })
}
