"""
Operator Powers launch soundtrack.

Original 120 BPM score synthesised from scratch (no samples) plus
Pixabay-licensed UI sound effects bundled with the HyperFrames media skill.
Every cut in the film lands on a 2-second bar line; the logo (6s), the
Codex drop (38s) and the end card (54s) all land on the tonic chord.

Usage: python3 audio/make_audio.py  ->  assets/soundtrack.wav
"""
import os
import subprocess
import numpy as np
from scipy import signal

SR = 48000
DUR = 58.5
N = int(SR * DUR)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "assets", "soundtrack.wav")
SFX_DIR = os.path.expanduser("~/.claude/skills/media-use/audio/assets/sfx")
RS = np.random.RandomState(7)

BEAT = 0.5
BAR = 2.0


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12.0)


def bus():
    return np.zeros((2, N))


def place(b, x, t, pan=0.0, gain=1.0):
    """Mix mono/stereo x into bus b at time t with constant-power pan."""
    i0 = int(round(t * SR))
    if i0 >= N:
        return
    if x.ndim == 1:
        a = (pan + 1) * np.pi / 4
        x = np.vstack([x * np.cos(a), x * np.sin(a)]) * np.sqrt(2)
    n = min(x.shape[1], N - i0)
    if i0 < 0:
        x = x[:, -i0:]
        n = min(x.shape[1], N)
        i0 = 0
    b[:, i0:i0 + n] += x[:, :n] * gain


# ---------------------------------------------------------------- instruments
def pluck(f, dur=1.4, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k, a in [(1, 1.0), (2, 0.42 * bright), (3, 0.2 * bright), (4, 0.1 * bright), (5, 0.05 * bright)]:
        fk = f * k * (1 + 0.0007 * k * k)
        tau = 1.1 / (1 + 0.7 * k) * (220.0 / f) ** 0.25
        y += a * np.sin(2 * np.pi * fk * t) * np.exp(-t / tau)
    y *= np.minimum(1, t / 0.003)
    # felt: soften the attack with a gentle lowpass
    bb, aa = signal.butter(2, min(0.99, 5200 / (SR / 2)))
    return signal.lfilter(bb, aa, y) * 0.32


def pad_note(f, dur, seed):
    n = int(dur * SR)
    t = np.arange(n) / SR
    r = np.random.RandomState(seed)
    y = np.zeros(n)
    for c in (-11, -5, 0, 5, 11):
        ff = f * 2 ** (c / 1200)
        y += signal.sawtooth(2 * np.pi * (ff * t + r.rand()))
    return y / 5.0


def bass_note(f, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(4 * np.pi * f * t) + 0.25 * np.sin(6 * np.pi * f * t) + 0.1 * np.sin(8 * np.pi * f * t)
    e = np.minimum(1, t / 0.008) * np.exp(-t / (dur * 0.9 + 0.05))
    rel = int(0.03 * SR)
    e[-rel:] *= np.linspace(1, 0, rel)
    return np.tanh(2.0 * y * e) * 0.55


def kick(vel=1.0):
    n = int(0.55 * SR)
    t = np.arange(n) / SR
    f = 52 + 95 * np.exp(-t / 0.04)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / 0.2)
    click = RS.randn(n) * np.exp(-t / 0.004) * 0.25
    bb, aa = signal.butter(2, 3000 / (SR / 2), "high")
    y += signal.lfilter(bb, aa, click)
    return np.tanh(1.4 * y) * vel


def clap(vel=1.0):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    y = np.zeros(n)
    for k, off in enumerate((0.0, 0.011, 0.023)):
        i = int(off * SR)
        seg = RS.randn(n - i) * np.exp(-np.arange(n - i) / SR / (0.012 if k < 2 else 0.14))
        y[i:] += seg
    bb, aa = signal.butter(2, [900 / (SR / 2), 4200 / (SR / 2)], "band")
    return signal.lfilter(bb, aa, y) * 0.55 * vel


def hat(open_=False, vel=1.0):
    n = int((0.35 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    y = RS.randn(n) * np.exp(-t / (0.09 if open_ else 0.014))
    bb, aa = signal.butter(2, 7500 / (SR / 2), "high")
    return signal.lfilter(bb, aa, y) * 0.22 * vel


def bell(f, dur=2.4, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    idx = 2.2 * np.exp(-t / 0.22)
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * 3.5 * t)) * np.exp(-t / 0.9)
    y += 0.25 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t / 0.5)
    y *= np.minimum(1, t / 0.002)
    return y * 0.28 * vel


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    p = t / dur
    noise = RS.randn(n)
    out = np.zeros(n)
    blk = 2048
    zi = None
    for i in range(0, n, blk):
        fc = 400 + 7000 * p[min(i, n - 1)] ** 2
        bb, aa = signal.butter(2, [max(60, fc * 0.6) / (SR / 2), min(0.98, fc * 1.4 / (SR / 2))], "band")
        if zi is None:
            zi = signal.lfilter_zi(bb, aa) * 0
        seg, zi = signal.lfilter(bb, aa, noise[i:i + blk], zi=zi)
        out[i:i + blk] = seg
    sweep = np.sin(2 * np.pi * np.cumsum(180 + 900 * p ** 2) / SR) * 0.25
    return (out * 0.5 + sweep) * (p ** 2.2) * 0.6


def impact():
    n = int(2.2 * SR)
    t = np.arange(n) / SR
    f = 38 + 30 * np.exp(-t / 0.12)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9)
    nz = RS.randn(n) * np.exp(-t / 0.18)
    bb, aa = signal.butter(2, 900 / (SR / 2))
    y += signal.lfilter(bb, aa, nz) * 0.5
    return np.tanh(1.3 * y) * 0.9


def reverse_swell(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    nz = RS.randn(n)
    bb, aa = signal.butter(2, [1500 / (SR / 2), 9000 / (SR / 2)], "band")
    return signal.lfilter(bb, aa, nz) * (t / dur) ** 3 * 0.35


# ---------------------------------------------------------------- effects
def lowpass_auto(x, curve_fn, order=2):
    """Time-varying lowpass on a stereo bus. curve_fn(t) -> cutoff Hz."""
    out = np.zeros_like(x)
    blk = 1024
    zi = [None, None]
    for i in range(0, x.shape[1], blk):
        fc = float(np.clip(curve_fn(i / SR), 80, 18000))
        bb, aa = signal.butter(order, fc / (SR / 2))
        for c in range(2):
            if zi[c] is None:
                zi[c] = signal.lfilter_zi(bb, aa) * x[c, i]
            out[c, i:i + blk], zi[c] = signal.lfilter(bb, aa, x[c, i:i + blk], zi=zi[c])
    return out


def reverb(x, sec=2.6, damp=5500, seed=3):
    n = int(sec * SR)
    t = np.arange(n) / SR
    r = np.random.RandomState(seed)
    ir = r.randn(2, n) * np.exp(-t / (sec / 6.9))
    bb, aa = signal.butter(1, damp / (SR / 2))
    ir = signal.lfilter(bb, aa, ir, axis=1)
    ir[:, : int(0.012 * SR)] = 0
    ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
    y = np.vstack([signal.fftconvolve(x[c], ir[c])[: x.shape[1]] for c in range(2)])
    return y


def load_sfx(name):
    p = os.path.join(SFX_DIR, name)
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T.astype(np.float64)
    pk = np.abs(a).max() or 1
    # trim leading silence so each effect starts on its cue (files carry 25-1500ms of lead-in)
    onset = int(np.argmax(np.abs(a).max(axis=0) > pk * 0.05))
    a = a[:, max(0, onset - int(0.002 * SR)):]
    return a / pk


# ---------------------------------------------------------------- score
CH = {
    "D": dict(bass=38, pad=[54, 57, 61, 64]),
    "Bm": dict(bass=35, pad=[50, 54, 57, 61]),
    "G": dict(bass=31, pad=[47, 50, 54, 57]),
    "A": dict(bass=33, pad=[49, 52, 57, 59]),
}
CYCLE = ["D", "Bm", "G", "A"]


def chord_at_bar(b):
    return CYCLE[(b - 3) % 4]


NBARS = 30
pads, plucks, basses, drums, bells, fx, verb_send = bus(), bus(), bus(), bus(), bus(), bus(), bus()
kick_times = []

for b in range(NBARS):
    t0 = b * BAR
    if t0 >= DUR:
        break
    c = CH[chord_at_bar(b)]
    final = b >= 27

    # ---- pad (whole bar, overlapping release)
    if b < 27:
        plen = BAR + 0.9
        for j, m in enumerate(c["pad"]):
            x = pad_note(midi(m), plen, seed=b * 10 + j)
            n = x.size
            e = np.ones(n)
            a = int(0.35 * SR)
            e[:a] = np.linspace(0, 1, a)
            r = int(0.9 * SR)
            e[-r:] = np.linspace(1, 0, r)
            place(pads, x * e, t0, pan=(-0.35 if j % 2 else 0.35), gain=0.12)

    # ---- plucked arpeggio
    arp_tones = [m + 12 for m in c["pad"]]
    pattern = [0, 1, 2, 3, 2, 1, 2, 3]
    if b <= 2:            # intro: sparse eighths
        steps, step_dt, vel = 8, 0.25, 0.55
    elif 25 <= b <= 26:   # break
        steps, step_dt, vel = 8, 0.25, 0.6
    elif b < 27:
        steps, step_dt, vel = 16, 0.125, 0.42
    else:
        steps = 0
    for s in range(steps):
        m = arp_tones[pattern[s % 8]] + (12 if (s // 8) % 2 and steps == 16 else 0)
        acc = 1.0 if s % 4 == 0 else 0.75
        place(plucks, pluck(midi(m), dur=1.2, bright=0.8), t0 + s * step_dt,
              pan=(0.45 if s % 2 else -0.45), gain=vel * acc)

    # ---- bass
    if 3 <= b <= 4:
        place(basses, bass_note(midi(c["bass"]), BAR * 0.98), t0, gain=0.45)
    elif 5 <= b <= 24:
        for s in range(8):
            if b in (17, 18) and s % 2:
                continue
            place(basses, bass_note(midi(c["bass"] + (12 if s in (3, 7) else 0)), 0.22), t0 + s * 0.25, gain=0.36)

    # ---- drums
    if 5 <= b <= 16:
        # half-time groove through install + outcomes
        for kt in (0.0, 1.25):
            place(drums, kick(0.9), t0 + kt, gain=0.66)
            kick_times.append(t0 + kt)
        if b >= 10:
            place(drums, clap(0.9), t0 + 1.0, gain=0.8)
            place(verb_send, clap(0.9), t0 + 1.0, gain=0.35)
        for s in range(8):
            place(drums, hat(False, 1.0 if s % 2 else 0.6), t0 + s * 0.25, pan=0.25, gain=1.15)
        if b >= 9:
            for s in range(8):
                place(drums, hat(False, 0.35), t0 + s * 0.25 + 0.125, pan=-0.25, gain=0.85)
    elif b in (17, 18):
        # build into the Codex drop
        for s in range(4):
            place(drums, kick(0.85), t0 + s * 0.5, gain=0.62)
            kick_times.append(t0 + s * 0.5)
        roll = 8 if b == 17 else 16
        for s in range(roll):
            v = 0.25 + 0.75 * ((b - 17) * roll + s) / (roll * 2)
            place(drums, clap(v), t0 + s * (BAR / roll), gain=0.45)
    elif 19 <= b <= 24:
        for s in range(4):
            place(drums, kick(1.0 if b <= 21 else 0.85), t0 + s * 0.5, gain=0.7)
            kick_times.append(t0 + s * 0.5)
        for ct in (0.5, 1.5):
            place(drums, clap(1.0), t0 + ct, gain=0.8)
            place(verb_send, clap(1.0), t0 + ct, gain=0.35)
        for s in range(4):
            place(drums, hat(b <= 21, 0.9), t0 + s * 0.5 + 0.25, pan=0.3, gain=0.75)
        for s in range(8):
            place(drums, hat(False, 0.4), t0 + s * 0.25, pan=-0.3, gain=0.55)

    # ---- bell lead over the drop and the phone
    if 19 <= b <= 24:
        mel = {"D": [81, 78, 76], "Bm": [78, 74, 73], "G": [74, 71, 69], "A": [73, 76, None]}[chord_at_bar(b)]
        for m, bt in zip(mel, (0.0, 0.75, 1.5)):
            if m:
                place(bells, bell(midi(m), 2.2, 0.9), t0 + bt, pan=0.15, gain=0.75)
                place(verb_send, bell(midi(m), 2.2, 0.9), t0 + bt, gain=0.5)
    if 25 <= b <= 26:
        for m, bt in zip((74, 78) if b == 25 else (76, 73), (0.0, 1.0)):
            place(bells, bell(midi(m), 2.6, 0.6), t0 + bt, gain=0.6)
            place(verb_send, bell(midi(m), 2.6, 0.6), t0 + bt, gain=0.6)

# ---- final chord at 54s (end card): tonic, long bloom
t_end = 54.0
fin_len = DUR - t_end
for j, m in enumerate([50, 54, 57, 61, 64, 69]):
    x = pad_note(midi(m), fin_len, seed=900 + j)
    n = x.size
    tt = np.arange(n) / SR
    e = np.minimum(1, tt / 0.08) * np.exp(-tt / 3.2)
    e[-int(0.6 * SR):] *= np.linspace(1, 0, int(0.6 * SR))
    place(pads, x * e, t_end, pan=(-0.4 if j % 2 else 0.4), gain=0.17)
place(basses, bass_note(midi(38), 3.8) * 0.9, t_end, gain=0.42)
for m, dt in ((74, 0.0), (81, 0.02), (86, 0.9)):
    place(bells, bell(midi(m), 4.0, 0.8), t_end + dt, gain=0.7)
    place(verb_send, bell(midi(m), 4.0, 0.8), t_end + dt, gain=0.7)

# ---- transitions / impacts (score side)
place(fx, reverse_swell(1.6), 6.0 - 1.6, gain=0.9)
place(fx, impact(), 6.0, gain=0.55)
place(fx, riser(4.0), 34.0, gain=0.8)
place(fx, impact(), 38.0, gain=0.8)
place(fx, reverse_swell(1.2), 50.0 - 1.2, gain=0.8)
place(fx, reverse_swell(1.4), 54.0 - 1.4, gain=0.7)
place(fx, impact(), 54.0, gain=0.45)

# ---------------------------------------------------------------- mix bus processing
def pad_cutoff(t):
    if t < 6:
        return 900 + 400 * (t / 6)
    if t < 10:
        return 1300 + 1700 * ((t - 6) / 4)
    if t < 34:
        return 4200
    if t < 38:
        return 3000 + 6000 * ((t - 34) / 4) ** 2
    if t < 50:
        return 7000
    if t < 54:
        return 1400
    return 5000


pads = lowpass_auto(pads, pad_cutoff)
plucks = lowpass_auto(plucks, lambda t: 2600 if t < 6 else (4400 if t < 50 else (2200 if t < 54 else 4800)))


def highpass(x, fc, order=2):
    bb, aa = signal.butter(order, fc / (SR / 2), "high")
    return signal.lfilter(bb, aa, x, axis=1)


pads = highpass(pads, 210)
plucks = highpass(plucks, 180)
bells = highpass(bells, 250)
verb_send = highpass(verb_send, 250)

# sidechain duck from kicks on bass + pads
duck = np.ones(N)
for kt in kick_times:
    i0 = int(kt * SR)
    n = int(0.28 * SR)
    if i0 >= N:
        continue
    seg = 1 - 0.45 * np.exp(-np.arange(n) / SR / 0.09)
    n = min(n, N - i0)
    duck[i0:i0 + n] = np.minimum(duck[i0:i0 + n], seg[:n])
basses *= duck
pads *= 0.6 + 0.4 * duck

wet = reverb(pads * 0.35 + plucks * 0.5 + verb_send + bells * 0.2, sec=2.8)
wet = highpass(wet, 200)
music = pads + plucks * 0.9 + basses * 0.9 + drums * 0.8 + bells * 0.85 + fx * 0.8 + wet * 0.55

# section loudness arc: quiet intro, groove, build, peak at the Codex drop, hushed break, resolve
arc_pts = [(0, 0.62), (5.8, 0.7), (6.0, 0.8), (10, 0.8), (19.5, 0.84), (34, 0.9), (38, 1.0), (49.8, 0.98),
           (50.0, 0.62), (53.8, 0.7), (54.0, 0.95), (58.5, 0.95)]
tt = np.arange(N) / SR
arc = np.interp(tt, [p[0] for p in arc_pts], [p[1] for p in arc_pts])
music *= arc
# air: gentle presence lift so the score reads on phone speakers
music += highpass(music, 5500) * 0.35

# ---------------------------------------------------------------- SFX
sfx = bus()
S = {k: load_sfx(k + ".mp3") for k in [
    "click", "click-soft", "key-press", "typing", "whoosh", "whoosh-short", "whoosh-cinematic",
    "pop", "chime", "ping", "sparkle", "notification"]}


def typing_burst(t0, t1, gain=0.22, seed=0):
    r = np.random.RandomState(seed)
    t = t0
    while t < t1:
        place(sfx, S["key-press"], t, pan=r.uniform(-0.2, 0.2), gain=gain * r.uniform(0.7, 1.0))
        t += r.uniform(0.055, 0.095)


# S1
for tw in (0.2, 0.46, 0.72):
    place(sfx, S["pop"], tw, gain=0.08)
place(sfx, S["click"], 2.0, gain=0.35)
place(sfx, S["whoosh-short"], 2.02, gain=0.35)
place(sfx, S["whoosh"], 3.02, gain=0.45)
place(sfx, S["whoosh"], 5.48, gain=0.4)
# S2
place(sfx, S["sparkle"], 6.3, gain=0.22)
place(sfx, S["whoosh"], 9.52, gain=0.4)
# S3 install
place(sfx, S["whoosh-short"], 10.0, gain=0.25)
place(sfx, S["click"], 11.76, gain=0.3)
place(sfx, S["click"], 12.54, gain=0.28)
typing_burst(12.64, 13.2, seed=1)
place(sfx, S["pop"], 13.12, gain=0.12)
place(sfx, S["click"], 13.78, gain=0.3)
place(sfx, S["whoosh-short"], 14.98, gain=0.35)
place(sfx, S["click"], 15.75, gain=0.45)
place(sfx, S["chime"], 16.42, gain=0.3)
place(sfx, S["whoosh-short"], 16.5, gain=0.22)
place(sfx, S["pop"], 16.82, gain=0.14)
place(sfx, S["click-soft"], 17.6, gain=0.35)
place(sfx, S["pop"], 17.84, gain=0.12)
place(sfx, S["pop"], 18.02, gain=0.14)
typing_burst(18.32, 19.24, gain=0.2, seed=2)
place(sfx, S["click"], 19.38, gain=0.35)
place(sfx, S["whoosh-short"], 19.42, gain=0.28)
# S4 outcomes
for t_w in (19.98, 23.3 + 0.8, 26.9 + 0.8, 30.5 + 0.8):
    place(sfx, S["pop"], t_w, gain=0.13)
for t_s in (23.1, 26.7, 30.3):
    place(sfx, S["whoosh"], t_s, gain=0.3)
for i in range(4):
    place(sfx, S["pop"], 24.28 + i * 0.12, gain=0.06)
place(sfx, S["ping"], 28.75, gain=0.16)
place(sfx, S["whoosh"], 33.55, gain=0.4)
# S4b montage
place(sfx, S["whoosh-cinematic"], 34.0, gain=0.22)
for i in range(10):
    place(sfx, S["key-press"], 34.3 + i * 0.1, gain=0.06)
place(sfx, S["whoosh-short"], 36.0, gain=0.3)
# S5 Codex
typing_burst(38.74, 39.8, gain=0.2, seed=3)
place(sfx, S["pop"], 40.27, gain=0.1)
place(sfx, S["pop"], 40.87, gain=0.1)
place(sfx, S["whoosh-short"], 41.18, gain=0.35)
place(sfx, S["click"], 41.8, gain=0.45)
place(sfx, S["whoosh"], 41.95, gain=0.35)
for i, td in enumerate((43.35, 43.70, 44.05)):
    place(sfx, S["ping"], td, gain=0.11)
# S6 phone
place(sfx, S["whoosh-cinematic"], 43.7, gain=0.18)
place(sfx, S["click-soft"], 45.0, gain=0.35)
place(sfx, S["pop"], 46.22, gain=0.12)
place(sfx, S["pop"], 46.95, gain=0.12)
place(sfx, S["whoosh"], 49.5, gain=0.38)
# S7 / S8
place(sfx, S["sparkle"], 50.08, gain=0.18)
place(sfx, S["whoosh-short"], 51.7, gain=0.16)
place(sfx, S["whoosh-short"], 53.1, gain=0.16)
place(sfx, S["whoosh-short"], 53.5, gain=0.22)
place(sfx, S["sparkle"], 54.25, gain=0.16)

# ---------------------------------------------------------------- master
mix = music * 0.9 + sfx * 1.0
# gentle glue compression (RMS follower)
rms = np.sqrt(signal.lfilter([1 - 0.9995], [1, -0.9995], (mix ** 2).mean(axis=0)) + 1e-9)
thr = 0.25
gain = np.where(rms > thr, (thr / rms) ** 0.25, 1.0)
mix *= gain
mix = np.tanh(mix * 0.9) / np.tanh(0.9)
# fade in first 30ms, fade out tail
fi = int(0.03 * SR)
mix[:, :fi] *= np.linspace(0, 1, fi)
fo = int(1.2 * SR)
mix[:, -fo:] *= np.linspace(1, 0, fo) ** 1.5
mix /= np.abs(mix).max() / 0.89

os.makedirs(os.path.dirname(OUT), exist_ok=True)
import wave
import json

tmp = OUT + ".tmp.wav"
pcm = (mix.T * 32767).astype(np.int16)
with wave.open(tmp, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

# two-pass loudness normalisation to -14 LUFS / -1.5 dBTP (social delivery)
m = subprocess.run(["ffmpeg", "-hide_banner", "-i", tmp, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json",
                    "-f", "null", "-"], capture_output=True, text=True).stderr
js = json.loads(m[m.rindex("{"):m.rindex("}") + 1])
af = ("loudnorm=I=-14:TP=-1.5:LRA=11:linear=true:measured_I={input_i}:measured_TP={input_tp}:"
      "measured_LRA={input_lra}:measured_thresh={input_thresh}:offset={target_offset}").format(**js)
subprocess.run(["ffmpeg", "-hide_banner", "-v", "error", "-y", "-i", tmp, "-af", af, "-ar", str(SR), "-c:a", "pcm_s16le", OUT],
               check=True)
os.remove(tmp)
print("wrote", os.path.normpath(OUT), f"{DUR}s")
