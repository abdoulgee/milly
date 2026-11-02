# Our Little World — a 3D birthday memory museum

A mobile-first 3D museum (React + Vite + TypeScript + React Three Fiber). She walks a
character through one continuous gallery with a joystick, a companion follows her,
photos open in a viewer, and the cake at the far end triggers the birthday finale.

## Run it

```bash
npm install
npm run dev        # prints a Network URL — open it on your phone (same Wi‑Fi)
npm run build      # production build in dist/
npm run preview    # serve the production build locally
```

Controls — **phone:** left thumb joystick, swipe to look, pinch to zoom, tap the pink
button near photos/cake. **Desktop:** WASD/arrows, mouse drag, wheel zoom, `E`
interact, `R` recenter, `Esc` pause. Add `?touch` to the URL to preview the phone UI
on a desktop.

## Personalise (no code changes needed)

| What | Where |
| --- | --- |
| Photos, titles, captions, dates, frame style/size/position | `src/data/memories.ts` + images in `public/memories/` |
| Museum title, welcome text, entrance sign, special-corner title | `src/data/museumConfig.ts` |
| Her name, wall message, final birthday letter, signature | `museumConfig.birthday` |
| Background music (mp3/ogg in `public/audio/`) | `museumConfig.audio.musicUrl` |
| Characters' colours (skin, hijab, dress print, kaftan, cap) | `characters.*.appearance` in `src/data/museumConfig.ts` |
| What they say in the speech bubbles | `src/data/chats.ts` |

**Photos:** drop files in `public/memories/` and point `image` at them. ~1600 px on the
long side is ideal; bigger phone photos are downscaled automatically. Photos are
cropped to fill their frame — adjust `size` to the photo's shape or set `fit: 'contain'`.
A missing photo shows a soft placeholder instead of breaking.

**Music:** with `musicUrl: null` a gentle generated music-box melody plays. Sound only
starts after "Enter Museum" is tapped.

## The characters

Both characters are built in code (`components/game/characters/ProceduralCharacter.tsx`)
in a stylised, Pixar-inspired look: her in a white hijab and red/gold Ankara dress, him
in a royal-blue kaftan and embroidered cap. They have walk/idle/turn animation,
blinking eyelids, a talking mouth, and turn their heads to each other while chatting.

**Speech bubbles** are run by `ChatDirector.tsx`: a welcome chat after the fly-in, a
chat at each photo (keyed by memory id), chats while sitting, at the fountain / special
corner / birthday corner, after the cake, and random little chats while walking. All
lines live in `src/data/chats.ts`.

**Benches:** walk up to a bench and tap **Sit together** — she sits, he takes the seat
beside her, and they chat while looking at the photos. Move the joystick or tap
**Stand up** to get going again.

## Replacing the characters with your own GLB models

To use custom models instead:

1. Put `female.glb` / `male.glb` in `public/characters/`. They need a skeleton and at
   least idle + walk clips (Mixamo-style rigs work well; a run clip is optional).
2. In `characters.player` / `characters.companion` set `model: '/characters/female.glb'`.
3. Tune `scale`, `rotationOffset` (if the model doesn't face +Z), `yOffset`, and
   `animations` (`idle`, `walk`, `run` clip names — auto-detected by name if omitted;
   `walkSpeed` is the speed at which the walk clip looks natural).

Movement, camera, companion AI and interactions only talk to characters through a small
`MotionState` (speed + turn rate), so nothing else changes. If a model fails to load,
the procedural character is used automatically.

You can also override per instance: `<Character type="player" model="/characters/me.glb" scale={0.01} />`.

## Project layout

```
src/
  components/game/   3D scene: MuseumLayout (floor plan + colliders), MuseumEnvironment,
                     PhotoFrame, Fountain, EntranceArea, SpecialCorner, BirthdayCorner,
                     Character (+ characters/ procedural & GLB visuals), ThirdPersonCamera …
  components/ui/     WelcomeScreen, GameControls, VirtualJoystick, InteractionButton,
                     PhotoViewer, PauseMenu, BirthdayMessage
  hooks/             usePlayerControls, useCompanionFollow, useCameraControls, useInteractions
  store/             gameStore (Zustand UI state), runtime (per-frame mutable state)
  data/              memories.ts, museumConfig.ts  ← edit these
  lib/               audio (Web Audio), procedural textures, shared materials, fonts
```

To move furniture or decor, edit `PLACEMENTS` / `LANDMARKS` in
`src/components/game/MuseumLayout.ts`; colliders follow automatically.

## Deploy

`npm run build` produces a static site in `dist/` (relative paths, so it works at a
domain root or a sub-path). Any static host works, e.g. Netlify Drop (drag `dist/` onto
app.netlify.com/drop), Vercel, Cloudflare Pages, or GitHub Pages.

## Performance notes

No real-time shadows (blob shadows instead), shared materials, instanced decor,
procedural canvas textures, capped pixel ratio with automatic downgrade when FPS drops,
lazy-loaded 3D scene, and shader pre-compilation behind the welcome screen.
# milly
