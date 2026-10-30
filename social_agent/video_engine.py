"""
Shri Ramji Astro (SRA) - Autonomous Video & Reel Generation Engine
Generates 1080x1920 (9:16) vertical MP4 video reels and YouTube Shorts
with natural neural Hindi voiceover (Edge-TTS), razor-sharp Devanagari typography,
and divine Vedic temple aesthetics.
"""

import os
import re
import html
import shutil
import asyncio
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg
import edge_tts

from .config import load_config

# macOS Devanagari font paths (fallback for PIL)
DEV_FONT_PATHS = [
    "/System/Library/Fonts/Supplemental/DevanagariMT.ttc",
    "/System/Library/Fonts/Supplemental/Devanagari Sangam MN.ttc",
    "/System/Library/Fonts/Supplemental/ITFDevanagari.ttc",
    "/System/Library/Fonts/Kohinoor.ttc"
]

def find_chrome_binary():
    """Locate Google Chrome or Chromium executable on the host system."""
    mac_paths = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"
    ]
    for p in mac_paths:
        if os.path.exists(p):
            return p
    return shutil.which("google-chrome") or shutil.which("chromium")

def get_devanagari_font(size: int = 40):
    """Load the first available Devanagari font."""
    for p in DEV_FONT_PATHS:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

def wrap_text(text: str, font, max_width: int, draw: ImageDraw.Draw) -> list:
    """Wrap Devanagari text cleanly within a maximum pixel width."""
    words = text.split()
    lines = []
    current_line = []
    for word in words:
        test_line = " ".join(current_line + [word])
        bbox = draw.textbbox((0, 0), test_line, font=font)
        w = bbox[2] - bbox[0]
        if w <= max_width:
            current_line.append(word)
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word]
    if current_line:
        lines.append(" ".join(current_line))
    return lines

async def generate_voiceover(script: str, output_path: str, voice: str = "hi-IN-MadhurNeural") -> float:
    """
    Generate natural neural Hindi voiceover using Edge-TTS.
    Returns the total duration in seconds.
    """
    communicate = edge_tts.Communicate(script, voice)
    await communicate.save(output_path)
    
    # Probe duration using ffmpeg
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    p = subprocess.run([exe, "-i", output_path], capture_output=True, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d+):([\d\.]+)", p.stderr or p.stdout)
    if m:
        hrs, mins, secs = float(m.group(1)), float(m.group(2)), float(m.group(3))
        return hrs * 3600 + mins * 60 + secs
    return 45.0 # fallback default

def render_slide_chrome(
    badge: str,
    title: str,
    body: str,
    output_path: Path,
    branding: str = "श्री रामजी एस्ट्रो • बृहत्पाराशरहोराशास्त्रम्"
) -> bool:
    """
    Render a pixel-perfect 1080x1920 slide using Chrome headless.
    Ensures flawless Devanagari ligatures, glowing borders, and rich typography.
    """
    chrome_bin = find_chrome_binary()
    if not chrome_bin:
        return False
        
    html_code = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Noto+Sans+Devanagari:wght@400;600;700;800&display=swap');
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    width: 1080px;
    height: 1920px;
    background: radial-gradient(ellipse at 50% 18%, #1a2544 0%, #0b101e 65%, #05070e 100%);
    font-family: 'Noto Sans Devanagari', -apple-system, BlinkMacSystemFont, sans-serif;
    color: #ffffff;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 85px 65px 100px;
    position: relative;
    overflow: hidden;
  }}
  .border-outer {{
    position: absolute;
    inset: 35px;
    border: 2px solid rgba(212, 175, 55, 0.35);
    border-radius: 26px;
    pointer-events: none;
  }}
  .border-inner {{
    position: absolute;
    inset: 48px;
    border: 3px solid #d4af37;
    border-radius: 20px;
    box-shadow: inset 0 0 50px rgba(212, 175, 55, 0.12), 0 0 35px rgba(212, 175, 55, 0.2);
    pointer-events: none;
  }}
  .corner-ornament {{
    position: absolute;
    width: 24px;
    height: 24px;
    background: #d4af37;
    transform: rotate(45deg);
  }}
  .corner-tl {{ top: 40px; left: 40px; }}
  .corner-tr {{ top: 40px; right: 40px; }}
  .corner-bl {{ bottom: 40px; left: 40px; }}
  .corner-br {{ bottom: 40px; right: 40px; }}
  
  .header {{
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 25px;
    z-index: 2;
  }}
  .om-symbol {{
    font-size: 82px;
    color: #ffd700;
    text-shadow: 0 0 30px rgba(255, 215, 0, 0.65);
    line-height: 1;
    margin-bottom: 15px;
  }}
  .brand-title {{
    font-size: 30px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #f3ce72;
    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
  }}
  .brand-divider {{
    width: 340px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #ffd700, transparent);
    margin: 16px 0 24px;
  }}
  .badge {{
    background: linear-gradient(135deg, rgba(212, 175, 55, 0.25), rgba(255, 215, 0, 0.12));
    border: 1.5px solid #ffd700;
    border-radius: 50px;
    padding: 14px 40px;
    font-size: 28px;
    font-weight: 700;
    color: #ffe699;
    box-shadow: 0 6px 25px rgba(0,0,0,0.5);
  }}

  .card {{
    background: linear-gradient(180deg, rgba(20, 28, 50, 0.92) 0%, rgba(11, 16, 28, 0.96) 100%);
    border: 1.5px solid rgba(212, 175, 55, 0.4);
    border-radius: 32px;
    padding: 60px 50px;
    width: 100%;
    max-width: 950px;
    min-height: 800px;
    box-shadow: 0 25px 60px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255, 255, 255, 0.12);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 38px;
    z-index: 2;
  }}
  .card-title {{
    font-size: 46px;
    font-weight: 800;
    color: #ffd700;
    line-height: 1.35;
    text-shadow: 0 2px 12px rgba(0,0,0,0.6);
  }}
  .card-divider {{
    width: 160px;
    height: 3px;
    background: linear-gradient(90deg, transparent, #d4af37, transparent);
  }}
  .card-body {{
    font-size: 38px;
    font-weight: 500;
    line-height: 1.6;
    color: #eaf0fa;
    text-shadow: 0 1px 5px rgba(0,0,0,0.4);
    white-space: pre-wrap;
  }}
  
  .footer {{
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    margin-bottom: 25px;
    z-index: 2;
  }}
  .cta-btn {{
    background: linear-gradient(135deg, #ffd700 0%, #e6a817 100%);
    color: #0b0f19;
    font-size: 32px;
    font-weight: 800;
    padding: 20px 54px;
    border-radius: 50px;
    box-shadow: 0 10px 30px rgba(255, 215, 0, 0.4);
    letter-spacing: 0.5px;
  }}
  .website-link {{
    font-size: 26px;
    font-weight: 600;
    color: #a0aec0;
    letter-spacing: 1px;
  }}
  .website-highlight {{
    color: #ffd700;
    font-weight: 700;
  }}
</style>
</head>
<body>
  <div class="border-outer"></div>
  <div class="border-inner"></div>
  <div class="corner-ornament corner-tl"></div>
  <div class="corner-ornament corner-tr"></div>
  <div class="corner-ornament corner-bl"></div>
  <div class="corner-ornament corner-br"></div>
  
  <div class="header">
    <div class="om-symbol">ॐ</div>
    <div class="brand-title">{html.escape(branding)}</div>
    <div class="brand-divider"></div>
    <div class="badge">{html.escape(badge)}</div>
  </div>
  
  <div class="card">
    <div class="card-title">{html.escape(title)}</div>
    <div class="card-divider"></div>
    <div class="card-body">{html.escape(body)}</div>
  </div>
  
  <div class="footer">
    <div class="cta-btn">अपनी जन्मपत्रिका अभी देखें 👉</div>
    <div class="website-link">
      <span class="website-highlight">shriramjiastro.in</span> • प्रामाणिक स्विस एफेमेरिस (DE431)
    </div>
  </div>
</body>
</html>"""

    temp_html = output_path.with_suffix(".temp.html")
    try:
        temp_html.write_text(html_code, encoding="utf-8")
        cmd = [
            chrome_bin,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--force-device-scale-factor=1",
            "--window-size=1080,1920",
            f"--screenshot={output_path.resolve()}",
            str(temp_html.resolve())
        ]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        return proc.returncode == 0 and output_path.exists()
    except Exception as e:
        print(f"[VideoEngine] Chrome slide render error: {e}")
        return False
    finally:
        if temp_html.exists():
            temp_html.unlink()

def render_slide_pil_fallback(
    slide_index: int,
    heading_badge: str,
    title_text: str,
    main_text: str,
    output_path: str,
    branding: str = "श्री रामजी एस्ट्रो • बृहत्पाराशरहोराशास्त्रम्"
):
    """
    Fallback PIL renderer if Chrome is unavailable.
    """
    width, height = 1080, 1920
    img = Image.new("RGB", (width, height), color=(8, 12, 22))
    draw = ImageDraw.Draw(img)
    
    # 1. Subtle background gradient
    for y in range(height):
        r = int(8 + (y / height) * 12)
        g = int(12 + (y / height) * 16)
        b = int(22 + (y / height) * 26)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
        
    # 2. Golden border
    border_color = (212, 160, 23)
    dim_gold = (120, 90, 20)
    draw.rectangle([(40, 50), (width - 40, height - 50)], outline=dim_gold, width=2)
    draw.rectangle([(48, 58), (width - 48, height - 58)], outline=border_color, width=3)

    # 3. Header
    font_om = get_devanagari_font(72)
    font_header = get_devanagari_font(34)
    draw.text((width // 2, 140), "ॐ", font=font_om, fill=(255, 215, 0), anchor="mm")
    draw.text((width // 2, 215), branding, font=font_header, fill=(212, 160, 23), anchor="mm")
    
    # 4. Badge
    draw.rounded_rectangle([(width // 2 - 280, 310), (width // 2 + 280, 385)], radius=35, fill=(30, 24, 10), outline=(255, 200, 40), width=2)
    font_badge = get_devanagari_font(34)
    draw.text((width // 2, 348), heading_badge, font=font_badge, fill=(255, 225, 120), anchor="mm")
    
    # 5. Card
    card_left, card_top = 80, 440
    card_right, card_bottom = width - 80, height - 380
    draw.rounded_rectangle([(card_left, card_top), (card_right, card_bottom)], radius=40, fill=(15, 22, 38), outline=dim_gold, width=2)
    
    font_title = get_devanagari_font(48)
    cur_y = card_top + 80
    title_lines = wrap_text(title_text, font_title, card_right - card_left - 80, draw)
    for line in title_lines:
        draw.text((width // 2, cur_y), line, font=font_title, fill=(255, 215, 0), anchor="mm")
        cur_y += 68
        
    cur_y += 40
    font_body = get_devanagari_font(40)
    body_lines = wrap_text(main_text, font_body, card_right - card_left - 90, draw)
    for line in body_lines:
        draw.text((width // 2, cur_y), line, font=font_body, fill=(240, 240, 245), anchor="mm")
        cur_y += 64
        
    # 6. Footer
    draw.rounded_rectangle([(width // 2 - 320, 1630), (width // 2 + 320, 1715)], radius=40, fill=border_color)
    font_cta = get_devanagari_font(36)
    draw.text((width // 2, 1672), "अपनी जन्मपत्रिका अभी देखें 👉", font=font_cta, fill=(10, 15, 25), anchor="mm")
    
    font_footer = get_devanagari_font(28)
    draw.text((width // 2, 1770), "shriramjiastro.in • स्विस एफेमेरिस DE431", font=font_footer, fill=(160, 170, 195), anchor="mm")
    
    img.save(output_path, quality=95)

# ---------------------------------------------------------------------------
# Scene-based engagement reel: hook in the first seconds, word-synced captions,
# slow zoom + crossfades, soft tanpura drone, progress bar and a subscribe ending.
# ---------------------------------------------------------------------------

FPS = 30
XFADE = 0.35                 # crossfade length between scenes (seconds)
SCENE_TAIL = 0.30            # breath after each narration
CAPTION_FONT = "Kohinoor Devanagari"
CAPTION_FONT_DIR = "/System/Library/Fonts"
CAPTION_SKIP_KINDS = {"shloka"}   # the shloka is already on screen

def probe_duration(path: str) -> float:
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    p = subprocess.run([exe, "-i", path], capture_output=True, text=True)
    m = re.search(r"Duration:\s*(\d+):(\d+):([\d\.]+)", p.stderr or p.stdout)
    if not m:
        return 0.0
    return float(m.group(1)) * 3600 + float(m.group(2)) * 60 + float(m.group(3))

async def tts_with_words(text: str, output_path: str, voice: str, rate: str) -> list:
    """Synthesize narration and return its word timings as (word, start_sec, end_sec)."""
    communicate = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    words = []
    with open(output_path, "wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                start = chunk["offset"] / 1e7
                words.append((chunk["text"], start, start + chunk["duration"] / 1e7))
    return words

SCENE_CSS = """
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@500;700;800;900&family=Noto+Serif+Devanagari:wght@600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    width: 1080px; height: 1920px; overflow: hidden; position: relative;
    font-family: 'Noto Sans Devanagari', 'Kohinoor Devanagari', sans-serif; color: #fff;
    background:
      radial-gradient(circle at 50% 30%, rgba(255, 196, 61, 0.22) 0%, rgba(255, 196, 61, 0) 42%),
      radial-gradient(ellipse at 50% 110%, #3a0d16 0%, rgba(58, 13, 22, 0) 60%),
      linear-gradient(180deg, #120a1c 0%, #0a0d1c 55%, #07070f 100%);
  }
  .mandala {
    position: absolute; left: 50%; top: 600px; width: 1500px; height: 1500px;
    transform: translate(-50%, -50%); border-radius: 50%; opacity: 0.16;
    background: repeating-conic-gradient(from 0deg, #d4af37 0deg 2deg, transparent 2deg 15deg);
    -webkit-mask: radial-gradient(circle, transparent 22%, #000 23%, #000 48%, transparent 49%);
  }
  .ring { position: absolute; left: 50%; top: 600px; border-radius: 50%; transform: translate(-50%, -50%);
          border: 2px solid rgba(212, 175, 55, 0.35); }
  .frame { position: absolute; inset: 34px; border: 2px solid rgba(212, 175, 55, 0.55); border-radius: 28px; }
  .top { position: absolute; top: 110px; width: 100%; text-align: center; }
  .om { font-size: 74px; color: #ffd36b; text-shadow: 0 0 34px rgba(255, 200, 80, 0.8); line-height: 1; }
  .brand { margin-top: 14px; font-size: 30px; font-weight: 700; letter-spacing: 1px; color: #f1d58a; }
  .badge { display: inline-block; margin-top: 26px; padding: 12px 36px; border-radius: 60px; font-size: 32px; font-weight: 800;
           color: #1a0d05; background: linear-gradient(135deg, #ffe08a, #e0a526); box-shadow: 0 10px 30px rgba(224, 165, 38, 0.45); }
  .stage { position: absolute; top: 470px; left: 70px; right: 70px; height: 640px;
           display: flex; align-items: center; justify-content: center; text-align: center; }
  .display { font-weight: 900; line-height: 1.32; color: #fff; text-shadow: 0 6px 30px rgba(0, 0, 0, 0.8); white-space: pre-line; }
  .display em { font-style: normal; color: #ffd36b; text-shadow: 0 0 40px rgba(255, 200, 80, 0.6), 0 6px 30px rgba(0, 0, 0, 0.8); }
  .shloka { font-family: 'Noto Serif Devanagari', serif; font-weight: 700; font-size: 54px; line-height: 1.7; color: #ffe6a8;
            white-space: pre-line; padding: 50px 40px; border-radius: 30px;
            background: rgba(20, 10, 24, 0.55); border: 2px solid rgba(212, 175, 55, 0.5); box-shadow: 0 30px 70px rgba(0, 0, 0, 0.6); }
  .source { margin-top: 26px; font-size: 32px; color: #f1d58a; font-weight: 700; }
  .foot { position: absolute; bottom: 120px; width: 100%; text-align: center; font-size: 34px; font-weight: 800; color: #ffd36b; letter-spacing: 1px; }
  .sub { display: inline-flex; align-items: center; gap: 18px; padding: 26px 64px; border-radius: 80px; background: #e62117;
         font-size: 58px; font-weight: 900; color: #fff; box-shadow: 0 18px 50px rgba(230, 33, 23, 0.55); }
  .cta-lines { margin-top: 50px; font-size: 54px; font-weight: 800; line-height: 1.5; white-space: pre-line; }
  .cta-lines em { font-style: normal; color: #ffd36b; }
"""

def _display_html(text: str) -> str:
    """Escape text; **word** becomes the gold highlight."""
    out = html.escape(text)
    return re.sub(r"\*\*(.+?)\*\*", r"<em>\1</em>", out)

def scene_html(scene: dict, branding: str) -> str:
    kind = scene.get("kind", "meaning")
    badge = html.escape(scene.get("badge", ""))
    display = scene.get("display", "")
    if kind == "shloka":
        stage = f'<div><div class="shloka">{html.escape(display)}</div><div class="source">{html.escape(scene.get("source", ""))}</div></div>'
    elif kind == "cta":
        stage = ('<div><div class="sub">🔔 SUBSCRIBE</div>'
                 f'<div class="cta-lines">{_display_html(display)}</div></div>')
    else:
        size = 96 if kind == "hook" else (78 if len(display) < 70 else 64)
        stage = f'<div class="display" style="font-size:{size}px">{_display_html(display)}</div>'
    rings = "".join(f'<div class="ring" style="width:{d}px;height:{d}px"></div>' for d in (760, 980))
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><style>{SCENE_CSS}</style></head>
<body><div class="mandala"></div>{rings}<div class="frame"></div>
<div class="top"><div class="om">ॐ</div><div class="brand">{html.escape(branding)}</div>
<div class="badge">{badge}</div></div>
<div class="stage">{stage}</div>
<div class="foot">shriramjiastro.in</div></body></html>"""

def render_html_png(html_code: str, output_path: Path) -> bool:
    chrome_bin = find_chrome_binary()
    if not chrome_bin:
        return False
    temp_html = output_path.with_suffix(".temp.html")
    try:
        temp_html.write_text(html_code, encoding="utf-8")
        cmd = [chrome_bin, "--headless=new", "--disable-gpu", "--hide-scrollbars",
               "--force-device-scale-factor=1", "--window-size=1080,1920",
               "--virtual-time-budget=4000",          # let the web fonts load
               f"--screenshot={output_path.resolve()}", str(temp_html.resolve())]
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        return proc.returncode == 0 and output_path.exists()
    except Exception as e:
        print(f"[VideoEngine] Chrome scene render error: {e}")
        return False
    finally:
        if temp_html.exists():
            temp_html.unlink()

def _ass_time(t: float) -> str:
    cs = int(round(t * 100))
    return f"{cs // 360000}:{cs // 6000 % 60:02d}:{cs // 100 % 60:02d}.{cs % 100:02d}"

def build_captions_ass(timed_scenes: list, ass_path: Path):
    """Karaoke captions: 2-4 words at a time, each word fills white → gold as it is spoken."""
    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{CAPTION_FONT},90,&H0036D3FF,&H00FFFFFF,&H00120A08,&H96000000,1,0,0,0,100,100,0,0,1,6,3,2,70,70,520,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events = []
    for sc in timed_scenes:
        if sc["kind"] in CAPTION_SKIP_KINDS:
            continue
        words, base = sc["words"], sc["start"]
        chunks, cur = [], []
        for w in words:
            cur.append(w)
            if len(cur) >= 4 or re.search(r"[।?!,—:]$", w[0]) or (len(cur) >= 3 and sum(len(x[0]) for x in cur) > 16):
                chunks.append(cur); cur = []
        if cur:
            chunks.append(cur)
        for i, ch in enumerate(chunks):
            start = base + ch[0][1]
            nxt = base + chunks[i + 1][0][1] if i + 1 < len(chunks) else base + ch[-1][2] + 0.25
            end = max(nxt, base + ch[-1][2])
            parts, t = [], ch[0][1]
            for word, ws, we in ch:
                gap = max(0, ws - t)
                parts.append((r"{\k%d}" % round(gap * 100) if gap > 0.02 else "") + r"{\kf%d}%s " % (max(1, round((we - ws) * 100)), word))
                t = we
            pop = r"{\fad(60,0)\t(0,120,\fscx108\fscy108)\t(120,220,\fscx100\fscy100)}"
            events.append(f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Cap,,0,0,0,,{pop}{''.join(parts).strip()}")
    ass_path.write_text(header + "\n".join(events) + "\n", encoding="utf-8")

def render_scene_reel(scenes: list, output_dir: Path, voice: str, branding: str) -> dict:
    output_dir = Path(output_dir)
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    rate = load_config()["content"].get("voice_rate", "+8%")

    # 1. Narration per scene (exact scene lengths + word timings)
    timed, t = [], 0.0
    for i, sc in enumerate(scenes):
        mp3 = str(output_dir / f"scene_{i}.mp3")
        words = asyncio.run(tts_with_words(sc["narration"], mp3, voice, rate))
        dur = probe_duration(mp3) + SCENE_TAIL
        timed.append({**sc, "audio": mp3, "words": words, "start": t, "dur": dur})
        t += dur
    total = t
    print(f"[VideoEngine] Narration: {len(scenes)} scenes, {total:.1f}s")

    # 2. Scene artwork
    for i, sc in enumerate(timed):
        png = output_dir / f"scene_{i}.png"
        if not render_html_png(scene_html(sc, branding), png):
            render_slide_pil_fallback(i, sc.get("badge", ""), sc.get("display", ""), "", str(png), branding)
        sc["png"] = str(png)
    Image.open(timed[0]["png"]).convert("RGB").save(output_dir / "thumbnail.jpg", quality=95)

    # 3. Captions
    ass_path = output_dir / "captions.ass"
    build_captions_ass(timed, ass_path)

    # 4. One ffmpeg pass: zoom per scene → crossfades → progress bar → captions; voice + drone
    n = len(timed)
    cmd = [exe, "-y"]
    for sc in timed:
        cmd += ["-i", sc["png"]]
    for sc in timed:
        cmd += ["-i", sc["audio"]]
    fc = []
    for i, sc in enumerate(timed):
        length = sc["dur"] + (XFADE if i < n - 1 else 0)
        frames = int(round(length * FPS))
        zoom = 0.10 if sc["kind"] == "hook" else 0.05
        fc.append(f"[{i}:v]scale=1620:2880,zoompan=z='1+{zoom}*on/{frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'"
                  f":d={frames}:s=1080x1920:fps={FPS},setsar=1,format=yuv420p[v{i}]")
    last, offset = "v0", 0.0
    for i in range(1, n):
        offset += timed[i - 1]["dur"]
        fc.append(f"[{last}][v{i}]xfade=transition=fade:duration={XFADE}:offset={offset:.3f}[x{i}]")
        last = f"x{i}"
    fc.append(f"color=c=0xFFC83D:s=1080x12:r={FPS}[bar]")
    fc.append(f"[{last}][bar]overlay=x='-w+w*t/{total:.3f}':y=0:shortest=1[vb]")
    ass_arg = str(ass_path).replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
    fc.append(f"[vb]ass='{ass_arg}':fontsdir={CAPTION_FONT_DIR}[vout]")
    for i, sc in enumerate(timed):
        fc.append(f"[{n + i}:a]aresample=44100,apad=whole_dur={sc['dur']:.3f}[a{i}]")
    fc.append("".join(f"[a{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1[voice]")
    # Soft tanpura-like drone on C# (Sa–Pa–Sa'), slowly breathing; synthesized, so no copyright issues.
    drone = ("0.45*sin(2*PI*138.59*t)*(0.7+0.3*sin(2*PI*0.23*t))"
             "+0.30*sin(2*PI*207.65*t)*(0.7+0.3*sin(2*PI*0.17*t+1))"
             "+0.22*sin(2*PI*277.18*t)*(0.7+0.3*sin(2*PI*0.29*t+2))"
             "+0.18*sin(2*PI*69.30*t)")
    fc.append(f"aevalsrc='{drone}':s=44100:d={total:.3f},lowpass=f=1800,volume=0.09,"
              f"afade=t=in:d=1.5,afade=t=out:st={max(0, total - 1.5):.3f}:d=1.5[drone]")
    fc.append("[voice][drone]amix=inputs=2:normalize=0,alimiter=limit=0.95[aout]")
    video_output_path = str(output_dir / "reel_1080x1920.mp4")
    cmd += ["-filter_complex", ";".join(fc), "-map", "[vout]", "-map", "[aout]",
            "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-maxrate", "8000k", "-bufsize", "12000k",
            "-g", "60", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart", "-t", f"{total:.3f}", video_output_path]
    print("[VideoEngine] Encoding scene reel (zoom, crossfades, captions, drone)...")
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"FFmpeg encoding failed: {proc.stderr[-3000:]}")
    print(f"[VideoEngine] Successfully created reel: {video_output_path}")
    return {"video_path": video_output_path, "thumbnail_path": str(output_dir / "thumbnail.jpg"),
            "audio_path": None, "duration_sec": total}

def render_vertical_video(
    video_data: dict,
    output_dir: Path
) -> dict:
    """
    Renders complete 1080x1920 MP4 vertical reel and high-res thumbnail
    at standard 30 FPS with high bitrate for razor-sharp social media playback.
    """
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if video_data.get("scenes"):
        config = load_config()
        try:
            return render_scene_reel(
                video_data["scenes"], output_dir,
                voice=config["content"].get("voice", "hi-IN-MadhurNeural"),
                branding=config["content"].get("branding", "श्री रामजी एस्ट्रो"))
        except Exception as e:
            # Never lose the day's post: fall back to the classic slide reel below.
            print(f"[VideoEngine] Scene reel failed, using classic slides: {e}")
    
    audio_path = str(output_dir / "voice.mp3")
    video_output_path = str(output_dir / "reel_1080x1920.mp4")
    thumbnail_path = str(output_dir / "thumbnail.jpg")
    concat_script_path = str(output_dir / "slides_concat.txt")
    
    config = load_config()
    voice = config["content"].get("voice", "hi-IN-MadhurNeural")
    branding = config["content"].get("branding", "श्री रामजी एस्ट्रो • बृहत्पाराशरहोराशास्त्रम्")
    
    voice_script = video_data.get("voice_script", "")
    slides = video_data.get("slides", [])
    title = video_data.get("title", "बृहत्पाराशरहोराशास्त्रम् रहस्य")
    
    # Step 1: Synthesize Voiceover
    print(f"[VideoEngine] Generating voiceover ({voice})...")
    total_audio_duration = asyncio.run(generate_voiceover(voice_script, audio_path, voice))
    print(f"[VideoEngine] Audio generated: {total_audio_duration:.2f} seconds.")
    
    # Step 2: Render each slide PNG (Chrome first, PIL fallback)
    slide_files = []
    num_slides = max(1, len(slides))
    slide_duration = total_audio_duration / num_slides
    
    for i, slide in enumerate(slides):
        slide_img_path = output_dir / f"slide_{i}.png"
        heading_badge = slide.get("heading", "⚡ वैदिक सूत्र")
        title_text = title if i == 0 else slide.get("heading", "")
        main_text = slide.get("body", "")
        
        # Attempt crisp Chrome HTML render
        rendered = render_slide_chrome(
            badge=heading_badge,
            title=title_text,
            body=main_text,
            output_path=slide_img_path,
            branding=branding
        )
        if not rendered:
            print(f"[VideoEngine] Fallback to PIL renderer for slide {i}")
            render_slide_pil_fallback(
                slide_index=i,
                heading_badge=heading_badge,
                title_text=title_text,
                main_text=main_text,
                output_path=str(slide_img_path),
                branding=branding
            )
            
        slide_files.append((str(slide_img_path), slide_duration))
        
        # Save first slide as thumbnail
        if i == 0:
            thumb_img = Image.open(str(slide_img_path))
            thumb_img.save(thumbnail_path, quality=95)
            
    # Step 3: Write ffmpeg concat file
    with open(concat_script_path, "w", encoding="utf-8") as f:
        for path, dur in slide_files:
            abs_path = str(Path(path).resolve())
            f.write(f"file '{abs_path}'\n")
            f.write(f"duration {dur:.3f}\n")
        # Repeat last slide per ffmpeg concat requirement
        if slide_files:
            last_abs_path = str(Path(slide_files[-1][0]).resolve())
            f.write(f"file '{last_abs_path}'\n")
            
    # Step 4: Transcode to MP4 at standard 30 FPS and crisp bitrate
    print(f"[VideoEngine] Encoding 1080x1920 MP4 video at 30 FPS...")
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        exe, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_script_path,
        "-i", audio_path,
        "-vf", "fps=30,format=yuv420p",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "18",
        "-b:v", "6000k",
        "-maxrate", "8000k",
        "-bufsize", "12000k",
        "-g", "60",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        video_output_path
    ]
    
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print(f"[VideoEngine] FFmpeg error: {proc.stderr}")
        raise RuntimeError(f"FFmpeg encoding failed: {proc.stderr}")
        
    print(f"[VideoEngine] Successfully created crisp HD video: {video_output_path}")
    return {
        "video_path": video_output_path,
        "thumbnail_path": thumbnail_path,
        "audio_path": audio_path,
        "duration_sec": total_audio_duration
    }
