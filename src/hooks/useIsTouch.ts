import { useEffect, useState } from 'react'

const query = '(pointer: coarse)'
// `?touch` in the URL forces the touch UI (handy for testing on desktop)
const detect = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia(query).matches || navigator.maxTouchPoints > 0 || new URLSearchParams(location.search).has('touch'))

/** True on phones/tablets (shows the joystick instead of keyboard hints). */
export function useIsTouch() {
  const [touch, setTouch] = useState(detect)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = () => setTouch(detect())
    mq.addEventListener('change', onChange)
    // A real touch anywhere also counts (e.g. touchscreen laptops)
    const onTouch = () => setTouch(true)
    window.addEventListener('touchstart', onTouch, { once: true })
    return () => {
      mq.removeEventListener('change', onChange)
      window.removeEventListener('touchstart', onTouch)
    }
  }, [])
  return touch
}
