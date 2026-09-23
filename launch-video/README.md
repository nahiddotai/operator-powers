# Operator Powers launch video

A 58.5-second 16:9 launch film for X, 1920x1080 at 60fps. The finished cut is `operator-powers-launch.mp4` in this folder.

It follows the grammar of the Codex launch spots (word-by-word type on white, slam zooms into the thing that matters, a glass composer over a painted sky, a floating wall of finished work, a calm logo hold) and tells the Operator Powers story in ChatGPT's own visual language: install the plugin in ChatGPT, get four finished deliverables, see the same powers in Codex and on the ChatGPT iPhone app, end on the logo and "Out now."

## Structure

- `DESIGN.md` has the style rules, palette, logo geometry and the shot-by-shot storyboard.
- `src/` is the source. `styles.css` and `css/` hold styles, `scenes/` the markup for each scene, `js/core.js` the camera, cursor, typing and WebGL gradient helpers, and `js/scenes/` the choreography per scene.
- `build.mjs` stitches `src/` into `index.html`, the HyperFrames composition.
- `audio/make_audio.py` writes `assets/soundtrack.wav`: an original 120 BPM score synthesised in code, mixed with UI sound effects and loudness-normalised to -14 LUFS.

## Rebuild

```bash
python3 audio/make_audio.py          # needs numpy, scipy and ffmpeg
node build.mjs
npx hyperframes lint
npx hyperframes render --fps 60 --quality high --output renders/operator-powers-launch.mp4
```

Rendering needs Chrome Headless Shell (`npx hyperframes browser ensure`) or `HYPERFRAMES_BROWSER_PATH` pointing at one.

## Notes

- The ChatGPT, Codex and iPhone screens are hand-built HTML replicas. The plugin page uses the plugin's published listing (name, tagline, developer, category, capabilities, starter prompts, version).
- Every scene builder runs after webfonts load, under a HyperFrames `buildReady` hold, so text measurements (and the camera targets derived from them) are exact.
- Sound effects come from Pixabay under the Pixabay Content License (free commercial use, no attribution required), as bundled with the HyperFrames media skill. The music is original.
