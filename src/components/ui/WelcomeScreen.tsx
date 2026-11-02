import { motion } from 'framer-motion'
import { museumConfig } from '../../data/museumConfig'
import { useGameStore } from '../../store/gameStore'
import { HeartIcon } from './icons'

const HEARTS = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 37) % 100,
  size: 10 + ((i * 7) % 14),
  delay: (i * 0.9) % 7,
  duration: 9 + ((i * 3) % 6),
}))

function tryFullscreen() {
  // Hides the browser bars on Android; harmless where unsupported (iOS).
  const el = document.documentElement
  if (!document.fullscreenElement && el.requestFullscreen && window.matchMedia('(pointer: coarse)').matches) {
    el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {})
  }
}

export function WelcomeScreen() {
  const ready = useGameStore((s) => s.sceneReady)
  const progress = useGameStore((s) => s.progress)
  const enter = useGameStore((s) => s.enter)

  const onEnter = () => {
    if (!ready) return
    tryFullscreen()
    enter()
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden px-6"
      style={{
        background:
          'radial-gradient(120% 80% at 20% 10%, #fde9ec 0%, transparent 60%), radial-gradient(90% 70% at 90% 90%, #e7dcf7 0%, transparent 60%), linear-gradient(160deg, #fbf1ea 0%, #f6dfe0 55%, #ebe0f4 100%)',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.06, filter: 'blur(8px)' }}
      transition={{ duration: 0.9, ease: 'easeInOut' }}
    >
      {/* Soft drifting light blobs */}
      {[
        { c: '#f7c6d3', x: '-10%', y: '-5%', s: 380 },
        { c: '#d9c9f3', x: '60%', y: '55%', s: 420 },
        { c: '#fde3c8', x: '55%', y: '-15%', s: 300 },
      ].map((b, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute rounded-full opacity-60 blur-3xl"
          style={{ background: b.c, width: b.s, height: b.s, left: b.x, top: b.y }}
          animate={{ x: [0, 30, -20, 0], y: [0, -25, 15, 0] }}
          transition={{ duration: 16 + i * 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Rising hearts */}
      {HEARTS.map((h, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute bottom-[-40px] text-petal/60"
          style={{ left: `${h.left}%` }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: '-110vh', opacity: [0, 0.8, 0.8, 0], x: [0, 14, -10, 6] }}
          transition={{ duration: h.duration, delay: h.delay, repeat: Infinity, ease: 'linear' }}
        >
          <HeartIcon filled width={h.size} height={h.size} strokeWidth={0} />
        </motion.div>
      ))}

      <motion.div
        className="relative flex max-w-md flex-col items-center text-center"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.18, delayChildren: 0.2 } } }}
      >
        {[
          <p key="k" className="mb-1 font-sans text-[11px] font-semibold tracking-[0.35em] text-rosegold uppercase">
            {museumConfig.subtitle}
          </p>,
          <h1 key="t" className="font-script text-[64px] leading-[1.05] text-rose drop-shadow-[0_2px_10px_rgba(255,255,255,0.8)] sm:text-[84px]">
            {museumConfig.title}
          </h1>,
          <div key="d" className="my-4 flex items-center gap-3 text-rosegold/70">
            <span className="h-px w-12 bg-current" />
            <HeartIcon filled width={12} height={12} strokeWidth={0} />
            <span className="h-px w-12 bg-current" />
          </div>,
          <p key="m" className="max-w-[22rem] font-serif text-[17px] leading-relaxed text-plum/85 italic">
            {museumConfig.welcomeMessage}
          </p>,
          <div key="b" className="mt-9 flex flex-col items-center gap-3">
            <motion.button
              onClick={onEnter}
              disabled={!ready}
              whileTap={{ scale: 0.96 }}
              whileHover={{ scale: ready ? 1.03 : 1 }}
              className="btn-rose relative min-w-[230px] cursor-pointer overflow-hidden rounded-full px-10 py-4 font-sans text-[17px] font-bold tracking-wide transition-opacity disabled:cursor-wait disabled:opacity-80"
            >
              {ready && (
                <motion.span
                  className="pointer-events-none absolute inset-y-0 -left-1/2 w-1/3 skew-x-[-20deg] bg-white/30"
                  animate={{ left: ['-50%', '150%'] }}
                  transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.4, ease: 'easeInOut' }}
                />
              )}
              {ready ? museumConfig.enterLabel : `Preparing the museum… ${Math.round(progress)}%`}
            </motion.button>
            <p className="font-sans text-xs text-plum/55">Best with sound on · turn your phone however you like</p>
          </div>,
        ].map((child, i) => (
          <motion.div
            key={i}
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: 'easeOut' } } }}
          >
            {child}
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
