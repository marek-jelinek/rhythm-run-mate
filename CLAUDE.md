# Kilometronom — Product & Technical Specification (v1 Prototype)

## What this app is
A web app that helps runners find and adjust their running cadence (steps
per minute) by playing a rhythmic sound (like a drum beat) that matches
their target pace — an alternative to a plain metronome.

## What we're testing (v1 goal)
1. Do people prefer a musical/interesting rhythm over a plain metronome?
2. Do people want this as its own tool, rather than using a
   Spotify/YouTube playlist?
3. Can people easily nudge their target cadence up or down and understand
   the number they're hearing?

## Functional requirements — single screen
- **Play/Stop button** — one button, toggles playback. Sound loops
  endlessly until the user presses Stop.
- **BPM display** — large, always visible while playing, shows the
  current tempo clearly.
- **BPM step controls** — plus/minus buttons. Fixed steps of 5 BPM,
  values limited to: 160, 165, 170, 175, 180, 185, 190. Never outside
  this range.
- **Cadence is global, independent of track** — changing the selected
  track/rhythm must NOT change or reset the current BPM.
- **Rhythm visualization** — an animated element (e.g. a pulsing circle)
  that visually matches the beat exactly, with no drift over time.
- **Track selector** — 5 tracks, styled after music genres: Pop, Rock,
  Metal, Jazz, Electro.
- **Volume control** — slider or +/- control.

## Architecture decisions
- **Stack:** React + TypeScript + Vite (matches Lovable's export, so no
  conversion needed if we start from that repo).
- **Audio engine:** Web Audio API, kept in its own module, separate from
  the UI (plain TypeScript, no React inside). Instead of scheduling beat by
  beat, the engine renders one full loop of the pattern at the current BPM
  into an audio buffer ahead of time (samples mixed in code, so the math
  is unit-testable without a browser) and plays it
  on repeat (`AudioBufferSourceNode` with `loop = true`). Beat positions
  are sample-exact, and nothing depends on `setInterval`/`setTimeout`,
  which drift and get paused by the phone when the screen is off. BPM and
  track changes re-render the loop and switch over on the next beat, so
  the rhythm never stumbles.
  Code lives in `src/audio/` (engine, loop mixing, timing math, patterns,
  placeholder sounds). The UI only talks to the engine through its public
  methods (start, stop, setBpm, setPattern, setVolume, getPosition).
  A hidden test page `/engine-test` exercises the engine without the real
  UI; unit tests (Vitest) check that every beat lands on the exact sample.
- **Visual sync:** the pulsing circle's animation must read its timing
  from the same audio clock (`AudioContext.currentTime`) the scheduler
  uses — via `requestAnimationFrame` computing where in the loop the
  audio currently is. This is what keeps the visual and the sound from ever
  drifting apart.
- **Sound files:** short WAV files (not MP3 — MP3 has small timing gaps
  at the start of the file that throw off precise rhythm playback).
  Added by the developer during setup, not uploaded by the end user.
- **Sample storage:** static files in the repo, not a database:
  ```
  /public/sounds/
    manifest.json
    patterns/
      pop/
        kick.wav
        hihat.wav
      rock/
      metal/
      jazz/
      electro/
  ```
  `manifest.json` maps each pattern to its display name, its sample
  files, and its beat sequence. Example shape:
  ```json
  {
    "patterns": [
      {
        "id": "pop",
        "name": "Pop",
        "samples": { "kick": "patterns/pop/kick.wav", "hihat": "patterns/pop/hihat.wav" },
        "sequence": ["kick", "hihat", "kick", "hihat"]
      }
    ]
  }
  ```
  BPM (tempo) is always a separate, runtime setting — never baked into
  the samples or the pattern definition.
- **Hosting:** Cloudflare Workers (decided 19. 9. 2026, instead of Pages:
  the Lovable project already builds for Workers; same free tier and
  https). Live at https://kilometronom.marker-b63.workers.dev (test page:
  `/engine-test`). Deploy from the Mac, no GitHub needed:
  `npm run build && npx wrangler deploy --config .output/server/wrangler.json --name kilometronom`
- **Offline support (PWA):** yes, scoped specifically to offline loading
  and installability (caching the app and sound files). Screen-off
  playback is handled by the audio engine, not by the PWA — see below.
- **Screen-off / locked-phone playback:** IN scope (decided 19. 9. 2026).
  Runners carry the phone in a pocket or armband, so the beat has to keep
  playing with the screen off. Approach:
  1. The pre-rendered looping buffer (see Audio engine) keeps playing
     without any JavaScript timers, which the phone pauses when locked.
  2. On iPhone, set `navigator.audioSession.type = "playback"` (Safari
     16.4+) so the sound behaves like music: keeps playing when locked
     and ignores the silent switch.
  3. Media Session API: shows play/stop on the lock screen.
  4. Fallback if a device still stops the sound: a "keep screen on"
     option (Screen Wake Lock API).
  Verified 19. 9. 2026: plays with the screen locked on a real iPhone
  (Safari) and a real Android phone (Chrome), `/engine-test` page.
  Originally planned as a check right after the audio engine works — it is the highest-risk
  part of the prototype. A native iOS app stays out of scope unless the
  web approach proves unreliable.
- **Analytics:** lightweight event tracking (PostHog recommended), just
  two things: session length, and whether/how often people switch
  between tracks. No full analytics platform, no backend needed.

## Explicitly out of scope for v1
- User accounts
- Saved presets across sessions
- Android app
- Native iOS app

## Acceptance checklist (what "done" looks like for this prototype)
- [ ] Single screen shows all elements: play/stop, BPM, +/- controls,
      visualization, track selector, volume
- [ ] BPM only ever shows one of: 160, 165, 170, 175, 180, 185, 190
- [ ] Switching track never changes the current BPM
- [ ] Playback loops indefinitely until Stop is pressed
- [ ] Visual beat indicator stays in sync with the audio over at least
      2 minutes of continuous play (no visible drift)
- [ ] Volume control audibly changes playback level
- [ ] Session-length and track-switch events appear correctly in
      analytics
- [ ] App still works after reloading offline (PWA)
- [ ] Beat keeps playing for at least 5 minutes with the screen locked
      on a real iPhone (Safari) and Android phone (Chrome)
- [ ] Deployed on Cloudflare Workers and testable on a real iPhone in
      Safari

## Open items to confirm before build starts
- Final visual direction chosen from the Lovable exploration (or a
  combination of the 3 directions)
- ~~Whether the Lovable-exported repo is used as the real starting point~~
  → Decided 19. 9. 2026: the Lovable repo (`rhythm-run-mate`) IS the
  starting point and stays connected to Lovable. Larger work happens on a
  separate branch and goes to `main` only when it works, because
  everything on `main` syncs back into Lovable.
- Where the WAV samples for the 5 tracks come from (free sample packs,
  bought, or made by someone). Decided 19. 9. 2026: solved after the
  engine is done. Until then the engine uses placeholder drum sounds
  generated in code; loading `manifest.json` + WAV files is added when
  the samples exist.

## Working rules
- **Audio changes are verified by measuring real playback**, not only by
  unit tests. After any change to the engine, record its actual output
  in the browser (e.g. via the `/engine-test` page and `window.__engine`
  in dev) and measure beat intervals across loop wraps and BPM/track
  switches. Reason: the unit tests passed while a Chromium looping bug
  (see `loopSafeLength` in `src/audio/cadence.ts`) broke the rhythm after
  the first loop — only a recording caught it.
