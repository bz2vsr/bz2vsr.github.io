import json

# Read the JSON file
with open('tools/mapsize_parser/vsr_mapdata_joined.json', 'r') as f:
    data = json.load(f)

# Remove "Default" from Size object for each map
for map_obj in data:
    if 'Size' in map_obj and 'Default' in map_obj['Size']:
        del map_obj['Size']['Default']

# Write the cleaned data to a new file
with open('tools/mapsize_parser/vsrmaplist-2.0.json', 'w') as f:
    json.dump(data, f, indent=4) 