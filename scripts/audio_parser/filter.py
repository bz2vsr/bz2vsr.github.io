import json
import os
import shutil
from pathlib import Path

# Get paths
SCRIPT_DIR = Path(__file__).parent
SRC_DIR = SCRIPT_DIR / 'src'
OUTPUT_DIR = SCRIPT_DIR / 'output'
JSON_PATH = SCRIPT_DIR / 'Categorized-ODF-Data.json'

# Create output directory if it doesn't exist
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def find_wav_references(obj):
    """Recursively search through object for .wav file references"""
    wav_files = set()
    
    if isinstance(obj, dict):
        for key, value in obj.items():
            # Check if value is a string ending in .wav
            if isinstance(value, str) and value.lower().endswith('.wav'):
                wav_files.add(value)
            # Recursively search nested objects
            elif isinstance(value, (dict, list)):
                wav_files.update(find_wav_references(value))
    
    elif isinstance(obj, list):
        for item in obj:
            wav_files.update(find_wav_references(item))
            
    return wav_files

def check_wav_file(filename):
    """Search for WAV file in src and output directories"""
    # First check if file already exists in output
    dst_file = OUTPUT_DIR / filename
    if dst_file.exists():
        return True
        
    # If not in output, check src directory
    src_wavs = {f.name.lower(): f for f in SRC_DIR.glob('**/*.wav')}
    wav_lower = filename.lower()
    
    if wav_lower in src_wavs:
        src_file = src_wavs[wav_lower]
        shutil.copy2(src_file, dst_file)
        return True
    
    print(f'Not found: {filename}')
    return False

def main():
    # Load the JSON data
    with open(JSON_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Find all WAV references
    wav_references = set()
    for category in data.values():
        for odf in category.values():
            wav_references.update(find_wav_references(odf))
    
    # Check and copy WAV files if needed
    found_count = 0
    missing_count = 0
    
    for wav in sorted(wav_references):
        if check_wav_file(wav):
            found_count += 1
        else:
            missing_count += 1
    
    print(f'\nProcessed {len(wav_references)} WAV references:')
    print(f'Found: {found_count}')
    print(f'Missing: {missing_count}')

if __name__ == '__main__':
    main()
