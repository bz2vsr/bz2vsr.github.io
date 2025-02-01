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
        this.currentAudio = null;
        
        // Cache DOM elements
        this.sidebar = document.getElementById('odfSidebarContent');
        this.content = document.getElementById('odfContentContent');
        
        // Show initial message
        this.showDefaultContent();
        
        // Initialize
        this.loadData();
        
        // Add tab change listener
        document.addEventListener('shown.bs.tab', (event) => {
            this.updateBadgeStyles();
        });
        
        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            // Special handling for arrow keys - allow them even in search input
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                e.preventDefault();
                this.cycleODFs(e.key === 'ArrowDown' ? 1 : -1);
                return;
            }
            
            // Don't handle other keyboard shortcuts if user is typing in an input
            if (e.target.tagName === 'INPUT' && e.key !== 'Escape') {
                return;
            }
            
            switch (e.key) {
                case 'Tab':
                    e.preventDefault();
                    this.cycleTabs(!e.shiftKey);
                    break;
                    
                case 'Enter':
                    e.preventDefault();
                    const activeODF = document.querySelector('.odf-item.active');
                    if (activeODF) {
                        activeODF.click();
                    }
                    break;
                    
                case 'k':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        document.getElementById('odfSearch').focus();
                    }
                    break;
                    
                case 'Escape':
                    e.preventDefault();
                    document.getElementById('clearSearch').click();
                    document.getElementById('odfSearch').focus();
                    break;
            }
        });
    }
    
    showDefaultContent() {
        this.content.innerHTML = `
            <div class="alert alert-primary" role="alert">
                Select an object to display its data.
            </div>
        `;
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
        
        // Create content area for ODF lists with flex-grow-1 to fill height
        const contentHTML = `
            <div class="tab-content flex-grow-1 overflow-auto" id="categoryContent">
                ${Object.entries(this.data).map(([category, odfs], idx) => `
                    <div class="tab-pane fade h-100 ${idx === 0 ? 'show active' : ''}" 
                         id="list-${category}" role="tabpanel">
                        <div class="list-group odf-list">
                            ${this.generateODFList(category, odfs)}
                        </div>
                    </div>
                `).join('')}
        </div>
    `;
    
        // Wrap everything in a d-flex flex-column container
        this.sidebar.innerHTML = `
            <div class="d-flex flex-column h-100">
                ${searchHTML}
                ${tabsHTML}
                ${contentHTML}
            </div>
        `;
        
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
    
    updateBadgeStyles() {
        // Update all badge styles based on current active tab
        document.querySelectorAll('#categoryTabs .nav-link').forEach(tab => {
            const badge = tab.querySelector('.badge');
            if (badge) {
                badge.classList.remove('bg-dark', 'bg-secondary');
                badge.classList.add(tab.classList.contains('active') ? 'bg-dark' : 'bg-secondary');
            }
        });
    }
    
    handleSearch(term) {
        if (!term) {
            // Show all items if search is empty
            document.querySelectorAll('.odf-item').forEach(item => {
                item.style.display = '';
                item.classList.remove('active');
            });
            // Reset tab labels
            Object.keys(this.data).forEach(category => {
                const tab = document.getElementById(`tab-${category}`);
                tab.textContent = category;
            });
            // Remove all "no matches" alerts
            document.querySelectorAll('.no-matches-alert').forEach(alert => {
                alert.remove();
            });
            // Show default content when clearing search
            this.showDefaultContent();
            this.selectedODF = null;
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
            
            // Create searchable text from all data
            const searchableTerms = [
                filename.toLowerCase(),
                ...this.getAllSearchableTerms(odfData)
            ];
            
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
        
        // Update tab labels with counts and show/hide no matches alert
        Object.entries(categoryCounts).forEach(([category, count]) => {
            const tab = document.getElementById(`tab-${category}`);
            const isActiveCategory = tab.classList.contains('active');
            const tabPane = document.getElementById(`list-${category}`);
            const odfList = tabPane.querySelector('.odf-list');
            
            // Update tab label
            tab.innerHTML = count > 0 ? 
                `${category} <span class="badge ${isActiveCategory ? 'bg-dark' : 'bg-secondary'} ms-1">${count}</span>` : 
                category;
            
            // Show/hide no matches alert
            if (count === 0) {
                // Remove existing alert if any
                const existingAlert = tabPane.querySelector('.no-matches-alert');
                if (existingAlert) existingAlert.remove();
                
                // Add new alert before the list
                const alert = document.createElement('div');
                alert.className = 'alert alert-secondary no-matches-alert mb-3';
                alert.textContent = `No matches for "${term}" found in ${category}`;
                odfList.insertAdjacentElement('beforebegin', alert);
            } else {
                // Remove alert if exists
                const existingAlert = tabPane.querySelector('.no-matches-alert');
                if (existingAlert) existingAlert.remove();
            }
        });
        
        // Get currently active category
        const activeTab = document.querySelector('#categoryTabs .nav-link.active');
        const currentCategory = activeTab.id.replace('tab-', '');
        
        // Find category with most matches
        const bestCategory = Object.entries(categoryCounts)
            .reduce((best, [category, count]) => 
                count > best.count ? {category, count} : best
            , {category: currentCategory, count: categoryCounts[currentCategory]});
        
        // Switch to category with most matches if it's different from current
        if (bestCategory.category !== currentCategory) {
            document.querySelector(`#tab-${bestCategory.category}`).click();
        }
    }
    
    // New helper method to recursively get all searchable terms from an object
    getAllSearchableTerms(obj, terms = []) {
        if (!obj || typeof obj !== 'object') return terms;
        
        // Process each key/value pair
        Object.entries(obj).forEach(([key, value]) => {
            // Add the key itself
            terms.push(key.toLowerCase());
            
            if (value === null) return;
            
            if (typeof value === 'object') {
                // Recursively process nested objects
                this.getAllSearchableTerms(value, terms);
            } else {
                // Convert value to string and add to terms
                const strValue = String(value).toLowerCase();
                terms.push(strValue);
                
                // If the value was quoted, also add unquoted version
                if (strValue.startsWith('"') && strValue.endsWith('"')) {
                    terms.push(strValue.slice(1, -1));
                }
            }
        });
        
        return terms;
    }
    
    displayODFData(category, filename) {
        const odfData = this.data[category][filename];
        this.selectedODF = {category, filename};
        
        // Get display name based on ODF type
        const displayName = category === 'Weapon' ? 
            odfData.WeaponClass?.wpnName || filename :
            odfData.GameObjectClass?.unitName || filename;
        
        // Get inheritance chain if it exists
        const inheritanceHtml = odfData.inheritanceChain?.length ? `
            <div class="mt-1">
                <small class="text-info">
                    Inherits: ${odfData.inheritanceChain.join(' → ')}
                </small>
            </div>
        ` : '';
        
        // Group entries by prefix
        const groupedEntries = Object.entries(odfData).reduce((acc, [key, value]) => {
            if (typeof value !== 'object' || value === null) return acc;
            
            const prefix = key.split('.')[0];
            if (key.includes('.')) {
                // Handle prefixed entries (Ordnance., Powerup., etc)
                if (!acc[prefix]) acc[prefix] = [];
                acc[prefix].push([key, value]);
            } else {
                // Handle regular entries
                if (!acc['Base']) acc['Base'] = [];
                acc['Base'].push([key, value]);
            }
            return acc;
        }, {});
        
        // Only show tabs if there are multiple groups
        const hasMultipleGroups = Object.keys(groupedEntries).length > 1;
        
        // Create tabs HTML only if multiple groups exist
        const tabsHtml = hasMultipleGroups ? `
            <ul class="nav nav-pills mb-3" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" 
                            id="tab-All" 
                            data-bs-toggle="pill"
                            data-bs-target="#content-All"
                            type="button"
                            role="tab">
                        All
                    </button>
                </li>
                ${Object.keys(groupedEntries).map((group) => `
                    <li class="nav-item" role="presentation">
                        <button class="nav-link" 
                                id="tab-${group}" 
                                data-bs-toggle="pill"
                                data-bs-target="#content-${group}"
                                type="button"
                                role="tab">
                            ${group}
                        </button>
                    </li>
                `).join('')}
            </ul>
        ` : '';
        
        // Create content HTML - if single group, don't wrap in tab-pane
        const contentHtml = hasMultipleGroups ? `
            <div class="tab-content">
                <div class="tab-pane fade show active" 
                     id="content-All" 
                     role="tabpanel">
                    <div class="row">
                        <div class="col-6 ps-0">
                            ${this.formatODFDataColumn(Object.entries(groupedEntries).flatMap(([, entries]) => entries).slice(0, Math.ceil(Object.entries(groupedEntries).flatMap(([, entries]) => entries).length / 2)))}
                        </div>
                        <div class="col-6 pe-0">
                            ${this.formatODFDataColumn(Object.entries(groupedEntries).flatMap(([, entries]) => entries).slice(Math.ceil(Object.entries(groupedEntries).flatMap(([, entries]) => entries).length / 2)))}
                        </div>
                    </div>
                </div>
                ${Object.entries(groupedEntries).map(([group, entries]) => {
                    const midPoint = Math.ceil(entries.length / 2);
                    const leftColumns = entries.slice(0, midPoint);
                    const rightColumns = entries.slice(midPoint);
                    
                    return `
                        <div class="tab-pane fade" 
                             id="content-${group}" 
                             role="tabpanel">
                            <div class="row">
                                <div class="col-6 ps-0">
                                    ${this.formatODFDataColumn(leftColumns)}
                                </div>
                                <div class="col-6 pe-0">
                                    ${this.formatODFDataColumn(rightColumns)}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        ` : `
            <div class="row">
                <div class="col-6 ps-0">
                    ${this.formatODFDataColumn(groupedEntries[Object.keys(groupedEntries)[0]].slice(0, Math.ceil(groupedEntries[Object.keys(groupedEntries)[0]].length / 2)))}
                </div>
                <div class="col-6 pe-0">
                    ${this.formatODFDataColumn(groupedEntries[Object.keys(groupedEntries)[0]].slice(Math.ceil(groupedEntries[Object.keys(groupedEntries)[0]].length / 2)))}
                </div>
            </div>
        `;
        
        // Create the entire card structure
        this.content.innerHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <h3 class="mb-0">${displayName}</h3>
                    <small class="text-secondary">${filename}</small>
                    ${inheritanceHtml}
                </div>
                <div class="card-body">
                    ${tabsHtml}
                    ${contentHtml}
                </div>
            </div>
        `;
    }
    
    formatODFDataColumn(classEntries) {
        // SVG icons
        const powerupIcon = `<svg class="me-2" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M15.528 2.973a.75.75 0 0 1 .472.696v8.662a.75.75 0 0 1-.472.696l-7.25 2.9a.75.75 0 0 1-.557 0l-7.25-2.9A.75.75 0 0 1 0 12.331V3.669a.75.75 0 0 1 .471-.696L7.443.184l.004-.001.274-.11a.75.75 0 0 1 .558 0l.274.11.004.001zm-1.374.527L8 5.962 1.846 3.5 1 3.839v.4l6.5 2.6v7.922l.5.2.5-.2V6.84l6.5-2.6v-.4l-.846-.339Z"/>
        </svg>`;
        
        const ordnanceIcon = `<svg class="me-2" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M12.17 9.53c2.307-2.592 3.278-4.684 3.641-6.218.21-.887.214-1.58.16-2.065a3.6 3.6 0 0 0-.108-.563 2 2 0 0 0-.078-.23V.453c-.073-.164-.168-.234-.352-.295a2 2 0 0 0-.16-.045 4 4 0 0 0-.57-.093c-.49-.044-1.19-.03-2.08.188-1.536.374-3.618 1.343-6.161 3.604l-2.4.238h-.006a2.55 2.55 0 0 0-1.524.734L.15 7.17a.512.512 0 0 0 .433.868l1.896-.271c.28-.04.592.013.955.132.232.076.437.16.655.248l.203.083c.196.816.66 1.58 1.275 2.195.613.614 1.376 1.08 2.191 1.277l.082.202c.089.218.173.424.249.657.118.363.172.676.132.956l-.271 1.9a.512.512 0 0 0 .867.433l2.382-2.386c.41-.41.668-.949.732-1.526zm.11-3.699c-.797.8-1.93.961-2.528.362-.598-.6-.436-1.733.361-2.532.798-.799 1.93-.96 2.528-.361s.437 1.732-.36 2.531Z"/>
            <path d="M5.205 10.787a7.6 7.6 0 0 0 1.804 1.352c-1.118 1.007-4.929 2.028-5.054 1.903-.126-.127.737-4.189 1.839-5.18.346.69.837 1.35 1.411 1.925"/>
        </svg>`;

        return classEntries.map(([className, classData]) => {
            // Determine which icon to use based on prefix
            let icon = '';
            if (className.startsWith('Ordnance.')) {
                icon = ordnanceIcon;
            } else if (className.startsWith('Powerup.')) {
                icon = powerupIcon;
            }
            
            return `
                <div class="card mb-3">
                    <div class="card-header bg-secondary-subtle">
                        <h5 class="mb-0 d-flex align-items-center">
                            ${icon}${className}
                        </h5>
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
            `;
        }).join('');
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
            
            // Check if value is a WAV file reference
            if (value.toLowerCase().endsWith('.wav')) {
                return `
                    <div class="d-flex align-items-center gap-2">
                        <code style="color: rgba(255, 107, 74, 0.85)">${value}</code>
                        <button class="btn btn-sm btn-outline-secondary d-flex align-items-center p-1 rounded-circle" 
                                onclick="browser.playAudio('../data/audio/${value}', this)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16">
                                <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                            </svg>
                        </button>
                        <span class="error-message text-danger small"></span>
                    </div>`;
            }
            
            // Check for different number formats
            if (
                /^-?\d*\.?\d+f?$/.test(value) ||
                /^-?\d*\.?\d+(?:f?\s+-?\d*\.?\d+f?)+$/.test(value)
            ) {
                return `<code style="color: rgba(255, 107, 74, 0.85)">${value}</code>`;
            }
        }
        
        return value;
    }
    
    // Add these new methods to handle keyboard navigation
    cycleTabs(forward = true) {
        const tabs = Array.from(document.querySelectorAll('#categoryTabs .nav-link'));
        const currentTab = document.querySelector('#categoryTabs .nav-link.active');
        const currentIndex = tabs.indexOf(currentTab);
        
        let nextIndex;
        if (forward) {
            nextIndex = currentIndex + 1 >= tabs.length ? 0 : currentIndex + 1;
        } else {
            nextIndex = currentIndex - 1 < 0 ? tabs.length - 1 : currentIndex - 1;
        }
        
        tabs[nextIndex].click();
    }
    
    cycleODFs(direction) {
        const activeTab = document.querySelector('#categoryTabs .nav-link.active');
        const categoryId = activeTab.getAttribute('data-bs-target').slice(1);
        const visibleODFs = Array.from(
            document.querySelectorAll(`#${categoryId} .odf-item`)
        ).filter(item => item.style.display !== 'none');
        
        if (!visibleODFs.length) return;
        
        const currentODF = document.querySelector('.odf-item.active');
        let currentIndex = currentODF ? visibleODFs.indexOf(currentODF) : -1;
        
        // Calculate next index
        let nextIndex;
        if (currentIndex === -1) {
            nextIndex = direction > 0 ? 0 : visibleODFs.length - 1;
        } else {
            nextIndex = currentIndex + direction;
            if (nextIndex >= visibleODFs.length) nextIndex = 0;
            if (nextIndex < 0) nextIndex = visibleODFs.length - 1;
        }
        
        // Remove active class from all ODFs
        document.querySelectorAll('.odf-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to next ODF and scroll it into view
        const nextODF = visibleODFs[nextIndex];
        nextODF.classList.add('active');
        nextODF.scrollIntoView({ block: 'nearest' });
    }

    playAudio(url, buttonElement) {
        // Create and play new audio
        const audio = new Audio(url);
        const errorSpan = buttonElement.nextElementSibling;
        
        // Clear any previous error message
        errorSpan.textContent = '';
        
        // Handle loading errors
        audio.addEventListener('error', () => {
            errorSpan.textContent = 'Sound file not found.';
        });
        
        // Stop any currently playing audio
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        
        // Play the audio
        this.currentAudio = audio;
        audio.play().catch(error => {
            errorSpan.textContent = 'Sound file not found.';
        });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make browser instance globally accessible
    window.browser = new ODFBrowser();
    
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
