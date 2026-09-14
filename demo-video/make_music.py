#!/usr/bin/env python3
"""Synthesize an energetic Afro-house style bed track (~96s) for the Deck Salone demo.

Layers: 4-on-the-floor kick, offbeat open hats, snare on 2&4, rolling bass,
chord stabs, noise sweep intro. Written as float32 WAV then converted to AAC
with ffmpeg in the edit step.
"""
import numpy as np
import wave, struct, os

SR = 44100
BPM = 122
BEAT = 60.0 / BPM          # ~0.4918 s
BAR = BEAT * 4
BARS = 41                  # 41 bars ≈ 80.6s
DUR = BARS * BAR
N = int(DUR * SR)
t = np.arange(N) / SR
mix = np.zeros(N, dtype=np.float64)

def place(sig, start_s):
    i = int(start_s * SR)
    j = min(N, i + len(sig))
    mix[i:j] += sig[:j - i]

# --- kick: 4 on the floor ---
def kick():
    dur = 0.28
    tt = np.arange(int(dur * SR)) / SR
    f = 52 + 120 * np.exp(-tt * 38)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.exp(-tt * 16)
    return 0.9 * np.sin(ph) * env

k = kick()
for b in range(BARS * 4):
    place(k, b * BEAT)

# --- snare on 2 & 4 ---
def snare():
    dur = 0.22
    tt = np.arange(int(dur * SR)) / SR
    noise = np.random.default_rng(7).standard_normal(len(tt))
    env = np.exp(-tt * 26)
    tone = np.sin(2 * np.pi * 185 * tt) * np.exp(-tt * 30)
    return 0.5 * (0.7 * noise * env + 0.5 * tone)

s = snare()
for b in range(BARS * 4):
    place(s, b * BEAT + 2 * BEAT)

# --- hats: offbeat closed + occasional open ---
rng = np.random.default_rng(3)
def hat(open_=False):
    dur = 0.09 if not open_ else 0.30
    tt = np.arange(int(dur * SR)) / SR
    n = rng.standard_normal(len(tt))
    # crude high-pass: differentiate
    hp = np.diff(n, prepend=0)
    env = np.exp(-tt * (70 if not open_ else 13))
    return 0.22 * hp * env

for b in range(BARS * 4):
    place(hat(), b * BEAT + 0.5 * BEAT)
    place(hat(), b * BEAT + 1.5 * BEAT)
    place(hat(), b * BEAT + 2.5 * BEAT)
    place(hat(open_=(b % 8 == 6)), b * BEAT + 3.5 * BEAT)

# --- rolling bass: minor pentatonic groove, A minor-ish ---
root = 55.0  # A1
notes = [1, 1, 1.5, 1, 2/1.5, 1, 1.189, 1.335]  # pattern multipliers (approx scale)
patt = [0, 0, 2, 0, 3, 0, 2, 1]  # indices into scale
scale = [1.0, 1.1892, 1.3348, 1.4983, 1.7818]  # minor pentatonic ratios
def bass_note(f, dur):
    tt = np.arange(int(dur * SR)) / SR
    saw = 2 * (tt * f % 1) - 1
    sub = np.sin(2 * np.pi * f * tt)
    env = np.minimum(1, tt * 200) * np.exp(-tt * 4)
    return 0.34 * (0.6 * saw + 0.7 * sub) * env

for b in range(BARS * 4):
    f = root * 2 * scale[patt[b % 8]]
    place(bass_note(f, BEAT * 0.9), b * BEAT + 0.0 * BEAT)

# --- chord stabs each bar (2 & 4), soft saw stack, Am7 -> F -> C -> G feel ---
chords = [
    [220.0, 261.63, 329.63, 392.0],   # Am7
    [174.61, 220.0, 261.63, 349.23],  # F
    [130.81, 196.0, 261.63, 329.63],  # C
    [196.0, 246.94, 293.66, 392.0],   # G
]
def stab(freqs, dur=0.5):
    tt = np.arange(int(dur * SR)) / SR
    sig = np.zeros(len(tt))
    for f in freqs:
        for det in (-0.004, 0.0, 0.004):
            sig += np.sin(2 * np.pi * f * (1 + det) * tt)
    sig /= (len(freqs) * 3)
    env = np.minimum(1, tt * 300) * np.exp(-tt * 7)
    return 0.16 * sig * env

for bar in range(BARS):
    ch = chords[bar % 4]
    place(stab(ch), bar * BAR + BEAT)
    place(stab(ch), bar * BAR + 3 * BEAT)

# --- riser in first 2 bars, small impact at scene-agnostic drops every 8 bars ---
riser_dur = 2 * BAR
rt = np.arange(int(riser_dur * SR)) / SR
rnoise = rng.standard_normal(len(rt))
rnoise = np.diff(rnoise, prepend=0)
renv = (rt / riser_dur) ** 2
place(0.20 * rnoise * renv, 0)
for bar in (8, 16, 24, 32):
    place(0.25 * rnoise * renv, (bar - 2) * BAR)

# --- gentle sidechain duck on beats (pump) ---
duck = np.ones(N)
for b in range(BARS * 4):
    i = int(b * BEAT * SR)
    L = int(0.30 * SR)
    j = min(N, i + L)
    w = np.linspace(0.45, 1.0, j - i) ** 1.5
    duck[i:j] *= w
mix *= duck

# --- master: soft clip, fade in/out ---
fade_in = int(0.4 * SR)
fade_out = int(2.5 * SR)
mix[:fade_in] *= np.linspace(0, 1, fade_in)
mix[-fade_out:] *= np.linspace(1, 0, fade_out)
mix = np.tanh(mix * 1.15)
mix /= np.max(np.abs(mix)) * 1.05

pcm = (mix * 32767).astype(np.int16)
out = "/Users/djfredmax/Desktop/Deck Salone/demo-video/music.wav"
with wave.open(out, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print(f"wrote {out}  dur={DUR:.1f}s  peak={np.max(np.abs(mix)):.2f}")
