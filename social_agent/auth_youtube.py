"""
Shri Ramji Astro (SRA) - One-time YouTube OAuth2 Authorization Helper
Run once to authorize YouTube Data API v3 uploads and save the refresh token.
"""

import os
import sys
import pickle
import argparse
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
CLIENT_SECRETS_FILE = Path(__file__).parent / "client_secrets.json"
TOKEN_PICKLE_FILE = Path(__file__).parent / "youtube_token.pickle"

def authenticate_youtube(token_filename="youtube_token.pickle", channel_name="Channel 1 (Main)"):
    token_path = Path(__file__).parent / token_filename
    if not CLIENT_SECRETS_FILE.exists():
        print(f"Error: {CLIENT_SECRETS_FILE} not found!")
        return False
        
    flow = InstalledAppFlow.from_client_secrets_file(
        str(CLIENT_SECRETS_FILE),
        scopes=SCOPES
    )
    
    print("\n=======================================================")
    print(f"🔐 SRA YOUTUBE OAUTH AUTHORIZATION: {channel_name}")
    print("=======================================================")
    print(f"Target Token File: {token_path.name}")
    print("Starting local server on port 8080 (or auto-assigned port)...")
    print("Please approve access for this YouTube channel in the browser.\n")
    
    try:
        credentials = flow.run_local_server(port=8080, prompt="consent", access_type="offline")
    except Exception:
        credentials = flow.run_local_server(port=0, prompt="consent", access_type="offline")
        
    with open(token_path, "wb") as token:
        pickle.dump(credentials, token)
        
    print(f"\n✅ YouTube Authorization Successful for {channel_name}!")
    print(f"Token saved to: {token_path}\n")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Authorize YouTube Channel for SRA Shorts Auto-Publisher")
    parser.add_argument("--channel", type=int, default=1, help="Channel number (1 or 2)")
    parser.add_argument("--file", type=str, default="", help="Custom token pickle filename")
    args = parser.parse_args()

    if args.channel == 2 or "2" in args.file:
        token_file = args.file or "youtube_token_channel2.pickle"
        authenticate_youtube(token_filename=token_file, channel_name="Channel 2")
    else:
        token_file = args.file or "youtube_token.pickle"
        authenticate_youtube(token_filename=token_file, channel_name="Channel 1 (Main)")
