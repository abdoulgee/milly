/**
 * The contract between movement controllers (player / companion) and
 * character visuals (procedural rig or GLB). Controllers write it every
 * frame; visuals read it to drive animation. This is what keeps models
 * swappable: a new GLB only needs to read `speed` and `turnRate`.
 */
export interface MotionState {
  /** Current ground speed (m/s) */
  speed: number
  /** Angular velocity around Y (rad/s, + = turning left) */
  turnRate: number
  /** Top speed of this character (m/s) */
  maxSpeed: number
  /** 0 = standing, 1 = seated (blended by the controller) */
  sit: number
  /** True while this character's speech bubble is showing */
  talking: boolean
  /** Where the head should turn, relative to the body (rad, + = left) */
  lookYaw: number
  /** 0..1 — standing at a photo, admiring it (hands clasped, looking up, smiling) */
  admire: number
}

export const createMotionState = (maxSpeed: number): MotionState => ({
  speed: 0,
  turnRate: 0,
  maxSpeed,
  sit: 0,
  talking: false,
  lookYaw: 0,
  admire: 0,
})
