# adds the width value to any matching map objects between mapsizes.json and vsrmaplist.js
import json

# Load the map sizes from mapsizes.json
with open(r'tools\mapsize_parser\mapsizes.json', 'r') as f:
    map_sizes = json.load(f)
# print("Loaded map sizes:", map_sizes)

# Load the VSRMapList from vsrmaplist.js
with open(r'data\maps\vsrmaplist.js', 'r') as f:
    vsr_map_list_content = f.read()
print("Loaded VSRMapList content")

# Extract the JSON part from vsrmaplist.js
vsr_map_list_start = vsr_map_list_content.find('[')
vsr_map_list_end = vsr_map_list_content.rfind(']') + 1
vsr_map_list_json = vsr_map_list_content[vsr_map_list_start:vsr_map_list_end]
print("Extracted JSON part")

# Parse the JSON part
vsr_map_list = json.loads(vsr_map_list_json)
# print("Parsed VSRMapList JSON:", vsr_map_list)

# Create a dictionary for quick lookup of map sizes by name
map_sizes_dict = {map_data['name']: map_data['width'] for map_data in map_sizes if 'name' in map_data}
# print("Created map sizes dictionary:", map_sizes_dict)

# Update the VSRMapList with width values
for map_data in vsr_map_list:
    map_name = map_data.get('Name')
    if map_name in map_sizes_dict:
        map_data['width'] = map_sizes_dict[map_name]
print("Updated VSRMapList with width values:", vsr_map_list)

# Convert the updated VSRMapList back to JSON
updated_vsr_map_list_json = json.dumps(vsr_map_list, indent=4)
print("Converted updated VSRMapList back to JSON")

# Replace the old JSON part in vsrmaplist.js with the updated JSON
updated_vsr_map_list_content = (
    vsr_map_list_content[:vsr_map_list_start] +
    updated_vsr_map_list_json +
    vsr_map_list_content[vsr_map_list_end:]
)
print("Replaced old JSON part with updated JSON")

# Write the updated content back to vsrmaplist.js
with open(r'data\maps\vsrmaplist.js', 'w') as f:
    f.write(updated_vsr_map_list_content)
print("Wrote updated content back to vsrmaplist.js")

print("VSRMapList has been updated with width values from mapsizes.json.")