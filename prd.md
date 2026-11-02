# MASTER PROMPT: BUILD AN INTERACTIVE 3D BIRTHDAY MEMORY MUSEUM

Act as a senior Three.js developer, React Three Fiber specialist, 3D web game developer, UI/UX designer, and technical architect.

I want you to build a beautiful, interactive, mobile-first 3D virtual birthday museum for my girlfriend.

This should feel like a small, polished 3D adventure game, not a normal website with pictures.

## 1. CORE CONCEPT

Create one large, beautiful, explorable 3D museum/gallery where two characters (one male and one female) explore memories together.

The female character represents my girlfriend, and the male character represents me.

For the initial development, use random, attractive, stylized 3D male and female characters. Do not attempt to generate characters resembling real people yet.

Eventually, I will replace these temporary characters with custom AI-generated 3D models based on our photographs.

The experience should work as follows:

1. The visitor opens the birthday museum through a link on her phone.
2. A beautiful welcome screen appears.
3. She enters the museum.
4. She controls the female character using an on-screen joystick.
5. The male character automatically follows her as a companion.
6. She can freely explore the museum.
7. She approaches pictures displayed on the museum walls.
8. She can interact with the pictures to view them in larger formats and read their captions.
9. She discovers different memory displays and birthday surprises throughout the environment.
10. At the end, she discovers a special birthday message.

IMPORTANT: This must be ONE SINGLE CONTINUOUS MUSEUM ROOM.

Do not create multiple rooms, separate scenes, room transitions, doors leading to other environments, or a multi-level world.

Different experiences should be arranged as different sections and corners inside the same large gallery.

## 2. VISUAL DIRECTION

Create a premium, cute, romantic, stylized 3D environment.

Visual inspiration:
- Pixar-inspired 3D animation.
- Beautiful modern art galleries.
- Dreamy romantic environments.
- Warm cinematic lighting.
- Soft pastel colors.
- Beautiful decorative elements.
- Premium indie 3D adventure games.

The museum should feel magical, intimate, peaceful, and romantic.

Suggested color palette:
- Cream white.
- Warm beige.
- Soft pink.
- Rose gold.
- Light lavender.
- Warm golden lighting.

Avoid excessive decorations, visual clutter, childish UI, and cheap-looking effects.

## 3. TECHNOLOGY STACK

Use:

- React.
- Vite.
- TypeScript.
- Three.js.
- React Three Fiber.
- @react-three/drei.
- Zustand for application/game state.
- Framer Motion for 2D interface animations.
- Tailwind CSS for UI styling.

Use GLB/glTF assets for 3D characters and other imported models.

Do not require Blender.

Build the environment procedurally using Three.js and React Three Fiber wherever possible.

For temporary characters:
- Use available free, properly licensed GLB character assets.
- Alternatively, use simple procedural stylized humanoid characters if suitable assets are unavailable.
- Do not use static photographs as character substitutes.
- Both characters must have a usable skeleton or an animation solution that supports walking and idle movements.

Keep character assets replaceable through configuration.

## 4. MUSEUM ENVIRONMENT

Create one large rectangular or gently curved gallery.

The entire museum should be connected and explorable without loading another environment.

Suggested layout:

### Entrance area
- Beautiful entrance point.
- Romantic welcome sign.
- A title such as "Our Little World".
- A short welcome message.
- An elegant entrance animation.

### Main memories gallery
- Large decorative picture frames on the walls.
- Several pictures arranged in a visually attractive layout.
- Different frame sizes and designs.
- Some pictures can be displayed in chronological order.
- Beautiful wall lighting illuminating the photographs.

### Central gallery area
- Spacious walking area.
- Decorative plants.
- Comfortable benches.
- A beautiful sculpture or fountain.
- Soft ambient lighting.
- Small decorative objects.

### Special memories corner
- A dedicated section containing selected photographs.
- Decorative text and captions.
- A few larger picture frames.
- Optional floating decorative particles.

### Birthday surprise corner
- A beautiful birthday cake.
- Decorative balloons.
- Birthday presents.
- A special birthday message.
- An optional final surprise animation.

All these areas must exist within the same continuous room.

## 5. CHARACTER SYSTEM

Create two temporary 3D characters:

- Female character: player-controlled.
- Male character: autonomous companion.

The characters should have:
- Stylized attractive appearance.
- Consistent proportions.
- Idle animation.
- Walking animation.
- Turning animation.
- Natural movement.
- Appropriate movement speed.

### Female character controller

The female character must be controlled using a mobile virtual joystick.

Requirements:
- Move forward.
- Move backward.
- Move left.
- Move right.
- Move diagonally.
- Rotate naturally based on movement direction.
- Smooth acceleration and deceleration.
- Prevent movement through walls and major objects.

### Male companion controller

The male character must automatically follow the female character.

Requirements:
- Maintain a comfortable following distance.
- Follow naturally rather than moving mechanically.
- Walk when the female character walks.
- Stop when she stops.
- Turn naturally.
- Avoid overlapping the female character.
- Avoid jittering.
- Use simple steering or waypoint navigation.
- Keep him reasonably close without standing directly on top of her.

The male character must not require user control.

## 6. CAMERA SYSTEM

Create a third-person camera.

Requirements:
- Follow the female character.
- Smooth camera movement.
- Adjustable camera distance.
- Camera rotation through touch gestures.
- Prevent the camera from entering walls.
- Keep both characters reasonably visible.
- Provide a camera reset/recenter control.

The camera must feel like a mobile adventure game.

## 7. MOBILE CONTROLS

The primary target device is a smartphone.

Design the controls specifically for touchscreens.

Include:

- Virtual joystick at the bottom-left.
- Camera rotation through dragging on the right side of the screen.
- Interaction button when near an interactive object.
- Optional camera reset button.
- Pause/settings button.
- Sound toggle.

Controls must be large enough for comfortable mobile use.

Do not let the controls obstruct important parts of the 3D environment.

Also support desktop keyboard controls for development and testing:
- WASD or arrow keys for movement.
- Mouse dragging for camera rotation.
- E for interaction.

## 8. INTERACTIVE PHOTOGRAPHS

This is one of the most important features.

Every photograph should be represented by a 3D picture frame attached to the museum wall.

When the player approaches a photograph:
- Detect proximity.
- Display an interaction prompt.
- Allow the player to tap the interaction button.
- Open a beautiful photo viewer.

The photo viewer should:
- Display the photograph in a large format.
- Show its caption.
- Have a close button.
- Use smooth opening and closing animations.
- Return the player to the 3D environment after closing.

The photographs must be loaded from configurable data rather than hardcoded into the scene.

Create a memory configuration structure similar to:

{
  "id": "memory-001",
  "image": "/memories/photo-001.jpg",
  "title": "A Beautiful Memory",
  "caption": "A special moment worth remembering.",
  "position": [0, 2, -5],
  "rotation": [0, 0, 0],
  "size": [1.5, 1.8]
}

Create at least 10 sample memory entries using placeholder images.

Make it easy to replace the placeholders with real photographs later.

## 9. BIRTHDAY SURPRISE INTERACTION

Create an interactive birthday cake in the birthday corner.

When the player approaches and interacts with it:
- Play a short celebratory animation.
- Show floating decorative particles.
- Display a birthday message.
- Optionally play a short celebration sound.
- Show a beautiful final message.

Make this feel like the emotional highlight of the experience.

Use placeholder birthday text for now.

## 10. AUDIO AND ATMOSPHERE

Include:
- Soft romantic background music placeholder.
- Optional ambient environmental sounds.
- Interaction sound effects.
- Birthday celebration sound.

Add a mute button.

Do not autoplay audio before the user interacts with the welcome screen.

## 11. UI/UX DESIGN

The interface should look premium and minimal.

Create:

### Welcome screen
- Beautiful background.
- Museum title.
- Short welcome message.
- Enter Museum button.

### In-game interface
- Minimal joystick.
- Camera controls.
- Interaction button.
- Pause/settings button.
- Optional small guidance text.

### Photo viewer
- Large photograph.
- Caption.
- Close button.

### Pause/settings menu
- Resume.
- Sound toggle.
- Return to welcome screen.

### Final birthday message
- Beautiful typography.
- Smooth animation.
- Birthday celebration effects.

The 2D interface should complement the 3D environment rather than dominate it.

## 12. ARCHITECTURE

Use a modular architecture.

Suggested structure:

src/
  components/
    ui/
      WelcomeScreen.tsx
      GameControls.tsx
      VirtualJoystick.tsx
      InteractionButton.tsx
      PhotoViewer.tsx
      PauseMenu.tsx
      BirthdayMessage.tsx

    game/
      MuseumScene.tsx
      MuseumEnvironment.tsx
      MuseumLayout.ts
      FemalePlayer.tsx
      MaleCompanion.tsx
      ThirdPersonCamera.tsx
      InteractionManager.tsx
      PhotoFrame.tsx
      BirthdayCorner.tsx
      Lighting.tsx

  hooks/
    usePlayerControls.ts
    useCameraControls.ts
    useCompanionFollow.ts
    useInteractions.ts

  store/
    gameStore.ts

  data/
    memories.ts
    museumConfig.ts

  assets/
    characters/
    textures/
    audio/
    memories/

  styles/
  App.tsx
  main.tsx

You may improve this architecture where technically justified.

## 13. PERFORMANCE REQUIREMENTS

The experience must run smoothly on modern smartphones, especially Samsung Galaxy S23.

Requirements:
- Target 45–60 FPS where practical.
- Optimize 3D models and textures.
- Use compressed textures where appropriate.
- Avoid unnecessary real-time shadows.
- Use efficient lighting.
- Avoid excessive draw calls.
- Lazy-load nonessential assets.
- Avoid unnecessary React re-renders inside the 3D animation loop.
- Use instancing for repeated decorative objects where appropriate.
- Provide a loading screen while assets load.
- Handle missing images or assets gracefully.

The museum should remain visually attractive without requiring a powerful desktop GPU.

## 14. FUTURE CHARACTER REPLACEMENT

Design the application so that I can later replace the temporary male and female characters with custom AI-generated GLB models.

Do not tightly couple character models to the scene.

Create a reusable character component that accepts:
- Model URL.
- Character type.
- Scale.
- Initial position.
- Animation configuration.

For example:

<Character
  model="/assets/characters/female.glb"
  type="player"
/>

<Character
  model="/assets/characters/male.glb"
  type="companion"
/>

The final implementation should allow me to replace the GLB files without rewriting the movement, camera, companion, or interaction systems.

## 15. DEVELOPMENT APPROACH

Do not attempt to build everything in one enormous component.

Work in stages:

Stage 1:
- Set up the React application.
- Build the 3D museum.
- Create the environment and lighting.
- Make the scene explorable.

Stage 2:
- Add the two temporary characters.
- Implement the female joystick controller.
- Implement the male companion-follow system.
- Add the third-person camera.

Stage 3:
- Add photographs and interactive frames.
- Implement the photo viewer.
- Add proximity detection.

Stage 4:
- Build the birthday surprise corner.
- Add UI animations.
- Add audio support.

Stage 5:
- Optimize performance.
- Test touch controls.
- Fix bugs.
- Make the application responsive.
- Prepare it for deployment.

After each stage, run the application and verify that the implemented features work.

Do not just create static mockups or screenshots. Build the actual working application.

## 16. IMPORTANT DEVELOPMENT RULES

1. Do not create multiple rooms. There must be exactly one continuous explorable museum environment.
2. Do not use Blender as a required development dependency.
3. Do not build a normal static website and call it a 3D museum.
4. Do not use photographs as substitutes for 3D characters.
5. Do not leave major buttons or controls nonfunctional.
6. Do not use paid assets or services without asking first.
7. Prefer free, properly licensed assets.
8. Do not invent missing assets or pretend that unavailable features work.
9. Keep the code clean, modular, maintainable, and documented.
10. Prioritize a complete working experience over unnecessary complexity.
11. Make the application mobile-first.
12. Use temporary random male and female characters for this first version.

## 17. FINAL EXPECTATION

I want a working, beautiful, interactive 3D birthday museum that I can open through a web link on a smartphone.

The female character should be controllable, the male character should follow her, and she should be able to explore the entire museum, interact with photographs, and discover the birthday surprise.

The project must be structured so that later I can:
- Replace both temporary characters with custom 3D models resembling us.
- Replace sample photographs with our actual pictures.
- Edit captions and personal messages.
- Change the birthday message.
- Customize the museum without rewriting its core systems.

Start by inspecting the existing project directory. If it is empty, initialize the project. Then implement the application in working stages.

Before making architectural decisions that require paid services or introduce major complexity, explain the trade-offs and ask me first.

Do not stop after producing a plan. Begin implementing the actual application.