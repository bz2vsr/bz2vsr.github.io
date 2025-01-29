import json

# File paths
vehicle_file = 'scripts/odf_parser/2.0/Vehicle-ODF-Data.json'
weapon_file = 'scripts/odf_parser/2.0/Weapon-ODF-Data.json'
building_file = 'scripts/odf_parser/2.0/Building-ODF-Data.json'

# Load JSON data from files
with open(vehicle_file, 'r') as vf, open(weapon_file, 'r') as wf, open(building_file, 'r') as bf:
    vehicle_data = json.load(vf)
    weapon_data = json.load(wf)
    building_data = json.load(bf)

# Combine data into a single dictionary
combined_data = {
    "Vehicle": vehicle_data,
    "Weapon": weapon_data,
    "Building": building_data
}

# Write combined data to a new JSON file
with open('scripts/odf_parser/2.0/Combined-ODF-Data.json', 'w') as combined_file:
    json.dump(combined_data, combined_file, indent=4)

print("Combined JSON data has been written to Combined-ODF-Data.json") 