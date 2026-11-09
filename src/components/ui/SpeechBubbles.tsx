/**
 * The speech bubble currently being said (one at a time), drawn as normal
 * DOM over the 3D canvas. Its screen position comes from the anchor above
 * the speaker's head (`runtime.bubbles`, written by the 3D SpeechBubble
 * anchors) and is updated every animation frame without re-rendering React.
 */
import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useChatStore } from '../../store/chatStore'
import { runtime, type Speaker } from '../../store/runtime'

const STYLE: Record<Speaker, { border: string; text: string; bg: string }> = {
  her: { border: '#f2a1ba', text: '#7b2f4d', bg: '#fff7fa' },
  him: { border: '#9fb6ee', text: '#22397a', bg: '#f6f8ff' },
}

/** Both characters' bubbles (only the current speaker's has a line). */
export function SpeechBubbles() {
  return (
    <>
      <SpeakerBubble who="her" />
      <SpeakerBubble who="him" />
    </>
  )
}

function SpeakerBubble({ who }: { who: Speaker }) {
  const line = useChatStore((s) => (s.line?.who === who ? s.line : null))
  const holder = useRef<HTMLDivElement>(null)

  // Follow the speaker's head every frame
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const el = holder.current
      if (el) {
        const b = runtime.bubbles[who]
        el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`
        el.style.visibility = b.visible ? 'visible' : 'hidden'
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [who])

  const c = STYLE[who]
  return (
    <div ref={holder} className="pointer-events-none fixed top-0 left-0 z-[15]" style={{ visibility: 'hidden' }}>
      <div style={{ transform: 'translate(-50%, -100%)' }}>
        <AnimatePresence>
          {line && (
            <motion.div
              key={line.key}
              initial={{ opacity: 0, scale: 0.4, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7, y: -6, transition: { duration: 0.18 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 22 }}
              className="relative w-max max-w-[210px] rounded-2xl px-3.5 py-2 text-center font-sans text-[14px] leading-snug font-semibold shadow-lg select-none"
              style={{ background: c.bg, color: c.text, border: `2px solid ${c.border}`, transformOrigin: '50% 100%' }}
            >
              {line.text}
              <span
                className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45"
                style={{ bottom: -7, background: c.bg, borderRight: `2px solid ${c.border}`, borderBottom: `2px solid ${c.border}` }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
