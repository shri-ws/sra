"""
Shri Ramji Astro (SRA) - YouTube Shorts Auto-Publisher
Uploads 1080x1920 vertical video reels directly to YouTube as #Shorts
via official Google YouTube Data API v3 client.
"""

import os
from pathlib import Path

def publish_to_youtube_shorts(yt_payload: dict, video_path: str, config: dict, dry_run: bool = False) -> dict:
    """
    Upload vertical video to YouTube as a Short.
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
        
    if dry_run or not (os.path.exists(client_secrets) or os.path.exists(token_pickle)):
        print(f"[YouTubePublisher] Dry-Run/Mock Mode (OAuth secrets missing or dry-run requested)")
        print(f"[YouTubePublisher] Video file: {video_path}")
        print(f"[YouTubePublisher] Title: {title}")
        return {
            "status": "simulated" if dry_run else "credentials_pending",
            "platform": "youtube",
            "title": title,
            "video_file": str(video_path),
            "tags": tags,
            "note": "YouTube Short ready. Add client_secrets.json to enable live YouTube uploads."
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
                print("[YouTubePublisher] OAuth token successfully refreshed!")
            except Exception as _e_ref:
                print(f"[YouTubePublisher] Token refresh error: {_e_ref}")

        if not credentials or not credentials.valid:
            print("[YouTubePublisher] YouTube OAuth token requires refresh or initial browser authorization.")
            return {
                "status": "auth_required",
                "platform": "youtube",
                "message": "Please authorize YouTube OAuth in settings or run oauth setup."
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
        print(f"[YouTubePublisher] Successfully uploaded YouTube Short: {video_url}")
        return {
            "status": "success",
            "platform": "youtube",
            "video_id": video_id,
            "link": video_url
        }
        
    except Exception as e:
        print(f"[YouTubePublisher] Error uploading to YouTube: {e}")
        return {
            "status": "error",
            "platform": "youtube",
            "error": str(e)
        }
