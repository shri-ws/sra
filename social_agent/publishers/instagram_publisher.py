"""
Shri Ramji Astro (SRA) - Instagram Reels Auto-Publisher
Publishes 1080x1920 vertical video Reels to Instagram Business/Creator Account
via Meta Instagram Graph API (2-step Container -> Publish workflow).
"""

import json
import time
import urllib.request
import urllib.parse
from pathlib import Path

def publish_to_instagram_reels(ig_payload: dict, video_path: str, config: dict, dry_run: bool = False, public_video_url: str = None) -> dict:
    """
    Publish vertical reel to Instagram.
    ig_payload contains: 'caption'
    """
    ig_cfg = config.get("platforms", {}).get("instagram", {})
    ig_user_id = ig_cfg.get("ig_user_id", "").strip()
    access_token = ig_cfg.get("access_token", "").strip()
    caption = ig_payload.get("caption", "")
    
    if dry_run or not (ig_user_id and access_token):
        print(f"[InstagramPublisher] Dry-Run/Mock Mode (Credentials missing or dry-run requested)")
        print(f"[InstagramPublisher] Video file: {video_path}")
        print(f"[InstagramPublisher] Caption preview: {caption[:120]}...")
        return {
            "status": "simulated" if dry_run else "credentials_pending",
            "platform": "instagram",
            "video_file": str(video_path),
            "ig_user_id": ig_user_id or "(none)",
            "caption": caption[:150],
            "note": "Reel ready. Add IG_USER_ID and IG_ACCESS_TOKEN to enable live Instagram publishing."
        }
        
    try:
        # Step 1: Create Container
        # Note: Meta Graph API requires a publicly accessible video URL
        if not public_video_url:
            public_video_url = f"https://shri-ramji-astro.org/media/{Path(video_path).name}"
            
        create_url = f"https://graph.facebook.com/v19.0/{ig_user_id}/media"
        data = urllib.parse.urlencode({
            "media_type": "REELS",
            "video_url": public_video_url,
            "caption": caption,
            "access_token": access_token
        }).encode("utf-8")
        
        req = urllib.request.Request(create_url, data=data, method="POST")
        with urllib.request.urlopen(req, timeout=30) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            container_id = res_data.get("id")
            
        print(f"[InstagramPublisher] Reel container created: {container_id}. Waiting for processing...")
        time.sleep(15) # Wait for Meta to process the video container
        
        # Step 2: Publish Container
        publish_url = f"https://graph.facebook.com/v19.0/{ig_user_id}/media_publish"
        pub_data = urllib.parse.urlencode({
            "creation_id": container_id,
            "access_token": access_token
        }).encode("utf-8")
        
        pub_req = urllib.request.Request(publish_url, data=pub_data, method="POST")
        with urllib.request.urlopen(pub_req, timeout=30) as pub_resp:
            pub_res = json.loads(pub_resp.read().decode("utf-8"))
            media_id = pub_res.get("id")
            print(f"[InstagramPublisher] Reel published successfully: Media ID {media_id}")
            return {
                "status": "success",
                "platform": "instagram",
                "media_id": media_id,
                "link": f"https://instagram.com/p/{media_id}"
            }
            
    except Exception as e:
        print(f"[InstagramPublisher] Error publishing Reel to Instagram: {e}")
        return {
            "status": "error",
            "platform": "instagram",
            "error": str(e)
        }
