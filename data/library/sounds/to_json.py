import os
import json

def get_sound_files():
    # Get the directory this script is in
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Define supported audio formats
    audio_extensions = {'.wav', '.mp3', '.ogg', '.aac', '.flac', '.aiff', '.m4a', '.alac'}
    
    # List all audio files in the directory
    files = [
        f for f in os.listdir(current_dir) 
        if os.path.splitext(f.lower())[1] in audio_extensions
    ]
    
    # Sort the files alphabetically
    files.sort()
    
    return files

def main():
    # Get the sound files
    sound_files = get_sound_files()
    
    # Get the output path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(current_dir, 'sounds.json')
    
    # Write to JSON file
    with open(output_path, 'w') as f:
        json.dump(sound_files, f, indent=4)

if __name__ == '__main__':
    main()
