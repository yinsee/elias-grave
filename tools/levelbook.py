#!/usr/bin/env python3
"""Build the level book: one HTML page with the prologue panels and the 8 level plans (docs/levels/*.md).

usage: tools/levelbook.py OUT_DIR      -> OUT_DIR/level-book.html and OUT_DIR/img/*.png (native-size pixel art)
"""
import glob, html, os, re, sys
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else 'build/levelbook'
os.makedirs(OUT + '/img', exist_ok=True)
E = lambda s: html.escape(s, quote=True)


def md(s):   # tiny inline markdown: **bold**, *em*, `code`
    s = E(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'(?<![*\w])\*(?!\s)(.+?)\*(?!\w)', r'<i>\1</i>', s)
    return re.sub(r'`(.+?)`', r'<code>\1</code>', s)


def summary_rows(sec):
    """A summary is either a table (| Key | Value |) or bold-label paragraphs (**Key.** text)."""
    rows = {}
    for l in sec.split('\n'):
        c = [x.strip() for x in l.strip().strip('|').split('|')]
        if l.strip().startswith('|') and len(c) >= 2 and c[0] and not set(c[0]) <= set('-: ') and c[0].lower() not in ('item', '#'):
            rows[c[0].strip('* ')] = c[1]
    for m in re.finditer(r'^\*\*([^*\n]+?)[.:]\*\*\s*(.+)$', sec, re.M):
        rows.setdefault(m.group(1).strip(), m.group(2).strip())
    return rows


def get(rows, *keys):
    for k in keys:
        for rk, v in rows.items():
            if rk.lower().startswith(k.lower()):
                return v
    return ''


def section(t, n):
    m = re.search(rf'^## {n}\..*?$(.*?)(?=^## \d+\.|\Z)', t, re.M | re.S)
    return m.group(1) if m else ''


KIND = {'fight': 'Fight', 'elite': 'Elite', 'boss': 'Boss', 'slow': 'Slow motion', 'glass': 'Glass', 'breather': 'Breather', 'scene': 'Scene'}
BOSS = {1: ('Sal "the Scale" Marchetti', 'Tenor'), 2: ('Ilsa "Switch" Varga', 'Tenor'), 3: ('Count Teodor Brask', 'Baritone'), 4: ('Nerissa Kalt', 'Baritone'),
        5: ('Dr. Anselm Krieg', 'Baritone'), 6: ('Commissioner Augusta Vane', 'Bass'), 7: ('Viktor Lenz', 'First Violin'), 8: ('Augustin Bell', 'The Conductor')}

levels = []
for f in sorted(glob.glob('docs/levels/0*.md')):
    t = open(f).read()
    s1, s2, s3, s5, s8 = (section(t, n) for n in (1, 2, 3, 5, 8))
    rows = summary_rows(s1)
    beats = []
    for m in re.finditer(r'^### Beat (\d+)\.?\s*(.+?)$(.*?)(?=^### |\Z)', s3, re.M | re.S):
        head, body = m.group(2).strip(), m.group(3).strip()
        xr = re.search(r'x\s*(\d+)\s*[-–]\s*(\d+)', head) or re.search(r'x\s*(\d+)\s*[-–]\s*(\d+)', body[:400])
        dur = re.search(r'(\d+:\d\d)', head)
        name = re.sub(r'\s*\(x[^)]*\)|\s*\[[^\]]*\]', '', head)
        name = re.sub(r'\s*\(([^)]*)\)\s*$', '', name).strip().strip('"')
        tags = (' '.join(re.findall(r'\(([^)]*)\)', head)) + ' ' + name).lower()
        kind = ('boss' if 'boss' in tags and 'mini' not in tags else 'elite' if ('elite' in tags or 'mini-boss' in tags) else 'slow' if 'slow' in tags
                else 'glass' if 'glass' in tags else 'breather' if 'breather' in tags else 'scene' if ('cutscene' in tags or 'in-engine' in tags) else 'fight')
        first = re.sub(r'\s+', ' ', re.sub(r'^\s*[-*]\s*', '', body.split('\n\n')[0], flags=re.M))
        if len(first) > 360:
            first = first[:357].rsplit(' ', 1)[0] + '…'
        beats.append({'n': int(m.group(1)), 'name': name, 'x': [int(xr.group(1)), int(xr.group(2))] if xr else None, 'dur': dur.group(1) if dur else '', 'kind': kind, 'text': first})
    feats = []
    for l in s8.split('\n'):
        c = [x.strip() for x in l.strip().strip('|').split('|')]
        if l.strip().startswith('|') and len(c) >= 3 and c[0].isdigit():
            feats.append((c[1].strip('* '), c[2]))
        mm = re.match(r'^\s*(?:[-*]|\d+\.)\s+\*\*(.+?)\*\*[:.]?\s*(.*)', l)
        if mm:
            feats.append((mm.group(1).rstrip(':.'), mm.group(2)))
    feats = [(n, (s[:200].rsplit(' ', 1)[0] + '…') if len(s) > 200 else s) for n, s in feats][:14]
    phases = []
    for mm in re.finditer(r'^(?:#{3,4}\s*(?:\d+\.\d+\s*)?|\s*[-*]\s*\**|\*\*)(Phase [\d\-–]+[^\n*]*)', s5, re.M):
        p = mm.group(1).strip().rstrip('*').rstrip('.').strip()
        if p not in phases:
            phases.append(p)
    ascii_m = re.search(r'```(?:text)?\n(.*?)```', s2, re.S)
    levels.append({'num': int(os.path.basename(f)[:2]), 'title': re.search(r'^# Level \d+: "?([^"\n]+)"?', t, re.M).group(1),
                   'rows': rows, 'beats': beats, 'feats': feats, 'phases': phases[:4], 'ascii': ascii_m.group(1).rstrip() if ascii_m else ''})

bible = open('docs/story-bible.md').read()
pro = re.search(r'### Prologue.*?(?=\n## 2\.)', bible, re.S).group(0)
caps = re.findall(r'^\| (\d) \| (.+?) \| (.+?) \|$', pro, re.M)
intro_caps, end_caps = caps[:5], caps[5:9]

# images at their native pixel size (the page scales them up with crisp pixels)
for f in sorted(os.listdir('assets/art/panels/prologue')):
    im = Image.open('assets/art/panels/prologue/' + f)
    im.resize((im.width // 4, im.height // 4), Image.NEAREST).save(f'{OUT}/img/{f}')
for f in ['marchetti_amused', 'marchetti_smug', 'marchetti_furious']:
    im = Image.open(f'assets/art/portraits/{f}.png')
    im.resize((im.width // 4, im.height // 4), Image.NEAREST).save(f'{OUT}/img/{f}.png')

CSS = open(os.path.join(os.path.dirname(__file__), 'levelbook.css')).read()
o = ['<title>Elias Grave Level Book</title>',
     '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
     '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@500;700&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">',
     f'<style>\n{CSS}</style>', '<div class="wrap">',
     '<header class="top"><div class="kicker">Level book · prologue and 8 story levels</div><h1>ELIAS GRAVE</h1>',
     '<p class="lede">Three nights after he took his dog back from Club Noir, the Choir burned down the watch shop of the man who raised him. '
     'These are the eight levels of the hunt, from the Pier 9 docks to the clock at the top of the Meridian Spire, with each boss\'s place in the Choir.</p></header>',
     '<h3>The Choir, rung by rung</h3><div class="ladder"><a class="rung done" href="#prologue"><small>Tenor</small><span>Malaspina (tutorial)</span></a>']
for n, (name, rank) in BOSS.items():
    short = 'Marchetti' if n == 1 else 'Switch' if n == 2 else name.split(' ')[-1]
    o.append(f'<a class="rung" href="#l{n}"><small>{E(rank)}</small><span>{E(short)}</span></a>')
o.append('</div><nav class="chips" aria-label="Levels"><a href="#prologue">Prologue</a>' + ''.join(f'<a href="#l{L["num"]}">{L["num"]} · {E(L["title"])}</a>' for L in levels) + '</nav>')


def panel(img, cap):
    who, txt = '', re.sub(r'\*', '', cap[2])
    m = re.match(r'(VO|BELL|HERO|HALE|SFX)\s*:\s*(.*)', txt)
    if m:
        who, txt = m.group(1), m.group(2)
    alt = re.sub(r'[*]', '', cap[1])[:160]
    return f'<figure class="panel"><img src="img/{img}" alt="{E(alt)}" width="320" height="180" loading="lazy"><figcaption><span class="who">{E(who)}</span>{md(txt)}</figcaption></figure>'


o.append('<section class="prologue" id="prologue"><div class="lvhead"><div class="lvnum">0</div><h2>Three Nights Later</h2>'
         '<p>Prologue cutscene, nine comic panels. This art is final: Z-Image with a pixel-art LoRA, with Elias\'s and Bell\'s faces locked to their reference portraits.</p></div>')
o.append('<p class="subhead">Opening</p><div class="panels">' + ''.join(panel(f'prologue_intro_0{i + 1}.png', c) for i, c in enumerate(intro_caps)) + '</div>')
o.append('<p class="subhead">Ending</p><div class="panels">' + ''.join(panel(f'prologue_end_0{i + 1}.png', c) for i, c in enumerate(end_caps)) + '</div></section>')

for L in levels:
    n, r = L['num'], L['rows']
    name, rank = BOSS[n]
    o.append(f'<section class="level" id="l{n}"><div class="lvhead"><div class="lvnum">{n}</div><h2>{E(L["title"])}</h2><p>{md(get(r, "Time"))}</p></div>')
    facts = [('Story beat', get(r, 'Story beat', 'Story')), ('What he learns', get(r, 'What the player learns', 'What he learns')), ('Setting', get(r, 'Setting')),
             ('Faction', get(r, 'Faction', 'Enemies', 'Enemy')), ('Mood', get(r, 'Mood')), ('Slow-motion set piece', get(r, 'Slow-motion', 'Slow motion', 'Gun-fu')),
             ('Glass and set pieces', get(r, 'Glass', 'Set piece', 'Environment')), ('Length', get(r, 'Length')), ('Hook', get(r, 'Hook', 'Next'))]
    o.append('<dl class="facts">' + ''.join(f'<div class="fact{" hook" if k == "Hook" else ""}"><dt>{k}</dt><dd>{md(v)}</dd></div>' for k, v in facts if v) + '</dl>')
    xb = [b for b in L['beats'] if b['x']]
    if len(xb) >= 2:
        mx = max(b['x'][1] for b in xb); mn = min(b['x'][0] for b in xb)
        segs = ''.join(f'<div class="seg k-{b["kind"]}" style="left:{(b["x"][0] - mn) / (mx - mn) * 100:.2f}%;width:{max(0.6, (b["x"][1] - b["x"][0]) / (mx - mn) * 100):.2f}%" '
                       f'title="Beat {b["n"]}: {E(b["name"])} (x {b["x"][0]}-{b["x"][1]})">{b["n"]}</div>' for b in xb)
        o.append(f'<div><h3>Beats along the level (world x, px)</h3><div class="strip" role="img" aria-label="Beats placed along the level from x {mn} to {mx}">{segs}</div>'
                 f'<div class="axis"><span>x {mn}</span><span>x {(mn + mx) // 2}</span><span>x {mx}</span></div></div>')
    kinds = sorted({b['kind'] for b in L['beats']}, key=list(KIND).index)
    o.append('<div class="legend">' + ''.join(f'<span><i class="k-{k}"></i>{KIND[k]}</span>' for k in kinds) + '</div>')
    o.append('<ol class="beats">' + ''.join(
        f'<li class="beat"><span class="n">{b["n"]}</span><div class="hd"><b>{md(b["name"])}</b><span class="tag"><i class="k-{b["kind"]}"></i>{KIND[b["kind"]]}</span>'
        f'<span class="meta">{("x " + str(b["x"][0]) + "–" + str(b["x"][1])) if b["x"] else ""}{(" · " + b["dur"]) if b["dur"] else ""}</span></div><p>{md(b["text"])}</p></li>'
        for b in L['beats']) + '</ol>')
    por = ''
    if n == 1:
        por = '<div class="portraits">' + ''.join(f'<figure><img src="img/{f}.png" alt="Marchetti, {f.split("_")[1]}" width="104" height="128"><figcaption>{f.split("_")[1]}</figcaption></figure>'
                                                  for f in ['marchetti_amused', 'marchetti_smug', 'marchetti_furious']) + '</div>'
    phases = ''.join(f'<li>{md(p)}</li>' for p in L['phases'])
    o.append(f'<div class="two"><div class="boss"><div class="rank">Boss · {E(rank)}</div><p class="name">{E(name)}</p>{"<ul>" + phases + "</ul>" if phases else ""}{por}</div>')
    if L['feats']:
        o.append('<div class="feats"><h3>New engine features</h3><ul>' + ''.join(f'<li><b>{md(fn)}</b> {md(fs)}</li>' for fn, fs in L['feats']) + '</ul></div>')
    o.append('</div>')
    if L['ascii']:
        o.append(f'<details class="ascii"><summary>Side view of the level</summary><div class="sc"><pre>{E(L["ascii"])}</pre></div></details>')
    o.append('</section>')
o.append('<footer>Built from docs/story-bible.md and docs/levels/01-08 by tools/levelbook.py. Beat positions are world pixels (22 px = 1 m). '
         'Portraits exist so far for Elias and Marchetti; the other bosses are next.</footer></div>')
open(f'{OUT}/level-book.html', 'w').write('\n'.join(o))
for L in levels:
    print(L['num'], L['title'], 'facts', sum(1 for v in [get(L['rows'], k) for k in ('Story', 'Setting', 'Faction', 'Mood', 'Slow', 'Glass', 'Length', 'Hook')] if v),
          'beats', len(L['beats']), 'phases', len(L['phases']), 'feats', len(L['feats']))
