import json
from pathlib import Path

# Define the categories and their identifying class keys
CATEGORIES = {
    "Vehicle": "CraftClass",
    "Weapon": "WeaponClass",
    "Pilot": "PersonClass",
    "Building": "BuildingClass",
    "Ordnance": "OrdnanceClass",
    "Powerup": "WeaponPowerupClass"
}

def categorize_objects(data):
    """Categorize objects based on their class keys"""
    categorized = {category: {} for category in CATEGORIES}
    
    for odf_name, odf_data in data.items():
        # Special case for Day Wrecker
        if odf_name == "apwrck.odf" or odf_name == "apwrckvsr.odf":
            categorized["Weapon"][odf_name] = odf_data
            continue

        # Special case for Service Pod
        if odf_name == "apserv.odf":
            categorized["Powerup"][odf_name] = odf_data
            continue
            
        # Check each object against category identifiers
        for category, class_key in CATEGORIES.items():

            if class_key in odf_data:
                categorized[category][odf_name] = odf_data
                break
    
    return categorized

def main():
    # Load Divine_ODF_Merge.json from src folder
    root_dir = Path(__file__).resolve().parent
    input_path = root_dir / 'src' / 'Divine_ODF_Merge.json'
    
    with open(input_path, 'r') as f:
        merged_data = json.load(f)
    
    # Categorize the data
    categorized_data = categorize_objects(merged_data)
    
    # Write pretty output
    output_path = root_dir / 'Categorized-ODF-Data.json'
    with open(output_path, 'w') as f:
        json.dump(categorized_data, f, indent=4)
    
    # Write minified output
    minified_path = root_dir / 'odf.min.json'
    with open(minified_path, 'w') as f:
        json.dump(categorized_data, f, separators=(',', ':'))
    
    # Print summary
    print("\nCategorized objects summary:")
    print("-" * 30)
    for category, objects in categorized_data.items():
        print(f"{category}: {len(objects)} objects")
    print("-" * 30)
    print(f"\nOutput written to:")
    print(f"Pretty: {output_path}")
    print(f"Minified: {minified_path}")

if __name__ == "__main__":
    main()
