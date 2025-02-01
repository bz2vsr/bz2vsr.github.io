import json
from pathlib import Path

# Get paths
SCRIPT_DIR = Path(__file__).parent.parent.parent  # Go up to project root
AUDIO_DIR = SCRIPT_DIR / 'data' / 'audio'
OUTPUT_FILE = SCRIPT_DIR / 'data' / 'audio' / 'available-wavs.json'

# Create output directory if it doesn't exist
OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

# Get all WAV files
wav_files = [f.name for f in AUDIO_DIR.glob('**/*.wav')]

# Save to JSON
with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    json.dump(wav_files, f, indent=2)

print(f'Found {len(wav_files)} WAV files') 