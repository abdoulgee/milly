/** Sculpts characters off the main thread so the page never freezes. */
import { sculptGeometry } from './sculpt'

const ctx = self as unknown as Worker

ctx.onmessage = (e: MessageEvent) => {
  const { id, ap } = e.data
  try {
    const parts = sculptGeometry(ap)
    const transfer = parts.flatMap((p) => [p.position.buffer, p.normal.buffer, p.color.buffer, p.skinIndex.buffer, p.skinWeight.buffer, p.index.buffer])
    ctx.postMessage({ id, parts }, transfer as Transferable[])
  } catch (err) {
    ctx.postMessage({ id, error: String(err) })
  }
}
