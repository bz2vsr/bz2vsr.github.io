import json
from pathlib import Path

def find_name(obj_data):
    """Find wpnName or unitName in any property object"""
    for class_obj in obj_data.values():
        if isinstance(class_obj, dict):
            if "wpnName" in class_obj:
                return ("wpnName", class_obj.get("wpnName"))
            if "unitName" in class_obj:
                return ("unitName", class_obj.get("unitName"))
    return None

def has_ordnance_class(obj_data):
    """Check if object has OrdnanceClass as a direct key"""
    return "OrdnanceClass" in obj_data

def main():
    # Load All-ODF-Data.json
    root_dir = Path(__file__).resolve().parent
    input_path = root_dir / 'src' / 'All-ODF-Data.json'

    with open(input_path, 'r') as f:
        all_data = json.load(f)

    # Sort objects into three dictionaries
    named = {}
    unnamed = {}
    ordnance = {}
    wpn_name_count = 0
    unit_name_count = 0

    for obj_name, obj_data in all_data.items():
        # Check for OrdnanceClass first
        if has_ordnance_class(obj_data):
            ordnance[obj_name] = obj_data
            continue

        # Then check for names
        name_info = find_name(obj_data)
        if name_info:
            name_type, name = name_info
            named[obj_name] = obj_data
            if name_type == "wpnName":
                wpn_name_count += 1
            else:
                unit_name_count += 1
        else:
            unnamed[obj_name] = obj_data

    # Create analysis folder if it doesn't exist
    analysis_dir = root_dir / 'analysis'
    analysis_dir.mkdir(exist_ok=True)

    # Write the files to analysis folder
    with open(analysis_dir / 'named.json', 'w') as f:
        json.dump(named, f, indent=4)

    with open(analysis_dir / 'unnamed.json', 'w') as f:
        json.dump(unnamed, f, indent=4)

    with open(analysis_dir / 'ordnance.json', 'w') as f:
        json.dump(ordnance, f, indent=4)

    # Print summary
    total_objects = len(all_data)
    print(f"\nAnalysis of {total_objects} total objects:")
    print(f"- {len(named)} have names:")
    print(f"  • {unit_name_count} have unitName")
    print(f"  • {wpn_name_count} have wpnName")
    print(f"- {len(unnamed)} have no names")
    print(f"- {len(ordnance)} are ordnance objects")

    print("\nExample named objects:")
    for i, (obj_name, obj_data) in enumerate(list(named.items())[:5]):
        name_info = find_name(obj_data)
        name_type, name = name_info
        print(f"{i+1}. {obj_name}: {name} ({name_type})")

    print("\nExample unnamed objects:")
    for i, (obj_name, obj_data) in enumerate(list(unnamed.items())[:5]):
        print(f"{i+1}. {obj_name}")

    print("\nExample ordnance objects:")
    for i, (obj_name, obj_data) in enumerate(list(ordnance.items())[:5]):
        print(f"{i+1}. {obj_name}")

    print(f"\nOutput written to:")
    print(f"- {analysis_dir / 'named.json'}")
    print(f"- {analysis_dir / 'unnamed.json'}")
    print(f"- {analysis_dir / 'ordnance.json'}")

if __name__ == "__main__":
    main()
