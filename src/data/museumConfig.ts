/**
 * ─── MUSEUM SETTINGS ──────────────────────────────────────────────────────
 *
 * All personal text lives here: titles, welcome note, birthday message,
 * music and characters. Edit freely — no other code needs to change.
 */

/**
 * Look of the built-in stylised characters. Her outfit is a hijab over a
 * long printed dress; his is a kaftan with trousers and an embroidered cap.
 */
export interface ProceduralAppearance {
  body: 'female' | 'male'
  skin: string
  lips: string
  /** Iris colour */
  eyes: string
  hair: string
  /** Her hijab / his cap */
  headwear: string
  /** Lace dots on the hijab / zig-zag embroidery on the cap */
  headwearPattern: string
  /** Her dress base (stripes) / his kaftan */
  outfit: string
  /** Her dress print / his kaftan embroidery */
  outfitPattern: string
  /** Her print centres / his trousers */
  outfitAccent: string
  shoes: string
  /** Overall height multiplier (1 ≈ 1.65 m for her, 1.75 m for him) */
  height: number
}

export interface CharacterAnimationConfig {
  /** Clip names inside the GLB. Leave undefined to auto-detect (/idle/i, /walk/i, /run/i). */
  idle?: string
  walk?: string
  run?: string
  /** Speed (m/s) at which the walk clip looks natural at 1× playback. */
  walkSpeed: number
  /** Speed (m/s) at which the run clip looks natural (only used if a run clip exists). */
  runSpeed: number
}

export interface CharacterConfig {
  /**
   * URL of a rigged GLB/glTF model, e.g. "/characters/female.glb".
   * `null` uses the built-in procedural character. If the model fails to
   * load, the procedural character is used automatically.
   */
  model: string | null
  /** Uniform scale applied to the model */
  scale: number
  /** Extra Y rotation (radians) if the model doesn't face +Z by default */
  rotationOffset: number
  /** Vertical offset if the model's origin isn't at its feet */
  yOffset: number
  /** Starting position on the floor [x, y, z] */
  position: [number, number, number]
  /** Top walking speed in m/s */
  maxSpeed: number
  animations: CharacterAnimationConfig
  /** Look of the procedural fallback character */
  appearance: ProceduralAppearance
}

export const characters: { player: CharacterConfig; companion: CharacterConfig } = {
  // Female, player-controlled
  player: {
    model: null, // e.g. '/characters/female.glb'
    scale: 1,
    rotationOffset: 0,
    yOffset: 0,
    position: [0, 0, 17.6],
    maxSpeed: 2.9,
    animations: { walkSpeed: 1.4, runSpeed: 3.5 },
    // White hijab + red/gold Ankara maxi dress (from photo-012)
    appearance: {
      body: 'female',
      skin: '#8a5638',
      lips: '#7c3a3c',
      eyes: '#3d2316',
      hair: '#1a1110',
      headwear: '#f6f5fa',
      headwearPattern: '#c7cbe6',
      outfit: '#dd9b36',
      outfitPattern: '#d41c34',
      outfitAccent: '#27307a',
      shoes: '#f3eee8',
      height: 1,
    },
  },
  // Male, autonomous companion
  companion: {
    model: null, // e.g. '/characters/male.glb'
    scale: 1,
    rotationOffset: 0,
    yOffset: 0,
    position: [1.1, 0, 18.6],
    maxSpeed: 3.6,
    animations: { walkSpeed: 1.4, runSpeed: 3.5 },
    // Royal-blue kaftan + embroidered cap (from photos 005 / 006)
    appearance: {
      body: 'male',
      skin: '#5e3925',
      lips: '#5b2d29',
      eyes: '#2a170e',
      hair: '#120b09',
      headwear: '#1f2f68',
      headwearPattern: '#e9e7f2',
      outfit: '#2546a3',
      outfitPattern: '#4c6cc9',
      outfitAccent: '#22408f',
      shoes: '#3b2a22',
      height: 1,
    },
  },
}

export const museumConfig = {
  title: 'Our Little World',
  subtitle: 'A tiny museum of us',
  welcomeMessage:
    'Every frame on these walls holds a piece of our story. Take your time, wander slowly, and remember with me.',
  enterLabel: 'Enter Museum',

  /** The freestanding sign beside the entrance arch */
  entranceSign: {
    title: 'Welcome, my love',
    body: 'This little museum was built just for you.\nWalk up to any photo to relive the memory.',
  },

  specialCornerTitle: 'Our Most Treasured Moments',

  birthday: {
    /** Her name / nickname — shown on the wall and in the final message */
    recipientName: 'My Love',
    wallHeadline: 'Happy Birthday',
    wallSubtitle: 'to my favourite person in the whole world',
    cakeActionLabel: 'Make a wish',
    cakeReplayLabel: 'Celebrate again',
    messageTitle: 'Happy Birthday',
    /** Each string is one paragraph of the final letter */
    messageParagraphs: [
      'Today is all about you — your kindness, your laugh, and the way you make every day brighter just by being in it.',
      'Thank you for every memory on these walls, and for all the ones we have not made yet. I cannot wait to fill a hundred more museums with you.',
      'I hope this year gives you everything you have ever wished for.',
    ],
    signature: 'Forever yours ♡',
  },

  audio: {
    /**
     * Optional background music file, e.g. '/audio/music.mp3' (put the file
     * in public/audio/). When null — or if the file can't be loaded — a soft
     * generated music-box melody plays instead.
     */
    musicUrl: null as string | null,
    musicVolume: 0.55,
    sfxVolume: 0.8,
  },
}
