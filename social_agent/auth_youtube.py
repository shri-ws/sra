"""
Shri Ramji Astro (SRA) - One-time YouTube OAuth2 Authorization Helper
Run once to authorize YouTube Data API v3 uploads and save the refresh token.
"""

import os
import pickle
from pathlib import Path
from google_auth_oauthlib.flow import InstalledAppFlow

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]
CLIENT_SECRETS_FILE = Path(__file__).parent / "client_secrets.json"
TOKEN_PICKLE_FILE = Path(__file__).parent / "youtube_token.pickle"

def authenticate_youtube():
    if not CLIENT_SECRETS_FILE.exists():
        print(f"Error: {CLIENT_SECRETS_FILE} not found!")
        return False
        
    flow = InstalledAppFlow.from_client_secrets_file(
        str(CLIENT_SECRETS_FILE),
        scopes=SCOPES
    )
    
    print("\n=======================================================")
    print("🔐 SRA YOUTUBE OAUTH AUTHORIZATION")
    print("=======================================================")
    print("Starting local server on port 8080 (or auto-assigned port)...")
    print("Please approve access for your YouTube channel.\n")
    
    try:
        credentials = flow.run_local_server(port=8080, prompt="consent", access_type="offline")
    except Exception:
        credentials = flow.run_local_server(port=0, prompt="consent", access_type="offline")
        
    with open(TOKEN_PICKLE_FILE, "wb") as token:
        pickle.dump(credentials, token)
        
    print(f"\n✅ YouTube Authorization Successful! Token saved to: {TOKEN_PICKLE_FILE}")
    print("Autonomous YouTube Shorts upload is now 100% active!\n")
    return True

if __name__ == "__main__":
    authenticate_youtube()
