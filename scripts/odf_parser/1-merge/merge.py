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
        
    # Look for parent object (classLabel.odf)
    parent_name = f"{class_label}.odf"
    if parent_name not in all_data:
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
    
    # Write output to merge folder
    output_path = root_dir / 'Divine_ODF_Merge.json'
    with open(output_path, 'w') as f:
        json.dump(merged_data, f, indent=4)
    
    print(f"\nProcessed {len(merged_data)} ODF objects")
    print(f"Merged data written to: {output_path}")

if __name__ == "__main__":
    main()

