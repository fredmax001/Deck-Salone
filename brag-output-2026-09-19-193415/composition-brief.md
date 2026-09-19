# Hyperframes Composition Brief: Deck Salone

## Objective
Create a short launch-style brag video for Deck Salone — the platform for discovering, streaming, booking, and battling DJs across Sierra Leone.

## Output
- Composition directory: `brag-output-2026-09-19-193415/composition/`
- Rendered video: `brag-output-2026-09-19-193415/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 20 seconds

## Source Material
- Project root: `/Users/djfredmax/Desktop/Deck Salone` (React+Vite frontend in `app/src`, Express+Prisma backend in `app/api`, Android/iOS apps)
- Primary files read: `app/index.html`, `app/README.md`, `app/src/index.css`, `app/tailwind.config.js`, `app/src/pages/Home.tsx`, `app/src/components/home/*`
- Product name: Deck Salone
- Tagline / strongest claim: "Discover top DJs, listen to exclusive Sierra Leonean mixes, book DJs for events, and experience live DJ battles on Deck Salone."
- Key UI or visual moment to recreate: the dark app home feed — DJ cards, mix cards with gold play buttons, a booking flow ending in a "Booked" confirmation, and section labels ("Trending Mixes", "Featured DJs", "Upcoming Events").
- Copy that must appear verbatim:
  - "WHERE SALONE'S DJS LIVE." (hook)
  - "BOOK DJ" → "BOOKED ✓"
  - "DISCOVER. LISTEN. BOOK. BATTLE."
  - "decksalone.com"

## Creative Direction
- Tone preset: default
- Creative direction: Friday-night Freetown promo — flyer energy, clean and confident
- Interpretation: punchy entrances, hard cuts, gold type that slams in fast and holds. Fun but sincere — a real shipping product, not a parody.
- Angle: Sierra Leone's whole DJ scene — discover, stream, book, battle — in one black-and-gold app. Dark stage, gold type, real app cards doing real app things.
- Hook: black screen, gold vinyl spins up, "WHERE SALONE'S DJS LIVE." slams in.
- Outro / punchline: gold DECK SALONE logo, "DISCOVER. LISTEN. BOOK. BATTLE.", decksalone.com.
- Avoid:
  - Generic SaaS language ("streamline your workflow" is banned)
  - Abstract filler visuals (no generic gradients/motion graphics that could be any video)
  - Unrelated visual redesign — stay inside the project's black/gold identity

## Visual Identity
- Background: `#000000`
- Text: near-white `#F5F5F5`
- Accent / primary: gold `#F2D24B` family (project primary is hsl(52 88% 65%))
- Display font: Clash Display (fallback: strong geometric sans, letterspaced caps)
- Body font: Inter (fallback: system-ui sans)
- Visual references from the project: dark app cards with gold accents, play buttons, DJ/mix cards, gold vinyl/disc motif for the hook.

## Storyboard
Use the storyboard in `brag-output-2026-09-19-193415/brag-plan.md` as the creative contract.

Scene summary:
1. Hook: the drop — 3.0s — gold vinyl spins up from black; "WHERE SALONE'S DJS LIVE." slams in and holds.
2. Discover the deck — 4.5s — 3 DJ cards slide in one by one (avatar, name, genre tags, followers); label "FEATURED DJS".
3. Press play — 4.5s — mix card; simulated tap on gold play button; progress bar fills, time ticks.
4. Book it — 5.0s — booking card populates (event, date, "Freetown"); tap "BOOK DJ"; gold "BOOKED ✓" stamp settles.
5. Logo outro — 3.0s — DECK SALONE logo; "DISCOVER. LISTEN. BOOK. BATTLE."; decksalone.com; music fades.

## Audio
- Audio role: upbeat bed with tasteful UI accents.
- Audio arc: music kicks in under the hook, ticks with card arrivals and the play press, one success chime on the booking stamp, one bell on the logo, fade out over the last 1.5s.
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` (already copied to `composition/assets/music/`)
- Music treatment: volume ~0.35; start the track around 2.5–3.0s so the hook lands on the first beat-grid point; duck slightly under the logo hit; fade out last 1.5s.
- Music cue guidance: bundled preset — copy `skills/brag/assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json` next to the track into `composition/assets/music/cues/` and pass it to the beat tooling. Tempo 120.19 BPM; beat grid starts 3.02s; strong cues at 17.02/18.02/18.52/20.02s. Hints only — readability wins.
- Audio-reactive treatment: subtle; gold glow on the vinyl/hero and presence on app cards may breathe with music RMS/bass. No equalizer bars, no waveform graphics, no strobing.
- Audio-coupled moments:
  - Scene 1 — hook line lands on a beat (impact)
  - Scene 2 — card-by-card arrivals snapped to beat grid (card-slide ticks)
  - Scene 3 — play-button tap (click) + progress start
  - Scene 4 — "BOOKED ✓" stamp (success chime, optionally near a strong cue ±0.15s)
  - Scene 5 — logo bell, music duck + fade
- SFX selection guidance: motion-matched — `casino/card-slide-*` or `interface/drop_*` for cards, `interface/click_*` for the tap, `impact/impactBell_heavy_000` or `casino/chips-collide-*` for success, `impact/impactBell_heavy_003` for the logo. Read `skills/brag/assets/sfx/sfx-analysis.md` before choosing; prefer low HF-risk files for repeated/polished moments.
- Exact SFX choice: Hyperframes chooses filenames, timestamps, density, and volume based on the implemented animation.
- Audio files: music is in `composition/assets/music/`; copy any selected SFX into `composition/assets/sfx/`.

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project (the app-card feed, section labels, booking flow).
- Keep all text readable in the final render.
- Keep the video within 15-25 seconds (target: 20s).
- Include the planned music/SFX layer.
- Treat `/brag` audio notes as guidance, not a fixed cue sheet. Choose SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints. Decide exact animation timing; ignore cues that hurt readability, scene pacing, or the product story.
- Major reveals may move toward nearby strong cues within about 0.15s. Smaller entrances may align to nearby beat points within about 0.10s. Use only 1-3 strong cue locks in the video.
- Use SFX to support motion and interaction; restraint when the edit is already busy.
- Honor planned music treatment: fade-out and duck under the final logo.
- Use the Hyperframes audio-reactive workflow for at least one subtle visual (gold glow/presence). If extraction is unavailable, document and skip — do not block render.
- Use local assets for audio; never absolute paths in the composition HTML.
- Run `hyperframes check` before render — it is brag's single gate.
