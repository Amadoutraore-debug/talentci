"""Music bed + synced sound effects for the 1:00 Octobre Rose video.

Original afro-house groove at 120 BPM (1 bar = 2 s, 30 bars = 60 s), synthesized
from scratch with numpy/scipy. Scene changes in the animation sit on bar lines;
sound-effect cues are read from cues.json (exported from window.CUES).

Outputs (48 kHz stereo WAV): music.wav, sfx.wav, mix.wav
"""
import json, sys
import numpy as np
import scipy.signal as ss
from scipy.io import wavfile
import pyloudnorm as pyln

SR = 48000
DUR = 60.0
N = int(SR * DUR)
BAR, S16 = 2.0, 0.125
rng = np.random.default_rng(7)
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'


def tt(d): return np.arange(int(d * SR)) / SR
def mtof(m): return 440.0 * 2 ** ((m - 69) / 12)
def db(x): return 10 ** (x / 20)
def noise(n): return rng.standard_normal(n)
def filt(x, kind, f, order=2): return ss.sosfilt(ss.butter(order, f, btype=kind, fs=SR, output='sos'), x)
def norm(x): m = np.max(np.abs(x)); return x / m if m > 0 else x


def place(bus, sig, t0, gain=1.0, pan=0.0):
    """Add a mono (n,) or stereo (2,n) signal to a stereo bus at time t0 (equal-power pan)."""
    i = int(round(t0 * SR))
    if i >= N: return
    if sig.ndim == 1:
        a = (pan + 1) * np.pi / 4
        sig = np.vstack([sig * np.cos(a), sig * np.sin(a)]) * np.sqrt(2)
    if i < 0: sig, i = sig[:, -i:], 0
    n = min(sig.shape[1], N - i)
    bus[:, i:i + n] += sig[:, :n] * gain


def reverb_ir(d=2.4, tau=0.36, lp=6000):
    t = tt(d)
    ir = np.vstack([noise(len(t)), noise(len(t))]) * np.exp(-t / tau)
    ir = np.vstack([filt(ir[0], 'low', lp), filt(ir[1], 'low', lp)])
    ir[:, :int(.02 * SR)] = 0                      # 20 ms pre-delay
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


IR = reverb_ir()
def reverb(bus): return np.vstack([ss.fftconvolve(bus[c], IR[c])[:N] for c in range(2)])


# ---------------------------------------------------------------- harmony
# Uplifting IV–V–iii–vi loop in C, resolving to C on the last bar.
#            Fmaj9                 G6                    Em9                   Am9                   Cadd9
VOICINGS = [[53, 57, 60, 64, 67], [55, 59, 62, 64, 67], [52, 55, 59, 62, 66], [57, 60, 64, 67, 71], [55, 60, 62, 64, 67]]
ROOTS = [41, 43, 40, 45, 48]                        # F2 G2 E2 A2 C3
MELODY = [[(0, 72), (2, 76), (3, 77), (5, 76), (6, 72)],
          [(0, 74), (2, 79), (3, 81), (5, 79), (6, 74)],
          [(0, 71), (2, 74), (3, 76), (5, 74), (6, 71)],
          [(0, 76), (2, 79), (3, 81), (5, 79), (6, 76)],
          [(0, 72), (2, 76), (3, 79), (5, 76), (6, 72)]]
def chord(bar): return 4 if bar >= 29 else bar % 4  # promo drop (bar 16) = F, last bar = C


def section(bar):
    for lim, name in [(2, 'intro'), (6, 'name'), (11, 'A'), (15, 'B'), (16, 'build'), (20, 'drop'),
                      (26, 'B'), (29, 'outro')]:
        if bar < lim: return name
    return 'end'


# ---------------------------------------------------------------- instruments
def keys_note(f, d=1.6, tau=1.1, vel=1.0):
    t = tt(d)
    idx = 2.0 * np.exp(-t / 0.22) + 0.35
    mod = np.sin(2 * np.pi * f * t)
    car = np.sin(2 * np.pi * f * t + idx * mod)
    tine = 0.18 * np.sin(2 * np.pi * f * 7.0 * t) * np.exp(-t / 0.05)
    env = np.minimum(t / 0.004, 1) * np.exp(-t / tau)
    y = (car + tine) * env * vel
    y[-int(.05 * SR):] *= np.linspace(1, 0, int(.05 * SR))
    return y


def keys_chord(notes, d, tau, vel=1.0, roll=0.0, gate=None):
    L = np.zeros(int((d + roll * len(notes) + .05) * SR)); R = np.zeros_like(L)
    for k, m in enumerate(notes):
        f = mtof(m)
        yl = keys_note(f, d, tau, vel); yr = keys_note(f * 1.0015, d, tau, vel)
        if gate:                                    # short stab: release after `gate` s
            g = np.ones(len(yl)); a = int(gate * SR); r = int(.09 * SR)
            g[a:a + r] = np.linspace(1, 0, r)[:max(0, len(g) - a)]; g[a + r:] = 0
            yl *= g; yr *= g
        i = int(k * roll * SR)
        L[i:i + len(yl)] += yl * (1 - k * .03); R[i:i + len(yr)] += yr * (1 - k * .03)
    return np.vstack([L, R]) / len(notes)


def saw(f, t, ph=0.0): return 2 * ((f * t + ph) % 1.0) - 1


def pad_bar(notes, d=2.6):
    t = tt(d)
    y = np.zeros((2, len(t)))
    for m in notes:
        f = mtof(m)
        for k, det in enumerate([-0.12, 0.0, 0.11]):
            ff = f * 2 ** (det / 12)
            s = saw(ff, t, rng.random())
            y[k % 2] += s; y[(k + 1) % 2] += s * .6
    env = np.minimum(t / 0.35, 1) * np.minimum(np.maximum((d - t) / 0.6, 0), 1)
    return y * env / (len(notes) * 3)


def bass_note(f, d):
    t = tt(d + .08)
    y = np.sin(2 * np.pi * f * t) + 0.45 * np.sin(4 * np.pi * f * t) + 0.12 * np.sin(6 * np.pi * f * t)
    env = np.minimum(t / 0.006, 1) * (0.72 + 0.28 * np.exp(-t / 0.12))
    rel = np.clip((d + .08 - t) / .08, 0, 1)
    return np.tanh(1.6 * y * env * rel)


def kick():
    t = tt(0.45)
    f = 44 + 120 * np.exp(-t / 0.032)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.26)
    click = filt(noise(len(t)), 'high', 3000) * np.exp(-t / 0.0025) * 0.35
    return norm(np.tanh(1.4 * (y + click)))


def clap():
    t = tt(0.4); y = np.zeros(len(t)); n = noise(len(t))
    for k, o in enumerate([0, .011, .022]):
        i = int(o * SR); e = np.exp(-(t[:len(t) - i]) / 0.007)
        y[i:] += n[:len(t) - i] * e
    y += n * np.exp(-t / 0.11) * 0.45
    return norm(filt(y, 'band', [900, 4200]))


def hat(open_=False):
    t = tt(0.3 if open_ else 0.06)
    y = filt(noise(len(t)), 'high', 7500, 4) * np.exp(-t / (0.09 if open_ else 0.018))
    return norm(y)


def shaker():
    t = tt(0.09)
    env = np.minimum(t / 0.008, 1) * np.exp(-t / 0.035)
    return norm(filt(noise(len(t)), 'band', [4500, 11000]) * env)


def conga(f):
    t = tt(0.3)
    fr = f * (1 + 0.35 * np.exp(-t / 0.012))
    y = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t / 0.1)
    y += 0.25 * filt(noise(len(t)), 'band', [1500, 5000]) * np.exp(-t / 0.004)
    return norm(y)


def marimba(f, d=1.2, tau=0.38):
    t = tt(d)
    y = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / 0.05)
    y += 0.08 * np.sin(2 * np.pi * f * 10 * t) * np.exp(-t / 0.012)
    return y * np.minimum(t / 0.002, 1) * np.exp(-t / tau)


# ---------------------------------------------------------------- arrangement
drums, bass, keys, pad, mel = (np.zeros((2, N)) for _ in range(5))
KICK, CLAP, HATC, HATO, SHK = kick(), clap(), hat(), hat(True), shaker()
CONG_H, CONG_L = conga(340), conga(225)
kick_times = []

for bar in range(30):
    s, c, t0 = section(bar), chord(bar), bar * BAR
    groove = s in ('A', 'B', 'drop')
    # --- drums
    if s in ('name', 'A', 'B', 'light', 'build', 'drop', 'outro'):
        for b in range(4):
            if s == 'build' and b % 2: continue
            place(drums, KICK, t0 + b * .5, db(-5)); kick_times.append(t0 + b * .5)
    if groove:
        for p in (4, 12): place(drums, CLAP, t0 + p * S16, db(-13), .1)
        for p in (3, 11): place(drums, CONG_H, t0 + p * S16, db(-17), .35)
        for p in (6, 14): place(drums, CONG_L, t0 + p * S16, db(-16), -.3)
        for p in (7, 15): place(drums, CONG_H, t0 + p * S16, db(-26), .35)
    if groove or s == 'outro':
        for p in (2, 6, 10, 14): place(drums, HATO, t0 + p * S16, db(-22), -.2)
    if s in ('B', 'drop'):
        for p in range(16): place(drums, HATC, t0 + p * S16, db(-29 if p % 2 == 0 else -25), .25)
    if s != 'intro' and s != 'end':
        lvl = {'name': -30, 'break': -27, 'light': -24, 'build': -24}.get(s, -23)
        for p in range(16):
            acc = 0 if p % 4 == 2 else (-5 if p % 2 else -9)
            swing = .018 if p % 2 else 0
            place(drums, SHK, t0 + p * S16 + swing, db(lvl + acc), .45)
    if s == 'build':                                  # clap roll into the slogan drop
        for p in range(8, 16):
            place(drums, CLAP, t0 + p * S16, db(-26 + (p - 8) * 1.6), 0)
    # --- bass
    if s in ('name', 'A', 'B', 'drop', 'outro'):
        pat = [(0, 2, 0), (3, 1, 0), (6, 2, 12), (10, 2, 0), (13, 1, 7), (14, 2, 0)] if s != 'name' else [(0, 6, 0), (8, 6, 0)]
        for p, ln, st in pat:
            place(bass, bass_note(mtof(ROOTS[c] + st - 12), ln * S16 * .9), t0 + p * S16, db(-8))
    # --- keys
    if groove:
        for p, ln in [(3, 1), (6, 1.5), (10, 1), (14, 1.5)]:
            place(keys, keys_chord(VOICINGS[c], .6, .5, gate=ln * S16), t0 + p * S16, db(-6))
    elif s in ('intro', 'name', 'break', 'light', 'end', 'outro', 'build'):
        v = {'intro': -1, 'name': -5, 'break': -1, 'light': -2, 'end': -2, 'outro': -5, 'build': -6}[s]
        place(keys, keys_chord(VOICINGS[c], 3.4 if s != 'end' else 2.6, 1.6, roll=.035), t0, db(v))
        if s in ('break', 'light', 'outro'):
            place(keys, keys_chord(VOICINGS[c][2:], 1.6, .9, roll=.03), t0 + 1.5, db(v - 6))
    # --- pad
    pv = {'intro': -7, 'name': -12, 'A': -17, 'B': -16, 'break': -8, 'light': -6, 'build': -8, 'drop': -14, 'outro': -11, 'end': -7}[s]
    place(pad, pad_bar([m - 12 for m in VOICINGS[c][:3]] + VOICINGS[c][3:]), t0 - .2, db(pv))
    # --- marimba melody
    if s in ('B', 'drop'):
        for p, m in MELODY[c]:
            g = db(-9 if s == 'drop' else -11) * (1 - .12 * (p % 2))
            place(mel, marimba(mtof(m)), t0 + p * .25, g, .3)
            if s == 'drop': place(mel, marimba(mtof(m - 12)), t0 + p * .25, g * .5, -.3)

# pad brightness: dark lowpass in intro/break, opens up elsewhere
bright = np.interp(np.arange(N) / SR, [0, 4, 12, 30, 32, 40, 52, 58, 60], [.2, .45, .55, .8, 1, .75, .7, .6, .45])
pad_d = np.vstack([filt(pad[c], 'low', 700) for c in range(2)])
pad_b = np.vstack([filt(pad[c], 'low', 2600) for c in range(2)])
pad = pad_d * (1 - bright) + pad_b * bright

# sidechain pumping from the kick
t = np.arange(N) / SR
duck = np.ones(N)
for k in kick_times:
    i = int(k * SR); n = int(.35 * SR)
    seg = 1 - np.exp(-t[:n] / .11)
    duck[i:i + n] = np.minimum(duck[i:i + n], .35 + .65 * seg[:len(duck[i:i + n])])
pad *= .5 + .5 * duck; keys *= .7 + .3 * duck; bass *= .45 + .55 * duck

music = drums + bass + keys * 1.0 + pad + mel
music += reverb(keys * .25 + pad * .3 + mel * .35 + drums * .06) * .5
music = np.vstack([filt(music[c], 'high', 30) for c in range(2)])
fade = np.interp(t, [0, .05, 58.6, 60], [0, 1, 1, 0])
music *= fade

# ---------------------------------------------------------------- sound effects
def stft_sweep(d, f0, f1, curve=1.5, bwr=.55):
    n = int(d * SR); x = noise(n)
    f, tm, Z = ss.stft(x, fs=SR, nperseg=1024, noverlap=768)
    p = np.clip(tm / d, 0, 1) ** curve
    fc = f0 * (f1 / f0) ** p
    G = np.exp(-.5 * ((f[:, None] - fc[None, :]) / (fc[None, :] * bwr)) ** 2)
    _, y = ss.istft(Z * G, fs=SR, nperseg=1024, noverlap=768)
    return norm(y[:n])


def fx_whoosh():
    d = .7; y = stft_sweep(d, 350, 5200, 1.3)
    t = tt(d); pk = .45
    env = np.where(t < pk, (t / pk) ** 2.4, np.exp(-(t - pk) / .09))
    return norm(y * env)


def fx_swoosh():
    d = .38; y = stft_sweep(d, 2600, 700, .8, .5); t = tt(d)
    return norm(y * np.minimum(t / .07, 1) * np.exp(-np.maximum(t - .07, 0) / .09))


def fx_riser(d):
    y = stft_sweep(d, 280, 7000, 1.6, .35); t = tt(d); p = t / d
    y = y + .35 * np.sin(2 * np.pi * np.cumsum(180 * 4 ** p) / SR)
    env = p ** 2.4; env[-int(.01 * SR):] *= np.linspace(1, 0, int(.01 * SR))
    return norm(y * env)


def fx_impact(big=True):
    d = 1.8 if big else .5; t = tt(d)
    f = 30 + 75 * np.exp(-t / .09)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (.5 if big else .14))
    nz = filt(noise(len(t)), 'low', 1800) * np.exp(-t / .05) * (.7 if big else .35)
    body = filt(noise(len(t)), 'band', [140, 900]) * np.exp(-t / .16) * (.5 if big else .2)
    return norm(np.tanh(1.6 * (sub + nz + body)))


def fx_tick():
    t = tt(.06)
    y = np.sin(2 * np.pi * 2300 * t) * np.exp(-t / .009) + .35 * filt(noise(len(t)), 'high', 5000) * np.exp(-t / .003)
    return norm(y)


def fx_pop(f0=1050, f1=440, tau=.035):
    t = tt(.14)
    f = f1 + (f0 - f1) * np.exp(-t / .018)
    return norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(t / .002, 1) * np.exp(-t / tau))


def fx_marker():
    d = .5; t = tt(d)
    y = filt(noise(len(t)), 'band', [1800, 6000]) * (.55 + .45 * np.sin(2 * np.pi * 26 * t))
    return norm(y * np.minimum(t / .03, 1) * np.clip((d - t) / .12, 0, 1))


def fx_step():
    t = tt(.1)
    y = (np.sin(2 * np.pi * 620 * t) + .5 * np.sin(2 * np.pi * 1310 * t)) * np.exp(-t / .016)
    return norm(y + .2 * filt(noise(len(t)), 'band', [800, 3000]) * np.exp(-t / .006))


def fx_shutter():
    y = np.zeros(int(.2 * SR)); t = tt(.012)
    c = filt(noise(len(t)), 'band', [1800, 8000]) * np.exp(-t / .0025)
    y[:len(c)] += c; y[int(.075 * SR):int(.075 * SR) + len(c)] += c * .8
    tl = tt(.05); y[:len(tl)] += .5 * np.sin(2 * np.pi * 170 * tl) * np.exp(-tl / .012)
    return norm(y)


def fx_shimmer(bar):
    y = np.zeros(int(2.2 * SR))
    tones = [m + 12 for m in VOICINGS[chord(bar)]] + [m + 24 for m in VOICINGS[chord(bar)][1:]]
    for k in range(14):
        m = tones[k % len(tones)]; o = rng.random() * .8
        s = marimba(mtof(m), 1.3, .45) * (.6 + .4 * rng.random())
        i = int(o * SR); y[i:i + len(s)] += s[:len(y) - i]
    return norm(y)


def fx_notes(t0, idx):
    """Chord-tone marimba note(s) that fit the harmony at time t0."""
    v = VOICINGS[chord(int(t0 // BAR))]
    if idx == 0:
        return norm(marimba(mtof(v[-1] + 12), 1.4, .45) + .6 * marimba(mtof(v[-3] + 12), 1.4, .45))
    return norm(marimba(mtof([69, 72, 76][idx - 1]), 1.4, .5))


cues = json.load(open(f'{OUT}/cues.json'))
sfx = np.zeros((2, N)); sfx_wet = np.zeros((2, N))
BASE = {'whoosh': -8, 'thump': -16, 'impact': -8, 'tick': -16, 'pop': -12, 'bubble': -16, 'swoosh': -13,
        'marker': -14, 'step': -12, 'note1': -10, 'note2': -10, 'note3': -10, 'pluck': -11, 'shutter': -11,
        'shimmer': -12, 'riser': -8}
SFX_TRIM = -4
WET = {'impact': .35, 'shimmer': .5, 'pluck': .4, 'note1': .4, 'note2': .4, 'note3': .4, 'whoosh': .15, 'riser': .2, 'pop': .1}
cache = {}
for q in cues:
    ty, t0, g, pan = q['type'], q['t'], q['gain'], q['pan']
    if ty == 'whoosh':
        s = fx_whoosh()
        a = np.linspace(-pan * .8, pan * .8, len(s)) * np.pi / 4 + np.pi / 4   # pan sweep with the panels
        s = np.vstack([s * np.cos(a), s * np.sin(a)]) * np.sqrt(2)
    elif ty == 'riser':
        s = fx_riser(np.ceil((t0 + .01) / BAR) * BAR - t0)
    elif ty == 'shimmer': s = fx_shimmer(int(t0 // BAR))
    elif ty == 'pluck': s = fx_notes(t0, 0)
    elif ty.startswith('note'): s = fx_notes(t0, int(ty[-1]))
    else:
        if ty not in cache:
            cache[ty] = {'thump': lambda: fx_impact(False), 'impact': fx_impact, 'tick': fx_tick, 'pop': fx_pop,
                         'bubble': lambda: fx_pop(1500, 820, .022), 'swoosh': fx_swoosh, 'marker': fx_marker,
                         'step': fx_step, 'shutter': fx_shutter}[ty]()
        s = cache[ty]
    gain = db(BASE[ty] + SFX_TRIM) * g
    place(sfx, s, t0, gain, pan if s.ndim == 1 else 0)
    if ty in WET: place(sfx_wet, s, t0, gain * WET[ty], pan if s.ndim == 1 else 0)
sfx += reverb(sfx_wet) * .6
sfx *= fade

# ---------------------------------------------------------------- loudness & export
meter = pyln.Meter(SR)
def lufs(x): return meter.integrated_loudness(x.T)
music *= db(-19 - lufs(music))          # music bed leaves room for a voice-over
mix = music + sfx
mix *= db(-15 - lufs(mix))
T = db(-1)                               # soft limiter: ceiling at -1 dBFS, ~linear below
mix = T * np.tanh(mix / T)
print(f'music {lufs(music):.1f} LUFS | sfx peak {20*np.log10(np.max(np.abs(sfx))):.1f} dBFS | mix {lufs(mix):.1f} LUFS, peak {20*np.log10(np.max(np.abs(mix))):.1f} dBFS')
scale = db(-15 - lufs(music + sfx))
for name, x in [('music', music * scale), ('sfx', sfx * scale), ('mix', mix)]:
    wavfile.write(f'{OUT}/{name}.wav', SR, (np.clip(x, -1, 1).T * 32767).astype(np.int16))
