# Brag Plan: Deck Salone

## What is this app?
Deck Salone is the platform for discovering, listening to, booking, and battling DJs across Sierra Leone — mixes, events, rankings, and a mobile app, all in one place.

## The angle
Sierra Leone's whole DJ scene — discover the DJ, press play on the mix, book them for your event, watch them battle for the crown — lives in one black-and-gold app. The video should feel like a Friday-night promo flyer that learned to move: dark stage, gold type, real app cards doing real app things.

## Hook (first 2-3 seconds)
Black screen. A single gold vinyl/disc spins up out of the dark with a needle-drop feel. Line slams in: **"Where Salone's DJs live."** The word "Salone" should feel like the audience is in on it.

## Key moments (the middle)
- DJ cards sliding in like a deck — avatar, name, genre tags (Amapiano, Afrobeats), follow count.
- A mix card with a play button: press it, waveform/progress line starts moving, "Trending Mixes" energy.
- A booking card filling itself out — event date, city (Freetown), "Book DJ" — then a gold **"Booked ✓"** confirmation stamp.
- Rankings/board moment — the battle for #1, two DJ cards facing off.

## Outro / punchline
Logo lands: **DECK SALONE** in Clash Display, gold on black, with the line **"Discover. Listen. Book. Battle."** — then the URL: `decksalone.com`.

## User flow worth showing
Discover → Play → Book. Entry: browse DJ/mix cards on the dark home feed. Key action: tap play on a mix (progress moves), then tap "Book" on a DJ. Result: gold "Booked" confirmation. This is the centerpiece — the cards must look like the real app (black cards, gold accents, real section names: "Trending Mixes", "Featured DJs", "Upcoming Events").

## Tone
- Preset: default
- Creative direction: Friday-night Freetown promo — flyer energy, clean and confident
- Interpretation: punchy entrances, hard cuts on the beat, gold type that slams in and holds. Fun but not a joke — this is a real product shipping real APKs.

## Format: landscape — 1920x1080
## Duration: 20 seconds

## Visual identity (from the project)
- Background: `#000000` (hsl 0 0% 0%)
- Accent / primary: gold `#F2D24B`-family (hsl 52 88% 65%)
- Text: near-white `#F5F5F5` (hsl 0 0% 96%)
- Display font: Clash Display (fallback: a strong geometric sans, letterspaced caps)
- Body font: Inter
- Strongest visual element: dark app cards with gold accents, play buttons, DJ/mix cards — plus the vinyl/disc motif for the hook.

## Share copy (draft)
Built Deck Salone — discover, stream, book, and battle Sierra Leone's DJs, all in one black-and-gold app. decksalone.com

## Audio direction
- Role: upbeat bed with tasteful UI accents — the music is the party, SFX are the interface.
- Music: `happy-beats-business-moves-vol-1-by-ende-dot-app.mp3` (120 BPM, most energetic bundled track)
- Music treatment: start near a beat grid onset (first beat at ~3.02s — start the track around 2.5–3.0s so the hook lands in the pocket), volume ~0.35, hold steady, duck slightly under the final logo hit and fade out over the last 1.5s.
- Music cue guidance: bundled preset `assets/music/cues/happy-beats-business-moves-vol-1-by-ende-dot-app.music-cues.json` (tempo 120.19 BPM). Strong cues in window: 17.02s, 18.02s, 18.52s, 20.02s — near the booking payoff and logo if scene timing drifts late; beat grid from 3.02s at ~0.5s intervals for card-by-card arrivals. Timing hints only — readability wins.
- Audio-reactive treatment: subtle; gold glow on the vinyl/hero and presence on the app cards can breathe with the music's RMS/bass. No equalizer bars, no waveform graphics.
- SFX posture: moderate — card-slide sounds for card arrivals, a click for the play button, a soft success/bell for the "Booked" stamp, one impact-bell for the logo.
- Audio-coupled moments: play-button press (click + progress starts), "Booked ✓" stamp (success chime), logo landing (deep bell), card arrivals (card-slide/drop).
- Restraint rule: SFX never fight the music bed; no SFX on every beat; nothing above the music.

## Storyboard

### Scene 1 — Hook: the drop — 3.0s
Black stage. A gold vinyl disc spins up from darkness (subtle RPM wobble), tonearm drops. Line slams in fast and holds: **"WHERE SALONE'S DJS LIVE."** Settled by ~1.2s, holds to the cut.
Sequential/interaction: yes — disc spins up first, then the line slams on the first strong beat after entrance.
Audio intent: music kicks in under the hook; needle-drop feel.
Audio-coupled idea: impact as the line lands (beat-locked to first beat grid point).
Music: upbeat bed starts ~2.5–3.0s into the track so the entrance sits in the pocket.
Transition mood: hard cut → Scene 2

### Scene 2 — Discover the deck — 4.5s
Recreate the home feed: a dark card grid like the real app. DJ cards slide in one by one (card-slide feel) — avatar, name, genre tags ("Amapiano", "Afrobeats"), follower counts. Small gold section label: **"FEATURED DJS"**. Cards breathe subtly with the music.
Sequential/interaction: yes — 3 DJ cards arrive in sequence, ~0.5–0.6s apart (every beat), full set held for reading.
Audio intent: light card-slide ticks synced to arrivals.
Audio-coupled idea: card-by-card sequence snapped to the beat grid.
Transition mood: clean wipe/slide → Scene 3

### Scene 3 — Press play — 4.5s
A mix card front and center — artwork, title, duration. A cursor/tap presses the gold play button: the progress bar starts filling and a subtle time counter ticks (`0:00 → 0:07`). Label: **"TRENDING MIXES"**.
Sequential/interaction: yes — simulated tap on play, then progress animates.
Audio intent: click on the tap; the bed carries the groove while the bar moves.
Audio-coupled idea: simulated user action (click) + progress tied to scene clock.
Transition mood: hard cut → Scene 4

### Scene 4 — Book it — 5.0s
A booking card fills itself: event name, date, **"Freetown"** — a cursor taps the gold **"BOOK DJ"** button. Stamp effect: **"BOOKED ✓"** in gold lands on the card with a slight rotate/scale settle.
Sequential/interaction: yes — form fields populate, tap, confirmation stamp.
Audio intent: success chime as the stamp lands (the payoff).
Audio-coupled idea: success ding at the moment "BOOKED ✓" is fully visible; consider nudging the stamp toward a strong cue (±0.15s).
Transition mood: clean crossfade → Scene 5

### Scene 5 — Logo outro — 3.0s
Gold **DECK SALONE** logo centers on black (Clash Display caps, slight scale-in settle). Line under it: **"DISCOVER. LISTEN. BOOK. BATTLE."** Then `decksalone.com` fades up small. Music ducks and fades.
Sequential/interaction: minimal — logo, then line, then URL.
Audio intent: one deep bell on the logo; bed fades out over the last 1.5s.
Audio-coupled idea: final logo hit — the one big SFX moment.
Transition mood: end.

**Total: 3.0 + 4.5 + 4.5 + 5.0 + 3.0 = 20.0s** ✓ (within 15–25s)

**Music mood for this video:** upbeat — clean party bed at ~0.35, SFX as interface accents.
**Audio summary:** music kicks in under the hook, ticks along with card arrivals and the play press, one success chime on the booking stamp, one bell on the logo, fade out.
