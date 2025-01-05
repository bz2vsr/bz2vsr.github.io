import json

# Read both JSON files
with open('tools/mapsize_parser/vsr_map_data_transformed.json', 'r') as f:
    map_data = json.load(f)

with open('tools/mapsize_parser/vsr_size_data.json', 'r') as f:
    size_data = json.load(f)

# Create a dictionary from size_data for faster lookups
size_dict = {item['file'].lower(): item for item in size_data}

# Loop through map data and update Size objects
for map_obj in map_data:
    map_file = map_obj['File'].lower()  # Convert to lowercase for case-insensitive matching
    
    if map_file in size_dict:
        size_info = size_dict[map_file]
        map_obj['Size'].update({
            'formattedSize': size_info['formattedSize'],
            'size': size_info['size'],
            'baseToBase': size_info['baseToBase'],
            'binarySave': size_info['binarySave']
        })

# Write the joined data to a new file
with open('tools/mapsize_parser/vsr_mapdata_joined.json', 'w') as f:
    json.dump(map_data, f, indent=4) 