/**
 * In-game HUD: camera drag layer, joystick (touch), guidance text,
 * memory counter, recenter / sound / pause buttons and the interaction
 * button. Everything stays at the screen edges so the scene stays visible.
 */
import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { memories } from '../../data/memories'
import { museumConfig } from '../../data/museumConfig'
import { useCameraGestures } from '../../hooks/useCameraControls'
import { useIsTouch } from '../../hooks/useIsTouch'
import { useKeyboardControls } from '../../hooks/usePlayerControls'
import { useGameStore } from '../../store/gameStore'
import { runtime } from '../../store/runtime'
import { HeartIcon, PauseIcon, RecenterIcon, SoundOffIcon, SoundOnIcon } from './icons'
import { InteractionButton } from './InteractionButton'
import { VirtualJoystick } from './VirtualJoystick'

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <motion.button
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.88 }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      className="glass pointer-events-auto flex h-12 w-12 cursor-pointer items-center justify-center rounded-full text-plum"
    >
      {children}
    </motion.button>
  )
}

function useGuidance(isTouch: boolean): string {
  const hasMoved = useGameStore((s) => s.hasMoved)
  const viewed = useGameStore((s) => s.viewed.length)
  const celebration = useGameStore((s) => s.celebration)
  if (celebration === 'done') return `Happy birthday, my ${museumConfig.birthday.nickname} ♡`
  if (!hasMoved) return isTouch ? 'Use the joystick to walk · swipe to look around' : 'WASD to walk · drag to look · E to interact'
  if (viewed === 0) return 'Walk up to a photo to relive the memory'
  if (viewed >= Math.min(6, memories.length)) return 'Something sweet is waiting at the end of the hall…'
  return 'Keep exploring — every frame holds a memory'
}

export function GameControls() {
  const isTouch = useIsTouch()
  useKeyboardControls(true)
  const gestures = useCameraGestures()
  const muted = useGameStore((s) => s.muted)
  const toggleMute = useGameStore((s) => s.toggleMute)
  const setPaused = useGameStore((s) => s.setPaused)
  const viewed = useGameStore((s) => s.viewed.length)
  const guidance = useGuidance(isTouch)

  return (
    <motion.div
      className="fixed inset-0 z-20 touch-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8, delay: 1.2 }}
    >
      {/* Camera: drag anywhere that isn't a control */}
      <div className="absolute inset-0 touch-none" {...gestures} />

      {isTouch && <VirtualJoystick />}

      {/* Top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 safe-top px-4">
        <div className="flex min-w-0 flex-col items-start gap-2">
          <div className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 font-sans text-[13px] font-bold text-rose">
            <HeartIcon filled width={14} height={14} strokeWidth={0} />
            {viewed} / {memories.length}
            <span className="font-semibold text-plum/60">memories</span>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={guidance}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.4 }}
              className="glass max-w-[70vw] rounded-2xl px-3.5 py-2 font-serif text-[13.5px] leading-snug text-plum/90 italic sm:max-w-sm"
            >
              {guidance}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex shrink-0 gap-2">
          <RoundButton label="Recenter camera" onClick={() => (runtime.camera.recenter = true)}>
            <RecenterIcon />
          </RoundButton>
          <RoundButton label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>
            {muted ? <SoundOffIcon /> : <SoundOnIcon />}
          </RoundButton>
          <RoundButton label="Pause" onClick={() => setPaused(true)}>
            <PauseIcon />
          </RoundButton>
        </div>
      </div>

      <InteractionButton showKeyHint={!isTouch} />
    </motion.div>
  )
}
