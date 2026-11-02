/**
 * Full-screen memory viewer: large photo, title, date and caption, with
 * previous / next browsing. Opens from a frame and returns to the museum
 * on close (button, backdrop tap, Esc or E).
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { memories } from '../../data/memories'
import { assetUrl } from '../../lib/assets'
import { useGameStore } from '../../store/gameStore'
import { ChevronIcon, CloseIcon, HeartIcon } from './icons'

function Photo({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [src])
  if (failed) {
    return (
      <div className="flex aspect-[4/5] w-[min(70vw,360px)] flex-col items-center justify-center rounded-xl bg-gradient-to-br from-blush to-lavender text-center text-plum/70">
        <HeartIcon filled width={36} height={36} strokeWidth={0} className="mb-3 text-petal" />
        <p className="font-serif text-lg">{title}</p>
        <p className="text-sm">photo coming soon</p>
      </div>
    )
  }
  return (
    <img
      src={assetUrl(src)}
      alt={title}
      onError={() => setFailed(true)}
      draggable={false}
      className="block max-h-[52dvh] w-auto max-w-full rounded-xl object-contain shadow-[0_12px_40px_rgba(110,60,80,0.25)] landscape:max-h-[72dvh] landscape:max-w-[55vw]"
    />
  )
}

export function PhotoViewer() {
  const id = useGameStore((s) => s.viewingMemoryId)
  const close = useGameStore((s) => s.closeMemory)
  const open = useGameStore((s) => s.openMemory)
  const index = memories.findIndex((m) => m.id === id)
  const memory = index >= 0 ? memories[index] : null

  const go = (d: number) => open(memories[(index + d + memories.length) % memories.length].id)

  return (
    <AnimatePresence>
      {memory && (
        <motion.div
          key="viewer"
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="absolute inset-0 bg-[#5a3a47]/35 backdrop-blur-md" onClick={close} />
          <motion.div
            className="glass relative flex max-h-full w-full max-w-4xl flex-col items-center gap-4 overflow-y-auto rounded-[28px] p-4 pt-5 sm:p-6 landscape:flex-row landscape:items-center landscape:gap-7"
            initial={{ scale: 0.9, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 20, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            <button
              aria-label="Close"
              onClick={close}
              className="absolute top-3 right-3 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/80 text-plum shadow-md"
            >
              <CloseIcon />
            </button>

            <AnimatePresence mode="wait">
              <motion.div
                key={memory.id}
                className="flex w-full flex-col items-center gap-4 landscape:flex-row landscape:gap-7"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.28 }}
              >
                <div className="flex shrink-0 justify-center rounded-2xl bg-white p-2.5 shadow-inner">
                  <Photo src={memory.image} title={memory.title} />
                </div>
                <div className="flex max-w-md flex-col items-center px-2 text-center landscape:items-start landscape:text-left">
                  <p className="font-sans text-[11px] font-bold tracking-[0.3em] text-rosegold uppercase">
                    No. {String(index + 1).padStart(2, '0')}
                    {memory.date ? ` · ${memory.date}` : ''}
                  </p>
                  <h2 className="mt-1.5 font-serif text-[26px] leading-tight text-plum sm:text-3xl">{memory.title}</h2>
                  <p className="mt-3 font-sans text-[15.5px] leading-relaxed text-plum/80">{memory.caption}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center gap-3 landscape:absolute landscape:right-5 landscape:bottom-5">
              <button aria-label="Previous memory" onClick={() => go(-1)} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/80 text-plum shadow">
                <ChevronIcon dir="left" />
              </button>
              <span className="min-w-14 text-center font-sans text-sm font-semibold text-plum/60">
                {index + 1} / {memories.length}
              </span>
              <button aria-label="Next memory" onClick={() => go(1)} className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full bg-white/80 text-plum shadow">
                <ChevronIcon />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
