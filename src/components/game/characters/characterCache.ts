/**
 * Sculpted character meshes, generated once per appearance in a Web Worker
 * (falls back to the main thread if workers are unavailable) and cached.
 * `readCharacter` is Suspense-friendly: it throws the pending promise.
 */
import type { ProceduralAppearance } from '../../../data/museumConfig'
import type { PartArrays } from '../../../lib/sdf'

interface Entry {
  promise: Promise<PartArrays[]>
  data?: PartArrays[]
}

const cache = new Map<string, Entry>()
const pending = new Map<number, (parts: PartArrays[] | null) => void>()
let worker: Worker | null | undefined
let nextId = 0

function getWorker(): Worker | null {
  if (worker !== undefined) return worker
  try {
    worker = new Worker(new URL('./sculpt.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent) => {
      const { id, parts, error } = e.data
      pending.get(id)?.(error ? null : parts)
      pending.delete(id)
    }
    worker.onerror = () => {
      for (const resolve of pending.values()) resolve(null)
      pending.clear()
      worker = null
    }
  } catch {
    worker = null
  }
  return worker
}

async function sculptHere(ap: ProceduralAppearance) {
  const { sculptGeometry } = await import('./sculpt')
  return sculptGeometry(ap)
}

export function loadCharacter(ap: ProceduralAppearance): Promise<PartArrays[]> {
  const key = JSON.stringify(ap)
  const hit = cache.get(key)
  if (hit) return hit.promise
  const w = getWorker()
  const fromWorker = w
    ? new Promise<PartArrays[] | null>((resolve) => {
        const id = nextId++
        pending.set(id, resolve)
        w.postMessage({ id, ap })
      })
    : Promise.resolve(null)
  const entry: Entry = {
    promise: fromWorker
      .then((parts) => parts ?? sculptHere(ap))
      .then((parts) => {
        entry.data = parts
        return parts
      }),
  }
  cache.set(key, entry)
  return entry.promise
}

export function readCharacter(ap: ProceduralAppearance): PartArrays[] {
  loadCharacter(ap)
  const entry = cache.get(JSON.stringify(ap))!
  if (entry.data) return entry.data
  throw entry.promise
}
