"""
Shri Ramji Astro (SRA) - Autonomous Social AI Agent Configuration
Manages API keys, social platform credentials, schedule and directory paths.
"""

import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
AGENT_DIR = BASE_DIR / "social_agent"
OUTPUT_DIR = AGENT_DIR / "output"
CONFIG_FILE = AGENT_DIR / "social_config.json"
BPHS_DB_FILE = BASE_DIR / "data" / "bphs_complete_shlokas_db.json"

# Ensure output directory exists
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Default configuration template
DEFAULT_CONFIG = {
    "schedule": {
        "cadence": "daily",
        "time": "07:00",
        "timezone": "Asia/Kolkata",
        "enabled": True
    },
    "content": {
        "theme": "parashara_vedic_wisdom",
        "voice": "hi-IN-MadhurNeural", # Natural Hindi Male voice, alt: hi-IN-SwaraNeural
        "target_duration_sec": 45,
        "language": "hi",
        "include_shloka": True,
        "include_remedy": True,
        "branding": "श्री रामजी एस्ट्रो • shri-ramji-astro.org"
    },
    "api_keys": {
        "gemini_api_key": os.getenv("GEMINI_API_KEY", ""),
        "gemini_model": "gemini-2.0-flash"
    },
    "platforms": {
        "reddit": {
            "enabled": False,
            "client_id": os.getenv("REDDIT_CLIENT_ID", ""),
            "client_secret": os.getenv("REDDIT_CLIENT_SECRET", ""),
            "username": os.getenv("REDDIT_USERNAME", ""),
            "password": os.getenv("REDDIT_PASSWORD", ""),
            "user_agent": "SRA_VedicAstrologyBot/1.0",
            "target_subreddits": ["vedicastrology", "hinduism"]
        },
        "quora": {
            "enabled": False,
            "mode": "draft_log", # draft_log, webhook, or playwright
            "spaces": ["Vedic Astrology Wisdom", "कुंडली और ज्योतिष"]
        },
        "facebook": {
            "enabled": False,
            "page_id": os.getenv("FB_PAGE_ID", ""),
            "access_token": os.getenv("FB_PAGE_ACCESS_TOKEN", "")
        },
        "instagram": {
            "enabled": False,
            "ig_user_id": os.getenv("IG_USER_ID", ""),
            "access_token": os.getenv("IG_ACCESS_TOKEN", "")
        },
        "youtube": {
            "enabled": False,
            "client_secrets_file": str(AGENT_DIR / "client_secrets.json"),
            "credentials_file": str(AGENT_DIR / "youtube_token.pickle")
        }
    }
}

def load_config() -> dict:
    """Load configuration from file, falling back to defaults and env vars."""
    config = dict(DEFAULT_CONFIG)
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                # Deep merge
                for k, v in saved.items():
                    if isinstance(v, dict) and k in config:
                        config[k].update(v)
                    else:
                        config[k] = v
        except Exception as e:
            print(f"[Config] Error reading {CONFIG_FILE}: {e}")

    # Fallback to env vars if not set in config
    if not config["api_keys"]["gemini_api_key"]:
        config["api_keys"]["gemini_api_key"] = os.getenv("GEMINI_API_KEY", "")
    
    return config

def save_config(new_config: dict) -> bool:
    """Save configuration to JSON file."""
    try:
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(new_config, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[Config] Error saving {CONFIG_FILE}: {e}")
        return False
