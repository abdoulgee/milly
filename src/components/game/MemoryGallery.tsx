import { memories } from '../../data/memories'
import { PhotoFrame } from './PhotoFrame'

/** Hangs every memory from `data/memories.ts` on the walls. */
export function MemoryGallery() {
  return (
    <>
      {memories.map((m, i) => (
        <PhotoFrame key={m.id} memory={m} index={i} />
      ))}
    </>
  )
}
