/**
 * Mobile-adventure style third-person camera.
 *
 * - Orbits the player (yaw / pitch / distance) driven by touch & mouse.
 * - Smoothly follows, biased slightly towards the companion so both stay in
 *   view.
 * - Never goes through walls, ceiling, or tall objects (shortens its boom).
 * - "Recenter" swings it back behind her.
 * - Plays a short cinematic fly-in each time the museum is entered.
 * - Widens the field of view in portrait orientation.
 */
import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { clamp, damp, dampAngle, easeInOutCubic, angleDelta } from '../../lib/math'
import { runtime } from '../../store/runtime'
import { cameraRayLimit } from './MuseumLayout'

const ROTATE_SPEED = 0.0065 // radians per pixel dragged
const PITCH_MIN = 0.05
const PITCH_MAX = 1.15
const DIST_MIN = 2.2
const DIST_MAX = 8.5
const INTRO_SECONDS = 3.6

const focus = new THREE.Vector3()
const desiredFocus = new THREE.Vector3()
const dir = new THREE.Vector3()
const followPos = new THREE.Vector3()
const introPos = new THREE.Vector3(0, 5.4, 21.4)
const introLook = new THREE.Vector3(0, 2.2, 6)
const lookAt = new THREE.Vector3()

export function ThirdPersonCamera() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const initialised = useRef(false)

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05)
    const c = runtime.camera
    const look = runtime.input.look
    const p = runtime.player

    // ── Input ──
    if (look.dx || look.dy) c.recenter = false
    c.yaw -= look.dx * ROTATE_SPEED
    c.pitch = clamp(c.pitch + look.dy * ROTATE_SPEED * 0.8, PITCH_MIN, PITCH_MAX)
    c.targetDistance = clamp(c.targetDistance * (1 + look.zoom), DIST_MIN, DIST_MAX)
    look.dx = look.dy = look.zoom = 0

    if (c.recenter) {
      const behind = p.yaw + Math.PI
      c.yaw = dampAngle(c.yaw, behind, 7, dt)
      c.pitch = damp(c.pitch, 0.36, 5, dt)
      if (Math.abs(angleDelta(c.yaw, behind)) < 0.01) c.recenter = false
    }

    // ── Focus point: her upper body, nudged towards him ──
    const comp = runtime.companion.position
    desiredFocus.set(p.position.x * 0.82 + comp.x * 0.18, 1.3, p.position.z * 0.82 + comp.z * 0.18)
    if (!initialised.current || c.intro === 0) {
      focus.copy(desiredFocus)
      initialised.current = true
    }
    focus.x = damp(focus.x, desiredFocus.x, 9, dt)
    focus.y = damp(focus.y, desiredFocus.y, 9, dt)
    focus.z = damp(focus.z, desiredFocus.z, 9, dt)

    // ── Boom with collision ──
    const cp = Math.cos(c.pitch)
    dir.set(Math.sin(c.yaw) * cp, Math.sin(c.pitch), Math.cos(c.yaw) * cp)
    const limit = Math.min(c.targetDistance, cameraRayLimit(focus, dir, c.targetDistance))
    // Pull in quickly when blocked, ease back out gently
    c.distance = damp(c.distance, limit, limit < c.distance ? 20 : 3, dt)
    followPos.copy(focus).addScaledVector(dir, c.distance)

    // ── Entrance fly-in ──
    if (c.intro < 1) {
      c.intro = Math.min(1, c.intro + dt / INTRO_SECONDS)
      const e = easeInOutCubic(c.intro)
      camera.position.lerpVectors(introPos, followPos, e)
      lookAt.lerpVectors(introLook, focus, e)
      camera.lookAt(lookAt)
    } else {
      camera.position.copy(followPos)
      camera.lookAt(focus)
    }

    // ── Portrait-friendly field of view ──
    const fov = camera.aspect < 1 ? 64 : 50
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = damp(camera.fov, fov, 6, dt)
      camera.updateProjectionMatrix()
    }
  })

  return null
}
