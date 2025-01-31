import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
src_path = ROOT_DIR / 'src'

print(f"\nScanning directory: {src_path}")
print("-" * 50)

# Combine all JSON files into one dictionary
all_data = {}

def clean_value(value):
    if isinstance(value, str):
        # Remove escaped quotes from string values
        if value.startswith('"') and value.endswith('"'):
            return value[1:-1]
    return value

def clean_dict(d):
    return {k: clean_value(v) if isinstance(v, str) else 
            clean_dict(v) if isinstance(v, dict) else v 
            for k, v in d.items()}

for json_file in src_path.glob('*.json'):
    print(f"Found JSON file: {json_file.name}")
    with open(json_file, 'r') as f:
        file_data = json.load(f)
        print(f"  - Contains {len(file_data)} objects")
        
        # Clean each object's data and ensure ODF keys are lowercase
        cleaned_data = {}
        for k, v in file_data.items():
            # Convert key to lowercase and ensure .odf extension is lowercase
            new_key = k.lower()
            if not new_key.endswith('.odf'):
                new_key += '.odf'
            cleaned_data[new_key] = clean_dict(v)
            
        all_data.update(cleaned_data)

print(f"\nTotal objects combined: {len(all_data)}")

# Write the combined data to a new file in the 0-combine folder
output_path = ROOT_DIR / 'All-ODF-Data.json'
with open(output_path, 'w') as f:
    json.dump(all_data, f, indent=4)

print(f"\nOutput written to: {output_path}")
