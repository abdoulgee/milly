/**
 * ─── MUSEUM SETTINGS ──────────────────────────────────────────────────────
 *
 * All personal text lives here: titles, welcome note, birthday message,
 * music and characters. Edit freely — no other code needs to change.
 */

/**
 * Look of the built-in sculpted characters (see female_ref.jpeg / male_ref.jpeg).
 * Her: hijab, nurse scrubs, trousers, clogs. Him: kaftan, trousers, cap, sandals.
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
  /** Hijab fold shade / embroidery on his cap */
  headwearPattern: string
  /** Her scrubs / his kaftan */
  outfit: string
  /** Pocket, badge & seam trims */
  outfitPattern: string
  /** Trousers */
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
   * URL of a VRM avatar (VRoid-style humanoid), e.g. "/characters/her.vrm".
   * Takes priority over `model`. Built by scripts/build-characters.py from the
   * CC0 VRoid base avatars and dressed at runtime (hijab / kaftan / cap) from
   * `appearance`. `null` falls back to `model` / the sculpted character.
   */
  vrm: string | null
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
    vrm: '/characters/her.vrm',
    model: null, // e.g. '/characters/female.glb'
    scale: 1,
    rotationOffset: 0,
    yOffset: 0,
    position: [0, 0, 17.6],
    maxSpeed: 2.9,
    animations: { walkSpeed: 1.4, runSpeed: 3.5 },
    // Maroon hijab, maroon nurse scrubs, navy trousers, white clogs (female_ref.jpeg)
    appearance: {
      body: 'female',
      skin: '#a46c4c',
      lips: '#b4636b',
      eyes: '#4a2b1b',
      hair: '#1a1110',
      headwear: '#5c1528',
      headwearPattern: '#4a1020',
      outfit: '#601a2c',
      outfitPattern: '#481222',
      outfitAccent: '#1d2848',
      shoes: '#f3f3f1',
      height: 1,
    },
  },
  // Male, autonomous companion
  companion: {
    vrm: '/characters/him.vrm',
    model: null, // e.g. '/characters/male.glb'
    scale: 1,
    rotationOffset: 0,
    yOffset: 0,
    position: [1.1, 0, 18.6],
    maxSpeed: 3.6,
    animations: { walkSpeed: 1.4, runSpeed: 3.5 },
    // Senator wear: charcoal knee-length top & trousers with silver embroidery,
    // matching embroidered cap, dark brown shoes. (The top/trouser texture
    // colours are baked by scripts/build-characters.py — keep them in sync.)
    appearance: {
      body: 'male',
      skin: '#5a3523',
      lips: '#5e302c',
      eyes: '#2b1810',
      hair: '#141010',
      headwear: '#30333c',
      headwearPattern: '#a7a8b1',
      outfit: '#2d3039',
      outfitPattern: '#a7a8b1',
      outfitAccent: '#2d3039',
      shoes: '#2b1e17',
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
