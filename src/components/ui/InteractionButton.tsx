import { AnimatePresence, motion } from 'framer-motion'
import { triggerInteraction } from '../../hooks/useInteractions'
import { isInputBlocked, useGameStore } from '../../store/gameStore'
import { CakeIcon, EyeIcon, SeatIcon, StandIcon } from './icons'

/** Big contextual action button (bottom-right) shown near photos / the cake. */
export function InteractionButton({ showKeyHint }: { showKeyHint: boolean }) {
  const nearby = useGameStore((s) => s.nearby)
  const blocked = useGameStore((s) => isInputBlocked(s))
  const visible = nearby && !blocked

  return (
    <div className="pointer-events-none absolute right-0 bottom-0 z-20 safe-bottom pr-6">
      <AnimatePresence>
        {visible && (
          <motion.button
            key={nearby.id}
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 24 }}
            whileTap={{ scale: 0.92 }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={triggerInteraction}
            className="btn-rose pointer-events-auto mb-4 flex cursor-pointer items-center gap-3 rounded-full py-4 pr-7 pl-5 font-sans text-[16px] font-bold"
          >
            <motion.span
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/25"
              animate={{ scale: [1, 1.12, 1] }}
              transition={{ duration: 1.6, repeat: Infinity }}
            >
              {nearby.kind === 'cake' ? <CakeIcon /> : nearby.kind === 'bench' ? <SeatIcon /> : nearby.kind === 'stand' ? <StandIcon /> : <EyeIcon />}
            </motion.span>
            {nearby.label}
            {showKeyHint && <kbd className="ml-1 rounded-md bg-white/30 px-2 py-0.5 font-sans text-xs">E</kbd>}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
