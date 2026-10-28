"""
Shri Ramji Astro (SRA) - Quora Auto-Publisher
Prepares, formats, and logs high-ranking Q&A content for Quora Spaces and search queries.
Supports webhook dispatch and local draft log formatting.
"""

import json
from pathlib import Path
import datetime

def publish_to_quora(quora_payload: dict, config: dict, dry_run: bool = False) -> dict:
    """
    Publish or stage Quora Question and Answer.
    quora_payload contains: 'question', 'answer', 'topics'
    """
    quora_cfg = config.get("platforms", {}).get("quora", {})
    mode = quora_cfg.get("mode", "draft_log")
    spaces = quora_cfg.get("spaces", ["Vedic Astrology Wisdom"])
    
    question = quora_payload.get("question", "")
    answer = quora_payload.get("answer", "")
    topics = quora_payload.get("topics", [])
    
    print(f"[QuoraPublisher] Staging Q&A for Quora Spaces ({', '.join(spaces)})")
    print(f"[QuoraPublisher] Question: {question}")
    
    # In addition to logging, write to a designated quora_daily_queue.json
    output_log = Path(__file__).resolve().parent.parent / "output" / "quora_staged.json"
    queue = []
    if output_log.exists():
        try:
            with open(output_log, "r", encoding="utf-8") as f:
                queue = json.load(f)
        except Exception:
            queue = []
            
    entry = {
        "timestamp": datetime.datetime.now().isoformat(),
        "question": question,
        "answer": answer,
        "topics": topics,
        "spaces": spaces,
        "status": "staged"
    }
    queue.insert(0, entry)
    
    with open(output_log, "w", encoding="utf-8") as f:
        json.dump(queue[:50], f, indent=2, ensure_ascii=False)
        
    return {
        "status": "staged" if not dry_run else "simulated",
        "platform": "quora",
        "question": question,
        "spaces": spaces,
        "staged_file": str(output_log),
        "message": "Quora Q&A formatted and queued for publishing."
    }
