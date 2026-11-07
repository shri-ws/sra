"""
Shri Ramji Astro (SRA) - YouTube Shorts Auto-Publisher
Uploads 1080x1920 vertical video reels directly to YouTube as #Shorts
via official Google YouTube Data API v3 client.
"""

import os
from pathlib import Path

def _upload_to_channel(title: str, desc: str, tags: list, video_path: str, client_secrets: str, token_pickle: str, channel_name: str = "YouTube", dry_run: bool = False) -> dict:
    if dry_run or not (os.path.exists(client_secrets) or os.path.exists(token_pickle)):
        print(f"[{channel_name}] Dry-Run/Mock Mode (OAuth secrets missing or dry-run requested)")
        print(f"[{channel_name}] Video file: {video_path}")
        print(f"[{channel_name}] Title: {title}")
        return {
            "status": "simulated" if dry_run else "credentials_pending",
            "channel": channel_name,
            "platform": "youtube",
            "title": title,
            "video_file": str(video_path),
            "tags": tags,
            "note": f"Short ready for {channel_name}. Run auth to enable live uploads."
        }
        
    try:
        from googleapiclient.discovery import build
        from googleapiclient.http import MediaFileUpload
        import pickle
        
        credentials = None
        if os.path.exists(token_pickle):
            with open(token_pickle, "rb") as token:
                credentials = pickle.load(token)
                
        if credentials and credentials.expired and credentials.refresh_token:
            try:
                from google.auth.transport.requests import Request
                credentials.refresh(Request())
                with open(token_pickle, "wb") as token:
                    pickle.dump(credentials, token)
                print(f"[{channel_name}] OAuth token successfully refreshed!")
            except Exception as _e_ref:
                print(f"[{channel_name}] Token refresh error: {_e_ref}")

        if not credentials or not credentials.valid:
            print(f"[{channel_name}] YouTube OAuth token requires refresh or initial browser authorization.")
            return {
                "status": "auth_required",
                "channel": channel_name,
                "platform": "youtube",
                "message": f"Please authorize {channel_name} OAuth (run: python auth_youtube.py)."
            }
            
        youtube = build("youtube", "v3", credentials=credentials)
        body = {
            "snippet": {
                "title": title[:100],
                "description": desc,
                "tags": tags,
                "categoryId": "27", # Education
                "defaultLanguage": "hi",
                "defaultAudioLanguage": "hi"
            },
            "status": {
                "privacyStatus": "public",
                "selfDeclaredMadeForKids": False
            }
        }
        
        media = MediaFileUpload(str(video_path), chunksize=-1, resumable=True, mimetype="video/mp4")
        request = youtube.videos().insert(part="snippet,status", body=body, media_body=media)
        response = request.execute()
        
        video_id = response.get("id")
        video_url = f"https://youtube.com/shorts/{video_id}"
        print(f"[{channel_name}] Successfully uploaded YouTube Short: {video_url}")
        return {
            "status": "success",
            "channel": channel_name,
            "platform": "youtube",
            "video_id": video_id,
            "link": video_url
        }
        
    except Exception as e:
        print(f"[{channel_name}] Error uploading to YouTube: {e}")
        return {
            "status": "error",
            "channel": channel_name,
            "platform": "youtube",
            "error": str(e)
        }


def publish_to_youtube_shorts(yt_payload: dict, video_path: str, config: dict, dry_run: bool = False) -> dict:
    """
    Upload vertical video to YouTube as a Short.
    Supports both single-channel and multi-channel configurations.
    yt_payload contains: 'title', 'description', 'tags'
    """
    yt_cfg = config.get("platforms", {}).get("youtube", {})
    client_secrets = yt_cfg.get("client_secrets_file", "")
    token_pickle = yt_cfg.get("credentials_file", "")
    
    title = yt_payload.get("title", "Vedic Astrology Wisdom #Shorts")
    desc = yt_payload.get("description", "")
    tags = yt_payload.get("tags", ["Shorts", "VedicAstrology"])
    
    # Ensure #Shorts is in title
    if "#Shorts" not in title:
        title = f"{title} #Shorts"

    channels = yt_cfg.get("channels")
    if channels and isinstance(channels, list):
        results = {}
        for ch in channels:
            if not ch.get("enabled", True):
                continue
            ch_id = ch.get("id", "channel_1")
            ch_name = ch.get("name", ch_id)
            ch_secrets = ch.get("client_secrets_file", client_secrets)
            ch_token = ch.get("credentials_file", token_pickle)
            
            # Resolve channel-specific payload and video file if provided
            ch_data = yt_payload.get(ch_id) if isinstance(yt_payload, dict) and ch_id in yt_payload else yt_payload
            if isinstance(ch_data, dict) and ("payload" in ch_data or "video_path" in ch_data):
                p_load = ch_data.get("payload", ch_data)
                v_path = ch_data.get("video_path", video_path)
            else:
                p_load = ch_data if isinstance(ch_data, dict) else yt_payload
                v_path = video_path

            c_title = p_load.get("title", title)
            c_desc = p_load.get("description", desc)
            c_tags = p_load.get("tags", tags)
            if "#Shorts" not in c_title:
                c_title = f"{c_title} #Shorts"

            res = _upload_to_channel(c_title, c_desc, c_tags, v_path, ch_secrets, ch_token, channel_name=ch_name, dry_run=dry_run)
            results[ch_id] = res
            
        any_success = any(r.get("status") == "success" for r in results.values())
        return {
            "status": "success" if any_success else "partial_or_failed",
            "platform": "youtube",
            "channels": results,
            "link": next((r.get("link") for r in results.values() if r.get("link")), None)
        }
        
    return _upload_to_channel(title, desc, tags, video_path, client_secrets, token_pickle, channel_name="YouTube (Primary)", dry_run=dry_run)
