"""
Shri Ramji Astro (SRA) - Autonomous Video & Reel Generation Engine
Generates 1080x1920 (9:16) vertical MP4 video reels and YouTube Shorts
with natural neural Hindi voiceover (Edge-TTS) and divine Vedic temple aesthetics.
"""

import os
import re
import asyncio
import subprocess
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import imageio_ffmpeg
import edge_tts

from .config import load_config

# macOS Devanagari font paths
DEV_FONT_PATHS = [
    "/System/Library/Fonts/Supplemental/DevanagariMT.ttc",
    "/System/Library/Fonts/Supplemental/Devanagari Sangam MN.ttc",
    "/System/Library/Fonts/Supplemental/ITFDevanagari.ttc",
    "/System/Library/Fonts/Kohinoor.ttc"
]

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

def create_slide_image(
    slide_index: int,
    heading_badge: str,
    title_text: str,
    main_text: str,
    output_path: str,
    branding: str = "श्री रामजी एस्ट्रो • बृहत्पाराशरहोराशास्त्रम्"
):
    """
    Render a 1080x1920 vertical slide with dark Vedic aesthetic and golden highlights.
    """
    width, height = 1080, 1920
    img = Image.new("RGB", (width, height), color=(8, 12, 22))
    draw = ImageDraw.Draw(img)
    
    # 1. Subtle background gradient (vertical interpolation)
    for y in range(height):
        r = int(8 + (y / height) * 12)
        g = int(12 + (y / height) * 16)
        b = int(22 + (y / height) * 26)
        draw.line([(0, y), (width, y)], fill=(r, g, b))
        
    # 2. Golden decorative border and corner accents
    border_color = (212, 160, 23)
    dim_gold = (120, 90, 20)
    draw.rectangle([(40, 50), (width - 40, height - 50)], outline=dim_gold, width=2)
    draw.rectangle([(48, 58), (width - 48, height - 58)], outline=border_color, width=3)
    
    # Corner diamonds
    corner_coords = [(48, 58), (width - 48, 58), (48, height - 58), (width - 48, height - 58)]
    for cx, cy in corner_coords:
        draw.polygon([(cx, cy - 10), (cx + 10, cy), (cx, cy + 10), (cx - 10, cy)], fill=border_color)

    # 3. Header: Sacred Symbol & SRA Branding
    font_om = get_devanagari_font(72)
    font_header = get_devanagari_font(34)
    
    draw.text((width // 2, 140), "ॐ", font=font_om, fill=(255, 215, 0), anchor="mm")
    draw.text((width // 2, 215), branding, font=font_header, fill=(212, 160, 23), anchor="mm")
    
    # Header divider
    draw.line([(width // 2 - 250, 255), (width // 2 + 250, 255)], fill=dim_gold, width=2)
    draw.polygon([(width // 2, 250), (width // 2 + 6, 255), (width // 2, 260), (width // 2 - 6, 255)], fill=border_color)
    
    # 4. Badge / Tag (e.g. ⚡ क्या आप जानते हैं?, 📜 महर्षि पराशर सूत्र)
    badge_bg = (30, 24, 10)
    badge_border = (255, 200, 40)
    draw.rounded_rectangle([(width // 2 - 280, 310), (width // 2 + 280, 385)], radius=35, fill=badge_bg, outline=badge_border, width=2)
    font_badge = get_devanagari_font(34)
    draw.text((width // 2, 348), heading_badge, font=font_badge, fill=(255, 225, 120), anchor="mm")
    
    # 5. Central Content Card Container
    card_top = 430
    card_bottom = 1580
    card_left = 80
    card_right = width - 80
    
    draw.rounded_rectangle([(card_left, card_top), (card_right, card_bottom)], radius=24, fill=(16, 22, 38), outline=dim_gold, width=2)
    
    # Title / Topic
    font_title = get_devanagari_font(52)
    title_lines = wrap_text(title_text, font_title, card_right - card_left - 80, draw)
    cur_y = card_top + 70
    for line in title_lines:
        draw.text((width // 2, cur_y), line, font=font_title, fill=(255, 215, 0), anchor="mm")
        cur_y += 68
        
    cur_y += 30
    draw.line([(card_left + 80, cur_y), (card_right - 80, cur_y)], fill=(50, 65, 100), width=1)
    cur_y += 50
    
    # Main Body Text / Shloka
    font_body = get_devanagari_font(44)
    body_lines = wrap_text(main_text, font_body, card_right - card_left - 90, draw)
    for line in body_lines:
        draw.text((width // 2, cur_y), line, font=font_body, fill=(240, 240, 245), anchor="mm")
        cur_y += 64
        
    # 6. Footer: CTA Button & Website Link
    cta_bg = (212, 160, 23)
    cta_text_color = (10, 15, 25)
    font_cta = get_devanagari_font(36)
    draw.rounded_rectangle([(width // 2 - 320, 1630), (width // 2 + 320, 1715)], radius=40, fill=cta_bg)
    draw.text((width // 2, 1672), "अपनी जन्मपत्रिका अभी देखें 👉", font=font_cta, fill=cta_text_color, anchor="mm")
    
    font_footer = get_devanagari_font(28)
    draw.text((width // 2, 1770), "shri-ramji-astro.org • 100% प्रामाणिक स्विस एफेमेरिस (DE431)", font=font_footer, fill=(160, 170, 195), anchor="mm")
    
    img.save(output_path, quality=95)

def render_vertical_video(
    video_data: dict,
    output_dir: Path
) -> dict:
    """
    Renders complete 1080x1920 MP4 vertical reel and high-res thumbnail.
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
    
    # Step 2: Render each slide PNG
    slide_files = []
    num_slides = max(1, len(slides))
    slide_duration = total_audio_duration / num_slides
    
    for i, slide in enumerate(slides):
        slide_img_path = str(output_dir / f"slide_{i}.png")
        create_slide_image(
            slide_index=i,
            heading_badge=slide.get("heading", "⚡ वैदिक सूत्र"),
            title_text=title if i == 0 else slide.get("heading", ""),
            main_text=slide.get("body", ""),
            output_path=slide_img_path,
            branding=branding
        )
        slide_files.append((slide_img_path, slide_duration))
        
        # Save first slide as thumbnail
        if i == 0:
            thumb_img = Image.open(slide_img_path)
            thumb_img.save(thumbnail_path, quality=95)
            
    # Step 3: Write ffmpeg concat file (using basename or absolute path)
    with open(concat_script_path, "w", encoding="utf-8") as f:
        for path, dur in slide_files:
            abs_path = str(Path(path).resolve())
            f.write(f"file '{abs_path}'\n")
            f.write(f"duration {dur:.3f}\n")
        # Repeat last slide per ffmpeg concat requirement
        if slide_files:
            last_abs_path = str(Path(slide_files[-1][0]).resolve())
            f.write(f"file '{last_abs_path}'\n")
            
    # Step 4: Transcode to MP4 using imageio_ffmpeg
    print(f"[VideoEngine] Encoding 1080x1920 MP4 video...")
    exe = imageio_ffmpeg.get_ffmpeg_exe()
    cmd = [
        exe, "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_script_path,
        "-i", audio_path,
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "22",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "192k",
        "-shortest",
        video_output_path
    ]
    
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        print(f"[VideoEngine] FFmpeg error: {proc.stderr}")
        raise RuntimeError(f"FFmpeg encoding failed: {proc.stderr}")
        
    print(f"[VideoEngine] Successfully created: {video_output_path}")
    return {
        "video_path": video_output_path,
        "thumbnail_path": thumbnail_path,
        "audio_path": audio_path,
        "duration_sec": total_audio_duration
    }
