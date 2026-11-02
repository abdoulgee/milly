import { AnimatePresence } from 'framer-motion'
import { lazy, Suspense } from 'react'
import { BirthdayMessage } from './components/ui/BirthdayMessage'
import { GameControls } from './components/ui/GameControls'
import { PauseMenu } from './components/ui/PauseMenu'
import { PhotoViewer } from './components/ui/PhotoViewer'
import { WelcomeScreen } from './components/ui/WelcomeScreen'
import { useGameStore } from './store/gameStore'

// The 3D scene is code-split so the welcome screen appears immediately.
const MuseumScene = lazy(() => import('./components/game/MuseumScene'))

export default function App() {
  const phase = useGameStore((s) => s.phase)
  return (
    <div className="fixed inset-0 overflow-hidden bg-[#f3e3dc]">
      <Suspense fallback={null}>
        <MuseumScene />
      </Suspense>
      <AnimatePresence>{phase === 'playing' && <GameControls key="controls" />}</AnimatePresence>
      <PhotoViewer />
      <PauseMenu />
      <BirthdayMessage />
      <AnimatePresence>{phase === 'welcome' && <WelcomeScreen key="welcome" />}</AnimatePresence>
    </div>
  )
}
