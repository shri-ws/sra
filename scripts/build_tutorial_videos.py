#!/usr/bin/env python3
"""Build MP4 videos of the Sutradhar tutorial lessons (tutorial/lessons-hi.js) for sharing on WhatsApp.

Same look as the in-portal player (tutorial/player.js): the real screenshot glides in to the part being
explained, a glowing green box with a pulse and a tap mark, the caption at the bottom, story bars on top.
Voice: Sarvam bulbul:v3 'aditya' (SARVAM_API_KEY in .env), falling back to macOS `say -v Lekha`. Text is drawn by headless Chrome (correct Devanagari shaping),
motion and frames by Pillow, encoding by ffmpeg. The quiz becomes a question card and an answer card.

Usage: set -a; . ./.env; set +a; .venv/bin/python scripts/build_tutorial_videos.py [--work DIR] [--only l1,l3]
Output: tutorial/video/<id>.mp4 (720x1560, H.264 + AAC).
"""
import argparse, html, json, math, os, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TUT = os.path.join(ROOT, 'tutorial')
OUT = os.path.join(TUT, 'video')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
W, H, FPS = 720, 1560, 30
FW, FH = 375, 812
K = W / FW                      # 1.92: focus boxes are in a 375x812 frame
VOICE, RATE = 'Lekha', 170

FONT = ("<link href='https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;600;700;800"
        "&display=block' rel='stylesheet'>")
BASE_CSS = ("*{box-sizing:border-box}html,body{margin:0;width:720px;height:1560px;overflow:hidden;background:transparent;"
            "font-family:'Noto Sans Devanagari',sans-serif;color:#fff}")
esc = lambda s: html.escape(str(s), quote=True)


def load_lessons():
    js = open(os.path.join(TUT, 'lessons-hi.js'), encoding='utf-8').read()
    code = "const window={};" + js + ";process.stdout.write(JSON.stringify(window.SRA_TUTOR_LESSONS))"
    return json.loads(subprocess.run(['node', '-e', code], capture_output=True, text=True, check=True).stdout)


# ---------- text layers (headless Chrome) ----------
def page(body, css=''):
    return f"<!doctype html><html><head><meta charset='utf-8'>{FONT}<style>{BASE_CSS}{css}</style></head><body>{body}</body></html>"


CAP_CSS = (".cap{position:absolute;left:0;right:0;bottom:0;padding:130px 36px 64px;"
           "background:linear-gradient(rgba(2,6,23,0),rgba(2,6,23,.92) 42%);font-size:36px;line-height:1.5;font-weight:600}")
TOP_CSS = (".top{position:absolute;top:44px;left:26px;right:26px;display:flex;justify-content:space-between;align-items:center;"
           "font-size:25px;font-weight:600;text-shadow:0 2px 6px rgba(0,0,0,.7)}.top b{max-width:70%;white-space:nowrap;overflow:hidden;"
           "text-overflow:ellipsis}.top span{font-size:22px;background:rgba(0,0,0,.4);border-radius:999px;padding:4px 16px;text-shadow:none}"
           ".shade{position:absolute;left:0;right:0;top:0;height:150px;background:linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,0))}")
TITLE_CSS = (".t{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:64px;"
             "background:radial-gradient(circle at 30% 20%,#1d4ed8,#0b1220 70%)}.t small{font-size:27px;opacity:.82;letter-spacing:.03em}"
             ".t h2{font-size:58px;line-height:1.35;margin:20px 0 28px;font-weight:700}.t p{font-size:29px;opacity:.86;margin:0}"
             ".t .site{position:absolute;bottom:70px;left:64px;font-size:26px;opacity:.7}")
WA_CSS = (".wa{position:absolute;inset:0;background:#efeae2}.wa-h{background:#075e54;padding:120px 32px 24px;font-weight:600;font-size:31px}"
          ".msg{position:absolute;right:24px;top:230px;width:86%;background:#d9fdd3;border-radius:20px 4px 20px 20px;padding:12px;"
          "box-shadow:0 2px 2px rgba(0,0,0,.12);font-size:27px;color:#111}.prev{background:#f1f5f2;border-radius:16px;overflow:hidden;"
          "margin-bottom:12px;display:flex;gap:16px;align-items:center}.prev img{width:124px;height:124px;object-fit:cover}"
          ".prev b{display:block;font-size:26px;line-height:1.3}.prev em{font-style:normal;font-size:23px;color:#555;display:block;margin-top:4px}"
          ".msg p{margin:4px 8px;line-height:1.45}.msg u{color:#027eb5;text-decoration:none;word-break:break-all}"
          ".tick{text-align:right;font-size:22px;color:#667;margin:4px 8px 0}")
QUIZ_CSS = (".q{position:absolute;inset:0;background:#0b1220;display:flex;flex-direction:column;justify-content:center;padding:56px 44px}"
            ".q small{opacity:.7;font-size:26px}.q h3{font-size:42px;line-height:1.45;margin:16px 0 36px}"
            ".o{border:3px solid rgba(255,255,255,.25);background:rgba(255,255,255,.06);border-radius:28px;padding:26px 32px;margin-bottom:20px;"
            "font-size:32px;font-weight:600;line-height:1.4}.o.ok{background:rgba(34,197,94,.2);border-color:#22c55e}"
            ".o.dim{opacity:.45}.why{font-size:30px;line-height:1.5;opacity:.92;margin:16px 4px 0;color:#bbf7d0}"
            ".end{text-align:center;align-items:center}.big{font-size:120px;line-height:1;color:#22c55e;font-weight:800;margin-bottom:12px}"
            ".end h3{margin:10px 0 18px}.end p{font-size:30px;opacity:.85;margin:0 0 12px;line-height:1.5}")


def offer():
    return {'wa': 'अभी तक आपने अपनी कालसर्प रिपोर्ट नहीं देखी? मात्र ₹501 में — आज ही जानिए।',
            'slug': 'kaalsarp', 'name': 'कालसर्प व सर्प-योग रिपोर्ट', 'price': 501}


def render_all(jobs, work):
    """jobs: list of (name, html). Writes work/<name>.png via headless Chrome, 6 at a time."""
    def one(job):
        name, doc = job
        hp, pp = os.path.join(work, name + '.html'), os.path.join(work, name + '.png')
        if os.path.exists(pp) and os.path.exists(hp) and open(hp, encoding='utf-8').read() == doc:
            return
        open(hp, 'w', encoding='utf-8').write(doc)
        prof = os.path.join(work, 'prof', name)
        subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files',
                        '--default-background-color=00000000', f'--window-size={W},{H}', '--virtual-time-budget=5000',
                        f'--user-data-dir={prof}', f'--screenshot={pp}', 'file://' + hp],
                       capture_output=True, check=True, timeout=90)
    with ThreadPoolExecutor(6) as ex:
        list(ex.map(one, jobs))


# ---------- voice ----------
SARVAM_SPEAKER = os.environ.get('SARVAM_SPEAKER', 'aditya')


def sarvam(text, path):
    import base64, urllib.request
    body = {'text': text, 'target_language_code': 'hi-IN', 'speaker': SARVAM_SPEAKER,
            'model': 'bulbul:v3', 'speech_sample_rate': 24000}
    req = urllib.request.Request('https://api.sarvam.ai/text-to-speech', data=json.dumps(body).encode(),
                                 headers={'Content-Type': 'application/json',
                                          'api-subscription-key': os.environ['SARVAM_API_KEY']})
    for attempt in range(4):
        try:
            r = json.load(urllib.request.urlopen(req, timeout=120))
            open(path, 'wb').write(base64.b64decode(r['audios'][0]))
            return
        except Exception:
            if attempt == 3:
                raise
            import time; time.sleep(3 * (attempt + 1))


def tts(text, path):
    """Hindi voice: Sarvam (bulbul:v3) when SARVAM_API_KEY is set, else the Mac's Lekha voice.
    Clips are cached by voice + text, so re-runs only ask for changed lines."""
    import hashlib
    who = f'sarvam-{SARVAM_SPEAKER}' if os.environ.get('SARVAM_API_KEY') else f'say-{VOICE}'
    path = os.path.join(os.path.dirname(path), 'voice-' + hashlib.sha1(f'{who}|{text}'.encode()).hexdigest()[:16] +
                        ('.wav' if who.startswith('sarvam') else '.aiff'))
    if not os.path.exists(path):
        if who.startswith('sarvam'):
            sarvam(text, path)
        else:
            subprocess.run(['say', '-v', VOICE, '-r', str(RATE), '-o', path, text], check=True)
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                         capture_output=True, text=True, check=True).stdout
    return float(out.strip()), path


# ---------- motion helpers ----------
def ease(p):                     # close to the player's cubic-bezier(.45,.05,.25,1)
    p = max(0.0, min(1.0, p))
    return 4 * p ** 3 if p < .5 else 1 - (-2 * p + 2) ** 3 / 2


def focus(f):
    if not f:
        return (1.0, 0.0, 0.0)
    fw, fh = f[2] / FW, f[3] / FH
    cx, cy = (f[0] + f[2] / 2) / FW, (f[1] + f[3] / 2) / FH
    s = max(1.0, min(1.6, 0.72 / max(fw, fh * 1.6)))
    cl = lambda v, lo, hi: max(lo, min(hi, v))
    return (s, cl(0.5 - cx * s, 1 - s, 0), cl(0.42 - cy * s, 1 - s, 0))


def shot(img, tr):
    s, tx, ty = tr
    gx, gy = s * W / img.width, s * H / img.height
    return img.transform((W, H), Image.AFFINE, (1 / gx, 0, -tx * W / gx, 0, 1 / gy, -ty * H / gy), Image.BILINEAR)


def rrect_mask(box, r, a):
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).rounded_rectangle(box, r, fill=a)
    return m


def alpha(img, a):
    if a >= 1:
        return img
    im = img.copy()
    im.putalpha(im.getchannel('A').point(lambda v: int(v * a)))
    return im


def shifted(layer, dy):
    if not dy:
        return layer
    out = Image.new('RGBA', layer.size, (0, 0, 0, 0))
    out.alpha_composite(layer, (0, int(dy)))
    return out


def bars(fr, n, i, p):
    d = ImageDraw.Draw(fr)
    gap, x0, x1, y = 8, 20, W - 20, 20
    w = (x1 - x0 - gap * (n - 1)) / n
    for k in range(n):
        a = x0 + k * (w + gap)
        d.rounded_rectangle((a, y, a + w, y + 6), 3, fill=(255, 255, 255, 80))
        fill = 1 if k < i else (p if k == i else 0)
        if fill > 0:
            d.rounded_rectangle((a, y, a + max(6, w * fill), y + 6), 3, fill=(255, 255, 255, 255))


# ---------- scene frame generators ----------
def img_frames(sc, img, prev_tr, dur, cap, top):
    tr1 = focus(sc.get('f'))
    tr0 = prev_tr or (1.0, 0.0, 0.0)
    s, tx, ty = tr1
    f = sc.get('f')
    box = None
    if f:
        bx0, by0 = f[0] * K * s + tx * W, f[1] * K * s + ty * H
        box = (bx0, by0, bx0 + f[2] * K * s, by0 + f[3] * K * s)
    still = shot(img, tr1).convert('RGBA')
    glow = None
    if box:
        g = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        ImageDraw.Draw(g).rounded_rectangle(box, 24, outline=(34, 197, 94, 255), width=14)
        glow = g.filter(ImageFilter.GaussianBlur(16))
    n = int(round(dur * FPS))
    for k in range(n):
        t = k / FPS
        zp = ease(t / 1.3)
        if zp < 1 and tr0 != tr1:
            tr = tuple(a + (b - a) * zp for a, b in zip(tr0, tr1))
            fr = shot(img, tr).convert('RGBA')
        else:
            fr = still.copy()
        if box:
            bp = max(0.0, min(1.0, (t - 0.55) / 0.45))
            if bp > 0:
                sc_ = 1.15 - 0.15 * (1 - (1 - bp) ** 3)
                cx, cy = (box[0] + box[2]) / 2, (box[1] + box[3]) / 2
                hw, hh = (box[2] - box[0]) / 2 * sc_, (box[3] - box[1]) / 2 * sc_
                b = (cx - hw, cy - hh, cx + hw, cy + hh)
                dim = Image.new('RGBA', (W, H), (15, 23, 42, 0))
                m = Image.new('L', (W, H), int(107 * bp))
                ImageDraw.Draw(m).rounded_rectangle(b, 24, fill=0)
                dim.putalpha(m)
                fr.alpha_composite(dim)
                fr.alpha_composite(alpha(glow, bp))
                d = ImageDraw.Draw(fr)
                d.rounded_rectangle(b, 24, outline=(34, 197, 94, int(255 * bp)), width=6)
                if t > 1.1:                                   # pulse ring
                    q = ((t - 1.1) % 1.6) / 1.6
                    e = 1 + 0.18 * q
                    pw, ph = (hw + 16) * e, (hh + 16) * e
                    ring = Image.new('RGBA', (W, H), (0, 0, 0, 0))
                    ImageDraw.Draw(ring).rounded_rectangle((cx - pw, cy - ph, cx + pw, cy + ph), 32,
                                                           outline=(34, 197, 94, int(205 * (1 - q))), width=4)
                    fr.alpha_composite(ring)
                if 1.2 <= t < 1.2 + 2.8:                      # tap mark, twice
                    q = ((t - 1.2) % 1.4) / 1.4
                    if q < .3:
                        op, z = q / .3, 1.8 - 0.8 * q / .3
                    elif q < .55:
                        op, z = 1, 1 - 0.2 * (q - .3) / .25
                    else:
                        op, z = 1 - (q - .55) / .45, 0.8 + 0.2 * (q - .55) / .45
                    r = 25 * z
                    tap = Image.new('RGBA', (W, H), (0, 0, 0, 0))
                    td = ImageDraw.Draw(tap)
                    td.ellipse((cx - r - 3, cy - r + 1, cx + r + 3, cy + r + 7), fill=(0, 0, 0, int(60 * op)))
                    td.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, int(242 * op)))
                    fr.alpha_composite(tap)
        cp = max(0.0, min(1.0, t / 0.5))
        fr.alpha_composite(top)
        fr.alpha_composite(alpha(shifted(cap, 28 * (1 - ease(cp))), cp))
        yield fr, t / dur
    return tr1


def card_frames(card, dur, top=None, layer=None, layer_at=0.5, cap=None, zoom_in=True):
    n = int(round(dur * FPS))
    for k in range(n):
        t = k / FPS
        fr = card.copy()
        if zoom_in and t < 0.7:                       # text rises in
            p = ease(t / 0.7)
            fr = Image.new('RGBA', (W, H), (11, 18, 32, 255))
            fr.alpha_composite(alpha(shifted(card, 30 * (1 - p)), p))
        if layer is not None:
            p = ease((t - layer_at) / 0.7)
            if p > 0:
                fr.alpha_composite(alpha(shifted(layer, 30 * (1 - p)), p))
        if top is not None:
            fr.alpha_composite(top)
        if cap is not None:
            cp = max(0.0, min(1.0, t / 0.5))
            fr.alpha_composite(alpha(shifted(cap, 28 * (1 - ease(cp))), cp))
        yield fr, t / dur


# ---------- one lesson ----------
def build_lesson(L, idx, total, nxt, work):
    lid = L['id']
    wd = os.path.join(work, lid)
    os.makedirs(wd, exist_ok=True)
    o = offer()
    logo = 'file://' + os.path.join(ROOT, 'logo.jpg')
    jobs = [(f'{lid}_top', page(f"<div class='shade'></div><div class='top'><b>{esc(L['title'])}</b><span>पाठ {idx + 1} / {total}</span></div>", TOP_CSS))]
    plan = []                                     # (kind, data, voice text)
    for i, sc in enumerate(L['scenes']):
        if sc.get('type') == 'title':
            jobs.append((f'{lid}_s{i}', page(f"<div class='t'><small>सूत्रधार ट्यूटोरियल · पाठ {idx + 1} / {total}</small>"
                                              f"<h2>{esc(sc['c'])}</h2><p>{esc(L.get('mins', ''))} · देखें, समझें और करें</p>"
                                              f"<div class='site'>shriramjiastro.in/sutradhar.html</div></div>", TITLE_CSS)))
            plan.append(('title', i, sc['s']))
            continue
        jobs.append((f'{lid}_c{i}', page(f"<div class='cap'>{esc(sc['c'])}</div>", CAP_CSS)))
        if sc.get('type') == 'wa':
            jobs.append((f'{lid}_wa', page("<div class='wa'><div class='wa-h'>परिवार ग्रुप</div></div>", WA_CSS)))
            jobs.append((f'{lid}_wamsg', page(
                f"<div class='msg'><div class='prev'><img src='{logo}'><div><b>{esc(o['name'])} — ₹{o['price']}</b><em>shriramjiastro.in</em></div></div>"
                f"<p>{esc(o['wa'])}</p><p><u>https://shriramjiastro.in/offer/{o['slug']}.html?ref=आपका-कोड</u></p><div class='tick'>अभी ✓✓</div></div>", WA_CSS)))
            plan.append(('wa', i, sc['s']))
        else:
            plan.append(('img', i, sc['s']))
    ords = ['पहला', 'दूसरा', 'तीसरा', 'चौथा']
    for qi, q in enumerate(L.get('quiz', [])):
        head = f"<small>छोटा सवाल {qi + 1} / {len(L['quiz'])}</small><h3>{esc(q['q'])}</h3>"
        opts = ''.join(f"<div class='o'>{esc(x)}</div>" for x in q['o'])
        ans = ''.join(f"<div class='o {'ok' if j == q['a'] else 'dim'}'>{'✓ ' if j == q['a'] else ''}{esc(x)}</div>" for j, x in enumerate(q['o']))
        jobs.append((f'{lid}_q{qi}', page(f"<div class='q'>{head}{opts}</div>", QUIZ_CSS)))
        jobs.append((f'{lid}_a{qi}', page(f"<div class='q'>{head}{ans}<div class='why'>{esc(q['why'])}</div></div>", QUIZ_CSS)))
        say_q = 'सवाल। ' + q['q'] + ' ' + '। '.join(f"{ords[j]}: {x}" for j, x in enumerate(q['o'])) + '।'
        plan.append(('quiz', qi, say_q))
        plan.append(('ans', qi, f"सही जवाब है: {q['o'][q['a']]}। {q['why']}"))
    if nxt:
        end_p, end_s = f"<p>अगला पाठ:</p><p><b>{esc(nxt['title'])}</b></p>", f"पाठ {idx + 1} पूरा हुआ। अगले पाठ में: {nxt['title']}।"
    else:
        end_p = "<p>सारे पाठ पूरे।</p><p>अब पोर्टल में <b>पहली कमाई</b> tab खोलें और आज का काम शुरू करें।</p>"
        end_s = 'बधाई हो, सारे पाठ पूरे हुए। अब पोर्टल में पहली कमाई वाला टैब खोलिए और आज का काम शुरू कीजिए।'
    jobs.append((f'{lid}_end', page(f"<div class='q end'><div class='big'>✓</div><h3>पाठ {idx + 1} पूरा!</h3>{end_p}"
                                    f"<p style='opacity:.6;margin-top:40px'>shriramjiastro.in/sutradhar.html</p></div>", QUIZ_CSS)))
    plan.append(('end', 0, end_s))
    render_all(jobs, wd)
    png = lambda n: Image.open(os.path.join(wd, n + '.png')).convert('RGBA')

    # voice per segment -> durations; the voice starts 0.35 s into each segment
    durs, wavs = [], []
    for k, (_, _, text) in enumerate(plan):
        aiff = os.path.join(wd, f'v{k}.aiff')
        d, clip = tts(text, aiff)
        durs.append(max(3.0, d + 0.35 + 0.6))
        wavs.append(clip)

    # audio track: each voice clip padded to its segment length
    alist = os.path.join(wd, 'audio.txt')
    with open(alist, 'w') as fh:
        for k, (a, d) in enumerate(zip(wavs, durs)):
            seg = os.path.join(wd, f'a{k}.wav')
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', a, '-af',
                            f'adelay=350|350,apad,atrim=0:{round(int(round(d * FPS)) / FPS, 4)}', '-ar', '44100', '-ac', '1', seg], check=True)
            fh.write(f"file '{seg}'\n")
    track = os.path.join(wd, 'track.wav')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', alist, '-c', 'copy', track], check=True)

    os.makedirs(OUT, exist_ok=True)
    out = os.path.join(OUT, f'{lid}.mp4')
    enc = subprocess.Popen(['ffmpeg', '-y', '-v', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-i', track, '-c:v', 'libx264', '-preset', 'medium', '-crf', '24', '-pix_fmt', 'yuv420p',
                            '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', '-shortest', out], stdin=subprocess.PIPE)
    top = png(f'{lid}_top')
    imgs = {}
    prev_img, prev_tr = None, None
    nseg = len(plan)
    for k, ((kind, i, _), d) in enumerate(zip(plan, durs)):
        if kind == 'img':
            sc = L['scenes'][i]
            if sc['img'] not in imgs:
                imgs[sc['img']] = Image.open(os.path.join(TUT, 'img', sc['img'] + '.jpg')).convert('RGB')
            gen = img_frames(sc, imgs[sc['img']], prev_tr if prev_img == sc['img'] else None, d, png(f'{lid}_c{i}'), top)
            prev_img, prev_tr = sc['img'], focus(sc.get('f'))
        else:
            prev_img, prev_tr = None, None
            if kind == 'title':
                gen = card_frames(png(f'{lid}_s{i}'), d)
            elif kind == 'wa':
                gen = card_frames(png(f'{lid}_wa'), d, top=top, layer=png(f'{lid}_wamsg'), cap=png(f'{lid}_c{i}'), zoom_in=False)
            elif kind == 'quiz':
                gen = card_frames(png(f'{lid}_q{i}'), d)
            elif kind == 'ans':
                gen = card_frames(png(f'{lid}_a{i}'), d, zoom_in=False)
            else:
                gen = card_frames(png(f'{lid}_end'), d)
        for fr, p in gen:
            bars(fr, nseg, k, p)
            enc.stdin.write(fr.convert('RGB').tobytes())
    enc.stdin.close()
    enc.wait()
    if enc.returncode:
        raise SystemExit(f'ffmpeg failed for {lid}')
    return out, sum(durs)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--work', default=os.path.join(tempfile.gettempdir(), 'sra_tutor_video'))
    ap.add_argument('--only', default='')
    a = ap.parse_args()
    lessons = load_lessons()
    only = set(x for x in a.only.split(',') if x)
    for i, L in enumerate(lessons):
        if only and L['id'] not in only:
            continue
        nxt = lessons[i + 1] if i + 1 < len(lessons) else None
        out, secs = build_lesson(L, i, len(lessons), nxt, a.work)
        print(f"{L['id']}: {out}  {secs:.0f}s  {os.path.getsize(out) / 1e6:.1f} MB", flush=True)


if __name__ == '__main__':
    main()
