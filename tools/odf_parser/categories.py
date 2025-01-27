import json

def categorize_objects(input_file, output_file):
    # Read the input JSON file
    with open(input_file, 'r') as f:
        data = json.load(f)

    # Initialize category arrays
    categories = {
        "Weapons": [],
        "Units": [],
        "Buildings": []
    }

    # Iterate through all objects
    for obj_name, obj_data in data.items():
        # Create an object with its name and data
        categorized_obj = {
            "name": obj_name,
            "data": obj_data
        }

        # Check for OrdnanceClass (Weapons)
        if "OrdnanceClass" in obj_data:
            categories["Weapons"].append(categorized_obj)
            continue

        # Check for CraftClass (Units)
        if "CraftClass" in obj_data:
            categories["Units"].append(categorized_obj)
            continue

        # Check for BuildingClass (Buildings)
        if "BuildingClass" in obj_data:
            categories["Buildings"].append(categorized_obj)

    # Write the categorized data to output file
    with open(output_file, 'w') as f:
        json.dump(categories, f, indent=2)

if __name__ == "__main__":
    categorize_objects("tools/odf_parser/odf-1.0filtered-numbers.json", "categories.json") 