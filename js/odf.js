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
        
        this.sidebar = document.getElementById('odfSidebarContent');
        this.content = document.getElementById('odfContentContent');
        
        this.showDefaultContent();
        
        this.loadData().then(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const odfToLoad = urlParams.get('odf');
            const categoryToShow = urlParams.get('cat');
            
            if (odfToLoad) {
                this.selectODFByName(odfToLoad, categoryToShow);
            } else {
                // Load first Vehicle ODF if no specific ODF is provided
                this.loadFirstVehicleODF();
            }
        });
        
        this.initializeEventListeners();
        
        this.lastEscapePress = 0;
        
        document.addEventListener('keydown', (e) => {
            // Handle Escape key for property search first
            if (e.key === 'Escape') {
                const propertySearch = document.getElementById('odfPropertySearch');
                if (document.activeElement === propertySearch) {
                    e.preventDefault();
                    propertySearch.value = '';
                    this.handlePropertySearch('');
                    return;
                }
            }

            // Up/Down arrows always control ODF list regardless of focus
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                // Always prevent default behavior
                e.preventDefault();
                e.stopPropagation();
                
                // Force blur on any focused nav elements
                if (document.activeElement.classList.contains('nav-link')) {
                    document.activeElement.blur();
                }
                
                // Handle ODF navigation through the browser instance
                this.cycleODFs(e.key === 'ArrowDown' ? 1 : -1);
                return;
            }
            
            // Left/Right arrows - only work when not in an input and handle nav elements
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                // Allow default behavior in input fields
                if (e.target.tagName === 'INPUT') {
                    return;
                }
                
                // Prevent default for all other elements
                e.preventDefault();
                e.stopPropagation();
                this.cycleTabs(e.key === 'ArrowRight');
                return;
            }
            
            // Don't handle other keyboard shortcuts if user is typing in an input
            if (e.target.tagName === 'INPUT' && e.key !== 'Escape') {
                return;
            }
            
            switch (e.key) {
                case 'k':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        document.getElementById('odfSearch').focus();
                    }
                    break;
                    
                case 'Escape':
                    e.preventDefault();
                    const now = Date.now();
                    
                    if (now - this.lastEscapePress < 750) {
                        const resetButton = document.getElementById('resetView');
                        this.flashButton(resetButton);
                        resetButton.click();
                    } else {
                        const clearButton = document.getElementById('clearSearch');
                        this.flashButton(clearButton);
                        clearButton.click();
                    }
                    
                    this.lastEscapePress = now;
                    document.getElementById('odfSearch').focus();
                    break;
            }
        });
        
        this.flashButton = (button) => {
            const originalClasses = button.className;
            button.className = 'btn text-bg-primary';
            
            setTimeout(() => {
                button.className = originalClasses;
            }, 150);
        };
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
            return true;
        } catch (error) {
            console.error('Error loading ODF data:', error);
            return false;
        }
    }
    
    initializeSidebar() {
        const searchHTML = `
            <div class="mb-3 d-flex gap-2 position-relative">
                <input type="text" class="form-control" id="odfSearch" 
                       placeholder="Type here to filter..." aria-label="Search ODFs">
                <span class="search-shortcut" id="searchShortcut">
                    <kbd class="text-secondary">Ctrl</kbd><kbd class="text-secondary">K</kbd>
                </span>
                <button class="btn btn-outline-secondary" id="clearSearch" type="button">
                    Clear
                </button>
                <button class="btn btn-outline-secondary" id="resetView" type="button">
                    Reset
                </button>
            </div>
        `;
        
        const tabsHTML = `
            <ul class="nav nav-underline mb-3 small nav-justified" id="categoryTabs" role="tablist">
                ${Object.keys(this.data).map((category, idx) => `
                    <li class="nav-item" role="presentation">
                        <button class="nav-link ${idx === 0 ? 'active' : ''}" 
                                id="sidebar-tab-${category}" 
                                type="button" role="tab"
                                tabindex="-1">
                            ${category}
                        </button>
                    </li>
                `).join('')}
            </ul>
        `;
        
        const contentHTML = `
            <div class="tab-content flex-grow-1 overflow-auto" id="categoryContent" tabindex="-1">
                ${Object.entries(this.data).map(([category, odfs], idx) => `
                    <div class="tab-pane fade h-100 ${idx === 0 ? 'show active' : ''}" 
                         id="list-${category}" 
                         role="tabpanel"
                         tabindex="-1">
                        <div class="list-group odf-list">
                            ${this.generateODFList(category, odfs)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;

        this.sidebar.innerHTML = `
            <div class="d-flex flex-column h-100">
                ${searchHTML}
                ${tabsHTML}
                ${contentHTML}
            </div>
        `;
        
        const searchInput = document.getElementById('odfSearch');
        searchInput.addEventListener('input', 
            debounce(e => this.handleSearch(e.target.value), 300));
        
        document.getElementById('clearSearch').addEventListener('click', () => {
            searchInput.value = '';
            this.handleSearch('');
        });
        
        document.getElementById('resetView').addEventListener('click', () => {
            searchInput.value = '';
            this.handleSearch('');
            this.showDefaultContent();
            
            document.querySelectorAll('.odf-item').forEach(item => {
                item.classList.remove('active');
            });
            
            const vehicleTab = document.querySelector('#sidebar-tab-Vehicle');
            if (vehicleTab) {
                vehicleTab.click();
            }
        });
        
        this.currentCategory = Object.keys(this.data)[0];
        
        const searchShortcut = document.getElementById('searchShortcut');

        searchInput.addEventListener('input', () => {
            searchShortcut.style.display = searchInput.value ? 'none' : '';
        });

        // Add click handlers for the nav buttons instead of using Bootstrap tabs
        document.querySelectorAll('#categoryTabs .nav-link').forEach(navLink => {
            navLink.addEventListener('click', () => {
                // Remove active class from all nav links
                document.querySelectorAll('#categoryTabs .nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                
                // Add active class to clicked nav link
                navLink.classList.add('active');
                
                // Show corresponding tab pane
                const category = navLink.id.replace('sidebar-tab-', '');
                document.querySelectorAll('#categoryContent .tab-pane').forEach(pane => {
                    pane.classList.remove('show', 'active');
                });
                document.querySelector(`#list-${category}`).classList.add('show', 'active');
                
                // Update badge styles after changing tabs
                this.updateBadgeStyles();
            });
        });
    }
    
    generateODFList(category, odfs) {
        const entries = Object.entries(odfs);
        const [namedOdfs, unnamedOdfs] = entries.reduce((result, [filename, data]) => {
            const displayName = data.GameObjectClass?.unitName || data.WeaponClass?.wpnName;
            result[displayName ? 0 : 1].push([filename, data]);
            return result;
        }, [[], []]);
        
        const sortedNamedOdfs = namedOdfs.sort(([, a], [, b]) => {
            const nameA = a.GameObjectClass?.unitName || a.WeaponClass?.wpnName || '';
            const nameB = b.GameObjectClass?.unitName || b.WeaponClass?.wpnName || '';
            return nameA.localeCompare(nameB);
        });
        
        const sortedUnnamedOdfs = unnamedOdfs.sort(([a], [b]) => a.localeCompare(b));
        
        return [...sortedNamedOdfs, ...sortedUnnamedOdfs]
            .map(([filename, data]) => {
                const displayName = data.GameObjectClass?.unitName || data.WeaponClass?.wpnName;
                return `
                    <button class="list-group-item list-group-item-action odf-item" 
                            data-filename="${filename}" 
                            data-category="${category}"
                            tabindex="-1">
                        ${displayName ? 
                            `<span class="odf-name">${displayName}</span> <span class="ms-2 text-secondary">${filename.replace('.odf', '')}</span>` : 
                            filename.replace('.odf', '')}
                    </button>
                `;
            }).join('');
    }
    
    updateBadgeStyles() {
        document.querySelectorAll('#categoryTabs .nav-link').forEach(tab => {
            const badge = tab.querySelector('.badge');
            if (badge) {
                badge.classList.remove('bg-primary', 'bg-dark');
                badge.classList.add(tab.classList.contains('active') ? 'bg-primary' : 'bg-dark');
            }
        });
    }
    
    handleSearch(term) {
        if (!term) {
            document.querySelectorAll('.odf-item').forEach(item => {
                item.style.display = '';
                item.classList.remove('active');
            });
            document.querySelectorAll('.no-matches-alert').forEach(alert => {
                alert.remove();
            });
            
            Object.keys(this.data).forEach(category => {
                const tab = document.getElementById(`sidebar-tab-${category}`);
                tab.textContent = category;
            });
            return;
        }

        term = term.toLowerCase();
        const categoryCounts = {};
        let hasExactMatch = false;
        let firstMatch = null;
        let firstExactMatch = null;  // Track the first exact match found
        let exactMatchCategory = null;
        
        document.querySelectorAll('.odf-item').forEach(item => {
            item.classList.remove('active');
            
            const filename = item.dataset.filename.toLowerCase();
            const category = item.dataset.category;
            const odfData = this.data[category][filename];
            
            categoryCounts[category] = categoryCounts[category] || 0;
            
            const searchableNames = [
                filename,
                filename.replace('.odf', ''),
                odfData?.GameObjectClass?.unitName?.toLowerCase(),
                odfData?.WeaponClass?.wpnName?.toLowerCase()
            ].filter(Boolean);
            
            const isExactMatch = searchableNames.some(name => name === term);
            if (isExactMatch) {
                hasExactMatch = true;
                item.style.display = '';
                categoryCounts[category]++;
                
                // Only store first exact match found
                if (!firstExactMatch) {
                    firstExactMatch = item;
                    exactMatchCategory = category;
                }
                return;
            }
            
            if (hasExactMatch) {
                item.style.display = 'none';
                return;
            }
            
            const isMatch = searchableNames.some(name => fuzzySearch(term, name));
            item.style.display = isMatch ? '' : 'none';
            
            if (isMatch && !firstMatch) {
                firstMatch = item;
            }
            if (isMatch) {
                categoryCounts[category]++;
            }
        });
        
        // Use firstExactMatch if available, otherwise use firstMatch
        const matchToSelect = firstExactMatch || firstMatch;
        if (matchToSelect) {
            matchToSelect.classList.add('active');
            matchToSelect.scrollIntoView({ block: 'nearest' });
            
            if (hasExactMatch && exactMatchCategory) {
                const targetTab = document.querySelector(`#sidebar-tab-${exactMatchCategory}`);
                if (targetTab && !targetTab.classList.contains('active')) {
                    targetTab.click();
                }
                const {filename, category} = matchToSelect.dataset;
                this.displayODFData(category, filename);
            }
        }
        
        Object.entries(categoryCounts).forEach(([category, count]) => {
            const tab = document.getElementById(`sidebar-tab-${category}`);
            const isActiveCategory = tab.classList.contains('active');
            
            tab.innerHTML = count > 0 ? 
                `${category} <div><span class="badge ${isActiveCategory ? 'bg-primary rounded-0 px-2' : 'bg-dark rounded-0 px-2'}">${count}</span></div>` : 
                category;
        });
        
        if (!hasExactMatch) {
            const bestCategory = Object.entries(categoryCounts)
                .reduce((best, [category, count]) => 
                    count > best.count ? {category, count} : best
                , {category: this.currentCategory, count: categoryCounts[this.currentCategory] || 0});
                
            if (bestCategory.count > 0 && bestCategory.category !== this.currentCategory) {
                document.querySelector(`#sidebar-tab-${bestCategory.category}`).click();
            }
        }

        Object.keys(this.data).forEach(category => {
            const categoryPane = document.querySelector(`#list-${category}`);
            const existingAlert = categoryPane.querySelector('.no-matches-alert');
            
            if (categoryCounts[category] === 0) {
                if (existingAlert) {
                    existingAlert.remove();
                }
                
                const alertHtml = `
                    <div class="alert alert-secondary no-matches-alert">
                        No matches for "${term}" found in ${category}
                    </div>
                `;
                categoryPane.querySelector('.list-group').insertAdjacentHTML('beforebegin', alertHtml);
            } else if (existingAlert) {
                existingAlert.remove();
            }
        });
    }
    
    getAllSearchableTerms(obj, terms = []) {
        if (!obj || typeof obj !== 'object') return terms;
        
        Object.entries(obj).forEach(([key, value]) => {
            terms.push(key.toLowerCase());
            
            if (value === null) return;
            
            if (typeof value === 'object') {
                this.getAllSearchableTerms(value, terms);
            } else {
                const strValue = String(value).toLowerCase();
                terms.push(strValue);
                
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

        const displayName = odfData.GameObjectClass?.unitName || odfData.WeaponClass?.wpnName || filename;
        const inheritanceHtml = odfData.inheritanceChain ? 
            `<div class="text-info small">Inherits: ${odfData.inheritanceChain.join(' → ')}</div>` : '';

        // Group entries based on common patterns
        const groupedEntries = {};
        
        // First, collect all entries to analyze patterns
        const entries = Object.keys(odfData).filter(name => name !== 'inheritanceChain');
        
        // Find groups of similar names (e.g., ArmoryGroup1, ArmoryGroup2)
        const patterns = new Map(); // Store pattern -> array of entries
        
        entries.forEach(name => {
            const data = odfData[name];
            const isEmpty = Object.keys(data).length === 0;
            
            if (name.includes('.')) {
                // Handle entries with dots (e.g., "Ordnance.Render", "PowerUp.PowerUpClass")
                const group = name.split('.')[0];
                groupedEntries[group] = groupedEntries[group] || [];
                groupedEntries[group].push([name, data]);
            } else if (name.endsWith('Class') && !isEmpty) {
                // Handle non-empty Class entries
                const group = name.replace('Class', '');
                groupedEntries[group] = groupedEntries[group] || [];
                groupedEntries[group].push([name, data]);
            } else {
                // Look for numbered patterns (e.g., ArmoryGroup1, ArmoryGroup2)
                const match = name.match(/^(.+?)(\d+)?$/);
                if (match) {
                    const [, base] = match;
                    // Special case to handle short entries like "Lod" and "e"
                    if (base.length < 4) {
                        groupedEntries['Other'] = groupedEntries['Other'] || [];
                        groupedEntries['Other'].push([name, data]);
                    } else {
                        if (!patterns.has(base)) {
                            patterns.set(base, []);
                        }
                        patterns.get(base).push(name);
                    }
                } else {
                    // Move to Other:
                    // - Empty Class entries
                    // - Non-Class entries without dots
                    // - Entries without patterns
                    groupedEntries['Other'] = groupedEntries['Other'] || [];
                    groupedEntries['Other'].push([name, data]);
                }
            }
        });
        
        // Process the patterns we found
        patterns.forEach((names, base) => {
            if (names.length > 1) {
                // If we found multiple entries with the same base name,
                // group them together under the base name
                groupedEntries[base] = names.map(name => [name, odfData[name]]);
            } else {
                // Single entry - put in Other
                groupedEntries['Other'] = groupedEntries['Other'] || [];
                names.forEach(name => {
                    groupedEntries['Other'].push([name, odfData[name]]);
                });
            }
        });

        const hasMultipleGroups = Object.keys(groupedEntries).length > 1;

        // Helper function to estimate table height
        const estimateHeight = (entry) => {
            const [className, classData] = entry;
            // Card header + table header + (rows * row height)
            return 60 + 42 + (Object.keys(classData).length * 42);
        };

        const distributeEntries = (entries) => {
            // First, calculate heights for all entries
            const entriesWithHeight = entries.map((entry, index) => ({
                entry,
                height: estimateHeight(entry),
                originalIndex: index
            }));
            
            const leftColumn = [];
            const rightColumn = [];
            let leftHeight = 0;
            let rightHeight = 0;
            
            // Process entries in original order
            entriesWithHeight.forEach(({ entry, height }) => {
                // If one column is significantly taller (>70% of current entry height),
                // force entry into shorter column
                if (Math.abs(leftHeight - rightHeight) > height * 0.7) {
                    if (leftHeight < rightHeight) {
                        leftColumn.push(entry);
                        leftHeight += height;
                    } else {
                        rightColumn.push(entry);
                        rightHeight += height;
                    }
                } else {
                    // Otherwise, try to maintain original order by preferring left column
                    // unless it would create significant imbalance
                    const projectedLeftHeight = leftHeight + height;
                    const heightDiff = Math.abs(projectedLeftHeight - rightHeight);
                    
                    if (heightDiff < height * 1.2) { // Allow some imbalance to maintain order
                        leftColumn.push(entry);
                        leftHeight += height;
                    } else {
                        rightColumn.push(entry);
                        rightHeight += height;
                    }
                }
            });
            
            return [leftColumn, rightColumn];
        };

        // Fix the tab content HTML generation to not duplicate tabs
        const contentHtml = hasMultipleGroups ? `
            <div class="tab-content px-0">
                <div class="tab-pane fade show active" id="content-All" role="tabpanel">
                    <div class="row gx-3">
                        ${(() => {
                            const allEntries = Object.entries(groupedEntries)
                                .flatMap(([, entries]) => entries);
                            const [leftCol, rightCol] = distributeEntries(allEntries);
                            return `
                                <div class="col-12 col-md-6">
                                    ${this.formatODFDataColumn(leftCol)}
                                </div>
                                <div class="col-12 col-md-6">
                                    ${this.formatODFDataColumn(rightCol)}
                                </div>
                            `;
                        })()}
                    </div>
                </div>
                ${Object.entries(groupedEntries).map(([group, entries]) => `
                    <div class="tab-pane fade" id="content-${group}" role="tabpanel">
                        <div class="row">
                            ${(() => {
                                const [leftCol, rightCol] = distributeEntries(entries);
                                return `
                                    <div class="col-12 col-md-6">
                                        ${this.formatODFDataColumn(leftCol)}
                                    </div>
                                    <div class="col-12 col-md-6">
                                        ${this.formatODFDataColumn(rightCol)}
                                    </div>
                                `;
                            })()}
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : (() => {
            const entries = groupedEntries[Object.keys(groupedEntries)[0]];
            const [leftCol, rightCol] = distributeEntries(entries);
            return `
                <div class="row">
                    <div class="col-12 col-md-6">
                        ${this.formatODFDataColumn(leftCol)}
                    </div>
                    <div class="col-12 col-md-6">
                        ${this.formatODFDataColumn(rightCol)}
                    </div>
                </div>
            `;
        })();
        
        // Update the tab selection HTML
        this.content.innerHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h3 class="mb-0">${displayName}</h3>
                            <small class="text-secondary">${filename}</small>
                            ${inheritanceHtml}
                        </div>
                        <div class="position-relative" style="width: 200px;">
                            <div class="input-group input-group-sm">
                                <input type="text" class="form-control" 
                                       id="odfPropertySearch" placeholder="Filter properties..."
                                       aria-label="Filter properties">
                                <button class="btn btn-outline-secondary" type="button" id="clearPropertySearch">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                        <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="card-body">
                    ${hasMultipleGroups ? `
                        <ul class="nav nav-pills mb-3 small ps-2" role="tablist" data-bs-keyboard="false">
                            <li class="nav-item" role="presentation">
                                <button class="nav-link active py-1" 
                                        id="content-tab-All" 
                                        data-bs-toggle="pill"
                                        data-bs-target="#content-All"
                                        type="button"
                                        role="tab">
                                    All
                                </button>
                            </li>
                            ${Object.entries(groupedEntries)
                                .filter(([group]) => group !== 'Other')
                                .map(([group]) => `
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link py-1" 
                                                id="content-tab-${group}" 
                                                data-bs-toggle="pill"
                                                data-bs-target="#content-${group}"
                                                type="button"
                                                role="tab">
                                            ${group}
                                        </button>
                                    </li>
                                `).join('')}
                            ${groupedEntries['Other'] ? `
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link py-1" 
                                            id="content-tab-Other" 
                                            data-bs-toggle="pill"
                                            data-bs-target="#content-Other"
                                            type="button"
                                            role="tab">
                                        Other
                                    </button>
                                </li>
                            ` : ''}
                        </ul>
                    ` : ''}
                    ${contentHtml}
                </div>
            </div>
        `;

        // Update the property search handler setup:
        const propertySearch = document.getElementById('odfPropertySearch');
        const clearPropertySearch = document.getElementById('clearPropertySearch');

        propertySearch.addEventListener('input', 
            debounce(e => this.handlePropertySearch(e.target.value), 300));

        clearPropertySearch.addEventListener('click', () => {
            propertySearch.value = '';
            this.handlePropertySearch('');
        });

        // Add tab change handler to reapply search
        document.querySelectorAll('[data-bs-toggle="pill"]').forEach(tab => {
            tab.addEventListener('shown.bs.tab', () => {
                this.handlePropertySearch(propertySearch.value);
            });
        });

        // Store grouped entries for later use
        this.groupedEntries = groupedEntries;

        // Prevent arrow key navigation on content nav elements
        document.querySelectorAll('#odfContentContent [data-bs-toggle="pill"]').forEach(navLink => {
            navLink.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, true);
        });
    }
    
    formatODFDataColumn(classEntries) {
        const powerupIcon = `<svg class="me-2" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path fill-rule="evenodd" d="M15.528 2.973a.75.75 0 0 1 .472.696v8.662a.75.75 0 0 1-.472.696l-7.25 2.9a.75.75 0 0 1-.557 0l-7.25-2.9A.75.75 0 0 1 0 12.331V3.669a.75.75 0 0 1 .471-.696L7.443.184l.004-.001.274-.11a.75.75 0 0 1 .558 0l.274.11.004.001zm-1.374.527L8 5.962 1.846 3.5 1 3.839v.4l6.5 2.6v7.922l.5.2.5-.2V6.84l6.5-2.6v-.4l-.846-.339Z"/>
        </svg>`;
        
        const ordnanceIcon = `<svg class="me-2" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M12.17 9.53c2.307-2.592 3.278-4.684 3.641-6.218.21-.887.214-1.58.16-2.065a3.6 3.6 0 0 0-.108-.563 2 2 0 0 0-.078-.23V.453c-.073-.164-.168-.234-.352-.295a2 2 0 0 0-.16-.045 4 4 0 0 0-.57-.093c-.49-.044-1.19-.03-2.08.188-1.536.374-3.618 1.343-6.161 3.604l-2.4.238h-.006a2.55 2.55 0 0 0-1.524.734L.15 7.17a.512.512 0 0 0 .433.868l1.896-.271c.28-.04.592.013.955.132.232.076.437.16.655.248l.203.083c.196.816.66 1.58 1.275 2.195.613.614 1.376 1.08 2.191 1.277l.082.202c.089.218.173.424.249.657.118.363.172.676.132.956l-.271 1.9a.512.512 0 0 0 .867.433l2.382-2.386c.41-.41.668-.949.732-1.526zm.11-3.699c-.797.8-1.93.961-2.528.362-.598-.6-.436-1.733.361-2.532.798-.799 1.93-.96 2.528-.361s.437 1.732-.36 2.531Z"/>
            <path d="M5.205 10.787a7.6 7.6 0 0 0 1.804 1.352c-1.118 1.007-4.929 2.028-5.054 1.903-.126-.127.737-4.189 1.839-5.18.346.69.837 1.35 1.411 1.925"/>
        </svg>`;

        return classEntries.map(([className, classData]) => {
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
        // Get the current category and class name from the selected ODF
        const category = this.selectedODF?.category;
        
        return Object.entries(classData)
            .map(([key, value]) => `
                <tr>
                    <td><code>${key}</code></td>
                    <td>${this.formatValue(value, key, category)}</td>
                </tr>
            `).join('');
    }
    
    formatValue(value, propertyName = '', category = '') {
        if (typeof value === 'object' && value !== null) {
            return `<pre class="mb-0"><code>${JSON.stringify(value, null, 2)}</code></pre>`;
        }
        
        if (typeof value === 'string') {
            // Handle wpnReticle special case
            if (propertyName === 'wpnReticle' && value.includes('" / "')) {
                value = value.replace(/"/g, '').replace(' / ', ', ');
            }
            
            // Remove quotes if present
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.slice(1, -1);
            }
            
            // Handle audio files
            if (value.toLowerCase().endsWith('.wav')) {
                return `
                    <div class="d-flex align-items-center gap-2">
                        <code style="color: rgba(255, 165, 0, 0.85)">${value}</code>
                        <button class="btn btn-sm btn-outline-secondary d-flex align-items-center p-1 rounded-circle" 
                                onclick="browser.playAudio('../data/audio/${value}', this)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-play-fill" viewBox="0 0 16 16">
                                <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/>
                            </svg>
                        </button>
                        <span class="error-message text-danger small"></span>
                    </div>`;
            }

            // Check if this value should be a link to another ODF
            if (this.shouldLinkToODF(propertyName, category, value)) {
                // Try to find the ODF in our data
                const targetCategory = this.findODFCategory(value);
                if (targetCategory) {
                    return `<a href="#" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" data-category="${targetCategory}" data-filename="${value}.odf">${value}</a>`;
                }
            }
            
            // Handle numeric values including scientific notation
            if (
                /^-?\d*\.?\d+f?$/.test(value) ||  // Regular numbers with optional decimal and 'f' suffix
                /^-?\d*\.?\d+(?:f?\s+-?\d*\.?\d+f?)+$/.test(value) ||  // Space-separated numbers
                /^-?\d*\.?\d+e[+-]?\d+f?$/i.test(value)  // Scientific notation with optional 'f' suffix
            ) {
                return `<code style="color: rgba(255, 107, 74, 0.85)">${value}</code>`;
            }
        }
        
        return value;
    }
    
    shouldLinkToODF(propertyName, category, value) {
        // Skip empty values
        if (!value) return false;

        // Skip if the value points to the current ODF
        const currentFilename = this.selectedODF?.filename;
        if (currentFilename && value + '.odf' === currentFilename) {
            return false;
        }

        // Universal properties that should link
        const universalProperties = ['classLabel', 'baseName'];
        if (universalProperties.includes(propertyName)) return true;

        // Category-specific properties
        const categoryProperties = {
            'Vehicle': [
                /^weaponName\d*$/,  // weaponName, weaponName1, etc.
                /^requireName\d*$/   // requireName, requireName1, etc.
            ],
            'Weapon': [
                'altName',
                'ordName'
            ],
            'Pilot': [
                /^weaponName\d*$/
            ],
            'Building': [
                'upgradeName',
                /^requireName\d*$/,
                'powerName',
                /^buildItem\d*$/    // buildItem, buildItem1, etc.
            ],
            'Powerup': [
                'weaponName'
            ]
        };


        // Check if property matches any patterns for the current category
        const patterns = categoryProperties[category] || [];
        return patterns.some(pattern => {
            if (pattern instanceof RegExp) {
                return pattern.test(propertyName);
            }
            return propertyName === pattern;
        });
    }

    findODFCategory(odfName) {
        // Search through all categories to find which one contains this ODF
        for (const [category, odfs] of Object.entries(this.data)) {
            if (odfs[`${odfName}.odf`]) {
                return category;
            }
        }
        return null;
    }
    
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
        // Get the active tab pane first
        const activeTabPane = document.querySelector('#categoryContent .tab-pane.active');
        if (!activeTabPane) return;

        // Get only visible ODFs within the active tab pane
        const visibleODFs = Array.from(
            activeTabPane.querySelectorAll('.odf-item')
        ).filter(item => item.style.display !== 'none');
        
        if (!visibleODFs.length) return;
        
        const currentODF = activeTabPane.querySelector('.odf-item.active');
        let currentIndex = currentODF ? visibleODFs.indexOf(currentODF) : -1;
        
        let nextIndex;
        if (currentIndex === -1) {
            nextIndex = direction > 0 ? 0 : visibleODFs.length - 1;
        } else {
            nextIndex = currentIndex + direction;
            if (nextIndex >= visibleODFs.length) nextIndex = 0;
            if (nextIndex < 0) nextIndex = visibleODFs.length - 1;
        }
        
        document.querySelectorAll('.odf-item').forEach(item => {
            item.classList.remove('active');
            item.blur(); // Remove focus from any previously focused item
        });
        
        const nextODF = visibleODFs[nextIndex];
        nextODF.classList.add('active');
        nextODF.focus(); // Set focus on the newly selected item
        nextODF.scrollIntoView({ block: 'nearest' });
        
        // Load the data for the selected ODF
        const {filename, category} = nextODF.dataset;
        this.displayODFData(category, filename);
    }

    playAudio(url, buttonElement) {
        const audio = new Audio(url);
        const errorSpan = buttonElement.nextElementSibling;
        
        errorSpan.textContent = '';
        
        audio.addEventListener('error', () => {
            errorSpan.textContent = 'Sound file not found.';
        });
        
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
        }
        
        this.currentAudio = audio;
        audio.play().catch(error => {
            errorSpan.textContent = 'Sound file not found.';
        });
    }

    selectODFByName(odfName, targetCategory = null) {
        console.log('Selecting ODF:', odfName, 'with target category:', targetCategory);
        
        const normalizedName = odfName.toLowerCase().endsWith('.odf') ? 
            odfName.toLowerCase() : 
            `${odfName.toLowerCase()}.odf`;
        
        for (const [category, odfs] of Object.entries(this.data)) {
            if (normalizedName in odfs) {
                const tab = document.querySelector(`#sidebar-tab-${category}`);
                if (tab) {
                    tab.click();
                }
                
                const odfItem = document.querySelector(`.odf-item[data-filename="${normalizedName}"]`);
                if (odfItem) {
                    console.log('Found ODF item, clicking it');
                    odfItem.click();
                    
                    if (targetCategory) {
                        console.log('Attempting to select target category after ODF display');
                        // Add small delay to ensure tabs are rendered
                        setTimeout(() => {
                            this.selectODFCategory(targetCategory);
                        }, 100);
                    }
                    
                    odfItem.scrollIntoView({ block: 'center' });
                }
                
                return true;
            }
        }
        
        console.warn(`ODF '${odfName}' not found`);
        return false;
    }

    selectODFCategory(category) {
        console.log('Selecting category:', category);
        
        // Convert category to lowercase for comparison
        const targetCategory = category.toLowerCase();
        console.log('Target category (lowercase):', targetCategory);
        
        // Get all available tabs and find one that matches (case-insensitive)
        const tabs = Array.from(document.querySelectorAll('[id^="content-tab-"]'));
        console.log('Available tabs:', tabs.map(tab => tab.id));
        
        const targetTab = tabs.find(tab => {
            // Extract the category part from the tab ID and compare lowercase
            const tabCategory = tab.id.replace('content-tab-', '').toLowerCase();
            return tabCategory === targetCategory;
        });
        
        console.log('Found matching tab:', targetTab);
        
        if (targetTab && !targetTab.classList.contains('active')) {
            console.log('Clicking target tab');
            targetTab.click();
            return true;
        }
        
        if (!targetTab) {
            console.log('Target tab not found, looking for All tab');
            const allTab = document.querySelector('#content-tab-All');
            console.log('Found All tab:', allTab);
            if (allTab && !allTab.classList.contains('active')) {
                console.log('Clicking All tab');
                allTab.click();
                return true;
            }
        }
        
        console.log('No tab selection performed');
        return false;
    }

    initializeEventListeners() {
        // Add click handler for ODF links
        document.addEventListener('click', (e) => {
            if (e.target.matches('a[data-category][data-filename]')) {
                e.preventDefault();
                const category = e.target.dataset.category;
                const filename = e.target.dataset.filename;
                
                // First, switch to the correct category tab in sidebar
                const categoryTab = document.querySelector(`#sidebar-tab-${category}`);
                if (categoryTab && !categoryTab.classList.contains('active')) {
                    categoryTab.click();
                }
                
                // Then find and select the ODF item in the list
                const odfItem = document.querySelector(`.odf-item[data-filename="${filename}"]`);
                if (odfItem) {
                    // Remove active class from all items
                    document.querySelectorAll('.odf-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    
                    // Add active class to target item
                    odfItem.classList.add('active');
                    
                    // Scroll the item into view
                    odfItem.scrollIntoView({ block: 'nearest' });
                }
                
                // Finally, display the ODF data
                this.displayODFData(category, filename);
            }
        });
    }

    handlePropertySearch(term) {
        const activeTabContent = document.querySelector('#odfContentContent .tab-pane.active') || 
                                document.querySelector('#odfContentContent .card-body');
        
        if (!activeTabContent) return;

        // Remove any existing alert
        const existingAlert = activeTabContent.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        // If clearing search, re-render the active tab's content
        if (!term) {
            const activeTabId = activeTabContent.id;
            if (activeTabId === 'content-All') {
                // Re-render all entries
                const allEntries = [];
                Object.values(this.groupedEntries).forEach(entries => {
                    allEntries.push(...entries);
                });
                this.renderColumnContent(activeTabContent, allEntries);
            } else {
                // Re-render specific tab content
                const groupName = activeTabId.replace('content-', '');
                const entries = this.groupedEntries[groupName] || [];
                this.renderColumnContent(activeTabContent, entries);
            }
            return;
        }

        // Rest of the existing search logic...
        const cards = Array.from(activeTabContent.querySelectorAll('.card'));
        term = term.toLowerCase();

        // First pass: determine visibility of rows and cards
        const visibleCards = cards.filter(card => {
            const rows = card.querySelectorAll('tbody tr');
            let hasVisibleRows = false;

            rows.forEach(row => {
                const propertyName = row.querySelector('td:first-child').textContent.toLowerCase();
                const propertyValue = row.querySelector('td:last-child').textContent.toLowerCase();
                
                const isMatch = propertyName.includes(term) || propertyValue.includes(term);
                row.classList.toggle('d-none', !isMatch);
                if (isMatch) hasVisibleRows = true;
            });

            card.classList.toggle('d-none', !hasVisibleRows);
            return hasVisibleRows;
        });

        // Get current tab name and show alert if no matches
        const activeTabButton = document.querySelector('#odfContentContent [data-bs-toggle="pill"].active');
        const tabName = activeTabButton ? activeTabButton.textContent.trim() : 'All';

        if (visibleCards.length === 0) {
            const alertHtml = `
                <div class="alert alert-primary mb-3" role="alert">
                    No matches for "${term}" found in ${tabName}
                </div>
            `;
            const contentArea = activeTabContent.querySelector('.row') || activeTabContent;
            contentArea.insertAdjacentHTML('beforebegin', alertHtml);
        }

        // Redistribute visible cards
        this.renderColumnContent(activeTabContent, visibleCards);
    }

    renderColumnContent(container, entries) {
        const leftColumn = container.querySelector('.col-6:first-child');
        const rightColumn = container.querySelector('.col-6:last-child');
        
        if (!leftColumn || !rightColumn) return;

        // Clear existing content
        leftColumn.innerHTML = '';
        rightColumn.innerHTML = '';

        // Calculate heights and distribute
        let leftHeight = 0;
        let rightHeight = 0;

        entries.forEach(entry => {
            const card = entry instanceof Element ? entry : this.formatODFDataColumn([entry]);
            const height = entry instanceof Element ? 
                (60 + 42 + (entry.querySelectorAll('tbody tr:not(.d-none)').length * 42)) :
                (60 + 42 + (Object.keys(entry[1]).length * 42));

            if (leftHeight <= rightHeight) {
                leftColumn.appendChild(typeof card === 'string' ? 
                    new DOMParser().parseFromString(card, 'text/html').body.firstChild : 
                    card.cloneNode(true));
                leftHeight += height;
            } else {
                rightColumn.appendChild(typeof card === 'string' ? 
                    new DOMParser().parseFromString(card, 'text/html').body.firstChild : 
                    card.cloneNode(true));
                rightHeight += height;
            }
        });
    }

    // Add new method to handle cycling through content tabs
    cycleContentTabs(forward = true) {
        const tabs = Array.from(document.querySelectorAll('#odfContentContent [data-bs-toggle="pill"]'));
        if (!tabs.length) return; // No tabs to cycle through
        
        const currentTab = document.querySelector('#odfContentContent [data-bs-toggle="pill"].active');
        const currentIndex = tabs.indexOf(currentTab);
        
        let nextIndex;
        if (forward) {
            nextIndex = currentIndex + 1 >= tabs.length ? 0 : currentIndex + 1;
        } else {
            nextIndex = currentIndex - 1 < 0 ? tabs.length - 1 : currentIndex - 1;
        }
        
        tabs[nextIndex].click();
    }

    loadFirstVehicleODF() {
        if (!this.data || !this.data.Vehicle) return;
        
        // Get all Vehicle ODFs and sort them like generateODFList does
        const entries = Object.entries(this.data.Vehicle);
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
        
        // Get the first ODF filename after sorting
        const firstVehicleODF = [...sortedNamedOdfs, ...sortedUnnamedOdfs][0]?.[0];
        
        if (firstVehicleODF) {
            // Switch to Vehicle tab
            const vehicleTab = document.querySelector('#sidebar-tab-Vehicle');
            if (vehicleTab) {
                vehicleTab.click();
            }
            
            // Select and display the first Vehicle ODF
            const odfItem = document.querySelector(`.odf-item[data-filename="${firstVehicleODF}"]`);
            if (odfItem) {
                odfItem.classList.add('active');
                odfItem.scrollIntoView({ block: 'nearest' });
                this.displayODFData('Vehicle', firstVehicleODF);
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.browser = new ODFBrowser();
    
    document.addEventListener('click', (e) => {
        const target = e.target.closest('.odf-item');
        if (target) {
            const {filename, category} = target.dataset;
            browser.displayODFData(category, filename);
            
            document.querySelectorAll('.odf-item').forEach(item => {
                item.classList.remove('active');
            });
            target.classList.add('active');
        }
    });
});
