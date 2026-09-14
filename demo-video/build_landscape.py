#!/usr/bin/env python3
"""Build the 1080p landscape Deck Salone demo video.

Stage 1: per-scene intermediates (trim, scale, scene-8 pillarbox, overlay burn, fade in/out)
Stage 2: 0.5s crossfade concat + music bed -> output/deck-salone-demo-1080p.mp4
"""
import subprocess, os, sys

BASE = "/Users/djfredmax/Desktop/Deck Salone/demo-video"
REC = f"{BASE}/recordings"
OVL = f"{BASE}/overlays"
OUT = f"{BASE}/output"
TMP = f"{BASE}/tmp_clips"
os.makedirs(TMP, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

# (scene, start, end)  -- useful window from record flow
SCENES = [
    ("01-intro",      9, 17),
    ("02-discover",   9, 18),
    ("03-dj-profile", 12, 21),
    ("04-upload",     9, 17),
    ("05-listening",  12, 21),
    ("06-discovery",  8, 16),
    ("07-growth",     8, 16),
    ("08-mobile",     20, 30),
    ("09-cta",        9, 17),
]
XFADE = 0.5

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("FAILED:", " ".join(cmd[:6]), "...")
        print(r.stderr[-2500:])
        sys.exit(1)

# ---- Stage 1 ----
for name, st, en in SCENES:
    dur = en - st
    src = f"{REC}/{name}.webm"
    ovl = f"{OVL}/{name}.png"
    dst = f"{TMP}/{name}.mp4"
    fade_out_st = dur - 0.4
    if name == "08-mobile":
        # 390x844 phone footage -> blurred pillarbox background
        fc = (
            "[0:v]scale=1920:1080:force_original_aspect_ratio=increase,"
            "crop=1920:1080,boxblur=18:2,eq=brightness=-0.28[bg];"
            "[0:v]scale=-2:1080[fg];"
            "[bg][fg]overlay=(W-w)/2:(H-h)/2[tmp];"
            f"[tmp][1:v]overlay=0:0,fade=t=in:st=0:d=0.4,fade=t=out:st={fade_out_st}:d=0.4[v]"
        )
    else:
        fc = (
            "[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[tmp];"
            f"[tmp][1:v]overlay=0:0,fade=t=in:st=0:d=0.4,fade=t=out:st={fade_out_st}:d=0.4[v]"
        )
    run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(st),
         "-i", src, "-i", ovl, "-t", str(dur),
         "-filter_complex", fc, "-map", "[v]",
         "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "veryfast",
         "-r", "30", dst])
    print("scene ok:", name, f"{dur}s")

# ---- Stage 2: xfade concat ----
durs = [en - st for _, st, en in SCENES]
total = sum(durs) - XFADE * (len(SCENES) - 1)
inputs = []
for name, _, _ in SCENES:
    inputs += ["-i", f"{TMP}/{name}.mp4"]
inputs += ["-i", f"{BASE}/music.wav"]

parts = []
labels = [f"[{i}:v]" for i in range(len(SCENES))]
cur = labels[0]
cur_dur = durs[0]
for i in range(1, len(SCENES)):
    off = cur_dur - XFADE
    out_lab = f"[x{i}]"
    parts.append(
        f"{cur}{labels[i]}xfade=transition=fade:duration={XFADE}:offset={off:.3f}{out_lab}"
    )
    cur = out_lab
    cur_dur = cur_dur + durs[i] - XFADE
mus_idx = len(SCENES)
parts.append(
    f"[{mus_idx}:a]atrim=0:{total:.3f},asetpts=PTS-STARTPTS,"
    f"afade=t=out:st={total-2.5:.3f}:d=2.5,volume=0.9[a]"
)
fc = ";".join(parts)

dst = f"{OUT}/deck-salone-demo-1080p.mp4"
run(["ffmpeg", "-y", "-loglevel", "error", *inputs,
     "-filter_complex", fc, "-map", cur, "-map", "[a]",
     "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "18", "-preset", "medium",
     "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-r", "30", dst])
print("DONE:", dst, f"{total:.1f}s")
