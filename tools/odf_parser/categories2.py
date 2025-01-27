import json

def categorize_objects(input_file, output_file):
    # Read the input JSON file
    with open(input_file, 'r') as f:
        data = json.load(f)

    # Initialize category dictionaries
    categories = {
        "Weapons": {},
        "Units": {},
        "Buildings": {}
    }

    # Iterate through all objects
    for obj_name, obj_data in data.items():
        # Check for OrdnanceClass (Weapons)
        if "OrdnanceClass" in obj_data:
            categories["Weapons"][obj_name] = obj_data
            continue

        # Check for CraftClass (Units)
        if "CraftClass" in obj_data:
            categories["Units"][obj_name] = obj_data
            continue

        # Check for BuildingClass (Buildings)
        if "BuildingClass" in obj_data:
            categories["Buildings"][obj_name] = obj_data

    # Write the categorized data to output file
    with open(output_file, 'w') as f:
        json.dump(categories, f, indent=2)

if __name__ == "__main__":
    categorize_objects("tools/odf_parser/names.json", "tools/odf_parser/categories2.json") 