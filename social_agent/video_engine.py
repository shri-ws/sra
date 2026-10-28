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
