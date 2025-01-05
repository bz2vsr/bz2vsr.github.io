import json

# Read the input JSON file
with open('tools/mapsize_parser/vsr_map_data.json', 'r') as f:
    data = json.load(f)

# Transform each object in the array
for map_obj in data:
    # Remove existing Size key if it exists
    if 'Size' in map_obj:
        del map_obj['Size']
    
    # Add new Size key with Default: None
    map_obj['Size'] = {"Default": "None"}

# Write the transformed data to a new file
with open('tools/mapsize_parser/vsr_map_data_transformed.json', 'w') as f:
    json.dump(data, f, indent=4) 