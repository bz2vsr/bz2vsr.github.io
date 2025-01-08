import json
import re

def convert_string_to_number(value):
    # If it's not a string, return as is
    if not isinstance(value, str):
        return value
    
    # Check if string is a number (integer or float)
    if re.match(r'^-?\d+\.?\d*$', value):
        # Convert to float if decimal point exists, otherwise to int
        return float(value) if '.' in value else int(value)
    return value

def process_json(obj):
    if isinstance(obj, dict):
        return {key: process_json(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [process_json(element) for element in obj]
    else:
        return convert_string_to_number(obj)

# Read the JSON file
with open(r'C:\Users\dhira\OneDrive\Documents\GitHub\bz2vsr.github.io\data\odf\odf-1.0filtered.json', 'r') as file:
    data = json.load(file)

# Convert string numbers to actual numbers
converted_data = process_json(data)

# Write the converted data back to a new file
with open(r'C:\Users\dhira\OneDrive\Documents\GitHub\bz2vsr.github.io\data\odf\odf-1.0filtered-numbers.json', 'w') as file:
    json.dump(converted_data, file, indent=2)

print("Conversion complete! Check odf-1.0filtered-numbers.json")