#!/usr/bin/env python3
"""Generate character voice lines with F5-TTS (MLX) from a JSON script, then check the words with whisper.cpp.

usage:
  tools/voice.py --refs                       # (re)build every reference clip assets/audio/voices/<speaker>/ref.wav + ref.txt
  tools/voice.py                              # generate missing lines -> assets/audio/voice/<id>.ogg, then check them
  tools/voice.py --only marchetti_intro_01 --force
  tools/voice.py --check                      # whisper.cpp transcript + word error rate of every line

Script: assets/prompts/audio_voice.json
  voices: {speaker: {say_voice, say_rate, pitch_st, ref_fx, ref_text, speed}}
     A reference is a macOS `say` voice, pitch-shifted (rubberband) and coloured with ffmpeg filters.
     F5-TTS clones the timbre of that reference for every line, so each character keeps one fixed voice.
  moods:  {mood: {speed, fx}}               speed scales the line duration; fx is an ffmpeg filter chain (radio, whisper ...)
  lines:  [{id, speaker, mood, text, say?, seed?}]  `say` is the spoken text when it differs from the caption
                                                    (spelling hints for names, e.g. "Club Nwahr")
"""
import argparse, functools, json, os, re, shutil, subprocess, sys, tempfile

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from music import encode, ROOT  # noqa: E402

SCRIPT = os.path.join(ROOT, 'assets/prompts/audio_voice.json')
VOICES = os.path.join(ROOT, 'assets/audio/voices')
OUT = os.path.join(ROOT, 'assets/audio/voice')
CACHE = os.path.join(ROOT, 'assets/audio/.cache/voice')
WHISPER_MODELS = [os.environ.get('WHISPER_MODEL', ''), os.path.expanduser('~/.cache/whisper/ggml-small.en.bin'),
                  os.path.expanduser('~/Works/vibecode/renarrate/models/whisper-cpp/ggml-small.en.bin'),
                  os.path.expanduser('~/.cache/whisper/ggml-base.en.bin')]
SR = 24000


def sh(*cmd):
    subprocess.run(cmd, check=True, capture_output=True)


def build_ref(name, v):
    """macOS say -> 24 kHz mono -> pitch shift (formants move with it) -> colour filters -> ref.wav (+ ref.txt)."""
    d = os.path.join(VOICES, name)
    os.makedirs(d, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        aiff = os.path.join(tmp, 'say.aiff')
        sh('say', '-v', v['say_voice'], '-r', str(v.get('say_rate', 170)), '-o', aiff, v['ref_text'])
        ratio = 2 ** (v.get('pitch_st', 0) / 12)
        af = f"rubberband=pitch={ratio:.4f}:formant=shifted"
        if v.get('ref_fx'):
            af += ',' + v['ref_fx']
        af += ',silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse'
        af += ',loudnorm=I=-20:TP=-2'
        sh('ffmpeg', '-y', '-loglevel', 'error', '-i', aiff, '-af', af, '-ar', str(SR), '-ac', '1', os.path.join(d, 'ref.wav'))
    open(os.path.join(d, 'ref.txt'), 'w').write(v['ref_text'] + '\n')
    x, _ = sf.read(os.path.join(d, 'ref.wav'))
    print(f'ref {name}: {len(x) / SR:.1f} s')


@functools.lru_cache(maxsize=1)
def f5():
    import f5_tts_mlx.generate as G
    G.F5TTS.from_pretrained = functools.lru_cache(maxsize=2)(G.F5TTS.from_pretrained)   # load the model once per run
    return G


def synth(line, voice, mood, wav, seed):
    G = f5()
    ref = os.path.join(VOICES, line['speaker'], 'ref.wav')
    ref_text = open(os.path.join(VOICES, line['speaker'], 'ref.txt')).read().strip()
    G.generate(generation_text=line.get('say', line['text']), ref_audio_path=ref, ref_audio_text=ref_text,
               speed=voice.get('speed', 1.0) * mood.get('speed', 1.0), seed=seed,
               steps=line.get('steps', 16), output_path=wav)


def post(wav, out, voice, mood):
    """Trim silence, add the mood filters (radio, whisper ...), normalise to -18 LUFS, mono Opus 64k."""
    fx = ['silenceremove=start_periods=1:start_threshold=-45dB', 'areverse',
          'silenceremove=start_periods=1:start_threshold=-45dB', 'areverse',
          'highpass=f=70', 'adelay=60', 'apad=pad_dur=0.25']
    if voice.get('line_pitch_st'):   # clones drift toward ~95 Hz; push each speaker back to his own register
        fx.append(f"rubberband=pitch={2 ** (voice['line_pitch_st'] / 12):.4f}:formant=shifted")
    for f in (voice.get('line_fx'), mood.get('fx')):
        if f:
            fx.append(f)
    encode(wav, out, lufs=mood.get('lufs', -18), bitrate='64k', pre_af=','.join(fx), channels=1)


def median_f0(path):
    import librosa
    y, sr = librosa.load(path, sr=16000)
    f0, _, _ = librosa.pyin(y, fmin=50, fmax=400, sr=sr)
    f0 = f0[~np.isnan(f0)]
    return float(np.median(f0)) if len(f0) else 0.0


def words(s):
    return re.sub(r"[^a-z0-9' ]", ' ', s.lower().replace('-', ' ')).split()


def wer(ref, hyp):
    r, h = words(ref), words(hyp)
    d = np.zeros((len(r) + 1, len(h) + 1), int)
    d[:, 0] = range(len(r) + 1); d[0, :] = range(len(h) + 1)
    for i in range(1, len(r) + 1):
        for j in range(1, len(h) + 1):
            d[i, j] = min(d[i - 1, j] + 1, d[i, j - 1] + 1, d[i - 1, j - 1] + (r[i - 1] != h[j - 1]))
    return d[-1, -1] / max(1, len(r))


def transcribe(path):
    model = next((m for m in WHISPER_MODELS if m and os.path.exists(m)), None)
    if not model:
        sys.exit('no whisper.cpp model found (set WHISPER_MODEL=/path/ggml-*.bin)')
    with tempfile.TemporaryDirectory() as tmp:
        w16 = os.path.join(tmp, 'a.wav')
        sh('ffmpeg', '-y', '-loglevel', 'error', '-i', path, '-ar', '16000', '-ac', '1', w16)
        r = subprocess.run(['whisper-cli', '-m', model, '-f', w16, '-nt', '-np', '-l', 'en'], capture_output=True, text=True)
    return ' '.join(r.stdout.split())


def check(lines, report_path):
    rows = []
    for ln in lines:
        p = os.path.join(OUT, ln['id'] + '.ogg')
        if not os.path.exists(p):
            continue
        heard = transcribe(p)
        dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p],
                                   capture_output=True, text=True).stdout or 0)
        row = {'id': ln['id'], 'speaker': ln['speaker'], 'mood': ln.get('mood', ''), 'scene': ln.get('scene', ''), 'dur': round(dur, 2), 'text': ln['text'], 'heard': heard, 'wer': round(wer(ln['text'], heard), 2)}
        rows.append(row)
        print(f"{row['wer']:.2f}  {ln['id']:22s} {dur:5.1f}s  heard: {heard}")
    old = json.load(open(report_path)) if os.path.exists(report_path) else []
    ids = {r['id'] for r in rows}
    order = {ln['id']: i for i, ln in enumerate(json.load(open(SCRIPT))['lines'])}
    merged = sorted([r for r in old if r['id'] not in ids] + rows, key=lambda r: order.get(r['id'], 999))
    json.dump(merged, open(report_path, 'w'), indent=1)
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--script', default=SCRIPT)
    ap.add_argument('--refs', action='store_true', help='rebuild the reference clips, then stop')
    ap.add_argument('--only', default='')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--check', action='store_true', help='only run the whisper check')
    a = ap.parse_args()
    s = json.load(open(a.script))
    if a.refs:
        for name, v in s['voices'].items():
            if not a.only or name in a.only.split(','):
                build_ref(name, v)
        return
    only = set(filter(None, a.only.split(',')))
    lines = [ln for ln in s['lines'] if not only or ln['id'] in only]
    if not a.check:
        os.makedirs(CACHE, exist_ok=True)
        for ln in lines:
            out = os.path.join(OUT, ln['id'] + '.ogg')
            if os.path.exists(out) and not a.force:
                continue
            if not os.path.exists(os.path.join(VOICES, ln['speaker'], 'ref.wav')):
                build_ref(ln['speaker'], s['voices'][ln['speaker']])
            voice, mood = s['voices'][ln['speaker']], s['moods'].get(ln.get('mood', ''), {})
            make_line(ln, voice, mood, out)
    check(lines, os.path.join(OUT, 'index.json'))


def make_line(ln, voice, mood, out):
    """Try seeds until whisper hears the right words and the pitch stays in the speaker's register; keep the best take.
    F5 sometimes squeaks or adds words on very short lines, so every take is scored: WER + 0.1 per semitone beyond 4."""
    ref_f0 = median_f0(os.path.join(VOICES, ln['speaker'], 'ref.wav')) * 2 ** (voice.get('line_pitch_st', 0) / 12)
    seeds = [ln['seed']] if 'seed' in ln else [7, 21, 42, 99]
    best = None
    for seed in seeds:
        wav = os.path.join(CACHE, f"{ln['id']}_s{seed}.wav")
        take = os.path.join(CACHE, f"{ln['id']}_s{seed}.ogg")
        synth(ln, voice, mood, wav, seed)
        post(wav, take, voice, mood)
        heard, f0 = transcribe(take), median_f0(take)   # the final take, after the speaker's pitch shift
        off = abs(12 * np.log2(max(f0, 1) / ref_f0)) if f0 else 12
        score = wer(ln['text'], heard) + 0.1 * max(0, off - 4)
        print(f"  {ln['id']} seed {seed}: score {score:.2f} (f0 {f0:.0f} Hz, {off:.1f} st off) heard: {heard}", flush=True)
        if best is None or score < best[0]:
            best = (score, seed, take)
        if score <= 0.1:
            break
    shutil.copyfile(best[2], out)
    print(f"made {ln['id']} (seed {best[1]}, score {best[0]:.2f})", flush=True)


if __name__ == '__main__':
    main()
