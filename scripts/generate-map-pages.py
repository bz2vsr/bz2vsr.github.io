import json
import os
from pathlib import Path

# Get the absolute path to the project root directory
ROOT_DIR = Path(__file__).resolve().parent.parent

# Read the map data
map_data_path = ROOT_DIR / 'data' / 'maps' / 'vsrmaplist.json'
template_path = ROOT_DIR / 'maps' / 'm' / 'template.html'
output_dir = ROOT_DIR / 'maps' / 'm'

# Create the maps/m directory if it doesn't exist
output_dir.mkdir(parents=True, exist_ok=True)

# Read the map data and template
with open(map_data_path, 'r', encoding='utf-8') as f:
    map_data = json.load(f)

with open(template_path, 'r', encoding='utf-8') as f:
    template = f.read()

# Generate a page for each map
for map_info in map_data:
    # Create directory for this map
    map_dir = output_dir / map_info['File']
    map_dir.mkdir(exist_ok=True)

    # Format the description with size information
    description = (
        f"{map_info['Name']} - "
        f"Base-to-Base: {map_info['Size']['baseToBase']}m, "
        f"Size: {map_info['Size']['formattedSize']}, "
        f"Pools: {map_info['Pools']}, "
        f"Loose: {'INF' if map_info['Loose'] == -2 else map_info['Loose']}. "
        f"Author: {map_info['Author']}"
    )
    map_info['formatted_description'] = description

    # Replace template placeholders with map data
    html = template
    for key, value in map_info.items():
        if isinstance(value, dict):
            # Handle nested objects like Size
            for sub_key, sub_value in value.items():
                placeholder = f'{{{{map.{key}.{sub_key}}}}}'
                html = html.replace(placeholder, str(sub_value))
        else:
            placeholder = f'{{{{map.{key}}}}}'
            html = html.replace(placeholder, str(value))

    # Write the HTML file
    output_file = map_dir / 'index.html'
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(html)

print(f'Generated static pages for {len(map_data)} maps') 