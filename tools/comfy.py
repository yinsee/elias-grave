#!/usr/bin/env python3
"""Generate cutscene panels and boss portraits with the local ComfyUI (HTTP API, no MCP needed).

usage:
  tools/comfy.py OUT.png "prompt" [--w 1024 --h 576 --seed 1 --steps 4 --ckpt flux1-schnell-fp8.safetensors --neg "..."]
  tools/comfy.py --batch jobs.json      # [{"out": "...png", "prompt": "...", "w":..., "h":..., "seed":...}, ...]

The shared art direction (STYLE) is appended to every prompt so all panels read as one graphic novel.
"""
import argparse, json, os, sys, time, urllib.request, uuid

HOST = os.environ.get('COMFY', 'http://127.0.0.1:8388')
STYLE = ('graphic novel panel, neo-noir comic art, heavy black ink shadows, rain, wet reflections, '
         'muted desaturated palette with red and amber accents, cinematic framing, film grain, '
         'inspired by Max Payne graphic novel cutscenes')
NEG = 'text, speech bubble, letters, watermark, signature, logo, blurry, deformed hands, extra fingers, cartoon, anime, 3d render'


def post(path, data):
    req = urllib.request.Request(HOST + path, data=json.dumps(data).encode(), headers={'Content-Type': 'application/json'})
    return json.load(urllib.request.urlopen(req))


def get(path):
    return urllib.request.urlopen(HOST + path).read()


MODELS = {   # name -> (defaults); 'zimage' is a diffusion model with its own text encoder and VAE
    'jugg':    {'ckpt': 'Juggernaut_X_RunDiffusion_Hyper.safetensors', 'steps': 6, 'cfg': 2.0, 'sampler': 'dpmpp_sde', 'scheduler': 'karras'},
    'zimage':  {'unet': 'z_image_turbo_bf16.safetensors', 'clip': 'qwen_3_4b.safetensors', 'vae': 'ae.safetensors', 'steps': 8, 'cfg': 1.0, 'sampler': 'euler', 'scheduler': 'simple'},
    'schnell': {'ckpt': 'flux1-schnell-fp8.safetensors', 'steps': 4, 'cfg': 1.0, 'sampler': 'euler', 'scheduler': 'simple'},
}


def workflow_zimage(prompt, w, h, seed, steps, neg, cfg, m):
    return {
        '1': {'class_type': 'UNETLoader', 'inputs': {'unet_name': m['unet'], 'weight_dtype': 'default'}},
        '8': {'class_type': 'CLIPLoader', 'inputs': {'clip_name': m['clip'], 'type': 'lumina2', 'device': 'default'}},
        '9': {'class_type': 'VAELoader', 'inputs': {'vae_name': m['vae']}},
        '10': {'class_type': 'ModelSamplingAuraFlow', 'inputs': {'model': ['1', 0], 'shift': 3.0}},
        '2': {'class_type': 'CLIPTextEncode', 'inputs': {'text': f'{prompt}. {STYLE}', 'clip': ['8', 0]}},
        '3': {'class_type': 'CLIPTextEncode', 'inputs': {'text': neg, 'clip': ['8', 0]}},
        '4': {'class_type': 'EmptySD3LatentImage', 'inputs': {'width': w, 'height': h, 'batch_size': 1}},
        '5': {'class_type': 'KSampler', 'inputs': {'model': ['10', 0], 'positive': ['2', 0], 'negative': ['3', 0], 'latent_image': ['4', 0],
                                                   'seed': seed, 'steps': steps, 'cfg': cfg, 'sampler_name': m['sampler'], 'scheduler': m['scheduler'], 'denoise': 1.0}},
        '6': {'class_type': 'VAEDecode', 'inputs': {'samples': ['5', 0], 'vae': ['9', 0]}},
        '7': {'class_type': 'SaveImage', 'inputs': {'images': ['6', 0], 'filename_prefix': 'noir'}},
    }


def workflow(prompt, w, h, seed, steps, ckpt, neg, cfg, sampler='euler', scheduler='simple'):
    return {
        '1': {'class_type': 'CheckpointLoaderSimple', 'inputs': {'ckpt_name': ckpt}},
        '2': {'class_type': 'CLIPTextEncode', 'inputs': {'text': f'{prompt}. {STYLE}', 'clip': ['1', 1]}},
        '3': {'class_type': 'CLIPTextEncode', 'inputs': {'text': neg, 'clip': ['1', 1]}},
        '4': {'class_type': 'EmptyLatentImage', 'inputs': {'width': w, 'height': h, 'batch_size': 1}},
        '5': {'class_type': 'KSampler', 'inputs': {'model': ['1', 0], 'positive': ['2', 0], 'negative': ['3', 0], 'latent_image': ['4', 0],
                                                   'seed': seed, 'steps': steps, 'cfg': cfg, 'sampler_name': sampler, 'scheduler': scheduler, 'denoise': 1.0}},
        '6': {'class_type': 'VAEDecode', 'inputs': {'samples': ['5', 0], 'vae': ['1', 2]}},
        '7': {'class_type': 'SaveImage', 'inputs': {'images': ['6', 0], 'filename_prefix': 'noir'}},
    }


def generate(out, prompt, w=1024, h=576, seed=1, model='jugg', steps=None, neg=NEG, cfg=None, timeout=900):
    m = MODELS[model]; steps = steps or m['steps']; cfg = m['cfg'] if cfg is None else cfg
    wf = workflow_zimage(prompt, w, h, seed, steps, neg, cfg, m) if 'unet' in m else workflow(prompt, w, h, seed, steps, m['ckpt'], neg, cfg, m['sampler'], m['scheduler'])
    cid = str(uuid.uuid4())
    pid = post('/prompt', {'prompt': wf, 'client_id': cid})['prompt_id']
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
    ap.add_argument('--model', default='jugg', choices=list(MODELS)); ap.add_argument('--neg', default=NEG); ap.add_argument('--cfg', type=float)
    a = ap.parse_args()
    jobs = json.load(open(a.batch)) if a.batch else [{'out': a.out, 'prompt': a.prompt}]
    for j in jobs:
        if a.batch and os.path.exists(j['out']):
            print('skip (exists)', j['out']); continue
        o, dt = generate(j['out'], j['prompt'], j.get('w', a.w), j.get('h', a.h), j.get('seed', a.seed), j.get('model', a.model), j.get('steps', a.steps), j.get('neg', a.neg), j.get('cfg', a.cfg))
        print(f'{o}  {dt:.0f}s', flush=True)
