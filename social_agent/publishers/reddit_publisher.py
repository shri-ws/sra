"""
Shri Ramji Astro (SRA) - Reddit Auto-Publisher
Publishes authentic BPHS Vedic astrology posts to Reddit (e.g. r/vedicastrology, r/hinduism)
via PRAW (Python Reddit API Wrapper) or operates in safe Dry-Run mode.
"""

import os
from pathlib import Path

def publish_to_reddit(reddit_payload: dict, config: dict, dry_run: bool = False) -> dict:
    """
    Publish post to configured subreddits.
    reddit_payload contains: 'title', 'body', 'subreddits'
    """
    reddit_cfg = config.get("platforms", {}).get("reddit", {})
    client_id = reddit_cfg.get("client_id", "").strip()
    client_secret = reddit_cfg.get("client_secret", "").strip()
    username = reddit_cfg.get("username", "").strip()
    password = reddit_cfg.get("password", "").strip()
    user_agent = reddit_cfg.get("user_agent", "SRA_VedicAstrologyBot/1.0")
    subreddits = reddit_payload.get("subreddits", ["vedicastrology"])
    
    title = reddit_payload.get("title", "")
    body = reddit_payload.get("body", "")
    
    # If in dry-run or missing credentials, log and return preview
    if dry_run or not (client_id and client_secret and username and password):
        print(f"[RedditPublisher] Dry-Run/Mock Mode (Credentials missing or dry-run requested)")
        print(f"[RedditPublisher] Target Subreddits: {subreddits}")
        print(f"[RedditPublisher] Title: {title}")
        return {
            "status": "simulated" if dry_run else "credentials_pending",
            "platform": "reddit",
            "title": title,
            "target_subreddits": subreddits,
            "links": [f"https://reddit.com/r/{s}/(pending_auth)" for s in subreddits],
            "message": "Reddit post ready. Add REDDIT_CLIENT_ID & REDDIT_CLIENT_SECRET to enable live publishing."
        }
        
    try:
        import praw
        reddit = praw.Reddit(
            client_id=client_id,
            client_secret=client_secret,
            username=username,
            password=password,
            user_agent=user_agent
        )
        
        submitted_urls = []
        for sub_name in subreddits:
            sub = reddit.subreddit(sub_name)
            submission = sub.submit(title=title, selftext=body)
            submitted_urls.append(submission.url)
            print(f"[RedditPublisher] Successfully posted to r/{sub_name}: {submission.url}")
            
        return {
            "status": "success",
            "platform": "reddit",
            "title": title,
            "links": submitted_urls
        }
    except Exception as e:
        print(f"[RedditPublisher] Error publishing to Reddit: {e}")
        return {
            "status": "error",
            "platform": "reddit",
            "error": str(e)
        }
