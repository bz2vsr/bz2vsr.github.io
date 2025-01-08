import json

# Read the input JSON file
with open('tools/odf_parser/odf-1.0a.json', 'r') as f:
    data = json.load(f)

# Convert dictionary to array of objects while preserving the key-value structure
array_data = []
for filename, obj_data in data.items():
    # Create new object with filename as the key
    new_obj = {
        filename: obj_data
    }
    array_data.append(new_obj)

# Write the converted data to the new file
with open('tools/odf_parser/odf-1.0b.json', 'w') as f:
    json.dump(array_data, f, indent=4) 