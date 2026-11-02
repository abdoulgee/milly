/**
 * ─── YOUR MEMORIES ────────────────────────────────────────────────────────
 *
 * Every entry becomes a framed photo on the museum wall. To use your own:
 *
 *   1. Put your photo in `public/memories/` (e.g. `public/memories/beach.jpg`).
 *      JPG/PNG/WebP all work. Around 1600px on the long side is ideal —
 *      larger photos are automatically downscaled for the 3D scene.
 *   2. Change `image` to `/memories/beach.jpg`.
 *   3. Edit `title`, `caption` and `date`.
 *
 * Photos are cropped to fill their frame ("cover"). Change `size` to match a
 * photo's shape (portrait ≈ [1.5, 1.9], landscape ≈ [2.2, 1.5], square ≈
 * [1.7, 1.7]) or set `fit: 'contain'` to show the whole photo.
 *
 * Coordinates (metres): the hall runs from z = 22 (entrance) to z = -22
 * (birthday corner). The west wall is at x = -11, the east wall at x = 11.
 * `rotation` makes the frame face into the room.
 */

export type FrameStyle = 'gold' | 'rose' | 'ivory' | 'ornate'

export interface Memory {
  id: string
  /** Path inside /public, e.g. "/memories/photo-001.jpg" */
  image: string
  title: string
  caption: string
  /** Optional short date / label shown on the plaque and in the viewer */
  date?: string
  /** Centre of the frame in world space [x, y, z] */
  position: [number, number, number]
  /** Euler rotation [x, y, z] in radians */
  rotation: [number, number, number]
  /** Visible photo size [width, height] in metres (frame is added around it) */
  size: [number, number]
  frame?: FrameStyle
  fit?: 'cover' | 'contain'
  /** Which side of the frame the little museum label sits on (default 'right') */
  labelSide?: 'left' | 'right'
  /** Which part of the museum it belongs to (used for guidance text) */
  section: 'gallery' | 'special'
}

// Helpers so positions stay readable. Frames hang 4.5 cm off the wall.
const WEST_X = -10.955
const EAST_X = 10.955
/** Faces east, into the room (mount on the west wall) */
const ON_WEST_WALL: [number, number, number] = [0, Math.PI / 2, 0]
/** Faces west, into the room (mount on the east wall) */
const ON_EAST_WALL: [number, number, number] = [0, -Math.PI / 2, 0]

export const memories: Memory[] = [
  // ── Entrance: a hello before the arch ──
  {
    id: 'memory-001',
    image: '/memories/photo-001.jpg',
    title: 'That Smile',
    caption: 'The smile that started it all. Every time I see it, I fall for you all over again.',
    date: 'Chapter One',
    position: [WEST_X, 2.5, 15.5],
    rotation: ON_WEST_WALL,
    size: [1.5, 2.1],
    frame: 'gold',
    section: 'gallery',
  },
  {
    id: 'memory-002',
    image: '/memories/photo-002.jpg',
    title: 'Red Suits You',
    caption: 'You took a mirror selfie, but honestly, the mirror was the lucky one.',
    date: 'Chapter One',
    position: [EAST_X, 2.5, 15.5],
    rotation: ON_EAST_WALL,
    size: [1.25, 2.22],
    frame: 'gold',
    section: 'gallery',
  },

  // ── Main memories gallery (zig-zagging down the hall) ──
  {
    id: 'memory-012',
    image: '/memories/photo-012.jpg',
    title: 'Pure Grace',
    caption: 'Soft, calm and quietly beautiful, just like the way you love.',
    date: 'Chapter Two',
    position: [WEST_X, 2.5, 11],
    rotation: ON_WEST_WALL,
    size: [1.25, 2.22],
    frame: 'rose',
    section: 'gallery',
  },
  {
    id: 'memory-010',
    image: '/memories/photo-010.jpg',
    title: 'Friday, 5:40 PM',
    caption: 'Just an ordinary Friday evening, made unforgettable because it was you.',
    date: 'Chapter Two',
    position: [EAST_X, 2.5, 11],
    rotation: ON_EAST_WALL,
    size: [1.25, 2.22],
    frame: 'ivory',
    section: 'gallery',
  },
  {
    id: 'memory-007',
    image: '/memories/photo-007.jpg',
    title: 'Peace & Love',
    caption: 'Henna on your hands, sunset behind you, and that playful look I adore.',
    date: 'Chapter Three',
    position: [WEST_X, 2.45, 6.5],
    rotation: ON_WEST_WALL,
    size: [1.6, 2.05],
    frame: 'ivory',
    section: 'gallery',
  },
  {
    id: 'memory-008',
    image: '/memories/photo-008.jpg',
    title: 'My Future Nurse',
    caption: 'The white coat looks perfect on you. I am so proud of everything you are becoming.',
    date: 'Chapter Three',
    position: [EAST_X, 2.5, 6.5],
    rotation: ON_EAST_WALL,
    size: [1.25, 2.22],
    frame: 'gold',
    section: 'gallery',
  },
  {
    id: 'memory-004',
    image: '/memories/photo-004.jpg',
    title: 'Sun-Kissed',
    caption: 'Eyes closed, face to the sun, wrapped in flowers. You make every day brighter.',
    date: 'Chapter Four',
    position: [WEST_X, 2.55, 2],
    rotation: ON_WEST_WALL,
    size: [1.05, 2.33],
    frame: 'rose',
    section: 'gallery',
  },
  {
    id: 'memory-014',
    image: '/memories/photo-014.jpg',
    title: 'Blue Skies',
    caption: 'Blue skies, green trees, and the prettiest view of all right in the middle.',
    date: 'Chapter Four',
    position: [EAST_X, 2.5, 2],
    rotation: ON_EAST_WALL,
    size: [1.25, 2.22],
    frame: 'gold',
    section: 'gallery',
  },
  {
    id: 'memory-009',
    image: '/memories/photo-009.jpg',
    title: 'Too Cool',
    caption: 'Sunglasses on, attitude on. Nobody does it like you.',
    date: 'Chapter Five',
    position: [WEST_X, 2.5, -2.5],
    rotation: ON_WEST_WALL,
    size: [1.25, 2.22],
    frame: 'gold',
    section: 'gallery',
  },
  {
    id: 'memory-011',
    image: '/memories/photo-011.jpg',
    title: 'Cake Day',
    caption: 'Shades, a cake and that confident pose. Here is to many more cakes together.',
    date: 'Chapter Five',
    position: [EAST_X, 2.5, -2.5],
    rotation: ON_EAST_WALL,
    size: [1.25, 2.22],
    frame: 'rose',
    section: 'gallery',
  },

  // ── Special memories corner (bigger, ornate frames) ──
  {
    id: 'memory-005',
    image: '/memories/photo-005.jpg',
    title: 'Us',
    caption: 'Side by side. My favourite place in the whole world is right next to you.',
    date: 'Treasured',
    position: [WEST_X, 2.85, -8],
    rotation: ON_WEST_WALL,
    size: [2.1, 2.8],
    frame: 'ornate',
    section: 'special',
  },
  {
    id: 'memory-006',
    image: '/memories/photo-006.jpg',
    title: 'Hand in Hand',
    caption: 'An open road and your hand in mine. Wherever it leads, I want to walk it with you.',
    date: 'Treasured',
    position: [EAST_X, 2.85, -8],
    rotation: ON_EAST_WALL,
    size: [2.0, 2.8],
    frame: 'ornate',
    labelSide: 'left',
    section: 'special',
  },
  {
    id: 'memory-003',
    image: '/memories/photo-003.jpg',
    title: 'Golden',
    caption: 'Wrapped in gold, glowing like you always do. A portrait worth framing forever.',
    date: 'Treasured',
    position: [WEST_X, 2.8, -12.5],
    rotation: ON_WEST_WALL,
    size: [2.0, 2.67],
    frame: 'ornate',
    labelSide: 'left',
    section: 'special',
  },
  {
    id: 'memory-013',
    image: '/memories/photo-013.jpg',
    title: 'Simply Stunning',
    caption: 'Some nights the stars come out. Some nights it is just you, and that is even better.',
    date: 'Treasured',
    position: [EAST_X, 2.85, -12.5],
    rotation: ON_EAST_WALL,
    size: [1.58, 2.8],
    frame: 'ornate',
    section: 'special',
  },
]
