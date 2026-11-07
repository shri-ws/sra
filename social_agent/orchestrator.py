"""
Shri Ramji Astro (SRA) - Master Autonomous Daily Social Media Orchestrator
Coordinates daily content curation, vertical video rendering, and multi-platform publishing:
Reddit, Quora, Facebook, Instagram Reels, and YouTube Shorts.
"""

import os
import sys
import json
import argparse
import datetime
from pathlib import Path

from .config import load_config, OUTPUT_DIR, BASE_DIR as ROOT_DIR
from .content_curator import synthesize_daily_social_package, select_daily_topic
from .video_engine import render_vertical_video
from .seo_agent import run_daily_seo
from .publishers.reddit_publisher import publish_to_reddit
from .publishers.quora_publisher import publish_to_quora
from .publishers.facebook_publisher import publish_to_facebook
from .publishers.instagram_publisher import publish_to_instagram_reels
from .publishers.youtube_publisher import publish_to_youtube_shorts

HISTORY_FILE = OUTPUT_DIR / "history.json"
LATEST_STATUS_FILE = OUTPUT_DIR / "latest_status.json"

def run_daily_pipeline(
    target_date: datetime.date = None,
    dry_run: bool = False,
    generate_only: bool = False,
    publish_only: bool = False,
    channel_filter: str = None
) -> dict:
    """
    Executes the complete daily autonomous social pipeline.
    channel_filter: 'channel_1' (Hindi + social), 'channel_2' (English Shorts only), or None (all).
    """
    if not target_date:
        target_date = datetime.date.today()
        
    date_str = target_date.isoformat()
    daily_output_dir = OUTPUT_DIR / date_str
    daily_output_dir.mkdir(parents=True, exist_ok=True)
    payload_json_path = daily_output_dir / "social_package.json"
    
    print(f"\n=======================================================")
    print(f"🚀 SRA AUTONOMOUS SOCIAL AGENT - DAILY RUN ({date_str})")
    print(f"=======================================================")
    
    config = load_config()
    
    # -------------------------------------------------------------
    # Step 0: Autonomous SEO Article Generation, Sitemap, RSS & Live Push
    # -------------------------------------------------------------
    seo_res = {}
    try:
        seo_res = run_daily_seo(target_date)
    except Exception as e:
        print(f"[Orchestrator] Daily SEO agent notice: {e}")

    # -------------------------------------------------------------
    # Step 1: Content Curation & Video Generation
    # -------------------------------------------------------------
    if not publish_only or not payload_json_path.exists():
        print(f"[Pipeline] Step 1: Curating BPHS Vedic wisdom & Shlokas for {date_str}...")
        topic_data = select_daily_topic(target_date)
        package = synthesize_daily_social_package(topic_data)
        
        # Attach today's live SEO article link to social payloads
        if seo_res and seo_res.get("url"):
            art_url = seo_res["url"]
            art_title = seo_res.get("title", "आज का शास्त्रीय शोध लेख")
            for plat in ["youtube", "facebook", "whatsapp"]:
                if plat in package.get("publish_payloads", {}):
                    cur_body = package["publish_payloads"][plat].get("description") or package["publish_payloads"][plat].get("text") or ""
                    if art_url not in cur_body:
                        addon = f"📖 {art_title}:\n👉 {art_url}\n\n"
                        if "description" in package["publish_payloads"][plat]:
                            package["publish_payloads"][plat]["description"] = addon + cur_body
                        elif "text" in package["publish_payloads"][plat]:
                            package["publish_payloads"][plat]["text"] = addon + cur_body

        print(f"[Pipeline] Step 2: Rendering 1080x1920 MP4 Video Reel (Hindi - Main Channel)...")
        media_res = render_vertical_video(package["video"], daily_output_dir)
        package["media"] = media_res

        # Render English Reel for Channel 2
        if "video_en" in package:
            print(f"[Pipeline] Step 2b: Rendering 1080x1920 MP4 Video Reel (English - Channel 2)...")
            output_dir_en = daily_output_dir / "en"
            output_dir_en.mkdir(parents=True, exist_ok=True)
            media_res_en = render_vertical_video(package["video_en"], output_dir_en)
            package["media_en"] = media_res_en
        
        # Save package to JSON
        with open(payload_json_path, "w", encoding="utf-8") as f:
            json.dump(package, f, indent=2, ensure_ascii=False)
        print(f"[Pipeline] Package and media saved to: {daily_output_dir}")
    else:
        print(f"[Pipeline] Loading existing package for {date_str}...")
        with open(payload_json_path, "r", encoding="utf-8") as f:
            package = json.load(f)
            
    if generate_only:
        print(f"[Pipeline] Generation complete (--generate-only set). Exiting.")
        status_record = {
            "date": date_str,
            "status": "generated",
            "topic": package["topic"]["theme"],
            "shloka": package["topic"]["shloka"],
            "video_path": package.get("media", {}).get("video_path"),
            "thumbnail_path": package.get("media", {}).get("thumbnail_path"),
            "timestamp": datetime.datetime.now().isoformat()
        }
        with open(LATEST_STATUS_FILE, "w", encoding="utf-8") as f:
            json.dump(status_record, f, indent=2, ensure_ascii=False)
        return package
        
    # -------------------------------------------------------------
    # Step 2: Multi-Platform Publishing
    # -------------------------------------------------------------
    video_path = package.get("media", {}).get("video_path", str(daily_output_dir / "reel_1080x1920.mp4"))
    video_path_en = package.get("media_en", {}).get("video_path")
    thumb_path = package.get("media", {}).get("thumbnail_path", str(daily_output_dir / "thumbnail.jpg"))
    
    publish_results = {}
    
    # 1-4. Non-YouTube platforms (run during morning / channel_1 run or full run)
    if channel_filter in (None, "channel_1", "all", "1"):
        print(f"\n[Pipeline] Publishing to Reddit...")
        publish_results["reddit"] = publish_to_reddit(package["reddit"], config, dry_run=dry_run)
        
        print(f"\n[Pipeline] Publishing to Quora...")
        publish_results["quora"] = publish_to_quora(package["quora"], config, dry_run=dry_run)
        
        print(f"\n[Pipeline] Publishing to Facebook...")
        publish_results["facebook"] = publish_to_facebook(package["facebook"], config, dry_run=dry_run, image_path=thumb_path)
        
        print(f"\n[Pipeline] Publishing Instagram Reel...")
        publish_results["instagram"] = publish_to_instagram_reels(package["instagram"], video_path, config, dry_run=dry_run)
    
    # 5. YouTube Shorts (Per-channel routing)
    yt_multi = {}
    if channel_filter in (None, "channel_1", "all", "1"):
        yt_multi["channel_1"] = {
            "payload": package["youtube"],
            "video_path": video_path
        }
    if channel_filter in (None, "channel_2", "all", "2"):
        yt_multi["channel_2"] = {
            "payload": package.get("youtube_channel2") or package["youtube"],
            "video_path": video_path_en or video_path
        }
    
    if yt_multi:
        print(f"\n[Pipeline] Publishing YouTube Shorts ({', '.join(yt_multi.keys())})...")
        publish_results["youtube"] = publish_to_youtube_shorts(yt_multi, video_path, config, dry_run=dry_run)
    
    # Record and merge history
    history = []
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception:
            history = []
            
    existing_idx = next((i for i, r in enumerate(history) if r.get("date") == date_str), -1)
    if existing_idx >= 0:
        history[existing_idx].setdefault("results", {})
        if "youtube" in publish_results:
            history[existing_idx]["results"].setdefault("youtube", {})
            history[existing_idx]["results"]["youtube"].setdefault("channels", {})
            history[existing_idx]["results"]["youtube"]["channels"].update(
                publish_results["youtube"].get("channels", {})
            )
            if publish_results["youtube"].get("status") == "success":
                history[existing_idx]["results"]["youtube"]["status"] = "success"
        for k in ["reddit", "quora", "facebook", "instagram"]:
            if k in publish_results:
                history[existing_idx]["results"][k] = publish_results[k]
        history[existing_idx]["timestamp"] = datetime.datetime.now().isoformat()
        summary_record = history[existing_idx]
    else:
        summary_record = {
            "date": date_str,
            "timestamp": datetime.datetime.now().isoformat(),
            "dry_run": dry_run,
            "topic": package["topic"]["theme"],
            "shloka": package["topic"]["shloka"],
            "video": video_path,
            "thumbnail": thumb_path,
            "results": publish_results
        }
        history.insert(0, summary_record)
        
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history[:100], f, indent=2, ensure_ascii=False)
        
    with open(LATEST_STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(summary_record, f, indent=2, ensure_ascii=False)

    # Keep static data/latest_social_package.json fresh for website admin
    try:
        data_pkg = ROOT_DIR / "data" / "latest_social_package.json"
        data_pkg.parent.mkdir(exist_ok=True)
        with open(data_pkg, "w", encoding="utf-8") as f:
            json.dump(package, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[Orchestrator] Warning copying to data/latest_social_package.json: {e}")
        
    print(f"\n=======================================================")
    print(f"✅ SRA AUTONOMOUS DAILY RUN COMPLETED SUCCESSFULLY!")
    print(f"=======================================================\n")
    return summary_record

SCHEDULE_START_CH1 = datetime.time(7, 0)   # Channel 1 (Hindi) & social platforms: 07:00 AM IST
SCHEDULE_START_CH2 = datetime.time(19, 0)  # Channel 2 (English Shorts): 07:00 PM IST (US/UK/Canada prime)
SCHEDULE_CUTOFF = datetime.time(23, 30)
MAX_ATTEMPTS_PER_DAY = 3
LOCK_FILE = OUTPUT_DIR / ".daily_run.lock"
ATTEMPTS_FILE = OUTPUT_DIR / ".attempts.json"

def is_channel_posted_today(date_str: str, channel_id: str) -> bool:
    if not HISTORY_FILE.exists():
        return False
    try:
        history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
    except Exception:
        return False
    for r in history:
        if r.get("date") == date_str and not r.get("dry_run"):
            yt = r.get("results", {}).get("youtube", {})
            channels = yt.get("channels", {})
            if channel_id in channels and channels[channel_id].get("status") == "success":
                return True
            if channel_id == "channel_1" and yt.get("status") == "success" and not channels:
                return True
    return False

def run_scheduled() -> None:
    """
    launchd calls this at 07:00, 19:00, at boot/login and every 30 minutes.
    - At or after 07:00 IST: posts Channel 1 (Hindi) + Reddit, Quora, Facebook, Instagram.
    - At or after 19:00 IST (7 PM): posts Channel 2 (English Shorts) targeting US, UK, Canada.
    """
    now = datetime.datetime.now()
    date_str = now.date().isoformat()
    if not (SCHEDULE_START_CH1 <= now.time() <= SCHEDULE_CUTOFF):
        return

    ch1_done = is_channel_posted_today(date_str, "channel_1")
    ch2_done = is_channel_posted_today(date_str, "channel_2")
    ch2_time_reached = (now.time() >= SCHEDULE_START_CH2)

    target_channel = None
    if not ch1_done and now.time() >= SCHEDULE_START_CH1:
        target_channel = "channel_1"
    elif not ch2_done and ch2_time_reached:
        target_channel = "channel_2"

    if not target_channel:
        return

    attempts = {}
    if ATTEMPTS_FILE.exists():
        try:
            attempts = json.loads(ATTEMPTS_FILE.read_text())
        except Exception:
            attempts = {}
    attempt_key = f"{date_str}_{target_channel}"
    if attempts.get(attempt_key, 0) >= MAX_ATTEMPTS_PER_DAY:
        return

    # One run at a time; lock older than 2 hours is considered stale
    if LOCK_FILE.exists() and (now.timestamp() - LOCK_FILE.stat().st_mtime) < 7200:
        return
    LOCK_FILE.write_text(str(os.getpid()))
    try:
        attempts[attempt_key] = attempts.get(attempt_key, 0) + 1
        ATTEMPTS_FILE.write_text(json.dumps(attempts))
        print(f"[Scheduler] Starting scheduled daily post for {date_str} [{target_channel}] at {now:%H:%M}")
        # Channel 1 run generates both reels; Channel 2 run reuses pre-rendered reel
        run_daily_pipeline(target_date=now.date(), channel_filter=target_channel)
    finally:
        LOCK_FILE.unlink(missing_ok=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SRA Autonomous Social Media Agent")
    parser.add_argument("--scheduled", action="store_true", help="launchd entry: post once per day, catching up after missed 07:00 runs")
    parser.add_argument("--channel", type=str, default=None, choices=["1", "2", "all", "channel_1", "channel_2"], help="Filter to a specific channel (1=Hindi, 2=English)")
    parser.add_argument("--dry-run", action="store_true", help="Simulate publishing without external API calls")
    parser.add_argument("--generate-only", action="store_true", help="Only generate content and video reel, do not publish")
    parser.add_argument("--publish-only", action="store_true", help="Publish previously generated package for date")
    parser.add_argument("--date", type=str, default=None, help="Specific date in YYYY-MM-DD format")
    
    args = parser.parse_args()
    if args.scheduled:
        run_scheduled()
        sys.exit(0)
    target_dt = datetime.date.fromisoformat(args.date) if args.date else None
    
    run_daily_pipeline(
        target_date=target_dt,
        dry_run=args.dry_run,
        generate_only=args.generate_only,
        publish_only=args.publish_only,
        channel_filter=args.channel
    )
