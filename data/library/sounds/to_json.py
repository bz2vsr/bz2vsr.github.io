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

def get_transcript(file_name):
    # Replace audio extension with .txt for transcript file
    transcript_file = os.path.splitext(file_name)[0] + '.txt'
    current_dir = os.path.dirname(os.path.abspath(__file__))
    transcript_path = os.path.join(current_dir, transcript_file)
    
    if os.path.exists(transcript_path):
        with open(transcript_path, 'r', encoding='utf-8') as f:
            # Read the content and replace new lines with "\n"
            return f.read().replace('\n', '\\n')
    else:
        return "Not available"

def main():
    # Get the sound files
    sound_files = get_sound_files()
    
    output_data = []

    for sound_file in sound_files:
        transcript_text = get_transcript(sound_file)
        output_data.append({
            "file": sound_file,
            "transcript": transcript_text
        })
    
    # Get the output path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(current_dir, 'sounds.json')
    
    # Write to JSON file
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, indent=4)

if __name__ == '__main__':
    main()
