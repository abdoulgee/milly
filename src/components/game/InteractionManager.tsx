import { useProximityDetection } from '../../hooks/useInteractions'

/** Runs proximity detection for photos & the cake inside the render loop. */
export function InteractionManager() {
  useProximityDetection()
  return null
}
