import json

# Read the JSON file
with open(r'C:\Users\dhira\OneDrive\Documents\GitHub\bz2vsr.github.io\data\odf\odf-1.0hero.json', 'r') as file:
    data = json.load(file)

# Initialize category arrays
categorized_data = {
    "Buildings": [],
    "Units": [],
    "Weapons": []
}

# Categorize each object
for item in data['odfs']:
    config = item['config']
    
    # Check for category based on presence of specific class keys
    if 'BuildingClass' in config:
        categorized_data['Weapons'].append(item)
    elif 'CraftClass' in config:
        categorized_data['Units'].append(item)
    elif 'OrdnanceClass' in config:
        categorized_data['Buildings'].append(item)

# Write the categorized data to a new file
with open(r'C:\Users\dhira\OneDrive\Documents\GitHub\bz2vsr.github.io\data\odf\odf-1.0categories.json', 'w') as file:
    json.dump(categorized_data, file, indent=2)

# Print statistics
print(f"\nCategories Summary:")
print(f"Buildings: {len(categorized_data['Buildings'])}")
print(f"Units: {len(categorized_data['Units'])}")
print(f"Weapons: {len(categorized_data['Weapons'])}")
print(f"\nOutput saved to odf-1.0categories.json") 