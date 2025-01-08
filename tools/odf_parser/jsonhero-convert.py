import json

# Read the JSON file
with open(r'C:\Users\dhira\OneDrive\Documents\GitHub\bz2vsr.github.io\data\odf\odf-1.0filtered-numbers.json', 'r') as file:
    data = json.load(file)

# Convert to JSONHero friendly format
hero_data = {
    "$schema": {
        "type": "object",
        "title": "ODF File Collection",
        "description": "Collection of ODF files and their configurations"
    },
    "files": [
        {
            "id": key.replace('.odf', ''),
            "filename": key,
            "type": "odf",
            "config": value
        }
        for key, value in data.items()
    ]
}

# Write the converted data back to a new file
with open(r'C:\Users\dhira\OneDrive\Documents\GitHub\bz2vsr.github.io\data\odf\odf-1.0hero.json', 'w') as file:
    json.dump(hero_data, file, indent=2)

print("Conversion complete! Check odf-1.0filtered-hero.json")