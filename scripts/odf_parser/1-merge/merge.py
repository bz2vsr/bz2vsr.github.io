import json
from pathlib import Path
from copy import deepcopy

def merge_dicts(child, parent):
    """Deep merge two dictionaries, with child values taking precedence"""
    result = deepcopy(parent)
    
    for key, value in child.items():
        if key in result and isinstance(value, dict) and isinstance(result[key], dict):
            # Recursively merge nested dictionaries
            result[key] = merge_dicts(value, result[key])
        else:
            # Use child's value
            result[key] = deepcopy(value)
    
    return result

def find_class_label(obj_data):
    """Find classLabel in any property object"""
    for class_obj in obj_data.values():
        if isinstance(class_obj, dict) and "classLabel" in class_obj:
            return class_obj.get("classLabel")
    return None

def process_inheritance(obj_name, obj_data, all_data, processed=None):
    """Process inheritance chain for an object"""
    if processed is None:
        processed = set()
    
    # Avoid circular inheritance
    if obj_name in processed:
        return obj_data
    processed.add(obj_name)
    
    # Initialize inheritance chain if not present
    if "inheritanceChain" not in obj_data:
        obj_data["inheritanceChain"] = []
    
    # Get the classLabel from any property object
    class_label = find_class_label(obj_data)
    if not class_label:
        return obj_data
        
    # Look for parent object (classLabel.odf), case insensitive
    parent_name = f"{class_label.lower()}.odf"
    parent_exists = False
    
    # Try to find the parent ODF with case-insensitive match
    for existing_name in all_data:
        if existing_name.lower() == parent_name:
            parent_name = existing_name  # Use the actual case from all_data
            parent_exists = True
            break
    
    if not parent_exists:
        # Add current classLabel to chain if this is the end and not already in chain
        if class_label not in obj_data["inheritanceChain"]:
            obj_data["inheritanceChain"].append(class_label)
        return obj_data
    
    # Get parent data and process its inheritance first
    parent_data = process_inheritance(parent_name, all_data[parent_name], all_data, processed)
    
    # Merge parent into child, with child taking precedence
    merged_data = merge_dicts(obj_data, parent_data)
    
    # Update inheritance chain
    parent_chain = parent_data.get("inheritanceChain", [])
    # Create new chain starting with current classLabel
    new_chain = []
    if class_label not in new_chain:
        new_chain.append(class_label)
    # Add parent chain items if not already present
    for label in parent_chain:
        if label not in new_chain:
            new_chain.append(label)
    merged_data["inheritanceChain"] = new_chain
    
    return merged_data

def process_ordnance_references(merged_data):
    """Process WeaponClass.ordName references and merge ordnance data"""
    for odf_name, odf_data in merged_data.items():
        # Check if object has WeaponClass with ordName
        weapon_class = odf_data.get('WeaponClass', {})
        ord_name = weapon_class.get('ordName', '')
        
        # Skip empty or NULL references
        if not ord_name or ord_name.upper() == 'NULL':
            continue
            
        # Convert to lowercase and ensure .odf extension
        ord_name_lower = ord_name.lower()
        if not ord_name_lower.endswith('.odf'):
            ord_name_lower += '.odf'
            
        # Look up the referenced ordnance ODF with case-insensitive match
        ordnance_name = None
        for existing_name in merged_data:
            if existing_name.lower() == ord_name_lower:
                ordnance_name = existing_name
                break
                
        if not ordnance_name:
            print(f"Warning: Could not find ordnance ODF '{ord_name}' referenced by '{odf_name}'")
            continue
            
        ordnance_data = merged_data[ordnance_name]
        
        # Copy relevant classes from ordnance to weapon with "Ordnance." prefix
        for class_name, class_data in ordnance_data.items():
            prefixed_name = f"Ordnance.{class_name}"
            odf_data[prefixed_name] = class_data

def process_powerup_references(merged_data):
    """Process WeaponPowerupClass.weaponName references and update powerup/weapon data"""
    for odf_name, odf_data in merged_data.items():
        # Check if object is a powerup with WeaponPowerupClass
        powerup_class = odf_data.get('WeaponPowerupClass', {})
        weapon_name = powerup_class.get('weaponName', '')
        
        if not weapon_name:
            continue
            
        # Convert to lowercase and ensure .odf extension
        weapon_name_lower = weapon_name.lower()
        if not weapon_name_lower.endswith('.odf'):
            weapon_name_lower += '.odf'
            
        # Look up the referenced weapon ODF with case-insensitive match
        weapon_odf_name = None
        for existing_name in merged_data:
            if existing_name.lower() == weapon_name_lower:
                weapon_odf_name = existing_name
                break
                
        if not weapon_odf_name:
            print(f"Warning: Could not find weapon ODF '{weapon_name}' referenced by powerup '{odf_name}'")
            continue
            
        weapon_data = merged_data[weapon_odf_name]
        
        # If powerup doesn't have a unitName, get it from the weapon
        if 'GameObjectClass' not in odf_data:
            odf_data['GameObjectClass'] = {}
            
        if 'unitName' not in odf_data['GameObjectClass']:
            wpn_name = weapon_data.get('WeaponClass', {}).get('wpnName')
            if wpn_name:
                odf_data['GameObjectClass']['unitName'] = wpn_name
        
        # Add powerup data to the weapon object with "Powerup." prefix
        for class_name, class_data in odf_data.items():
            prefixed_name = f"Powerup.{class_name}"
            weapon_data[prefixed_name] = class_data

def main():
    # Load All-ODF-Data.json from src folder
    root_dir = Path(__file__).resolve().parent
    input_path = root_dir / 'src' / 'All-ODF-Data.json'
    
    with open(input_path, 'r') as f:
        all_data = json.load(f)
    
    # Process each object
    merged_data = {}
    for obj_name, obj_data in all_data.items():
        merged_data[obj_name] = process_inheritance(obj_name, deepcopy(obj_data), all_data)
    
    # Process ordnance references
    process_ordnance_references(merged_data)
    
    # Process powerup references
    process_powerup_references(merged_data)
    
    # Write output to merge folder
    output_path = root_dir / 'Divine_ODF_Merge.json'
    with open(output_path, 'w') as f:
        json.dump(merged_data, f, indent=4)
    
    print(f"\nProcessed {len(merged_data)} ODF objects")
    print(f"Merged data written to: {output_path}")

if __name__ == "__main__":
    main()

