import json

# Read the blue data file
blue_data = {}
with open(r'C:\Users\dhira\OneDrive\Documents\GitHub\bz2vsr.github.io\tools\maploose_parser\blue_data.txt', 'r') as file:
    for line in file:
        parts = line.strip().split(',')
        if len(parts) == 3:
            name, pieces, loose = parts
            if loose:  # Only add if loose value exists
                blue_data[name] = int(loose)

# Read the VSR map list
with open(r'C:\Users\dhira\OneDrive\Documents\GitHub\bz2vsr.github.io\tools\maploose_parser\vsrmaplist_sb.json', 'r') as file:
    vsr_data = json.load(file)

# Track changes for reporting
changes = []

# Update loose values
for map_obj in vsr_data:
    map_name = map_obj['Name']
    if map_name in blue_data:
        old_loose = map_obj['Loose']
        new_loose = blue_data[map_name]
        if old_loose != new_loose:
            map_obj['Loose'] = new_loose
            changes.append((map_name, old_loose, new_loose))

# Save updated data back to original file
with open('C:\Users\dhira\OneDrive\Documents\GitHub\bz2vsr.github.io\tools\maploose_parser\vsrmaplist_sb.json', 'w') as file:
    json.dump(vsr_data, file, indent=4)

# Print changes
print("Changes made to vsrmaplist_sb.json:")
for name, old, new in changes:
    print(f"{name}: {old} → {new}") 