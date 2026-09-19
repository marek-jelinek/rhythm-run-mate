# Rhythm Runner

Build a single-screen mobile-first web app called a "Running Cadence Player." It's a tool that helps runners keep a steady running rhythm by playing a looping beat sound, similar to a metronome but musical.

Layout: one screen only, no navigation, no login, designed for a phone held in a runner's hand or armband, big touch targets.

Elements on the screen:

Play/Stop button — one large button that toggles between playing and stopping the sound. Use a basic placeholder beep/click sound for now.

BPM display — large, clearly readable number showing current tempo in beats per minute. This is the most important piece of information on the screen.

BPM increase/decrease controls — plus and minus buttons that step tempo in fixed steps of 5, range 160–190 (160, 165, 170, 175, 180, 185, 190 only).

Rhythm visualization — an animated shape that pulses/moves in time with the beat. Doesn't need to be perfectly synced yet — just visually pulse at the current BPM's timing.

Track selector — 5 tracks, each inspired by a music genre: Pop, Rock, Metal, Jazz, Electro. Switching tracks must NOT change or reset the current BPM.

Volume control — a slider or +/- control for volume.

Not needed at this stage: accounts, settings screens, saved preferences, backend, precise real audio timing — this is a UI/UX exploration only.

Visual direction for this version: Sports/fitness dashboard feel:Bold, high-contrast, dark background, big chunky numbers and buttons like a running watch or gym equipment display. Strong accent color for the play button. Feels athletic and functional, built for glancing at mid-run.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/bbcba9a0-6058-5a9c-b7ba-5ae4a5edd8b0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
