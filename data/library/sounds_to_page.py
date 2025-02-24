import json
import os
import subprocess
from pathlib import Path

def format_title(filename):
    """Convert filename like 'american_seed' to 'American Seed'"""
    # Remove extension and split by underscore
    base_name = os.path.splitext(filename)[0]
    words = base_name.split('_')
    # Capitalize each word and join with spaces
    return ' '.join(word.capitalize() for word in words)

def check_ffmpeg():
    """Check if ffmpeg is available"""
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        return True
    except FileNotFoundError:
        print("Error: ffmpeg not found. Please install ffmpeg and ensure it's in your system PATH")
        return False
    except subprocess.CalledProcessError:
        print("Error: ffmpeg check failed")
        return False

def create_video_for_sound(sound_file, output_dir):
    """Create a video file from audio and static image"""
    # First check if ffmpeg is available
    if not check_ffmpeg():
        return False
        
    try:
        # Setup paths
        script_dir = Path(__file__).parent.parent.parent  # Go up to root directory
        assets_dir = script_dir / 'img'
        cover_image = assets_dir / 'video-cover.jpg'
        
        print(f"Using cover image: {cover_image}")
        print(f"Output directory: {output_dir}")
        
        # If video-cover.jpg doesn't exist, create it using ffmpeg
        if not cover_image.exists():
            print("Creating video cover image...")
            create_cover_cmd = [
                'ffmpeg',
                '-f', 'lavfi',
                '-i', 'color=c=black:s=250x100',
                '-frames:v', '1',
                str(cover_image)
            ]
            subprocess.run(create_cover_cmd, check=True, capture_output=True)
            print("Created video cover image")
        
        video_output = output_dir / 'video.mp4'
        audio_input = Path(__file__).parent / 'sounds' / sound_file
        
        print(f"Audio input: {audio_input}")
        
        # Verify audio file exists
        if not audio_input.exists():
            print(f"Audio file not found: {audio_input}")
            return False
            
        # FFmpeg command to create video
        cmd = [
            'ffmpeg',
            '-y',  # Overwrite output file if it exists
            '-loop', '1',
            '-i', str(cover_image),
            '-i', str(audio_input),
            '-c:v', 'libx264',
            '-c:a', 'aac',
            '-strict', 'experimental',
            '-b:a', '192k',
            '-shortest',
            '-s', '250x100',
            str(video_output)
        ]
        
        print(f"Running command: {' '.join(cmd)}")
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"Created video for {sound_file}")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"FFmpeg error for {sound_file}: {e.stderr}")
        return False
    except Exception as e:
        print(f"Unexpected error creating video for {sound_file}: {e}")
        print(f"Current working directory: {os.getcwd()}")
        return False

def create_sound_page(sound_data, template_dir):
    """Create an individual HTML page for a sound file"""
    file_name = sound_data['file']
    base_name = os.path.splitext(file_name)[0]
    transcript = sound_data.get('transcript', 'No transcript available')
    
    # Get formatted title
    page_title = format_title(file_name)
    
    # Create directory structure
    sound_dir = Path(template_dir) / 's' / base_name
    sound_dir.mkdir(parents=True, exist_ok=True)
    
    # Create video file
    video_created = create_video_for_sound(file_name, sound_dir)
    
    # Add video meta tags if video was created successfully
    video_meta_tags = ''
    if video_created:
        video_url = f"https://bz2vsr.com/library/s/{base_name}/video.mp4"
        video_meta_tags = f"""
        <meta property="og:video" content="{video_url}">
        <meta property="og:video:secure_url" content="{video_url}">
        <meta property="og:video:type" content="video/mp4">
        <meta property="og:video:width" content="250">
        <meta property="og:video:height" content="100">
        """
    
    # JavaScript code needs escaped curly braces
    js_code = """
        // Audio player functionality
        document.addEventListener('DOMContentLoaded', () => {{
            const audio = document.querySelector('audio');
            const volumeIcon = document.querySelector('.bi-volume-up');
            const card = document.querySelector('.card');
            
            audio.addEventListener('play', () => {{
                volumeIcon.style.display = 'block';
                card.classList.add('border-primary', 'shadow-sm');
            }});
            
            audio.addEventListener('pause', () => {{
                volumeIcon.style.display = 'none';
                card.classList.remove('border-primary', 'shadow-sm');
            }});
            
            audio.addEventListener('ended', () => {{
                volumeIcon.style.display = 'none';
                card.classList.remove('border-primary', 'shadow-sm');
            }});
        }});
    """
    
    html_content = f"""<!DOCTYPE html>
<html lang="en" data-bs-theme="dark" class="h-100">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{page_title}</title>
        <link rel="stylesheet" href="/css/bootstrap.min.css">
        <link rel="stylesheet" href="/css/main.css">
        <meta property="description" content="{transcript}">
        <meta property="og:site_name" content="bz2vsr.com/library/s/{base_name}"/>
        <meta property="og:image" content="https://bz2vsr.com/img/opengraph-library.png" />
        <meta property="og:title" content="{page_title}" />
        <meta property="og:description" content="{transcript}" />
        <meta property="og:audio" content="https://bz2vsr.com/data/library/sounds/{file_name}" />
        <meta property="og:audio:type" content="audio/{file_name.split('.')[-1]}" />
        {video_meta_tags}
    </head>
    <body class="d-flex flex-column h-100">
        <nav class="navbar navbar-expand navbar-dark">
            <div class="container-fluid">
                <div class="d-inline m-0 p-0">
                    <a class="navbar-brand me-2" href="/library">
                        <img src="/img/logo.png" class="img-fluid ms-2 me-1" height="30" width="30">
                        <span class="d-none d-lg-inline" style="position:relative;top:1px;">Library Browser</span>
                    </a>
                </div>
            </div>
        </nav>
        <main class="container mt-4">
            <div class="row justify-content-center">
                <div class="col-12 col-md-8">
                    <div class="card">
                        <div class="card-header bg-secondary-subtle d-flex justify-content-between align-items-center">
                            <h6 class="mb-0">{page_title}</h6>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" 
                                class="bi bi-volume-up text-primary" viewBox="0 0 16 16" style="display: none;">
                                <path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303z"/>
                                <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.48 5.48 0 0 1 11.025 8a5.48 5.48 0 0 1-1.61 3.89z"/>
                                <path d="M10.025 8a4.5 4.5 0 0 1-1.318 3.182L8 10.475A3.5 3.5 0 0 0 9.025 8c0-.966-.392-1.841-1.025-2.475l.707-.707A4.5 4.5 0 0 1 10.025 8M7 4a.5.5 0 0 0-.812-.39L3.825 5.5H1.5A.5.5 0 0 0 1 6v4a.5.5 0 0 0 .5.5h2.325l2.363 1.89A.5.5 0 0 0 7 12zM4.312 6.39 6 5.04v5.92L4.312 9.61A.5.5 0 0 0 4 9.5H2v-3h2a.5.5 0 0 0 .312-.11"/>
                            </svg>
                        </div>
                        <div class="card-body p-3 d-flex align-items-center">
                            <audio class="w-100" controls>
                                <source src="/data/library/sounds/{file_name}" type="audio/{file_name.split('.')[-1]}">
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                        <div class="card-footer bg-secondary-subtle p-2">
                            <div class="transcript">
                                <p class="mb-0 small text-muted">{transcript}</p>
                            </div>
                        </div>
                    </div>
                    <div class="text-center mt-3">
                        <a href="/library" class="text-decoration-none">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-collection-play me-1 mb-1" viewBox="0 0 16 16">
                                <path d="M2 3a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 0-1h-11A.5.5 0 0 0 2 3m2-2a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 0-1h-7A.5.5 0 0 0 4 1m2.765 5.576A.5.5 0 0 0 6 7v5a.5.5 0 0 0 .765.424l4-2.5a.5.5 0 0 0 0-.848z"/>
                                <path d="M1.5 14.5A1.5 1.5 0 0 1 0 13V6a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 16 6v7a1.5 1.5 0 0 1-1.5 1.5zm13-1a.5.5 0 0 0 .5-.5V6a.5.5 0 0 0-.5-.5h-13A.5.5 0 0 0 1 6v7a.5.5 0 0 0 .5.5z"/>
                            </svg>
                            Back to Library
                        </a>
                    </div>
                </div>
            </div>
        </main>
        <script src="/js/bootstrap.bundle.min.js"></script>
        <script>
            {js_code}
        </script>
        <script async data-id="101466371" src="//static.getclicky.com/js"></script>
    </body>
</html>"""

    # Write the HTML file
    with open(sound_dir / 'index.html', 'w', encoding='utf-8') as f:
        f.write(html_content)

def main():
    # Get the directory where this script is located
    script_dir = Path(__file__).parent.resolve()
    
    # Read the sounds.json file
    with open(script_dir / 'sounds' / 'sounds.json', 'r', encoding='utf-8') as f:
        sounds_data = json.load(f)
    
    # Create pages for each sound
    for sound in sounds_data:
        create_sound_page(sound, script_dir)
        print(f"Created page for {sound['file']}")

if __name__ == "__main__":
    main()
