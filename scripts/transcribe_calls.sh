#!/bin/zsh
# Turns astrologer call recordings into Hindi text, on this Mac only (whisper.cpp, nothing is uploaded).
# Put recordings (m4a, mp3, ogg, opus, wav, aac, mp4) in call-recordings/ ; text goes to call-recordings/transcripts/.
# A recording that already has a transcript is skipped. The folder is git-ignored (astrologers' voices and numbers).
# Usage: scripts/transcribe_calls.sh            (all new recordings)
#        scripts/transcribe_calls.sh file.m4a   (one file)
set -e
ROOT="${0:A:h:h}"
DIR="$ROOT/call-recordings"
OUT="$DIR/transcripts"
MODEL="$HOME/.whisper-models/ggml-large-v3-turbo.bin"
# Words the model should expect, so names and Jyotish terms come out right.
HINT="श्री राम जी एस्ट्रो, पत्रिका ऐप, ज्योतिषी, जातक, कुंडली, सूत्रधार, सदस्यता, मंगल दोष, कालसर्प, गुण मिलान, मांगलिक, विवाह मुहूर्त, वास्तु, यज्ञोपवीत, मुंडन, पाराशर, दैवज्ञ डेस्क, उपाय-ट्रैकर, दक्षिणा, ChatGPT, AI, WhatsApp, डेमो।"

mkdir -p "$OUT"
[[ -f "$MODEL" ]] || { echo "Model missing: $MODEL"; exit 1; }

if [[ -n "$1" ]]; then files=("$1"); else
  files=("$DIR"/*.(m4a|mp3|ogg|opus|wav|aac|mp4|amr|3gp)(N))
fi

done_any=0
for f in $files; do
  base="${f:t:r}"
  [[ -f "$OUT/$base.txt" ]] && continue
  echo "Transcribing: ${f:t}"
  tmp="$(mktemp -t callwav).wav"
  # 16 kHz mono, loudness evened out so the speaker-phone side is not too quiet.
  ffmpeg -loglevel error -y -i "$f" -ac 1 -ar 16000 -af "highpass=f=80,dynaudnorm" "$tmp"
  whisper-cli -m "$MODEL" -l hi -t 8 --prompt "$HINT" -otxt -osrt -of "$OUT/$base" -np "$tmp"
  rm -f "$tmp"
  echo "  -> transcripts/$base.txt"
  done_any=1
done
[[ $done_any == 1 ]] || echo "No new recordings in call-recordings/."
