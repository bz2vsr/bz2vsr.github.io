# converts the contents of map_sizes.txt into JSON (mapsizes.json)
import json

def parse_map_data(filename):
    maps = []
    
    with open(filename, 'r') as file:
        current_map = {}
        
        for line in file:
            line = line.strip()
            
            if line.startswith('Map:'):
                if current_map:
                    maps.append(current_map)
                    current_map = {}
                
                # Remove "Map: " and "VSR: " from the name
                name = line[5:].strip()  # Remove "Map: "
                if name.startswith('VSR: '):
                    name = name[5:]  # Remove "VSR: "
                current_map['name'] = name
                
            elif line.startswith('Size (m):'):
                dimensions = line[9:].strip()
                width, height = dimensions.split('x')
                current_map['width'] = int(width)
                current_map['height'] = int(height)
        
        # Add the last map
        if current_map:
            maps.append(current_map)
    
    # Convert to JSON format
    maps_json = json.dumps(maps, indent=4)
    
    # Save to mapsizes.json
    with open('mapsizes.json', 'w') as json_file:
        json_file.write(maps_json)
    
    return maps_json

if __name__ == '__main__':
    json_output = parse_map_data('map_sizes.txt')
    print(json_output)