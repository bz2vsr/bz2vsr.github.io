// Fuzzy search function
function fuzzySearch(searchTerm, str) {
    const searchLower = searchTerm.toLowerCase();
    const strLower = str.toLowerCase();
    let searchIndex = 0;
    
    for (let i = 0; i < strLower.length && searchIndex < searchLower.length; i++) {
        if (strLower[i] === searchLower[searchIndex]) {
            searchIndex++;
        }
    }
    
    return searchIndex === searchLower.length;
}

// Create the UI elements
function createInterface(container) {
    container.innerHTML = `
        <div class="mb-4 d-flex gap-2 align-items-center justify-content-center">
            <input type="text" id="odf-search" class="form-control" style="width: 50%;" placeholder="Type here to start filtering...">
            <button type="button" id="odf-search-clear" class="btn btn-outline-secondary">
                Clear
            </button>
        </div>
        
        <ul class="nav nav-tabs" id="odf-tabs" role="tablist">
            <li class="nav-item" role="presentation">
                <button class="nav-link active" id="weapons-tab" data-bs-toggle="tab" data-bs-target="#weapons" type="button" role="tab">
                    Weapons
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="units-tab" data-bs-toggle="tab" data-bs-target="#units" type="button" role="tab">
                    Units
                </button>
            </li>
            <li class="nav-item" role="presentation">
                <button class="nav-link" id="buildings-tab" data-bs-toggle="tab" data-bs-target="#buildings" type="button" role="tab">
                    Buildings
                </button>
            </li>
        </ul>
        
        <div class="tab-content" id="odf-content-tabs">
            <div class="tab-pane fade show active" id="weapons" role="tabpanel">
                <div class="accordion scrollable-accordion" id="weapons-accordion"></div>
            </div>
            <div class="tab-pane fade" id="units" role="tabpanel">
                <div class="accordion scrollable-accordion" id="units-accordion"></div>
            </div>
            <div class="tab-pane fade" id="buildings" role="tabpanel">
                <div class="accordion scrollable-accordion" id="buildings-accordion"></div>
            </div>
        </div>
    `;

    container.innerHTML += `
        <style>
            .scrollable-accordion {
                height: 82.5vh;
                overflow-y: auto;
            }

            /* Use DataTables scrollbar styling */
            .scrollable-accordion::-webkit-scrollbar {
                width: 10px;
                cursor: pointer;
            }

            .scrollable-accordion::-webkit-scrollbar-track {
                background: rgba(173, 181, 189, 0.08);
            }

            .scrollable-accordion::-webkit-scrollbar-thumb {
                background: rgba(13, 110, 253, 0.8);
                cursor: pointer;
            }

            .scrollable-accordion::-webkit-scrollbar-thumb:hover {
                background: rgba(13, 110, 253, 1.0);
            }

            .accordion-body {
                padding: 1rem;
            }
            .card-header {
                padding: 0.75rem 1rem;                 /* Slightly more padding */
            }
            .card-header h5 {
                color: #fff;
                font-size: 1rem;
                font-weight: 600;
                margin: 0;
                opacity: 0.9;                          /* Slightly dimmed text */
            }
            .card {
                background-color: #212529;             /* Slightly darker card background */
                border: 1px solid #2c3034;            /* Subtle border */
            }
            .table {
                margin-bottom: 0;
                background-color: #2c3034;            /* Slightly lighter table background */
            }
            .table td {
                vertical-align: middle;
                border-color: #373b3e;                /* Darker table borders */
            }
            .table pre {
                background: rgba(0,0,0,0.2);          /* Darker code background */
                padding: 0.5rem;
                border-radius: 4px;
                margin: 0;
            }
            .table code {
                color: #6ea8fe;
            }
            .table thead th {
                background-color: #242729;            /* Darker header background */
                border-bottom: 2px solid #373b3e;     /* More visible header border */
            }
            
            .accordion-item {
                transition: opacity 0.2s ease-in-out;
            }
            
            .badge {
                font-size: 0.75em;
            }
        </style>
    `;

    // Add click handler for clear button
    document.getElementById('odf-search-clear').addEventListener('click', () => {
        const searchInput = document.getElementById('odf-search');
        searchInput.value = '';
        // Trigger the input event to update the search results
        searchInput.dispatchEvent(new Event('input'));
    });
}

// Helper function to format the ODF data into a readable table
function formatODFData(allData, objectName) {
    let html = '';
    
    // Get the category (Vehicle, Weapon, Building) that contains this object
    const category = Object.entries(allData).find(([_, items]) => objectName in items)?.[0];
    if (!category) return html;
    
    // Get direct properties
    const directData = allData[category][objectName];
    if (!directData) return html;
    
    // Helper function to create object link
    const createObjectLink = (objName, type) => {
        const cleanObjName = objName.replace(/^"(.*)"$/, '$1');
        let targetCategory, exists;
        
        // For weapons, only check Weapons category
        if (type === 'weapon' || cleanObjName.toLowerCase().includes('_weap')) {
            exists = allData.Weapons?.[cleanObjName + '.odf'] || 
                    allData.Weapons?.[cleanObjName + '.ODF'];
            targetCategory = 'weapons';
        } else {
            // For buildItems, check both Units and Weapons
            exists = allData.Units?.[cleanObjName + '.odf'] || 
                    allData.Units?.[cleanObjName + '.ODF'];
            targetCategory = 'units';
            
            // If not found in Units, try Weapons
            if (!exists) {
                exists = allData.Weapons?.[cleanObjName + '.odf'] || 
                        allData.Weapons?.[cleanObjName + '.ODF'];
                if (exists) {
                    targetCategory = 'weapons';
                }
            }
        }
        
        if (exists) {
            const cleanFileName = cleanObjName + '.odf';
            return `<a href="#" class="text-info" onclick="
                document.querySelector('#${targetCategory}-tab').click(); 
                setTimeout(() => {
                    const accordionButton = document.querySelector('[data-bs-target=\\'#${targetCategory}-${cleanFileName}\\']');
                    if (accordionButton) {
                        accordionButton.click();
                        accordionButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);
                return false;
            ">${cleanObjName}</a>`;
        }
        return cleanObjName;
    };
    
    // Get object name from direct or inherited properties
    let displayName = objectName.replace(/\.odf$/i, '');
    let objectTitle = directData.GameObjectClass?.unitName?.replace(/^"(.*)"$/, '$1') ||
                     directData.WeaponClass?.wpnName?.replace(/^"(.*)"$/, '$1');
    
    if (!objectTitle) {
        // Look through inheritance chain for a name
        const inheritanceChain = getInheritanceChain(allData[category], objectName, category);
        for (let i = 1; i < inheritanceChain.length; i++) {
            const inheritedData = inheritanceChain[i].data;
            objectTitle = inheritedData.GameObjectClass?.unitName?.replace(/^"(.*)"$/, '$1') ||
                         inheritedData.WeaponClass?.wpnName?.replace(/^"(.*)"$/, '$1');
            if (objectTitle) break;
        }
    }
    
    // Add header section
    html += `
        <div class="mb-3">
            <h5 class="mb-0">
                ${displayName}
                ${objectTitle ? `<span class="text-secondary ms-2">${objectTitle}</span>` : ''}
            </h5>
        </div>
    `;
    
    // Format direct properties
    Object.entries(directData).forEach(([className, classData]) => {
        if (!classData || Object.keys(classData).length === 0) return;

        html += `
            <div class="card mb-3">
                <div class="card-header bg-secondary-subtle">
                    <h5 class="mb-0">${className}</h5>
                </div>
                <div class="card-body p-0">
                    <table class="table table-sm table-hover mb-0">
                        <thead>
                            <tr>
                                <th scope="col" style="width: 30%">Property</th>
                                <th scope="col">Value</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        Object.entries(classData).forEach(([prop, value]) => {
            let displayValue = value;
            if (typeof value === 'object' && value !== null) {
                displayValue = `<pre class="mb-0"><code>${JSON.stringify(value, null, 2)}</code></pre>`;
            } else if (typeof value === 'boolean') {
                displayValue = value ? 'true' : 'false';
            } else if (value === '') {
                displayValue = '<em class="text-muted">empty</em>';
            } else if (typeof value === 'string') {
                // Check if this is a weaponName or buildItem property
                if (prop.toLowerCase().includes('weaponname')) {
                    displayValue = createObjectLink(value, 'weapon');
                } else if (prop.toLowerCase().includes('builditem') || 
                           className.toLowerCase().includes('armorygroup') || 
                           className.toLowerCase().includes('factoryclass')) {
                    displayValue = createObjectLink(value, 'unit');
                } else {
                    displayValue = value.replace(/^"(.*)"$/, '$1');
                }
            }

            html += `
                <tr>
                    <td class="text-nowrap"><code>${prop}</code></td>
                    <td>${displayValue}</td>
                </tr>
            `;
        });

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });
    
    // Get and format inherited properties
    const inheritanceChain = getInheritanceChain(allData[category], objectName, category);
    html += formatInheritedData(inheritanceChain);
    
    return html;
}

// Populate category accordion
function populateCategory(category, data) {
    const accordion = document.getElementById(`${category.toLowerCase()}-accordion`);
    accordion.innerHTML = '';
    
    // Handle the new data structure where items are nested under Vehicle/Building/Weapon
    const categoryData = data[category] || {};
    
    // Create array of items with their display names for sorting
    const items = Object.entries(categoryData).map(([filename, itemData]) => {
        // Strip .odf extension for display (case-insensitive)
        const cleanFilename = filename.replace(/\.odf$/i, '');
        let displayName = cleanFilename;
        let sortName = '';  // Used for sorting
        
        // First try to get name directly from the object
        let objectName = itemData.GameObjectClass?.unitName?.replace(/^"(.*)"$/, '$1') ||
                        itemData.WeaponClass?.wpnName?.replace(/^"(.*)"$/, '$1');
        
        // If no direct name found, look through inheritance chain
        if (!objectName) {
            const inheritanceChain = getInheritanceChain(categoryData, filename, category);
            // Skip first item (current object) and look through inherited objects
            for (let i = 1; i < inheritanceChain.length; i++) {
                const inheritedData = inheritanceChain[i].data;
                objectName = inheritedData.GameObjectClass?.unitName?.replace(/^"(.*)"$/, '$1') ||
                            inheritedData.WeaponClass?.wpnName?.replace(/^"(.*)"$/, '$1');
                if (objectName) break;
            }
        }
        
        // Only include items that have a name
        if (!objectName) return null;
        
        // Format display name
        displayName = `${objectName}&nbsp;&nbsp;<span class="text-secondary">${cleanFilename}</span>`;
        sortName = objectName.toLowerCase();
        
        return {
            filename,  // Keep original filename for ID/data purposes
            cleanFilename,  // Filename without .odf
            itemData,
            displayName,
            sortName
        };
    }).filter(item => item !== null); // Remove items without names
    
    // Sort items alphabetically (all items will have names now)
    items.sort((a, b) => a.sortName.localeCompare(b.sortName));
    
    // Create accordion items in sorted order
    items.forEach(({ filename, itemData, displayName }) => {
        const item = createAccordionItem(category.toLowerCase(), filename, itemData, displayName, data);
        accordion.appendChild(item);
    });
}

// Create an accordion item for an ODF
function createAccordionItem(category, filename, data, displayName, allData) {
    const itemId = `${category}-${filename}`;
    const item = document.createElement('div');
    item.className = 'accordion-item';
    
    item.innerHTML = `
        <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${itemId}">
                ${displayName}
            </button>
        </h2>
        <div id="${itemId}" class="accordion-collapse collapse" data-bs-parent="#${category}-accordion">
            <div class="accordion-body">
                ${formatODFData(allData, filename)}
            </div>
        </div>
    `;
    
    return item;
}

// Handle search
function handleSearch(data) {
    const searchInput = document.getElementById('odf-search');
    let debounceTimer;
    
    searchInput.addEventListener('input', (e) => {
        // Clear any existing timer
        clearTimeout(debounceTimer);
        
        // Set a new timer to execute the search after 150ms
        debounceTimer = setTimeout(() => {
            const searchTerm = e.target.value.trim().toLowerCase();
            
            // If search is empty, show all items and reset all tabs
            if (!searchTerm) {
                Object.entries(data).forEach(([category, categoryItems]) => {
                    const accordion = document.getElementById(`${category.toLowerCase()}-accordion`);
                    const accordionItems = accordion.querySelectorAll('.accordion-item');
                    accordionItems.forEach(item => item.style.display = 'block');
                    
                    // Reset tab text
                    const tabElement = document.querySelector(`[data-bs-target="#${category.toLowerCase()}"]`);
                    tabElement.innerHTML = category;
                    tabElement.parentElement.style.display = 'block';
                });
                return;
            }
            
            // Track matches for each category
            const categoryMatches = {
                Weapons: 0,
                Units: 0,
                Buildings: 0
            };
            
            // Search through each category regardless of active tab
            Object.entries(data).forEach(([category, categoryItems]) => {
                const accordion = document.getElementById(`${category.toLowerCase()}-accordion`);
                
                // Search through each item in the category
                Object.entries(categoryItems).forEach(([name, itemData]) => {
                    const itemId = `${category.toLowerCase()}-${name}`;
                    const accordionItem = accordion.querySelector(`[data-bs-target="#${itemId}"]`)?.closest('.accordion-item');
                    
                    if (accordionItem) {
                        // Get direct names
                        let directName = itemData.GameObjectClass?.unitName?.toLowerCase().replace(/^"(.*)"$/, '$1') || '';
                        let directWpnName = itemData.WeaponClass?.wpnName?.toLowerCase().replace(/^"(.*)"$/, '$1') || '';
                        
                        // Get inherited names
                        let inheritedName = '';
                        if (!directName && !directWpnName) {
                            const inheritanceChain = getInheritanceChain(categoryItems, name, category);
                            // Skip first item (current object) and look through inherited objects
                            for (let i = 1; i < inheritanceChain.length; i++) {
                                const inheritedData = inheritanceChain[i].data;
                                inheritedName = inheritedData.GameObjectClass?.unitName?.toLowerCase().replace(/^"(.*)"$/, '$1') ||
                                              inheritedData.WeaponClass?.wpnName?.toLowerCase().replace(/^"(.*)"$/, '$1') || '';
                                if (inheritedName) break;
                            }
                        }
                        
                        // Create searchable text from all the data
                        const searchableText = [
                            name.toLowerCase(),
                            directName,
                            directWpnName,
                            inheritedName,
                            JSON.stringify(itemData).toLowerCase()
                        ].join(' ');
                        
                        // Check if any part matches the search
                        const isMatch = searchableText.includes(searchTerm);
                        
                        // Show/hide the accordion item
                        accordionItem.style.display = isMatch ? 'block' : 'none';
                        
                        // Increment match counter for this category
                        if (isMatch) {
                            categoryMatches[category]++;
                        }
                    }
                });
                
                // Update tab text and visibility for this category
                const tabElement = document.querySelector(`[data-bs-target="#${category.toLowerCase()}"]`);
                
                if (categoryMatches[category] > 0) {
                    tabElement.parentElement.style.display = 'block';
                    tabElement.innerHTML = `${category} <span class="badge bg-primary ms-2">${categoryMatches[category]}</span>`;
                } else {
                    // Don't hide the tab if it has no matches, just show 0
                    tabElement.parentElement.style.display = 'block';
                    tabElement.innerHTML = `${category} <span class="badge bg-secondary ms-2">0</span>`;
                }
            });
            
            // If no active tab has matches, switch to the first tab that does
            const activeTab = document.querySelector('.tab-pane.active');
            const activeCategory = activeTab.id.charAt(0).toUpperCase() + activeTab.id.slice(1);
            
            if (categoryMatches[activeCategory] === 0) {
                // Find first category with matches
                const firstMatchingCategory = Object.entries(categoryMatches)
                    .find(([_, count]) => count > 0);
                
                if (firstMatchingCategory) {
                    // Programmatically click the tab
                    const tabToActivate = document.querySelector(
                        `[data-bs-target="#${firstMatchingCategory[0].toLowerCase()}"]`
                    );
                    const tab = new bootstrap.Tab(tabToActivate);
                    tab.show();
                }
            }
        }, 150); // Wait 150ms before executing search
    });
}

// Main function to load and display data
async function loadODFData() {
    try {
        const container = document.getElementById('odf-content');
        
        // Initialize Bootstrap tabs
        const tabElements = document.querySelectorAll('[data-bs-toggle="tab"]');
        tabElements.forEach(tabElement => {
            new bootstrap.Tab(tabElement);
        });
        
        // Create the interface
        createInterface(container);
        
        // Fetch the data
        const response = await fetch('/data/odf/odf.json');
        const data = await response.json();
        
        // Map the new data structure to the old categories
        const categorizedData = {
            Weapons: data.Weapon || {},
            Units: data.Vehicle || {},
            Buildings: data.Building || {}
        };
        
        // Populate categories
        populateCategory('Weapons', categorizedData);
        populateCategory('Units', categorizedData);
        populateCategory('Buildings', categorizedData);
        
        // Setup search
        handleSearch(categorizedData);
        
    } catch (error) {
        console.error('Error loading ODF data:', error);
        const container = document.getElementById('odf-content');
        container.innerHTML = '<p class="text-danger">Error loading ODF data</p>';
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', loadODFData);

// Get inheritance chain for an object
function getInheritanceChain(categoryData, objectName, category) {
    // Special handling for weapons - directly follow WeaponClass references
    if (category === 'Weapons') {
        const chain = [];
        const currentObject = categoryData[objectName];
        
        // Helper to clean up ODF names
        const cleanName = (name) => name?.replace(/^"(.*)"$/, '$1')?.replace(/\.odf$/i, '');
        
        // Helper to find object by name (with or without .odf)
        const findObject = (name) => {
            if (!name || name === "NULL") return null;
            return categoryData[name + '.odf'] || 
                   categoryData[name + '.ODF'] || 
                   categoryData[name];
        };
        
        // Helper to get references from an object
        const getReferences = (obj) => ({
            ordName: obj.WeaponClass?.ordName,
            classLabel: obj.WeaponClass?.classLabel || obj.OrdnanceClass?.classLabel,
            altName: obj.WeaponClass?.altName,
            payLoadName: obj.WeaponClass?.payLoadName || obj.OrdnanceClass?.payLoadName,
            xplGround: obj.OrdnanceClass?.xplGround,
            xplObject: obj.OrdnanceClass?.xplObject,
            xplExpire: obj.OrdnanceClass?.xplExpire
        });
        
        // Add the current object first
        chain.push({
            name: objectName.replace(/\.odf$/i, ''),
            data: currentObject,
            inheritanceType: null
        });
        
        // Get first level references
        const firstLevelRefs = getReferences(currentObject);
        
        // Process first level references
        Object.entries(firstLevelRefs).forEach(([refType, refValue]) => {
            if (!refValue) return;
            
            const cleanedValue = cleanName(refValue);
            const referencedObject = findObject(cleanedValue);
            
            if (referencedObject) {
                chain.push({
                    name: cleanedValue,
                    data: referencedObject,
                    inheritanceType: refType
                });
                
                // Get second level references from this object
                const secondLevelRefs = getReferences(referencedObject);
                
                // Process second level references
                Object.entries(secondLevelRefs).forEach(([secondRefType, secondRefValue]) => {
                    if (!secondRefValue) return;
                    
                    const cleanedSecondValue = cleanName(secondRefValue);
                    const secondReferencedObject = findObject(cleanedSecondValue);
                    
                    if (secondReferencedObject) {
                        chain.push({
                            name: cleanedSecondValue,
                            data: secondReferencedObject,
                            inheritanceType: `${refType} → ${secondRefType}`
                        });
                    }
                });
            }
        });
        
        return chain;
    }
    
    // Original inheritance chain logic for units and buildings
    const chain = [];
    let currentObject = categoryData[objectName];
    let currentName = objectName;
    
    // Helper to clean up ODF names
    const cleanName = (name) => name?.replace(/^"(.*)"$/, '$1')?.replace(/\.odf$/i, '');
    
    // Helper to find object by name (with or without .odf)
    const findObject = (name) => {
        if (!name || name === "NULL") return null;
        return categoryData[name + '.odf'] || 
               categoryData[name + '.ODF'] || 
               categoryData[name];
    };
    
    // Set to track processed objects to prevent circular inheritance
    const processed = new Set();
    // Set to track which property names we've already seen
    const seenProperties = new Set();
    
    while (currentObject && !processed.has(currentName)) {
        processed.add(currentName);
        chain.push({
            name: cleanName(currentName),
            data: currentObject,
            inheritanceType: chain.length === 0 ? null : chain[chain.length - 1].inheritanceType
        });
        
        // Get all possible inheritance paths
        const inheritancePaths = [
            {
                type: 'classLabel',
                property: 'classLabel',
                value: currentObject.GameObjectClass?.classLabel || 
                       currentObject.WeaponClass?.classLabel ||
                       currentObject.OrdnanceClass?.classLabel
            },
            {
                type: 'ordName',
                property: 'ordName',
                value: currentObject.WeaponClass?.ordName
            },
            {
                type: 'baseName',
                property: 'baseName',
                value: currentObject.GameObjectClass?.baseName
            },
            {
                type: 'payLoadName',
                property: 'payLoadName',
                value: currentObject.WeaponClass?.payLoadName || 
                       currentObject.OrdnanceClass?.payLoadName
            },
            {
                type: 'xplGround',
                property: 'xplGround',
                value: currentObject.OrdnanceClass?.xplGround
            },
            {
                type: 'xplObject',
                property: 'xplObject',
                value: currentObject.OrdnanceClass?.xplObject
            },
            {
                type: 'xplExpire',
                property: 'xplExpire',
                value: currentObject.OrdnanceClass?.xplExpire
            },
            {
                type: 'wpnName',
                property: 'wpnName',
                value: currentObject.WeaponClass?.wpnName
            },
            {
                type: 'altName',
                property: 'altName',
                value: currentObject.WeaponClass?.altName
            }
        ];
        
        // Try each unprocessed inheritance path
        let foundNext = false;
        for (const {type, property, value} of inheritancePaths) {
            // Skip if we've already seen this property name
            if (seenProperties.has(property)) continue;
            
            const cleanedValue = cleanName(value);
            const nextObject = cleanedValue ? findObject(cleanedValue) : null;
            
            if (nextObject) {
                currentObject = nextObject;
                currentName = cleanedValue;
                chain[chain.length - 1].inheritanceType = type;
                seenProperties.add(property);
                foundNext = true;
                break;
            }
        }
        
        if (!foundNext) break;
    }
    
    return chain;
}

// Format inherited data into a table
function formatInheritedData(chain) {
    if (chain.length <= 1) return '';
    
    let html = `
        <div class="card mb-3">
            <div class="card-header bg-secondary-subtle">
                <h5 class="mb-0">Inherited Properties</h5>
            </div>
            <div class="card-body p-0">
                <div class="row g-0">
    `;
    
    // Remove the first item since it's the current object
    chain = chain.slice(1);
    
    // Split remaining items into two columns
    const midPoint = Math.ceil(chain.length / 2);
    const leftColumn = chain.slice(0, midPoint);
    const rightColumn = chain.slice(midPoint);
    
    // Format columns
    [leftColumn, rightColumn].forEach((column, columnIndex) => {
        if (column.length === 0) return;
        
        html += `
            <div class="col-6 ${columnIndex === 1 ? 'border-start' : ''}">
        `;
        
        column.forEach(({name, data, inheritanceType}) => {
            html += `
                <div class="p-3 ${columnIndex === 1 ? 'ps-4' : 'pe-4'}">
                    <div class="fw-bold text-info-emphasis mb-2">
                        ${name}
                        ${inheritanceType ? `<span class="badge bg-secondary ms-2">${inheritanceType}</span>` : ''}
                    </div>
                    <table class="table table-sm table-hover mb-3">
                        <tbody>
            `;
            
            // Add properties from each class
            Object.entries(data).forEach(([className, classData]) => {
                if (Object.keys(classData).length === 0) return;
                
                Object.entries(classData).forEach(([prop, value]) => {
                    let displayValue = value;
                    if (typeof value === 'object' && value !== null) {
                        displayValue = `<pre class="mb-0"><code>${JSON.stringify(value, null, 2)}</code></pre>`;
                    } else if (typeof value === 'boolean') {
                        displayValue = value ? 'true' : 'false';
                    } else if (value === '') {
                        displayValue = '<em class="text-muted">empty</em>';
                    } else if (typeof value === 'string') {
                        displayValue = value.replace(/^"(.*)"$/, '$1');
                    }
                    
                    html += `
                        <tr>
                            <td class="text-nowrap" style="width: 40%">
                                <code class="text-body-secondary">${className}.</code><code>${prop}</code>
                            </td>
                            <td>${displayValue}</td>
                        </tr>
                    `;
                });
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });
        
        html += `</div>`;
    });
    
    html += `
                </div>
            </div>
        </div>
    `;
    
    return html;
}