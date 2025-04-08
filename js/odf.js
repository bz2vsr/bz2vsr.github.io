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
        
        // Add the comparison modal to the document
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="compareModal" tabindex="-1" aria-labelledby="compareModalLabel" aria-hidden="true">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title" id="compareModalLabel">Compare ODF</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p class="text-secondary mb-2">Choose an ODF to compare with:</p>
                            <div class="mt-4 mb-2">
                                <input type="text" class="form-control bg-secondary-subtle" id="compareSearch" 
                                       placeholder="Search for ODF to compare..." 
                                       autocomplete="off">
                                <div class="dropdown-menu w-100" id="compareSearchResults"></div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary" id="confirmCompare" disabled>Compare</button>
                        </div>
                    </div>
                </div>
            </div>
        `);

        // Add this after the compareModal HTML in the constructor
        document.body.insertAdjacentHTML('beforeend', `
            <div class="dropdown-menu" id="odfContextMenu">
                <a class="dropdown-item d-flex align-items-center gap-2" href="#" id="openInNewTab">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M4 8a.5.5 0 0 1 .5-.5h5.793L8.146 5.354a.5.5 0 1 1 .708-.708l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L10.293 8.5H4.5A.5.5 0 0 1 4 8z"/>
                    </svg>
                    Open in new tab
                </a>
            </div>
        `);

        // Initialize build tree
        this.initializeBuildTree();
        
        // Add build tree button handler
        document.getElementById('showBuildTree').addEventListener('click', () => {
            this.showBuildTree();
        });
        
        this.showDefaultContent();
        
        this.loadData().then(() => {
            const urlParams = new URLSearchParams(window.location.search);
            const compareParam = urlParams.get('compare');
            const odfToLoad = urlParams.get('odf');
            const categoryToShow = urlParams.get('cat');
            const buildTreeParam = urlParams.get('buildtree');
            
            if (compareParam) {
                const [odf1, odf2] = compareParam.split(',').map(odf => odf.trim());
                if (odf1 && odf2) {
                    // Find exact matches for both ODFs
                    let odf1Match = null;
                    let odf2Match = null;

                    // Search through all categories for exact matches
                    for (const [category, odfs] of Object.entries(this.data)) {
                        // Look for exact matches (case-insensitive)
                        const odf1Exact = Object.keys(odfs).find(filename => 
                            filename.toLowerCase() === `${odf1.toLowerCase()}.odf`);
                        const odf2Exact = Object.keys(odfs).find(filename => 
                            filename.toLowerCase() === `${odf2.toLowerCase()}.odf`);

                        if (odf1Exact) {
                            odf1Match = { category, filename: odf1Exact };
                        }
                        if (odf2Exact) {
                            odf2Match = { category, filename: odf2Exact };
                        }
                    }

                    // Show error if either ODF doesn't have an exact match
                    if (!odf1Match || !odf2Match) {
                        this.showError(`Could not find exact matches for ODFs to compare:
                            ${odf1}${!odf1Match ? ' (not found)' : ''}, 
                            ${odf2}${!odf2Match ? ' (not found)' : ''}`);
                        return;
                    }

                    // Both ODFs found, show comparison
                    this.compareODFs(odf1Match, odf2Match);
                    
                    // Update sidebar selection for first ODF
                    const odfItem = document.querySelector(`.odf-item[data-filename="${odf1Match.filename}"]`);
                    if (odfItem) {
                        const categoryTab = document.querySelector(`#sidebar-tab-${odf1Match.category}`);
                        if (categoryTab) {
                            categoryTab.click();
                        }
                        odfItem.classList.add('active');
                        odfItem.scrollIntoView({ block: 'nearest' });
                    }
                    return;
                }
            }
            
            // Handle single ODF loading
            if (odfToLoad) {
                if (!this.selectODFByName(odfToLoad)) {
                    this.showError(`Could not find ODF: ${odfToLoad}`);
                    return;
                }
            } else {
                // Load first Vehicle ODF if no specific ODF is provided
                this.loadFirstVehicleODF();
            }

            // Handle buildtree parameter
            if (buildTreeParam === 'true') {
                // Show build tree modal after a short delay to ensure everything is loaded
                setTimeout(() => {
                    this.buildTreeModal.show();
                }, 100);
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

        // Add popstate handler for browser back/forward
        window.addEventListener('popstate', (event) => {
            if (event.state) {
                if (event.state.compare) {
                    const [odf1, odf2] = event.state.compare.split(',');
                    this.handleCompareState(odf1, odf2);
                } else if (event.state.odf) {
                    this.handleODFState(event.state.odf);
                }
            }
        });

        // Add this to the constructor after initializing other event listeners
        this.initializeContextMenu();

        // Add this to the constructor after the context menu HTML
        const styleSheet = document.createElement('style');
        styleSheet.textContent = `
            #odfContextMenu {
                position: fixed;
                z-index: 1000;
                display: none;
            }
            
            #odfContextMenu .dropdown-item:hover {
                background-color: var(--bs-primary);
                color: white;
            }
            
            #odfContextMenu .dropdown-item:hover svg {
                fill: white;
            }
        `;
        document.head.appendChild(styleSheet);
    }
    
    showError(message) {
        this.content.innerHTML = `
            <div class="alert alert-danger" role="alert">
                ${message}
            </div>
        `;
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
            const response = await fetch('/data/odf/odf.min.json');
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
            <div class="mb-2 d-flex gap-2 position-relative">
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
            <ul class="nav nav-underline small nav-justified" id="categoryTabs" role="tablist">
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
            this.resetView();
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
        let firstMatch = null;
        let firstExactMatch = null;
        let exactMatchCategory = null;
        
        // First pass - identify exact matches and count all matches
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
            
            // Check for exact match
            const isExactMatch = searchableNames.some(name => name === term);
            if (isExactMatch) {
                item.style.display = '';
                item.classList.add('exact-match'); // Add class for exact matches
                categoryCounts[category]++;
                
                if (!firstExactMatch) {
                    firstExactMatch = item;
                    exactMatchCategory = category;
                }
                return;
            }
            
            // Check for partial match
            const isMatch = searchableNames.some(name => fuzzySearch(term, name));
            if (isMatch) {
                item.style.display = '';
                item.classList.remove('exact-match');
                categoryCounts[category]++;
                
                if (!firstMatch) {
                    firstMatch = item;
                }
            } else {
                item.style.display = 'none';
            }
        });
        
        // Select the best match
        const matchToSelect = firstExactMatch || firstMatch;
        if (matchToSelect) {
            matchToSelect.classList.add('active');
            
            // Use setTimeout to ensure DOM has updated before scrolling
            setTimeout(() => {
                matchToSelect.scrollIntoView({ 
                    block: 'nearest',
                    behavior: 'smooth' // Optional: adds smooth scrolling
                });
            }, 0);
            
            if (firstExactMatch && exactMatchCategory) {
                const targetTab = document.querySelector(`#sidebar-tab-${exactMatchCategory}`);
                if (targetTab && !targetTab.classList.contains('active')) {
                    targetTab.click();
                }
                const {filename, category} = matchToSelect.dataset;
                this.displayODFData(category, filename);
            }
        }
        
        // Update category tabs with counts
        Object.entries(categoryCounts).forEach(([category, count]) => {
            const tab = document.getElementById(`sidebar-tab-${category}`);
            const isActiveCategory = tab.classList.contains('active');
            
            tab.innerHTML = count > 0 ? 
                `${category} <div><span class="badge ${isActiveCategory ? 'bg-primary rounded-0 px-2' : 'bg-dark rounded-0 px-2'}">${count}</span></div>` : 
                category;
        });
        
        // Switch to best category if needed
        if (!firstExactMatch) {
            const bestCategory = Object.entries(categoryCounts)
                .reduce((best, [category, count]) => 
                    count > best.count ? {category, count} : best
                , {category: this.currentCategory, count: categoryCounts[this.currentCategory] || 0});
                
            if (bestCategory.count > 0 && bestCategory.category !== this.currentCategory) {
                document.querySelector(`#sidebar-tab-${bestCategory.category}`).click();
            }
        }

        // Update no-matches alerts
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
        // Add this at the beginning of the method
        this.selectedODF = {
            category: category,
            filename: filename,
            data: this.data[category][filename]  // Store the full ODF data
        };

        // Update URL before displaying ODF
        const odfName = filename.replace('.odf', '');
        this.updateURL({ odf: odfName });
        
        const odfData = this.data[category][filename];

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

        // Create the base HTML structure first
        this.content.innerHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h3 class="mb-0">${displayName}</h3>
                            <small class="text-secondary">${filename}</small>
                            ${inheritanceHtml}
                        </div>
                        <div class="d-flex gap-2">
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
                            <div>
                            <button class="btn btn-sm btn-primary" id="compareButton" type="button">
                                Compare
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
                            ${Object.keys(groupedEntries)
                                .filter(group => group !== 'Other')
                                .map(group => `
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
                        </ul>
                    ` : ''}
                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="content-All" role="tabpanel">
                            <div class="row">
                                <div class="col-4 odf-content-left"></div>
                                <div class="col-4 odf-content-middle"></div>
                                <div class="col-4 odf-content-right"></div>
                            </div>
                        </div>
                        ${hasMultipleGroups ? Object.keys(groupedEntries)
                            .map(group => `
                                <div class="tab-pane fade" id="content-${group}" role="tabpanel">
                                    <div class="row">
                                        <div class="col-4 odf-content-left"></div>
                                        <div class="col-4 odf-content-middle"></div>
                                        <div class="col-4 odf-content-right"></div>
                                    </div>
                                </div>
                            `).join('') : ''}
                    </div>
                </div>
            </div>
        `;

        // Now that the structure is created, distribute the content
        if (hasMultipleGroups) {
            // Handle All tab content
            const allEntries = Object.values(groupedEntries).flat();
            const allContainer = document.querySelector('#content-All');
            this.renderColumnContent(allContainer, allEntries);

            // Handle individual category tabs
            Object.entries(groupedEntries).forEach(([group, entries]) => {
                const tabPane = document.querySelector(`#content-${group}`);
                if (tabPane) {
                    this.renderColumnContent(tabPane, entries);
                }
            });
        } else {
            // Single category - just render in the main container
            const allEntries = Object.values(groupedEntries).flat();
            const container = document.querySelector('#content-All');
            this.renderColumnContent(container, allEntries);
        }

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

        // Update the compare modal content with the new ODF
        const compareModal = document.getElementById('compareModal');
        if (compareModal) {
            const modalBody = compareModal.querySelector('.modal-body');
            modalBody.innerHTML = `
                <p class="text-secondary mb-2">Choose an ODF to compare <strong class="text-light fw-bold">${filename}</strong> with:</p>
                <div class="mt-4 mb-2">
                    <input type="text" class="form-control bg-secondary-subtle" id="compareSearch" 
                           placeholder="Search for ODF to compare..." 
                           autocomplete="off">
                    <div class="dropdown-menu w-100" id="compareSearchResults"></div>
                </div>
            `;
        }

        // Initialize the comparison modal functionality
        this.initializeCompareModal(category, filename);

        // After rendering content
        this.initializeComparisonHovers();
        this.equalizeCardHeights();
        
        // After content is rendered, initialize popovers
        document.querySelectorAll('[data-bs-toggle="popover"]').forEach(popoverTriggerEl => {
            new bootstrap.Popover(popoverTriggerEl);
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
        // Add debug logging
        console.log('formatClassProperties:', {
            selectedODF: this.selectedODF,
            category: this.selectedODF?.category,
            data: this.selectedODF?.data
        });
        
        const category = this.selectedODF?.category;
        
        return Object.entries(classData)
            .map(([key, value]) => {
                // Add debug logging for each property
                console.log('Processing property:', key, value);
                return `
                    <tr>
                        <td><code>${key}</code></td>
                        <td>${this.formatValue(value, key, category, this.selectedODF?.data)}</td>
                    </tr>
                `;
            }).join('');
    }
    
    formatValue(value, propertyName = '', category = '', odfData = null) {
        if (typeof value === 'object' && value !== null) {
            return `<pre class="mb-0"><code>${JSON.stringify(value, null, 2)}</code></pre>`;
        }
        
        // Handle subAttackClass property
        if (propertyName === 'subAttackClass' && category === 'Vehicle') {
            const popoverContent = `This property contains 3 letters to specify how the AI behaves when attacking:
                <br><br>
                <strong>First letter:</strong><br>
                N = Attack ground targets only.<br>
                A = Attack ground and flying targets.
                <br><br>
                <strong>Second letter:</strong><br>
                N = Attack when undeployed<br>
                D = Attack when deployed.

                <br><br>
                <strong>Third letter:</strong><br>
                N = Use <code>engageRange</code> for attacking.<br>
                S = Use <code>Weapon.aiRange</code> for attacking.`;
                

            return `
                <div class="d-flex align-items-center gap-2">
                    <span>${value}</span>
                    <button class="btn btn-sm btn-link p-0 text-muted" 
                            data-bs-toggle="popover" 
                            data-bs-html="true"
                            data-bs-placement="right"
                            data-bs-content="${popoverContent}"
                            data-bs-trigger="hover focus">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                            <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
                        </svg>
                    </button>
                </div>`;
        }
        
        // Handle engageRange property for Vehicles
        if (propertyName === 'engageRange' && category === 'Vehicle') {
            // Get the CraftClass data directly from the current class
            const craftClass = Object.entries(odfData).find(([className]) => 
                className === 'CraftClass')?.[1];
                
            if (craftClass) {
                const subAttackClass = craftClass.subAttackClass || '';
                const thirdLetter = subAttackClass.charAt(2)?.toUpperCase();
                
                let popoverContent = '';
                if (thirdLetter === 'S') {
                    popoverContent = "Per the <code>subAttackClass</code>, this unit uses its <code>Weapon.aiRange</code> property value instead of <code>engageRange</code>";
                } else if (thirdLetter === 'N') {
                    popoverContent = "Per the <code&lt;subAttackClass</code&lt;, this unit uses this engageRange value instead of its Weapon aiRange";
                }
                
                if (popoverContent) {
                    return `
                        <div class="d-flex align-items-center gap-2">
                            <code style="color: rgba(255, 107, 74, 0.85)">${value}</code>
                            <button class="btn btn-sm btn-link p-0 text-muted" 
                                    data-bs-toggle="popover" 
                                    data-bs-html="true"
                                    data-bs-placement="right"
                                    data-bs-content="${popoverContent}"
                                    data-bs-trigger="hover focus">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" class="bi bi-info-circle" viewBox="0 0 16 16">
                                    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
                                    <path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0"/>
                                </svg>
                            </button>
                        </div>`;
                }
            }
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
                    // Create a proper URL for the href
                    const odfName = value.replace('.odf', '');
                    const href = `${window.location.pathname}?odf=${odfName}`;
                    
                    return `<a href="${href}" class="link-info link-offset-2 link-underline-opacity-25 link-underline-opacity-100-hover" 
                              data-category="${targetCategory}" 
                              data-filename="${value}.odf"
                              onclick="event.preventDefault(); 
                                      const {category, filename} = this.dataset;
                                      window.browser.displayODFData(category, filename);">
                              ${value}
                           </a>`;
                }
            }
        }
        
        // Handle numeric values including scientific notation
        if (typeof value === 'number' || 
            (typeof value === 'string' && (
                /^-?\d*\.?\d+f?$/.test(value) ||  // Regular numbers with optional decimal and 'f' suffix
                /^-?\d*\.?\d+(?:f?\s+-?\d*\.?\d+f?)+$/.test(value) ||  // Space-separated numbers
                /^-?\d*\.?\d+e[+-]?\d+f?$/i.test(value)  // Scientific notation with optional 'f' suffix
            ))) {
            return `<code style="color: rgba(255, 107, 74, 0.85)">${value}</code>`;
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
                /^requireName\d*$/,   // requireName, requireName1, etc.
                /^buildItem\d*$/    // buildItem, buildItem1, etc.
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

        // Get the entries for the current tab
        const activeTabId = activeTabContent.id;
        let entries;
        if (activeTabId === 'content-All') {
            entries = Object.values(this.groupedEntries).flat();
        } else {
            const groupName = activeTabId.replace('content-', '');
            entries = this.groupedEntries[groupName] || [];
        }

        // If no search term, show all entries
        if (!term) {
            this.renderColumnContent(activeTabContent, entries);
            return;
        }

        term = term.toLowerCase();

        // Filter entries and their properties based on the search term
        const filteredEntries = entries.map(entry => {
            const [className, classData] = entry;
            
            // Check if class name matches
            const classNameMatches = className.toLowerCase().includes(term);
            
            // Filter properties that match
            const filteredProperties = Object.entries(classData).reduce((acc, [key, value]) => {
                const keyMatch = key.toLowerCase().includes(term);
                const valueMatch = String(value).toLowerCase().includes(term);
                if (keyMatch || valueMatch) {
                    acc[key] = value;
                }
                return acc;
            }, {});

            // Return the entry only if class name matches or there are matching properties
            if (classNameMatches || Object.keys(filteredProperties).length > 0) {
                return [className, filteredProperties];
            }
            return null;
        }).filter(Boolean); // Remove null entries

        // Show alert if no matches found
        const activeTabButton = document.querySelector('#odfContentContent [data-bs-toggle="pill"].active');
        const tabName = activeTabButton ? activeTabButton.textContent.trim() : 'All';

        if (filteredEntries.length === 0) {
            const alertHtml = `
                <div class="alert alert-primary mb-3" role="alert">
                    No matches for "${term}" found in ${tabName}
                </div>
            `;
            const contentArea = activeTabContent.querySelector('.row') || activeTabContent;
            contentArea.insertAdjacentHTML('beforebegin', alertHtml);
        }

        // Render the filtered entries
        this.renderColumnContent(activeTabContent, filteredEntries);
    }

    renderColumnContent(container, entries) {
        const leftColumn = container.querySelector('.col-4:nth-child(1)');
        const middleColumn = container.querySelector('.col-4:nth-child(2)');
        const rightColumn = container.querySelector('.col-4:nth-child(3)');
        
        if (!leftColumn || !middleColumn || !rightColumn) return;

        // Clear existing content
        leftColumn.innerHTML = '';
        middleColumn.innerHTML = '';
        rightColumn.innerHTML = '';

        // Calculate heights and distribute
        let leftHeight = 0;
        let middleHeight = 0;
        let rightHeight = 0;

        entries.forEach(entry => {
            const card = entry instanceof Element ? entry : this.formatODFDataColumn([entry]);
            const height = entry instanceof Element ? 
                (60 + 42 + (entry.querySelectorAll('tbody tr:not(.d-none)').length * 42)) :
                (60 + 42 + (Object.keys(entry[1]).length * 42));

            // Find the column with the smallest height
            const minHeight = Math.min(leftHeight, middleHeight, rightHeight);
            
            if (minHeight === leftHeight) {
                leftColumn.appendChild(typeof card === 'string' ? 
                    new DOMParser().parseFromString(card, 'text/html').body.firstChild : 
                    card.cloneNode(true));
                leftHeight += height;
            } else if (minHeight === middleHeight) {
                middleColumn.appendChild(typeof card === 'string' ? 
                    new DOMParser().parseFromString(card, 'text/html').body.firstChild : 
                    card.cloneNode(true));
                middleHeight += height;
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

    initializeCompareModal(originalCategory, originalFilename) {
        const modal = new bootstrap.Modal(document.getElementById('compareModal'));
        const compareButton = document.getElementById('compareButton');
        const searchInput = document.getElementById('compareSearch');
        const resultsContainer = document.getElementById('compareSearchResults');
        const confirmButton = document.getElementById('confirmCompare');
        
        let selectedODF = null;

        // Show modal when Compare button is clicked
        compareButton.addEventListener('click', () => {
            searchInput.value = '';
            confirmButton.disabled = true;
            selectedODF = null;
            resultsContainer.innerHTML = '';
            modal.show();
        });

        // Handle search input
        searchInput.addEventListener('input', debounce((e) => {
            const term = e.target.value.toLowerCase();
            if (!term) {
                resultsContainer.innerHTML = '';
                return;
            }

            const matches = [];
            for (const [category, odfs] of Object.entries(this.data)) {
                for (const [filename, data] of Object.entries(odfs)) {
                    const displayName = data.GameObjectClass?.unitName || data.WeaponClass?.wpnName;
                    const searchableText = [
                        filename.toLowerCase(),
                        filename.toLowerCase().replace('.odf', ''),
                        (displayName || '').toLowerCase()
                    ].join(' ');

                    if (searchableText.includes(term)) {
                        matches.push({ category, filename, displayName });
                    }
                }
            }

            // Sort matches by relevance
            matches.sort((a, b) => {
                const aName = a.displayName || a.filename;
                const bName = b.displayName || b.filename;
                return aName.localeCompare(bName);
            });

            // Show results dropdown
            resultsContainer.innerHTML = matches.map(match => `
                <button class="dropdown-item d-flex justify-content-between align-items-center" 
                        data-category="${match.category}" 
                        data-filename="${match.filename}">
                    <span>
                        ${match.displayName ? 
                            `<strong>${match.displayName}</strong> <small class="text-secondary">${match.filename}</small>` : 
                            match.filename}
                    </span>
                    <small class="text-secondary">${match.category}</small>
                </button>
            `).join('');

            resultsContainer.classList.add('show');
        }, 300));

        // Handle result selection
        resultsContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (!item) return;

            selectedODF = {
                category: item.dataset.category,
                filename: item.dataset.filename
            };

            searchInput.value = item.dataset.filename.replace('.odf', '');
            resultsContainer.classList.remove('show');
            confirmButton.disabled = false;
        });

        // Handle compare confirmation
        confirmButton.addEventListener('click', () => {
            if (!selectedODF) return;
            
            this.compareODFs(
                { category: originalCategory, filename: originalFilename },
                selectedODF
            );
            
            modal.hide();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                resultsContainer.classList.remove('show');
            }
        });
    }

    compareODFs(odf1, odf2) {
        // Update URL before showing comparison
        const odf1Name = odf1.filename.replace('.odf', '');
        const odf2Name = odf2.filename.replace('.odf', '');
        this.updateURL({ compare: `${odf1Name},${odf2Name}` });
        
        const data1 = this.data[odf1.category][odf1.filename];
        const data2 = this.data[odf2.category][odf2.filename];
        
        // Get display names for both ODFs
        const displayName1 = data1.GameObjectClass?.unitName || data1.WeaponClass?.wpnName || odf1.filename;
        const displayName2 = data2.GameObjectClass?.unitName || data2.WeaponClass?.wpnName || odf2.filename;

        // Update the content header to show comparison
        this.content.innerHTML = `
            <div class="card">
                <div class="card-header bg-secondary-subtle">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h3 class="mb-0">Comparing ODFs</h3>
                            <div class="text-secondary">
                                ${displayName1} (${odf1.filename}) vs ${displayName2} (${odf2.filename})
                            </div>
                        </div>
                        <div class="d-flex gap-2">
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
                            <button class="btn btn-sm btn-outline-secondary" onclick="
                                window.browser.updateURL({ odf: '${odf1.filename.replace('.odf', '')}' });
                                window.browser.displayODFData('${odf1.category}', '${odf1.filename}')
                            ">
                                Exit Comparison
                            </button>
                        </div>
                    </div>
                </div>
                <div class="card-body p-0" id="comparisonContent">
                    <div class="row g-0">
                        <div class="col-6" id="odf1-column">
                            <div class="alert alert-primary py-2 rounded-0 position-sticky top-0 mb-0 z-1">
                                <span class="text-light">${odf1.filename}</span>
                                <small class="d-block text-secondary">${displayName1}</small>
                            </div>
                            <div class="p-3">
                                ${this.formatComparisonColumn(data1, data2, displayName1, 'odf1')}
                            </div>
                        </div>
                        <div class="col-6" id="odf2-column">
                            <div class="alert alert-primary py-2 rounded-0 position-sticky top-0 mb-0 z-1">
                                <span class="text-light">${odf2.filename}</span>
                                <small class="d-block text-secondary">${displayName2}</small>
                            </div>
                            <div class="p-3">
                                ${this.formatComparisonColumn(data2, data1, displayName2, 'odf2')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Store comparison data for filtering
        this.comparisonData = { odf1, odf2, data1, data2, displayName1, displayName2 };

        // Initialize search functionality
        const searchInput = document.getElementById('odfPropertySearch');
        const clearButton = document.getElementById('clearPropertySearch');

        searchInput.addEventListener('input', (e) => {
            this.filterComparisonProperties(e.target.value);
        });

        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            this.filterComparisonProperties('');
        });

        // Add hover synchronization
        this.initializeComparisonHovers();

        // After rendering content
        this.equalizeCardHeights();
    }

    filterComparisonProperties(term) {
        const { odf1, odf2, data1, data2, displayName1, displayName2 } = this.comparisonData;
        const comparisonContent = document.getElementById('comparisonContent');
        
        if (!comparisonContent) return;

        // Remove any existing "no matches" alert, but not the column headers
        const existingAlert = comparisonContent.querySelector('.alert-primary:not(.position-sticky)');
        if (existingAlert) {
            existingAlert.remove();
        }

        // Function to update content and ensure height equalization
        const updateContent = (content) => {
            comparisonContent.innerHTML = content;
            this.initializeComparisonHovers();
            
            // Use requestAnimationFrame to ensure DOM is painted
            requestAnimationFrame(() => {
                // Double RAF to ensure a full render cycle
                requestAnimationFrame(() => {
                    this.equalizeCardHeights();
                });
            });
        };

        if (!term) {
            // Reset the comparison view
            updateContent(`
                <div class="row g-0">
                    <div class="col-6" id="odf1-column">
                        <div class="alert alert-primary py-2 rounded-0 position-sticky top-0 mb-0 z-1">
                            <span class="text-light">${odf1.filename}</span>
                            <small class="d-block text-secondary">${displayName1}</small>
                        </div>
                        <div class="p-3">
                            ${this.formatComparisonColumn(data1, data2, displayName1, 'odf1')}
                        </div>
                    </div>
                    <div class="col-6" id="odf2-column">
                        <div class="alert alert-primary py-2 rounded-0 position-sticky top-0 mb-0 z-1">
                            <span class="text-light">${odf2.filename}</span>
                            <small class="d-block text-secondary">${displayName2}</small>
                        </div>
                        <div class="p-3">
                            ${this.formatComparisonColumn(data2, data1, displayName2, 'odf2')}
                        </div>
                    </div>
                </div>
            `);
            return;
        }

        term = term.toLowerCase();

        // Filter the data for both ODFs
        const filteredData1 = this.filterODFData(data1, term);
        const filteredData2 = this.filterODFData(data2, term);

        let content = '';
        
        // Show alert if no matches found
        if (Object.keys(filteredData1).length === 0 && Object.keys(filteredData2).length === 0) {
            content = `
                <div class="alert alert-primary m-3" role="alert">
                    No matches for "${term}" found in either ODF
                </div>
            `;
        }

        // Update the comparison view with filtered data
        content += `
            <div class="row g-0">
                <div class="col-6" id="odf1-column">
                    <div class="alert alert-primary py-2 rounded-0 position-sticky top-0 mb-0 z-1">
                        <span class="text-light">${odf1.filename}</span>
                        <small class="d-block text-secondary">${displayName1}</small>
                    </div>
                    <div class="p-3">
                        ${this.formatComparisonColumn(filteredData1, filteredData2, displayName1, 'odf1')}
                    </div>
                </div>
                <div class="col-6" id="odf2-column">
                    <div class="alert alert-primary py-2 rounded-0 position-sticky top-0 mb-0 z-1">
                        <span class="text-light">${odf2.filename}</span>
                        <small class="d-block text-secondary">${displayName2}</small>
                    </div>
                    <div class="p-3">
                        ${this.formatComparisonColumn(filteredData2, filteredData1, displayName2, 'odf2')}
                    </div>
                </div>
            </div>
        `;

        updateContent(content);
    }

    filterODFData(data, term) {
        const filtered = {};
        
        for (const [className, classData] of Object.entries(data)) {
            if (className === 'inheritanceChain') continue;
            
            const filteredProperties = {};
            let hasMatch = false;

            // Check if class name matches
            if (className.toLowerCase().includes(term)) {
                filteredProperties = {...classData};
                hasMatch = true;
            } else {
                // Check properties
                for (const [key, value] of Object.entries(classData)) {
                    if (key.toLowerCase().includes(term) || 
                        String(value).toLowerCase().includes(term)) {
                        filteredProperties[key] = value;
                        hasMatch = true;
                    }
                }
            }

            if (hasMatch) {
                filtered[className] = filteredProperties;
            }
        }

        return filtered;
    }

    formatComparisonColumn(data, otherData, displayName, columnId) {
        // Collect all class types from both ODFs
        const classTypes = new Set([
            ...Object.keys(data),
            ...Object.keys(otherData)
        ].filter(key => key !== 'inheritanceChain'));

        const html = [];
        
        for (const classType of classTypes) {
            const classData = data[classType] || {};
            const otherClassData = otherData[classType] || {};
            
            if (!Object.keys(classData).length && !Object.keys(otherClassData).length) continue;

            const allProperties = new Set([
                ...Object.keys(classData),
                ...Object.keys(otherClassData)
            ]);

            const propertyGroups = {
                different: [],
                same: [],
                unique: []
            };

            // Categorize properties
            for (const prop of allProperties) {
                const value = classData[prop];
                const otherValue = otherClassData[prop];
                
                if (value === undefined) continue;

                if (otherValue === undefined) {
                    propertyGroups.unique.push({
                        prop,
                        value,
                        type: 'unique'
                    });
                } else {
                    const normalizedValue = String(value).toLowerCase().trim();
                    const normalizedOtherValue = String(otherValue).toLowerCase().trim();
                    
                    if (normalizedValue !== normalizedOtherValue) {
                        propertyGroups.different.push({
                            prop,
                            value,
                            type: 'different'
                        });
                    } else {
                        propertyGroups.same.push({
                            prop,
                            value,
                            type: 'same'
                        });
                    }
                }
            }

            // Sort each group
            for (const group of Object.values(propertyGroups)) {
                group.sort((a, b) => a.prop.localeCompare(b.prop));
            }

            const rows = [];
            
            // Helper to create a row (simplified without placeholder handling)
            const createRow = (prop, value, type) => {
                const classes = {
                    different: 'text-warning bg-warning bg-opacity-10',
                    unique: 'text-info bg-info bg-opacity-10',
                    same: ''
                };
                
                return `
                    <tr data-property="${prop}" data-class="${classType}" data-column="${columnId}">
                        <td class="property-name ${classes[type]}">${prop}</td>
                        <td class="${classes[type]}">${this.formatValue(value, prop)}</td>
                    </tr>
                `;
            };

            // Add rows in order: different, same, unique
            propertyGroups.different.forEach(item => rows.push(createRow(item.prop, item.value, item.type)));
            propertyGroups.same.forEach(item => rows.push(createRow(item.prop, item.value, item.type)));
            propertyGroups.unique.forEach(item => rows.push(createRow(item.prop, item.value, item.type)));

            if (rows.length) {
                html.push(`
                    <div class="card mb-3" data-class-type="${classType}">
                        <div class="card-header py-2 bg-secondary-subtle">
                            <h5 class="card-title mb-0">${classType}</h5>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-sm table-hover mb-0">
                                <tbody>
                                    ${rows.join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                `);
            }
        }

        return html.join('') || '<div class="alert alert-info">No data to display</div>';
    }

    initializeComparisonHovers() {
        const rows = document.querySelectorAll('tr[data-property]');
        
        rows.forEach(row => {
            row.addEventListener('mouseenter', () => {
                const property = row.dataset.property;
                const classType = row.dataset.class;
                const columnId = row.dataset.column;
                const otherColumnId = columnId === 'odf1' ? 'odf2' : 'odf1';
                
                // Add highlight to current row
                row.classList.add('table-active');
                
                // Find and highlight matching row in other column
                const matchingRow = document.querySelector(
                    `tr[data-property="${property}"][data-class="${classType}"][data-column="${otherColumnId}"]`
                );
                if (matchingRow) {
                    matchingRow.classList.add('table-active');
                }
            });
            
            row.addEventListener('mouseleave', () => {
                // Remove highlight from all rows
                document.querySelectorAll('tr.table-active').forEach(highlightedRow => {
                    highlightedRow.classList.remove('table-active');
                });
            });
        });
    }

    // New method to update URL and push state
    updateURL(params) {
        const url = new URL(window.location);
        
        // Clear existing parameters
        url.searchParams.delete('odf');
        url.searchParams.delete('compare');
        url.searchParams.delete('cat');
        
        // Add new parameters
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
        
        // Get the URL string and replace encoded comma with actual comma
        let urlString = url.toString().replaceAll('%2C', ',');
        
        // Push new state to history
        window.history.pushState(params, '', urlString);
    }

    // New methods to handle state changes
    handleCompareState(odf1, odf2) {
        // Find categories for both ODFs
        let odf1Match = null;
        let odf2Match = null;

        for (const [category, odfs] of Object.entries(this.data)) {
            const odf1Exact = Object.keys(odfs).find(filename => 
                filename.toLowerCase() === `${odf1.toLowerCase()}.odf`);
            const odf2Exact = Object.keys(odfs).find(filename => 
                filename.toLowerCase() === `${odf2.toLowerCase()}.odf`);

            if (odf1Exact) odf1Match = { category, filename: odf1Exact };
            if (odf2Exact) odf2Match = { category, filename: odf2Exact };
        }

        if (odf1Match && odf2Match) {
            this.compareODFs(odf1Match, odf2Match);
        }
    }

    handleODFState(odfName) {
        this.selectODFByName(odfName);
    }

    // Add this new method to handle card height equalization
    equalizeCardHeights() {
        // Get all class types that exist in either column
        const classTypes = new Set([
            ...Array.from(document.querySelectorAll('#odf1-column .card')).map(card => card.dataset.classType),
            ...Array.from(document.querySelectorAll('#odf2-column .card')).map(card => card.dataset.classType)
        ]);

        // For each class type, equalize the card heights
        classTypes.forEach(classType => {
            const card1 = document.querySelector(`#odf1-column .card[data-class-type="${classType}"]`);
            const card2 = document.querySelector(`#odf2-column .card[data-class-type="${classType}"]`);
            
            if (card1 && card2) {
                // Reset heights first
                card1.style.height = '';
                card2.style.height = '';
                
                // Get natural heights
                const height1 = card1.offsetHeight;
                const height2 = card2.offsetHeight;
                
                // Set both cards to the larger height
                const maxHeight = Math.max(height1, height2);
                card1.style.height = `${maxHeight}px`;
                card2.style.height = `${maxHeight}px`;
            }
        });
    }

    // Add new method to ODFBrowser class
    initializeBuildTree() {
        // Create and add the modal
        document.body.insertAdjacentHTML('beforeend', `
            <div class="modal fade" id="buildTreeModal" tabindex="-1" data-bs-backdrop="static">
                <div class="modal-dialog modal-fullscreen">
                    <div class="modal-content">
                        <div class="modal-header" style="background: rgb(2, 4, 12); border-color: rgba(255,255,255,0.1)">
                            <h5 class="modal-title">VSR Faction Build Trees</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-4" style="background: rgb(2, 4, 12); height: calc(100vh - 70px); overflow: hidden;">
                            <div class="container-fluid h-100">
                                <div class="row h-100">
                                    <div class="col-md-4 h-100">
                                        <div class="d-flex flex-column h-100">
                                            <div class="d-flex align-items-center" style="padding-bottom: 10px;">
                                                <h4 class="mb-0">ISDF</h4>
                                                    <img src="/img/ISDF-Logo.png" alt="Image" style="width: 50px; height: 50px; margin-left: 10px;">
                                            </div>
                                        <div class="flex-grow-1 overflow-auto" id="isdfBuildTree"></div>
                                        </div>
                                    </div>
                                    <div class="col-md-4 h-100">
                                        <div class="d-flex flex-column h-100">
                                            <div class="d-flex align-items-center" style="padding-bottom: 10px;">
                                                <h4 class="mb-0">Hadean</h4>
                                                    <img src="/img/Hadean-Logo.png" alt="Image" style="width: 50px; height: 50px; margin-left: 10px;">
                                            </div>
                                            <div class="flex-grow-1 overflow-auto" id="hadeanBuildTree"></div>
                                        </div>
                                    </div>
                                    <div class="col-md-4 h-100">
                                        <div class="d-flex flex-column h-100">
                                            <div class="d-flex align-items-center" style="padding-bottom: 10px;">
                                                <h4 class="mb-0">Scion</h4>
                                                    <img src="/img/Scion-Logo2.png" alt="Image" style="width: 50px; height: 50px; margin-left: 10px;">
                                            </div>
                                            <div class="flex-grow-1 overflow-auto" id="scionBuildTree"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `);

        // Initialize the modal
        const modalElement = document.getElementById('buildTreeModal');
        this.buildTreeModal = new bootstrap.Modal(modalElement);

        // Load all faction trees when modal is shown
        modalElement.addEventListener('shown.bs.modal', () => {
            this.generateBuildTree('ibrecy_vsr', document.getElementById('isdfBuildTree'));
            this.generateBuildTree('ebrecym_vsr', document.getElementById('hadeanBuildTree'));
            this.generateBuildTree('fbrecy_vsr', document.getElementById('scionBuildTree'));
        });
    }

    showBuildTree() {
        this.buildTreeModal.show();
    }

    generateBuildTree(odfName, container) {
        // Find the ODF data
        let odfData = null;
        let category = null;
        let filename = null;

        // Search through categories to find the ODF
        for (const [cat, odfs] of Object.entries(this.data)) {
            const exactMatch = Object.keys(odfs).find(fname => 
                fname.toLowerCase() === `${odfName.toLowerCase()}.odf` ||
                fname.toLowerCase() === odfName.toLowerCase());
            if (exactMatch) {
                odfData = odfs[exactMatch];
                category = cat;
                filename = exactMatch;
                break;
            }
        }

        if (!odfData) {
            container.innerHTML = `<div class="alert alert-danger d-inline-block py-2 mb-4">Could not find ODF: ${odfName}</div>`;
            return;
        }

        // Extract relevant properties
        const properties = this.extractODFProperties(odfData, category);
        
        // Find all child ODFs
        const children = this.findChildODFs(odfData, category, filename);

        // Create the tree node
        const node = document.createElement('div');
        node.className = 'build-tree-node mb-3';
        
        // Check if this ODF should have collapsible children
        const isBaseODF = filename.toLowerCase().includes('brecy');  // This will match ibrecy, ebrecy, fbrecy
        const hasCollapsibleChildren = (
            (odfData.ConstructionRigClass || odfData.FactoryClass || odfData.ArmoryClass || isBaseODF) && 
            children.length > 0
        );

        // Generate unique ID for both collapses
        const collapseId = `collapse-${filename.replace(/\W/g, '')}`;
        const childrenCollapseId = `children-${filename.replace(/\W/g, '')}`;
        
        node.innerHTML = `
            <div class="d-flex align-items-center gap-2">
                <div class="alert alert-${this.getCategoryColor(category, odfData)} d-inline-block ${category === 'Weapon' ? 'p-0 px-2' : 'py-2'}" 
                     data-category="${category}" 
                     data-filename="${filename}"
                     data-bs-toggle="collapse" 
                     data-bs-target="#${collapseId}" 
                     aria-expanded="false"
                     role="alert"
                     style="cursor: pointer; margin-bottom: 0.5rem;">
                    <div class="d-flex align-items-center gap-2">
                        ${properties.unitName ? `<span class="fw-bold">${properties.unitName}</span>` : ''}
                    </div>
                    <div class="collapse" id="${collapseId}"
                         data-bs-parent="#${childrenCollapseId}">
                        <div class="pt-2 border-top border-opacity-25 mt-2 pb-2">
                            <div class="build-tree-properties small mb-2">
                                ${this.formatTreeProperties(properties)}
                            </div>
                            <button class="btn btn-sm btn-${this.getCategoryColor(category, odfData)}" onclick="
                                window.browser.buildTreeModal.hide();
                                window.browser.displayODFData('${category}', '${filename}');
                                
                                // Update sidebar selection
                                document.querySelectorAll('.odf-item').forEach(item => {
                                    item.classList.remove('active');
                                });
                                const categoryTab = document.querySelector('#sidebar-tab-${category}');
                                if (categoryTab) {
                                    categoryTab.click();
                                }
                                const odfItem = document.querySelector('.odf-item[data-filename=\\'${filename}\\']');
                                if (odfItem) {
                                    odfItem.classList.add('active');
                                    odfItem.scrollIntoView({ block: 'nearest' });
                                }
                            ">
                                View Full Data
                            </button>
                        </div>
                    </div>
                </div>
                ${hasCollapsibleChildren ? `
                    <button class="btn btn-link btn-sm text-decoration-none p-0 ${isBaseODF ? '' : 'collapsed'}" 
                            data-bs-toggle="collapse" 
                            data-bs-target="#${childrenCollapseId}" 
                            aria-expanded="${isBaseODF ? 'true' : 'false'}"
                            style="margin-top: -9px">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-caret-down-fill" viewBox="0 0 16 16">
                            <path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
                        </svg>
                    </button>
                ` : ''}
            </div>
            ${children.length ? `<div class="build-tree-children ps-4 mt-2 border-start border-secondary collapse ${!hasCollapsibleChildren || isBaseODF ? 'show' : ''}" id="${childrenCollapseId}"></div>` : ''}
        `;

        // Add to container
        container.innerHTML = '';
        container.appendChild(node);

        // Process children (same as before)
        if (children.length) {
            const childContainer = node.querySelector('.build-tree-children');
            const processedODFs = new Set();
            
            const processChildren = (childList, container) => {
                childList.forEach(child => {
                    if (processedODFs.has(child)) return;
                    processedODFs.add(child);
                    
                    // Skip processing if this is a weapon child of a vehicle
                    let childCategory = null;
                    for (const [cat, odfs] of Object.entries(this.data)) {
                        if (Object.keys(odfs).find(fname => 
                            fname.toLowerCase() === `${child.toLowerCase()}.odf` ||
                            fname.toLowerCase() === child.toLowerCase())) {
                            childCategory = cat;
                            break;
                        }
                    }
                    
                    // Skip if parent is vehicle and child is weapon
                    if (!(category === 'Vehicle' && childCategory === 'Weapon')) {
                        const childDiv = document.createElement('div');
                        container.appendChild(childDiv);
                        this.generateBuildTree(child, childDiv);
                    }
                });
            };

            processChildren(children, childContainer);
        }
    }

    extractODFProperties(odfData, category) {
        const properties = {};
        
        // Extract common properties
        const gameObj = odfData.GameObjectClass || {};
        properties.unitName = gameObj.unitName;
        properties.maxHealth = gameObj.maxHealth;
        properties.scrapValue = gameObj.scrapValue;
        properties.scrapCost = gameObj.scrapCost;
        properties.armorClass = gameObj.armorClass;

        // Category-specific properties
        if (category === 'Vehicle') {
            const craftClass = odfData.CraftClass || {};
            properties.customCost = gameObj.customCost;
            properties.buildTime = gameObj.buildTime;
            properties.customTime = gameObj.customTime;
            properties.maxAmmo = gameObj.maxAmmo;
            properties.isAssault = gameObj.isAssault;
            properties.engageRange = craftClass.engageRange;
            properties.topSpeed = craftClass.topSpeed;
            
            // Collect weapon names with display names and count duplicates
            const weaponCounts = new Map();
            for (let i = 1; i <= 10; i++) {
                const weaponFile = gameObj[`weaponName${i}`];
                if (weaponFile) {
                    // Add .odf extension if not present when looking up weapon data
                    const fullWeaponName = weaponFile.endsWith('.odf') ? weaponFile : `${weaponFile}.odf`;
                    const weaponData = this.data['Weapon']?.[fullWeaponName];
                    let displayName = weaponData?.WeaponClass?.wpnName || weaponFile.replace('.odf', '');
                    
                    // Add assault/combat indicator
                    if (weaponData?.WeaponClass) {
                        const isAssault = weaponData.WeaponClass.isAssault === "1";
                        displayName = `<span class="text-warning fw-bold">${isAssault ? 'A' : 'C'}</span> | ${displayName}`;
                    }
                    
                    // Count occurrences of each weapon
                    weaponCounts.set(displayName, (weaponCounts.get(displayName) || 0) + 1);
                }
            }

            // Convert counts to formatted strings
            const weapons = Array.from(weaponCounts.entries()).map(([name, count]) => 
                count > 1 ? `${name} ×${count}` : name
            );

            if (weapons.length) properties.weapons = weapons;
        }
        else if (category === 'Building') {
            properties.powerCost = gameObj.powerCost;
            properties.buildSupport = gameObj.buildSupport;
            properties.buildRequire = gameObj.buildRequire;
            if (odfData.PoweredBuildingClass) {
                properties.powerName = odfData.PoweredBuildingClass.powerName;
            }
        }

        return properties;
    }

    findChildODFs(odfData, category, filename) {
        const children = new Set();
        
        // Helper to add child if it exists
        const addChild = (name) => {
            if (!name) return;
            children.add(name);  // Use exact name as-is
        };

        // Check FactoryClass buildItems
        if (odfData.FactoryClass) {
            for (let i = 1; i <= 10; i++) {
                addChild(odfData.FactoryClass[`buildItem${i}`]);
            }
        }

        // Check ConstructionRigClass buildItems
        if (odfData.ConstructionRigClass) {
            for (let i = 1; i <= 10; i++) {
                addChild(odfData.ConstructionRigClass[`buildItem${i}`]);
            }
        }

        // Check weapon references
        const gameObj = odfData.GameObjectClass || {};
        for (let i = 1; i <= 10; i++) {
            addChild(gameObj[`weaponName${i}`]);
        }

        // Check ArmoryGroup buildItems
        for (let group = 1; group <= 5; group++) {
            const groupClass = odfData[`ArmoryGroup${group}`];
            if (groupClass) {
                for (let i = 1; i <= 10; i++) {
                    addChild(groupClass[`buildItem${i}`]);
                }
            }
        }

        // Check for factory upgrades
        if (gameObj.upgradeName) {
            // Special handling for Xenomator and Kiln upgrades
            if (gameObj.baseName?.toLowerCase() === 'ebfact' || // Hadean Xenomator
                gameObj.baseName?.toLowerCase() === 'fbkiln' || // Scion Kiln
                filename.toLowerCase().includes('fbkiln_vsr')) { // Additional check for Scion Kiln
                addChild(gameObj.upgradeName);
            }
        }

        return Array.from(children);
    }

    getCategoryColor(category, odfData) {
        const colors = {
            'Vehicle': 'primary',
            'Building': 'warning',
            'Weapon': 'secondary',
            'Powerup': 'success',
            'Pilot': 'info'
        };
        return colors[category] || 'secondary';
    }

    formatTreeProperties(properties) {
        const html = [];
        
        for (const [key, value] of Object.entries(properties)) {
            if (!value || key === 'unitName') continue;
            
            if (key === 'weapons') {
                html.push(`
                    <div class="weapons-list mt-2">
                        ${value.map(weaponName => `
                            <div class="alert alert-secondary d-inline-block p-0 px-2 me-1 mb-1">
                                ${weaponName}
                            </div>
                        `).join('')}
                    </div>
                `);
            } else {
                html.push(`<div><span class="opacity-75">${key}:</span> ${value}</div>`);
            }
        }
        
        return html.join('');
    }

    resetView() {
        // Clear search
        document.getElementById('odfSearch').value = '';
        this.handleSearch('');
        
        // Clear URL parameters and update history
        const baseUrl = window.location.pathname;
        window.history.pushState({}, '', baseUrl);
        
        // Reset to first Vehicle ODF
        this.loadFirstVehicleODF();
        
        // Switch to Vehicle tab if not already active
        const vehicleTab = document.querySelector('#sidebar-tab-Vehicle');
        if (vehicleTab && !vehicleTab.classList.contains('active')) {
            vehicleTab.click();
        }
    }

    // Add this new method to the ODFBrowser class
    initializeContextMenu() {
        const contextMenu = document.getElementById('odfContextMenu');
        const openInNewTab = document.getElementById('openInNewTab');
        
        // Store the current target ODF
        let currentTarget = null;
        
        // Handle right-click on ODF items
        document.addEventListener('contextmenu', (e) => {
            const odfItem = e.target.closest('.odf-item');
            if (odfItem) {
                e.preventDefault();
                
                // Store the current target
                currentTarget = odfItem;
                
                // Position the context menu
                contextMenu.style.display = 'block';
                
                // Adjust menu position to stay within viewport
                const menuRect = contextMenu.getBoundingClientRect();
                const x = Math.min(e.clientX, window.innerWidth - menuRect.width);
                const y = Math.min(e.clientY, window.innerHeight - menuRect.height);
                
                contextMenu.style.left = `${x}px`;
                contextMenu.style.top = `${y}px`;
            }
        });
        
        // Handle clicking "Open in new tab"
        openInNewTab.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentTarget) {
                const {filename, category} = currentTarget.dataset;
                const odfName = filename.replace('.odf', '');
                const url = `${window.location.pathname}?odf=${odfName}`;
                window.open(url, '_blank');
            }
            contextMenu.style.display = 'none';
        });
        
        // Hide context menu when clicking elsewhere
        document.addEventListener('click', () => {
            contextMenu.style.display = 'none';
        });
        
        // Hide context menu when scrolling
        document.addEventListener('scroll', () => {
            contextMenu.style.display = 'none';
        });
        
        // Hide context menu when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                contextMenu.style.display = 'none';
            }
        });
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
