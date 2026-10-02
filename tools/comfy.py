#!/usr/bin/env python3
"""Generate cutscene panels and boss portraits with the local ComfyUI (HTTP API, no MCP needed).

usage:
  tools/comfy.py OUT.png "prompt" [--model zimage|jugg|schnell --w 1024 --h 576 --seed 1 --face assets/art/characters/elias/ref.png]
  tools/comfy.py --batch jobs.json      # [{"out": "...png", "prompt": "...", "w":..., "h":..., "seed":..., "face": "..."}, ...]

The shared art direction (STYLE) is appended to every prompt so all panels read as one graphic novel.
--face swaps a character's reference face onto the finished image (ReActor), so the hero looks the same in every panel.
"""
import argparse, json, mimetypes, os, sys, time, urllib.request, uuid
sys.path.insert(0, os.path.dirname(__file__))
from pixelate import pixelate

HOST = os.environ.get('COMFY', 'http://127.0.0.1:8388')
STYLES = {   # (no names here: the model paints names onto signs)
    'comic': ('graphic novel panel, neo-noir comic art, bold ink lines, heavy black shadows, rain, wet reflections, '
              'muted desaturated palette with red and amber accents, cinematic framing'),
    'pixel': ('pixel art, 16-bit retro video game cutscene, crisp square pixels, limited color palette, ordered dithering, '
              'low resolution sprite art, neo-noir, heavy black shadows, rain, muted palette with red and amber accents, cinematic framing'),
}
STYLE = STYLES['pixel']
NEG = ('text, words, letters, lettering on signs, speech bubble, caption, watermark, signature, logo, white border, frame, margin, '
       'blurry, deformed hands, extra fingers, 3d render, photo')


def post(path, data):
    req = urllib.request.Request(HOST + path, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req))


def get(path):
    return urllib.request.urlopen(HOST + path).read()


_uploaded = {}
def upload(path):
    """Upload a local image to ComfyUI's input folder (once per run); returns the name LoadImage uses."""
    if path in _uploaded:
        return _uploaded[path]
    boundary = uuid.uuid4().hex
    name = os.path.basename(path)
    body = (f'--{boundary}\r\nContent-Disposition: form-data; name="image"; filename="{name}"\r\n'
            f'Content-Type: {mimetypes.guess_type(name)[0] or "image/png"}\r\n\r\n').encode() + open(path, 'rb').read() + \
           f'\r\n--{boundary}\r\nContent-Disposition: form-data; name="overwrite"\r\n\r\ntrue\r\n--{boundary}--\r\n'.encode()
    req = urllib.request.Request(HOST + '/upload/image', data=body, headers={'Content-Type': f'multipart/form-data; boundary={boundary}'})
    _uploaded[path] = json.load(urllib.request.urlopen(req))['name']
    return _uploaded[path]


MODELS = {   # name -> defaults; 'zimage' is a diffusion model with its own text encoder and VAE
    'zimage':  {'unet': 'z_image_turbo_bf16.safetensors', 'clip': 'qwen_3_4b.safetensors', 'vae': 'ae.safetensors', 'steps': 8, 'cfg': 1.0, 'sampler': 'euler', 'scheduler': 'simple'},
    'jugg':    {'ckpt': 'Juggernaut_X_RunDiffusion_Hyper.safetensors', 'steps': 6, 'cfg': 2.0, 'sampler': 'dpmpp_sde', 'scheduler': 'karras'},
    'schnell': {'ckpt': 'flux1-schnell-fp8.safetensors', 'steps': 4, 'cfg': 1.0, 'sampler': 'euler', 'scheduler': 'simple'},
}


def workflow(prompt, w, h, seed, steps, neg, cfg, m, style=STYLE, lora=None):
    if 'unet' in m:   # Z-Image: model, text encoder and VAE load separately; AuraFlow sampling
        wf = {
            '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': m['unet'], 'weight_dtype': 'default'}},
            '8': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': m['clip'], 'type': 'lumina2', 'device': 'default'}},
            '9': {'class_type': 'VAELoader', 'inputs': {'vae_name': m['vae']}},
            '10': {'class_type': 'ModelSamplingAuraFlow', 'inputs': {'model': ['13', 0] if lora else ['1', 0], 'shift': 3.0}},
            '4': {'class_type': 'EmptySD3LatentImage', 'inputs': {'width': w, 'height': h, 'batch_size': 1}},
        }
        model, clip, vae = ['10', 0], ['8', 0], ['9', 0]
        if lora:   # a style LoRA on the diffusion model ('file.safetensors:strength')
            name, _, k = lora.partition(':')
            wf['13'] = {'class_type': 'LoraLoaderModelOnly', 'inputs': {'model': ['1', 0], 'lora_name': name, 'strength_model': float(k or 1.0)}}
    else:
        wf = {
            '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': m['ckpt']}},
            '4': {'class_type': 'EmptyLatentImage', 'inputs': {'width': w, 'height': h, 'batch_size': 1}},
        }
        model, clip, vae = ['1', 0], ['1', 1], ['1', 2]
    wf.update({
        '2': {'class_type': 'CLIPTextEncode', 'inputs': {'text': f'{prompt}. {style}', 'clip': clip}},
        '3': {'class_type': 'CLIPTextEncode', 'inputs': {'text': neg, 'clip': clip}},
        '5': {'class_type': 'KSampler', 'inputs': {'model': model, 'positive': ['2', 0], 'negative': ['3', 0], 'latent_image': ['4', 0],
                                                   'seed': seed, 'steps': steps, 'cfg': cfg, 'sampler_name': m['sampler'], 'scheduler': m['scheduler'], 'denoise': 1.0}},
        '6': {'class_type': 'VAEDecode', 'inputs': {'samples': ['5', 0], 'vae': vae}},
        '7': {'class_type': 'SaveImage', 'inputs': {'images': ['6', 0], 'filename_prefix': 'noir'}},
    })
    return wf


def with_face(wf, face_name, face_index='0'):
    """ReActor: swap the reference face onto the decoded image (input_faces_index picks which face in the panel)."""
    wf['11'] = {'class_type': 'LoadImage', 'inputs': {'image': face_name}}
    wf['12'] = {'class_type': 'ReActorFaceSwap', 'inputs': {
        'enabled': True, 'input_image': ['6', 0], 'source_image': ['11', 0], 'swap_model': 'inswapper_128.onnx',
        'facedetection': 'retinaface_resnet50', 'face_restore_model': 'none', 'face_restore_visibility': 1.0, 'codeformer_weight': 0.5,
        'detect_gender_input': 'no', 'detect_gender_source': 'no', 'input_faces_index': face_index, 'source_faces_index': '0', 'console_log_level': 1}}
    wf['7']['inputs']['images'] = ['12', 0]
    return wf


def generate(out, prompt, w=1024, h=576, seed=1, model='zimage', steps=None, neg=NEG, cfg=None, face=None, face_index='0', style='pixel', lora=None, trigger='', timeout=900):
    m = MODELS[model]; steps = steps or m['steps']; cfg = m['cfg'] if cfg is None else cfg
    wf = workflow(f'{trigger} {prompt}'.strip(), w, h, seed, steps, neg, cfg, m, STYLES[style], lora)
    if face:
        wf = with_face(wf, upload(face), face_index)
    pid = post('/prompt', {'prompt': wf, 'client_id': str(uuid.uuid4())})['prompt_id']
    t0 = time.time()
    while time.time() - t0 < timeout:
        hist = json.loads(get(f'/history/{pid}'))
        if pid in hist:
            st = hist[pid].get('status', {})
            if st.get('status_str') == 'error':
                raise RuntimeError(json.dumps(st)[:800])
            for node in hist[pid]['outputs'].values():
                for im in node.get('images', []):
                    q = f"/view?filename={urllib.request.quote(im['filename'])}&subfolder={urllib.request.quote(im['subfolder'])}&type={im['type']}"
                    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
                    open(out, 'wb').write(get(q))
                    return out, time.time() - t0
        time.sleep(1.5)
    raise TimeoutError(out)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('out', nargs='?'); ap.add_argument('prompt', nargs='?')
    ap.add_argument('--batch'); ap.add_argument('--w', type=int, default=1024); ap.add_argument('--h', type=int, default=576)
    ap.add_argument('--seed', type=int, default=1); ap.add_argument('--steps', type=int)
    ap.add_argument('--model', default='zimage', choices=list(MODELS)); ap.add_argument('--neg', default=NEG); ap.add_argument('--cfg', type=float)
    ap.add_argument('--face', help='reference image whose face is swapped onto the result'); ap.add_argument('--face-index', default='0')
    ap.add_argument('--style', default='pixel', choices=list(STYLES))
    ap.add_argument('--lora', default='pixel_art_style_z_image_turbo.safetensors:0.8', help='file.safetensors:strength (Z-Image); "none" for no LoRA')
    ap.add_argument('--trigger', default='Pixel art style.', help="the LoRA's trigger words, put first in the prompt")
    a = ap.parse_args()
    if a.lora == 'none': a.lora, a.trigger = None, ''
    jobs = json.load(open(a.batch)) if a.batch else [{'out': a.out, 'prompt': a.prompt}]
    chars_path = os.path.join(os.path.dirname(__file__), '..', 'assets', 'prompts', 'characters.json')
    CHARS = json.load(open(chars_path)) if os.path.exists(chars_path) else {}
    for j in jobs:
        j['prompt'] = j['prompt'].format(**{k: v['desc'] for k, v in CHARS.items()})
        if j.get('face') in CHARS: j['face'] = CHARS[j['face']]['ref']
    for j in jobs:
        if a.batch and os.path.exists(j['out']):
            print('skip (exists)', j['out']); continue
        o, dt = generate(j['out'], j['prompt'], j.get('w', a.w), j.get('h', a.h), j.get('seed', a.seed), j.get('model', a.model),
                         j.get('steps', a.steps), j.get('neg', a.neg), j.get('cfg', a.cfg), j.get('face', a.face), str(j.get('face_index', a.face_index)), j.get('style', a.style), j.get('lora', a.lora), j.get('trigger', a.trigger))
        if j.get('post'):   # re-pixelate after the face swap so the swapped face sits on the pixel grid
            p = j['post']; pixelate(o, p.get('out', o), p.get('w', 320), p.get('colors', 32), p.get('dither', 0.3), p.get('scale', 4))
        print(f'{o}  {dt:.0f}s', flush=True)
