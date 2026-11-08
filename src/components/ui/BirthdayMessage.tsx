/**
 * The final birthday letter, shown after the candles are blown out.
 * Text comes from `museumConfig.birthday`.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { museumConfig } from '../../data/museumConfig'
import { useGameStore } from '../../store/gameStore'
import { HeartIcon } from './icons'

const PIECES = Array.from({ length: 36 }, (_, i) => ({
  left: (i * 29) % 100,
  delay: (i % 12) * 0.35,
  dur: 6 + (i % 5),
  color: ['#f6a5bb', '#e3cff7', '#f3c98b', '#ffffff', '#f9c6d3'][i % 5],
  heart: i % 3 === 0,
  size: 8 + (i % 4) * 4,
}))

export function BirthdayMessage() {
  const open = useGameStore((s) => s.celebration === 'message')
  const close = useGameStore((s) => s.closeBirthdayMessage)
  const b = museumConfig.birthday

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center overflow-hidden p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div
            className="absolute inset-0 backdrop-blur-[6px]"
            style={{ background: 'radial-gradient(80% 60% at 50% 40%, rgba(255,240,244,0.75), rgba(214,170,200,0.55))' }}
          />
          {/* Falling confetti & hearts */}
          {PIECES.map((p, i) => (
            <motion.div
              key={i}
              className="pointer-events-none absolute top-[-30px]"
              style={{ left: `${p.left}%`, color: p.color }}
              initial={{ y: 0, rotate: 0, opacity: 0 }}
              animate={{ y: '110vh', rotate: 360 * (i % 2 ? 1 : -1), opacity: [0, 1, 1, 0.6], x: [0, 18, -14, 8] }}
              transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'linear' }}
            >
              {p.heart ? (
                <HeartIcon filled width={p.size + 6} height={p.size + 6} strokeWidth={0} />
              ) : (
                <span className="block rounded-[2px]" style={{ width: p.size * 0.6, height: p.size, background: p.color }} />
              )}
            </motion.div>
          ))}

          <motion.div
            className="glass relative max-h-full w-full max-w-lg overflow-y-auto rounded-[32px] px-7 py-8 text-center sm:px-10"
            initial={{ scale: 0.85, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 20, delay: 0.2 }}
          >
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.45, delayChildren: 0.6 } } }}
            >
              {[
                <h2 key="h" className="font-script text-[58px] leading-none text-rose sm:text-7xl">
                  {b.messageTitle}
                </h2>,
                <p key="n" className="mt-1 font-script text-4xl text-rosegold">
                  my {b.nickname}
                </p>,
                <div key="d" className="my-5 flex items-center justify-center gap-3 text-rosegold/70">
                  <span className="h-px w-14 bg-current" />
                  <HeartIcon filled width={14} height={14} strokeWidth={0} />
                  <span className="h-px w-14 bg-current" />
                </div>,
                ...b.messageParagraphs.map((para, i) => (
                  <p key={`p${i}`} className="mx-auto mb-4 max-w-sm font-serif text-[16.5px] leading-relaxed text-plum/90">
                    {para}
                  </p>
                )),
                <p key="s" className="mt-2 font-script text-4xl text-rose">
                  {b.signature}
                </p>,
                <motion.button
                  key="c"
                  whileTap={{ scale: 0.96 }}
                  onClick={close}
                  className="btn-rose mt-7 cursor-pointer rounded-full px-9 py-3.5 font-sans text-[16px] font-bold"
                >
                  Keep exploring ♡
                </motion.button>,
              ].map((child, i) => (
                <motion.div
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
                    show: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.9, ease: 'easeOut' } },
                  }}
                >
                  {child}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
