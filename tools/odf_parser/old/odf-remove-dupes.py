import json

# Read the JSON file
with open(r'C:\Users\dhira\OneDrive\Documents\GitHub\bz2vsr.github.io\tools\odf_parser\odf-1.0simple.json', 'r') as file:
    data = json.load(file)

# Create a new dictionary with unique keys
unique_data = {}
for key, value in data.items():
    if key not in unique_data:
        unique_data[key] = value

# Write the deduplicated data back to a new file
with open(r'C:\Users\dhira\OneDrive\Documents\GitHub\bz2vsr.github.io\tools\odf_parser\odf-1.0simple-deduped.json', 'w') as file:
    json.dump(unique_data, file, indent=2)

# Print statistics
print(f"Original entries: {len(data)}")
print(f"Unique entries: {len(unique_data)}")
print(f"Removed {len(data) - len(unique_data)} duplicates") 