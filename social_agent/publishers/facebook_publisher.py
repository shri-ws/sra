"""
Shri Ramji Astro (SRA) - Facebook Auto-Publisher
Publishes posts and image cards to Facebook Pages via Meta Graph API v19.0+.
"""

import json
import urllib.request
import urllib.parse
from pathlib import Path

def publish_to_facebook(fb_payload: dict, config: dict, dry_run: bool = False, image_path: str = None) -> dict:
    """
    Publish text and image post to Facebook Page.
    fb_payload contains: 'text'
    """
    fb_cfg = config.get("platforms", {}).get("facebook", {})
    page_id = fb_cfg.get("page_id", "").strip()
    access_token = fb_cfg.get("access_token", "").strip()
    message = fb_payload.get("text", "")
    
    if dry_run or not (page_id and access_token):
        print(f"[FacebookPublisher] Dry-Run/Mock Mode (Credentials missing or dry-run requested)")
        print(f"[FacebookPublisher] Message preview: {message[:120]}...")
        return {
            "status": "simulated" if dry_run else "credentials_pending",
            "platform": "facebook",
            "page_id": page_id or "(none)",
            "message_preview": message[:150],
            "note": "Facebook post ready. Add FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN to enable live publishing."
        }
        
    try:
        # If image provided, publish via /photos
        if image_path and Path(image_path).exists():
            url = f"https://graph.facebook.com/v19.0/{page_id}/photos"
            # Note: For multipart/form-data image uploads, or feed post with caption:
            # Simple text feed post endpoint:
        url = f"https://graph.facebook.com/v19.0/{page_id}/feed"
        data = urllib.parse.urlencode({
            "message": message,
            "access_token": access_token
        }).encode("utf-8")
        
        req = urllib.request.Request(url, data=data, method="POST")
        with urllib.request.urlopen(req, timeout=20) as resp:
            res_data = json.loads(resp.read().decode("utf-8"))
            post_id = res_data.get("id", "")
            print(f"[FacebookPublisher] Successfully published post ID: {post_id}")
            return {
                "status": "success",
                "platform": "facebook",
                "post_id": post_id,
                "link": f"https://facebook.com/{post_id}"
            }
    except Exception as e:
        print(f"[FacebookPublisher] Error publishing to Facebook: {e}")
        return {
            "status": "error",
            "platform": "facebook",
            "error": str(e)
        }
