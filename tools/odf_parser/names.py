import json

def restructure_data(input_file, output_file):
    # Read the input JSON file
    with open(input_file, 'r') as f:
        data = json.load(f)

    # Initialize new dictionary for restructured data
    restructured = {}

    # Process each category (Weapons, Units, Buildings)
    for category in ['Weapons', 'Units', 'Buildings']:
        if category in data:
            # Process each object in the category
            for obj in data[category]:
                # Get name without .odf extension
                name = obj['name'].replace('.odf', '').replace('.ODF', '')
                # Add to restructured data with name as key and data as value
                restructured[name] = obj['data']

    # Write the restructured data to output file
    with open(output_file, 'w') as f:
        json.dump(restructured, f, indent=2)

if __name__ == "__main__":
    restructure_data("tools/odf_parser/categories.json", "tools/odf_parser/names.json") 