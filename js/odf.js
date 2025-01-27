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
        <div class="mb-4">
            <input type="text" id="odf-search" class="form-control" placeholder="Search ODFs...">
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
                <div class="accordion" id="weapons-accordion"></div>
            </div>
            <div class="tab-pane fade" id="units" role="tabpanel">
                <div class="accordion" id="units-accordion"></div>
            </div>
            <div class="tab-pane fade" id="buildings" role="tabpanel">
                <div class="accordion" id="buildings-accordion"></div>
            </div>
        </div>
    `;

    container.innerHTML += `
        <style>
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
}

// Helper function to format the ODF data into a readable table
function formatODFData(data) {
    let html = '';
    
    // Iterate through each class/component (GameObjectClass, CraftClass, etc)
    Object.entries(data).forEach(([className, classData]) => {
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
        
        // If the class has properties
        if (Object.keys(classData).length > 0) {
            Object.entries(classData).forEach(([prop, value]) => {
                // Format the value based on its type
                let displayValue = value;
                if (typeof value === 'object' && value !== null) {
                    displayValue = `<pre class="mb-0"><code>${JSON.stringify(value, null, 2)}</code></pre>`;
                } else if (typeof value === 'boolean') {
                    displayValue = value ? 'true' : 'false';
                } else if (value === '') {
                    displayValue = '<em class="text-muted">empty</em>';
                }

                html += `
                    <tr>
                        <td class="text-nowrap"><code>${prop}</code></td>
                        <td>${displayValue}</td>
                    </tr>
                `;
            });
        } else {
            html += `
                <tr>
                    <td colspan="2" class="text-center text-muted">
                        <em>No properties</em>
                    </td>
                </tr>
            `;
        }

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    return html;
}

// Create an accordion item for an ODF
function createAccordionItem(category, name, data) {
    const itemId = `${category}-${name}`;
    const item = document.createElement('div');
    item.className = 'accordion-item';
    
    // Get unit name if available
    let displayName = name;
    if (data.GameObjectClass && data.GameObjectClass.unitName) {
        displayName = `${name} (${data.GameObjectClass.unitName})`;
    }
    
    item.innerHTML = `
        <h2 class="accordion-header">
            <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#${itemId}">
                ${displayName}
            </button>
        </h2>
        <div id="${itemId}" class="accordion-collapse collapse" data-bs-parent="#${category}-accordion">
            <div class="accordion-body">
                ${formatODFData(data)}
            </div>
        </div>
    `;
    
    return item;
}

// Populate category accordion
function populateCategory(category, data) {
    const accordion = document.getElementById(`${category.toLowerCase()}-accordion`);
    accordion.innerHTML = '';
    
    Object.entries(data).forEach(([name, odfData]) => {
        const item = createAccordionItem(category.toLowerCase(), name, odfData);
        accordion.appendChild(item);
    });
}

// Handle search
function handleSearch(data) {
    const searchInput = document.getElementById('odf-search');
    
    searchInput.addEventListener('input', (e) => {
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
                const accordionItem = accordion.querySelector(`#${itemId}`).parentElement;
                
                // Create searchable text from all the data
                const searchableText = [
                    name.toLowerCase(),
                    itemData.GameObjectClass?.unitName?.toLowerCase() || '',
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
        
        // Populate categories
        populateCategory('weapons', data.Weapons);
        populateCategory('units', data.Units);
        populateCategory('buildings', data.Buildings);
        
        // Setup search
        handleSearch(data);
        
    } catch (error) {
        console.error('Error loading ODF data:', error);
        const container = document.getElementById('odf-content');
        container.innerHTML = '<p class="text-danger">Error loading ODF data</p>';
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', loadODFData);
