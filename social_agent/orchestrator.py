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

from .config import load_config, OUTPUT_DIR
from .content_curator import synthesize_daily_social_package, select_daily_topic
from .video_engine import render_vertical_video
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
    publish_only: bool = False
) -> dict:
    """
    Executes the complete daily autonomous social pipeline.
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
    # Step 1: Content Curation & Video Generation
    # -------------------------------------------------------------
    if not publish_only or not payload_json_path.exists():
        print(f"[Pipeline] Step 1: Curating BPHS Vedic wisdom & Shlokas for {date_str}...")
        topic_data = select_daily_topic(target_date)
        package = synthesize_daily_social_package(topic_data)
        
        print(f"[Pipeline] Step 2: Rendering 1080x1920 MP4 Video Reel & High-Res Cover...")
        media_res = render_vertical_video(package["video"], daily_output_dir)
        package["media"] = media_res
        
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
    thumb_path = package.get("media", {}).get("thumbnail_path", str(daily_output_dir / "thumbnail.jpg"))
    
    publish_results = {}
    
    # 1. Reddit
    print(f"\n[Pipeline] Publishing to Reddit...")
    publish_results["reddit"] = publish_to_reddit(package["reddit"], config, dry_run=dry_run)
    
    # 2. Quora
    print(f"\n[Pipeline] Publishing to Quora...")
    publish_results["quora"] = publish_to_quora(package["quora"], config, dry_run=dry_run)
    
    # 3. Facebook
    print(f"\n[Pipeline] Publishing to Facebook...")
    publish_results["facebook"] = publish_to_facebook(package["facebook"], config, dry_run=dry_run, image_path=thumb_path)
    
    # 4. Instagram Reels
    print(f"\n[Pipeline] Publishing Instagram Reel...")
    publish_results["instagram"] = publish_to_instagram_reels(package["instagram"], video_path, config, dry_run=dry_run)
    
    # 5. YouTube Shorts
    print(f"\n[Pipeline] Publishing YouTube Short...")
    publish_results["youtube"] = publish_to_youtube_shorts(package["youtube"], video_path, config, dry_run=dry_run)
    
    # Record history
    history = []
    if HISTORY_FILE.exists():
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception:
            history = []
            
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
    
    # Prepend latest
    history.insert(0, summary_record)
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history[:100], f, indent=2, ensure_ascii=False)
        
    with open(LATEST_STATUS_FILE, "w", encoding="utf-8") as f:
        json.dump(summary_record, f, indent=2, ensure_ascii=False)
        
    print(f"\n=======================================================")
    print(f"✅ SRA AUTONOMOUS DAILY RUN COMPLETED SUCCESSFULLY!")
    print(f"=======================================================\n")
    return summary_record

SCHEDULE_START = datetime.time(7, 0)     # first moment the daily post may go out
SCHEDULE_CUTOFF = datetime.time(21, 0)   # after this a missed day is skipped, not posted at night
MAX_ATTEMPTS_PER_DAY = 3
LOCK_FILE = OUTPUT_DIR / ".daily_run.lock"
ATTEMPTS_FILE = OUTPUT_DIR / ".attempts.json"

def youtube_done_today(date_str: str) -> bool:
    if not HISTORY_FILE.exists():
        return False
    try:
        history = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
    except Exception:
        return False
    return any(r.get("date") == date_str and not r.get("dry_run")
               and r.get("results", {}).get("youtube", {}).get("status") == "success"
               for r in history)

def run_scheduled() -> None:
    """
    launchd calls this at 07:00, at login/boot and every 30 minutes. It posts once per day:
    if the Mac was off or asleep at 07:00 (e.g. a power cut), the next call catches up.
    """
    now = datetime.datetime.now()
    date_str = now.date().isoformat()
    if not (SCHEDULE_START <= now.time() <= SCHEDULE_CUTOFF):
        return
    if youtube_done_today(date_str):
        return
    attempts = {}
    if ATTEMPTS_FILE.exists():
        try:
            attempts = json.loads(ATTEMPTS_FILE.read_text())
        except Exception:
            attempts = {}
    if attempts.get(date_str, 0) >= MAX_ATTEMPTS_PER_DAY:
        return
    # One run at a time; a lock older than 2 hours is from a crashed run.
    if LOCK_FILE.exists() and (now.timestamp() - LOCK_FILE.stat().st_mtime) < 7200:
        return
    LOCK_FILE.write_text(str(os.getpid()))
    try:
        ATTEMPTS_FILE.write_text(json.dumps({date_str: attempts.get(date_str, 0) + 1}))
        late = "" if now.time() < datetime.time(7, 30) else f" (catch-up run at {now:%H:%M})"
        print(f"[Scheduler] Starting daily post for {date_str}{late}")
        # Reuse a reel already rendered today so a retry does not render a different one.
        run_daily_pipeline(target_date=now.date(), publish_only=True)
    finally:
        LOCK_FILE.unlink(missing_ok=True)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SRA Autonomous Social Media Agent")
    parser.add_argument("--scheduled", action="store_true", help="launchd entry: post once per day, catching up after missed 07:00 runs")
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
        publish_only=args.publish_only
    )
