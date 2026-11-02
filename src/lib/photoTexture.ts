/**
 * Loads memory photos as GPU textures.
 *
 * - Large phone photos are downscaled (max 1280px) before upload, keeping
 *   GPU memory low on mobile.
 * - Missing/broken images resolve to a pretty fallback instead of crashing.
 * - Results are cached per URL.
 */
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { assetUrl } from './assets'
import { fallbackPhotoTexture } from './textures'

const MAX_SIZE = 1280
const cache = new Map<string, Promise<{ texture: THREE.Texture; aspect: number }>>()

export function loadPhoto(url: string, fallbackTitle: string) {
  let p = cache.get(url)
  if (p) return p
  p = new Promise((resolve) => {
    const manager = THREE.DefaultLoadingManager
    manager.itemStart(url)
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      const scale = Math.min(1, MAX_SIZE / Math.max(img.naturalWidth, img.naturalHeight))
      let source: HTMLImageElement | HTMLCanvasElement = img
      if (scale < 1) {
        const c = document.createElement('canvas')
        c.width = Math.round(img.naturalWidth * scale)
        c.height = Math.round(img.naturalHeight * scale)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        source = c
      }
      const texture = new THREE.Texture(source)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = 4
      texture.needsUpdate = true
      manager.itemEnd(url)
      resolve({ texture, aspect: img.naturalWidth / img.naturalHeight })
    }
    img.onerror = () => {
      console.warn(`[museum] Could not load memory photo "${url}" — showing a placeholder.`)
      manager.itemEnd(url)
      resolve({ texture: fallbackPhotoTexture(fallbackTitle), aspect: 512 / 640 })
    }
    img.src = assetUrl(url)
  })
  cache.set(url, p)
  return p
}

/**
 * Returns a texture fitted to a frame of `frameAspect` (w/h), either cropped
 * to fill ("cover") or shown whole ("contain" — the caller sizes the plane
 * using the returned aspect). `null` while loading.
 */
export function usePhotoTexture(url: string, title: string, frameAspect: number, fit: 'cover' | 'contain' = 'cover') {
  const [tex, setTex] = useState<{ texture: THREE.Texture; aspect: number } | null>(null)
  useEffect(() => {
    let alive = true
    loadPhoto(url, title).then(({ texture, aspect }) => {
      if (!alive) return
      // Clone so the same image can be fitted differently in different frames
      const t = texture.clone()
      t.needsUpdate = true
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
      if (fit === 'cover') {
        if (aspect > frameAspect) {
          t.repeat.set(frameAspect / aspect, 1)
          t.offset.set((1 - t.repeat.x) / 2, 0)
        } else {
          t.repeat.set(1, aspect / frameAspect)
          t.offset.set(0, (1 - t.repeat.y) / 2)
        }
      }
      setTex({ texture: t, aspect })
    })
    return () => {
      alive = false
    }
  }, [url, title, frameAspect, fit])
  return tex
}
