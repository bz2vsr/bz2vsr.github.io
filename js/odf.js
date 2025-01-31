// Fuzzy search function
function fuzzySearch(needle, haystack) {
    needle = needle.toLowerCase();
    haystack = haystack.toLowerCase();
    
    let hLen = haystack.length;
    let nLen = needle.length;
    
    if (nLen > hLen) {
        return false;
    }
    if (nLen === hLen) {
        return needle === haystack;
    }
    
    outer: for (let i = 0, j = 0; i < nLen; i++) {
        let nChar = needle.charCodeAt(i);
        while (j < hLen) {
            if (haystack.charCodeAt(j++) === nChar) {
                continue outer;
            }
        }
        return false;
    }
    return true;
}

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

class ODFBrowser {
    constructor() {
        this.data = null;
        this.currentCategory = null;
        this.searchTerm = '';
        this.selectedODF = null;
        
        // Cache DOM elements
        this.sidebar = document.getElementById('odfSidebarContent');
        this.content = document.getElementById('odfContentContent');
        
        // Initialize
        this.loadData();
    }
    
    async loadData() {
        try {
            const response = await fetch('/data/odf/odf.json');
            this.data = await response.json();
            this.initializeSidebar();
        } catch (error) {
            console.error('Error loading ODF data:', error);
        }
    }
    
    initializeSidebar() {
        // Create search bar with clear button
        const searchHTML = `
            <div class="mb-3 d-flex gap-2">
                <input type="text" class="form-control" id="odfSearch" 
                       placeholder="Type here to filter..." aria-label="Search ODFs">
                <button class="btn btn-outline-secondary" id="clearSearch" type="button">
                    Clear
                </button>
            </div>
        `;
        
        // Create category pills
        const tabsHTML = `
            <ul class="nav nav-pills mb-3" id="categoryTabs" role="tablist">
                ${Object.keys(this.data).map((category, idx) => `
                    <li class="nav-item" role="presentation">
                        <button class="nav-link ${idx === 0 ? 'active' : ''}" 
                                id="tab-${category}" 
                                data-bs-toggle="pill" 
                                data-bs-target="#list-${category}" 
                                type="button" role="tab">
                            ${category}
                        </button>
                    </li>
                `).join('')}
            </ul>
        `;
        
        // Create content area for ODF lists
        const contentHTML = `
            <div class="tab-content" id="categoryContent">
                ${Object.entries(this.data).map(([category, odfs], idx) => `
                    <div class="tab-pane fade ${idx === 0 ? 'show active' : ''}" 
                         id="list-${category}" role="tabpanel">
                        <div class="list-group odf-list">
                            ${this.generateODFList(category, odfs)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        this.sidebar.innerHTML = searchHTML + tabsHTML + contentHTML;
        
        // Add event listeners
        const searchInput = document.getElementById('odfSearch');
        searchInput.addEventListener('input', 
            debounce(e => this.handleSearch(e.target.value), 300));
        
        // Add clear button handler
        document.getElementById('clearSearch').addEventListener('click', () => {
            searchInput.value = '';
            this.handleSearch('');
        });
        
        // Initialize first category
        this.currentCategory = Object.keys(this.data)[0];
    }
    
    generateODFList(category, odfs) {
        // Split entries into named and unnamed arrays
        const entries = Object.entries(odfs);
        const [namedOdfs, unnamedOdfs] = entries.reduce((result, [filename, data]) => {
            const displayName = data.GameObjectClass?.unitName || data.WeaponClass?.wpnName;
            result[displayName ? 0 : 1].push([filename, data]);
            return result;
        }, [[], []]);
        
        // Sort named ODFs by display name
        const sortedNamedOdfs = namedOdfs.sort(([, a], [, b]) => {
            const nameA = a.GameObjectClass?.unitName || a.WeaponClass?.wpnName || '';
            const nameB = b.GameObjectClass?.unitName || b.WeaponClass?.wpnName || '';
            return nameA.localeCompare(nameB);
        });
        
        // Sort unnamed ODFs by filename
        const sortedUnnamedOdfs = unnamedOdfs.sort(([a], [b]) => a.localeCompare(b));
        
        // Combine the arrays and generate HTML
        return [...sortedNamedOdfs, ...sortedUnnamedOdfs]
            .map(([filename, data]) => {
                const displayName = data.GameObjectClass?.unitName || data.WeaponClass?.wpnName;
                return `
                    <button class="list-group-item list-group-item-action odf-item" 
                            data-filename="${filename}" 
                            data-category="${category}">
                        ${displayName ? 
                            `<span class="odf-name">${displayName}</span> <span class="ms-2 text-secondary">${filename.replace('.odf', '')}</span>` : 
                            filename.replace('.odf', '')}
                    </button>
                `;
            }).join('');
    }
    
    handleSearch(term) {
        if (!term) {
            // Show all items if search is empty
            document.querySelectorAll('.odf-item').forEach(item => {
                item.style.display = '';
            });
            // Reset tab labels
            Object.keys(this.data).forEach(category => {
                const tab = document.getElementById(`tab-${category}`);
                tab.textContent = category;
            });
            return;
        }

        term = term.toLowerCase();
        
        // Track counts for each category
        const categoryCounts = {};
        
        // Get all ODF items
        document.querySelectorAll('.odf-item').forEach(item => {
            const filename = item.dataset.filename;
            const category = item.dataset.category;
            const odfData = this.data[category][filename];
            
            // Initialize counter for this category if needed
            categoryCounts[category] = categoryCounts[category] || 0;
            
            // Create searchable text from relevant properties
            const searchableTerms = [
                filename.toLowerCase(),
                odfData.GameObjectClass?.unitName?.toLowerCase() || '',
                odfData.WeaponClass?.wpnName?.toLowerCase() || '',
            ].filter(Boolean);
            
            // Search through each term
            const isMatch = searchableTerms.some(text => 
                fuzzySearch(term, text)
            );
            
            item.style.display = isMatch ? '' : 'none';
            
            // Increment counter if there's a match
            if (isMatch) {
                categoryCounts[category]++;
            }
        });
        
        // Update tab labels with counts
        Object.entries(categoryCounts).forEach(([category, count]) => {
            const tab = document.getElementById(`tab-${category}`);
            tab.innerHTML = count > 0 ? 
                `${category} <span class="badge bg-secondary ms-1">${count}</span>` : 
                category;
        });
    }
    
    displayODFData(category, filename) {
        const odfData = this.data[category][filename];
        this.selectedODF = {category, filename};
        
        // Get inheritance chain if it exists
        const inheritanceHtml = odfData.inheritanceChain?.length ? `
            <div class="mt-1">
                <small class="text-secondary">
                    Inherits: ${odfData.inheritanceChain.join(' → ')}
                </small>
            </div>
        ` : '';
        
        // Get all class entries and split them into two arrays
        const classEntries = Object.entries(odfData).filter(([, data]) => 
            typeof data === 'object' && data !== null
        );
        
        const midPoint = Math.ceil(classEntries.length / 2);
        const leftColumns = classEntries.slice(0, midPoint);
        const rightColumns = classEntries.slice(midPoint);
        
        // Create the entire card structure
        this.content.innerHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="mb-0">${odfData.GameObjectClass?.unitName || filename}</h3>
                    <small class="text-secondary">${filename}</small>
                    ${inheritanceHtml}
                </div>
                <div class="card-body">
                    <div class="row">
                        <div class="col-6">
                            ${this.formatODFDataColumn(leftColumns)}
                        </div>
                        <div class="col-6">
                            ${this.formatODFDataColumn(rightColumns)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    formatODFDataColumn(classEntries) {
        return classEntries.map(([className, classData]) => `
            <div class="card mb-3">
                <div class="card-header bg-secondary-subtle">
                    <h5 class="mb-0">${className}</h5>
                </div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                        <table class="table table-hover table-striped mb-0">
                            <thead>
                                <tr>
                                    <th scope="col" style="width: 30%">Property</th>
                                    <th scope="col">Value</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.formatClassProperties(classData)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    formatClassProperties(classData) {
        return Object.entries(classData)
            .map(([key, value]) => `
                <tr>
                    <td><code>${key}</code></td>
                    <td>${this.formatValue(value)}</td>
                </tr>
            `).join('');
    }
    
    formatValue(value) {
        if (typeof value === 'object' && value !== null) {
            return `<pre class="mb-0"><code>${JSON.stringify(value, null, 2)}</code></pre>`;
        }
        
        // Remove quotes from string values that were originally quoted in the ODF
        if (typeof value === 'string') {
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            
            // Check if the string is a number (including decimals)
            if (/^-?\d*\.?\d+$/.test(value)) {
                return `<code style="color: rgba(255, 107, 74, 0.85)">${value}</code>`;
            }
        }
        
        return value;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const browser = new ODFBrowser();
    
    // Add click handler for ODF items
    document.addEventListener('click', (e) => {
        // Find closest .odf-item parent if we clicked on a child element
        const target = e.target.closest('.odf-item');
        if (target) {
            const {filename, category} = target.dataset;
            browser.displayODFData(category, filename);
            
            // Add active state
            document.querySelectorAll('.odf-item').forEach(item => {
                item.classList.remove('active');
            });
            target.classList.add('active');
        }
    });
});
