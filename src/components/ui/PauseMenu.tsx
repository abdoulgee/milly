import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useIsTouch } from '../../hooks/useIsTouch'
import { useGameStore } from '../../store/gameStore'
import { SoundOffIcon, SoundOnIcon } from './icons'

function MenuButton({ onClick, children, primary }: { onClick: () => void; children: ReactNode; primary?: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-full py-3.5 font-sans text-[16px] font-bold ${
        primary ? 'btn-rose' : 'bg-white/80 text-plum shadow-sm'
      }`}
    >
      {children}
    </motion.button>
  )
}

export function PauseMenu() {
  const paused = useGameStore((s) => s.paused && s.phase === 'playing')
  const muted = useGameStore((s) => s.muted)
  const setPaused = useGameStore((s) => s.setPaused)
  const toggleMute = useGameStore((s) => s.toggleMute)
  const exit = useGameStore((s) => s.exitToWelcome)
  const isTouch = useIsTouch()

  return (
    <AnimatePresence>
      {paused && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-[#5a3a47]/30 backdrop-blur-sm" onClick={() => setPaused(false)} />
          <motion.div
            className="glass relative w-full max-w-xs rounded-[28px] p-6 text-center"
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            <h2 className="font-script text-5xl text-rose">Paused</h2>
            <div className="mt-5 flex flex-col gap-3">
              <MenuButton primary onClick={() => setPaused(false)}>
                Resume
              </MenuButton>
              <MenuButton onClick={toggleMute}>
                {muted ? <SoundOffIcon /> : <SoundOnIcon />}
                Sound: {muted ? 'Off' : 'On'}
              </MenuButton>
              <MenuButton onClick={exit}>Return to welcome screen</MenuButton>
            </div>
            <p className="mt-5 font-sans text-xs leading-relaxed text-plum/60">
              {isTouch
                ? 'Left thumb: walk with the joystick · Right thumb: swipe to look, pinch to zoom'
                : 'WASD / arrows: walk · Drag: look · Wheel: zoom · E: interact · R: recenter · Esc: pause'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
