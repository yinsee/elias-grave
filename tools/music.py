#!/usr/bin/env python3
"""Generate game music with ACE-Step v1 (3.5B) through the local ComfyUI HTTP API.

usage:
  tools/music.py                                  # every job in assets/prompts/audio_music.json
  tools/music.py --only title,docks_explore       # some jobs
  tools/music.py --jobs other.json --force        # re-make files that exist
  tools/music.py --check                          # print ffprobe/level stats of the files only

A job: {"id": "docks_explore", "tags": "...", "lyrics": "[instrumental]", "seconds": 80,
        "seeds": [11, 12], "loop": true, "xfade": 4.0, "steps": 50, "cfg": 5.0, "lyrics_strength": 1.0}

Per seed it writes:
  assets/audio/music/<id>_s<seed>.ogg        the full track (Opus, loudness-normalised)
  assets/audio/music/<id>_s<seed>.loop.ogg   when "loop": a seamless loop (tail cross-faded into the head)
The raw FLAC from ComfyUI stays in assets/audio/.cache/ (git-ignored).
The STYLE string is appended to every job's tags so all tracks sound like one score.
"""
import argparse, json, os, re, subprocess, sys, time, urllib.request, uuid

import numpy as np
import soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOST = os.environ.get('COMFY', 'http://127.0.0.1:8388')
OUT = os.path.join(ROOT, 'assets/audio/music')
CACHE = os.path.join(ROOT, 'assets/audio/.cache/music')
CKPT = 'ace_step_v1_3.5b.safetensors'
STYLE = 'dark industrial, cold, tense, cinematic, high quality mix'
REENCODE = False
LUFS = -16.0          # target loudness of every track (EBU R128 integrated)


def post(path, data):
    req = urllib.request.Request(HOST + path, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req))


def get(path):
    return urllib.request.urlopen(HOST + path, timeout=30).read()


def wait_server(limit=300):
    t0 = time.time()
    while time.time() - t0 < limit:
        try:
            get('/system_stats'); return True
        except Exception:
            time.sleep(5)
    sys.exit(f'ComfyUI at {HOST} does not answer after {limit} s')


def workflow(job, seed):
    tags = f"{job['tags']}, {STYLE}"
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': CKPT}},
        '2': {'class_type': 'ModelSamplingSD3', 'inputs': {'model': ['1', 0], 'shift': job.get('shift', 5.0)}},
        '3': {'class_type': 'LatentOperationTonemapReinhard', 'inputs': {'multiplier': 1.0}},
        '4': {'class_type': 'LatentApplyOperationCFG', 'inputs': {'model': ['2', 0], 'operation': ['3', 0]}},
        '5': {'class_type': 'TextEncodeAceStepAudio', 'inputs': {'clip': ['1', 1], 'tags': tags, 'lyrics': job.get('lyrics', '[instrumental]'),
                                                                 'lyrics_strength': job.get('lyrics_strength', 1.0)}},
        '6': {'class_type': 'ConditioningZeroOut', 'inputs': {'conditioning': ['5', 0]}},
        '7': {'class_type': 'EmptyAceStepLatentAudio', 'inputs': {'seconds': float(job['seconds']), 'batch_size': 1}},
        '8': {'class_type': 'KSampler', 'inputs': {'model': ['4', 0], 'positive': ['5', 0], 'negative': ['6', 0], 'latent_image': ['7', 0],
                                                   'seed': seed, 'steps': job.get('steps', 50), 'cfg': job.get('cfg', 5.0),
                                                   'sampler_name': 'euler', 'scheduler': 'simple', 'denoise': 1.0}},
        '9': {'class_type': 'VAEDecodeAudio', 'inputs': {'samples': ['8', 0], 'vae': ['1', 2]}},
        '10': {'class_type': 'SaveAudio', 'inputs': {'audio': ['9', 0], 'filename_prefix': f"audio/elias_{job['id']}_s{seed}"}},
    }


def render(job, seed, out, timeout=1500):
    pid = post('/prompt', {'prompt': workflow(job, seed), 'client_id': str(uuid.uuid4())})['prompt_id']
    t0 = time.time()
    while time.time() - t0 < timeout:
        hist = json.loads(get(f'/history/{pid}'))
        if pid in hist:
            st = hist[pid].get('status', {})
            if st.get('status_str') == 'error':
                raise RuntimeError(json.dumps(st)[:800])
            for node in hist[pid]['outputs'].values():
                for a in node.get('audio', []):
                    q = f"/view?filename={urllib.request.quote(a['filename'])}&subfolder={urllib.request.quote(a['subfolder'])}&type={a['type']}"
                    os.makedirs(os.path.dirname(out), exist_ok=True)
                    open(out, 'wb').write(get(q))
                    return time.time() - t0
        time.sleep(2)
    raise TimeoutError(out)


def trim_silence(x, sr, floor_db=-50):
    """Cut leading/trailing near-silence (ACE-Step often ends with a tail of quiet)."""
    env = np.abs(x).max(axis=1)
    thr = 10 ** (floor_db / 20) * max(env.max(), 1e-9)
    idx = np.where(env > thr)[0]
    if not len(idx):
        return x
    return x[idx[0]: min(len(x), idx[-1] + int(0.05 * sr))]


def make_loop(x, sr, xfade):
    """Seamless loop: loop = x[c:L-c] + (x[L-c:] faded out + x[:c] faded in). Its end flows into x[c], its own start."""
    c = int(xfade * sr)
    if len(x) < 4 * c:
        raise ValueError('track too short for the cross-fade')
    t = np.linspace(0, np.pi / 2, c)[:, None]
    seam = x[-c:] * np.cos(t) + x[:c] * np.sin(t)     # equal-power cross-fade
    return np.concatenate([x[c:-c], seam])


def encode(src_wav, out, fade_out=0.0, dur=None, lufs=LUFS, bitrate='160k', pre_af='', channels=None):
    """Two-pass loudnorm to `lufs`, true peak -1.5 dB, Opus in Ogg. pre_af: ffmpeg filters run before the loudness pass."""
    pre = pre_af + ',' if pre_af else ''
    meas = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', src_wav, '-af', f'{pre}loudnorm=I={lufs}:TP=-1.5:LRA=11:print_format=json',
                           '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(meas[meas.rindex('{'):meas.rindex('}') + 1])
    af = (f"{pre}loudnorm=I={lufs}:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true,aresample=48000,alimiter=limit=0.75:level=false")   # limiter: loudnorm alone can still overshoot
    if fade_out and dur:   # the full (non-loop) version ends with a short fade, the loop must not
        af += f',afade=t=out:st={max(0, dur - fade_out):.2f}:d={fade_out}'
    os.makedirs(os.path.dirname(out), exist_ok=True)
    trim = 0.0
    for _ in range(3):   # Opus can overshoot dense, distorted material by 2-3 dB: measure the decoded file, turn down, retry
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', src_wav, '-af', af + (f',volume={trim:.2f}dB' if trim else ''),
                        '-ar', '48000'] + (['-ac', str(channels)] if channels else []) + ['-c:a', 'libopus', '-b:a', bitrate, '-vbr', 'on', out], check=True)
        peak = stats(out)['peak_db']
        if peak <= -1.0:
            break
        trim -= peak + 1.5


def stats(path):
    """Duration, peak and RMS (dBFS), and the share of near-silent 100 ms blocks."""
    x, sr = sf.read(path, always_2d=True)
    mono = x.mean(axis=1)
    blk = int(0.1 * sr)
    n = len(mono) // blk
    rms_blocks = np.sqrt((mono[:n * blk].reshape(n, blk) ** 2).mean(axis=1) + 1e-12)
    db = lambda v: 20 * np.log10(max(v, 1e-9))
    return {'file': os.path.relpath(path, ROOT), 'dur': round(len(mono) / sr, 2), 'peak_db': round(db(np.abs(x).max()), 1),
            'rms_db': round(db(np.sqrt((mono ** 2).mean())), 1), 'silent_pct': round(100 * float((rms_blocks < 10 ** (-50 / 20)).mean()), 1)}


def health(x, sr):
    """(share of spectrum below 500 Hz, mean spectral change between 1 s blocks).
    ACE-Step sometimes renders a frozen high whine (about 15 kHz) for the whole track: low < 0.05 and change < 0.02."""
    m = x.mean(axis=1)
    n = len(m) // sr
    blocks = m[:n * sr].reshape(n, sr)
    S = np.abs(np.fft.rfft(blocks * np.hanning(sr), axis=1))
    fr = np.fft.rfftfreq(sr, 1 / sr)
    Sn = S / (np.linalg.norm(S, axis=1, keepdims=True) + 1e-12)
    return float(S[:, fr < 500].sum() / S.sum()), float(np.mean(1 - (Sn[1:] * Sn[:-1]).sum(axis=1)))


def process(job, seed, force=False):
    """Render (or reuse the cached FLAC), reject a degenerate render, encode full + loop. Returns False on a reject."""
    base = f"{job['id']}_s{seed}"
    full, loop = os.path.join(OUT, base + '.ogg'), os.path.join(OUT, base + '.loop.ogg')
    raw = os.path.join(CACHE, base + '.flac')
    want_loop = job.get('loop', False)
    if not force and not REENCODE and os.path.exists(full) and (os.path.exists(loop) or not want_loop):
        print('skip', base); return True
    if force or not os.path.exists(raw):
        dt = render(job, seed, raw)
        print(f'rendered {base} in {dt:.0f} s', flush=True)
    x, sr = sf.read(raw, always_2d=True)
    low, change = health(x, sr)
    if low < 0.05 or change < 0.02:
        print(f'REJECT {base}: degenerate render (low-band share {low:.3f}, spectral change {change:.4f})', flush=True)
        return False
    x = trim_silence(x, sr)
    tmp = os.path.join(CACHE, base + '.trim.wav')
    sf.write(tmp, x, sr)
    encode(tmp, full, fade_out=job.get('fade_out', 3.0), dur=len(x) / sr)
    if want_loop:
        lp = os.path.join(CACHE, base + '.loop.wav')
        sf.write(lp, make_loop(x, sr, job.get('xfade', 4.0)), sr)
        encode(lp, loop)
    for f in [full] + ([loop] if want_loop else []):
        print(json.dumps(stats(f)), flush=True)
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--jobs', default=os.path.join(ROOT, 'assets/prompts/audio_music.json'))
    ap.add_argument('--only', default='')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--reencode', action='store_true', help='rebuild the .ogg files from the cached FLAC, no new render')
    a = ap.parse_args()
    global REENCODE
    REENCODE = a.reencode
    jobs = json.load(open(a.jobs))['jobs']
    only = set(filter(None, a.only.split(',')))
    jobs = [j for j in jobs if not only or j['id'] in only]
    if not a.check:
        wait_server()
        os.makedirs(CACHE, exist_ok=True)
        os.makedirs(OUT, exist_ok=True)
        for job in jobs:
            for seed in job['seeds']:
                for k in range(4):   # a rejected seed is replaced by seed+1000, seed+2000 ...
                    if process(job, seed + 1000 * k, a.force):
                        break
    write_index(json.load(open(a.jobs))['jobs'], verbose=a.check)


def write_index(jobs, verbose=False):
    """assets/audio/music/index.json: every candidate file with its job, seed and level stats (read by tests/audio.html)."""
    rows = []
    for job in jobs:
        seeds = sorted({int(f[len(job['id']) + 2:].split('.')[0]) for f in os.listdir(OUT)
                        if re.fullmatch(re.escape(job['id']) + r'_s\d+(\.loop)?\.ogg', f)})
        for seed in seeds:
            for suffix in ('.ogg', '.loop.ogg'):
                f = os.path.join(OUT, f"{job['id']}_s{seed}{suffix}")
                if os.path.exists(f):
                    rows.append({'id': job['id'], 'seed': seed, 'loop': suffix == '.loop.ogg', 'use': job.get('use', ''), **stats(f)})
                    if verbose:
                        print(json.dumps(rows[-1]))
    json.dump(rows, open(os.path.join(OUT, 'index.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
