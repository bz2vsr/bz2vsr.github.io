const vsrModID = "1325933293";
const proxyURL = 'https://api.codetabs.com/v1/proxy/?quest=';
const assetsURL = "https://gamelistassets.iondriver.com/bzcc/";
const REFRESH_RATE = 2000;

const MapList  = document.querySelector("#MapList tbody");

// if URL has a map string, process that immediately
const urlParams = new URLSearchParams(window.location.search);
const mapTarget = urlParams.get('map');

function filter_maps() {
    let input = document.querySelector("#mapSearch").value.toLowerCase();

    for( let i = 0; i < maps.length; i++ ) {
        let matches = maps[i].getAttribute("data-value").toLowerCase().includes(input);

        if(!matches) {
            maps[i].style.setProperty("display", 'none', 'important');
        }
        else {
            maps[i].style.setProperty("display", 'block', 'important');
        }
    }
}

// simple string truncation
const truncate = (str, len, end = "...") => {
    return str.length <= len ? str : str.substring(0, len) + end
}

window.addEventListener('DOMContentLoaded', (event) => {

    // fetch the local map list data
    fetch('/data/maps/vsrmaplist.json')
        .then(response => response.json())
        .then(MapData => {
            MapData.forEach((map, index) => { 
                MapList.insertAdjacentHTML('beforeend',
                    `
                    <tr class="map-item" data-mapfile="${map.File}">
                        <td>
                            <img class="border border-secondary-subtle border-2 rounded" width="75" height="75px" src="${map.Image}" onerror="this.src='/img/no_steam_pfp.jpg'" style="filter:brightness(1.5)">
                        </td>
                        <td class="fw-bold">${map.Name}</td>
                        <td class="text-center">${map.Size.baseToBase}</td>
                        <td class="text-center">${map.Pools}</td>
                        <td class="text-center">${( map.Loose == -2 ? "INF" : map.Loose )}</td>
                        <td class="text-secondary">${map.File}</td>
                        <td>${map.Author}</td>
                        <td>${map.Tags}</td>
                    </tr>
                    `
                );
            });


            // initialize map list table as a DataTable
            let dt = new DataTable('#MapList', {
                paging: true,
                scroller: true,
                scrollCollapse: true,
                scrollY: '75vh',
                select: {
                    style: 'single'
                },
                layout: {
                    topStart: {
                        search: {
                            // text: '',
                            // placeholder: 'Search...'
                        }
                    },
                    topEnd: null
                },
                order: [ [1, 'asc'] ],                  // sort by map name by default 
                columnDefs: [
                    { targets: [0], orderable: false },  // don't allow image column to be sorted
                    // { target: '_all', orderable: false }
                ],
                lengthMenu: [
                    [ 8, 10, 25, 50, 100, -1 ],
                    [ 8, 10, 25, 50, 100, "All"]
                ],
                initComplete: function () {             // allow columns to be filtered by group
                    this.api()
                        .columns('.col-filter')
                        .every(function () {
                            let column = this;
            
                            // Create select element
                            let select = document.createElement('select');
                            select.add(new Option(''));
                            column.footer().replaceChildren(select);
            
                            // Apply listener for user change in value
                            select.addEventListener('change', function () {
                                column
                                    .search(select.value, {exact: true})
                                    .draw();
                            });
            
                            column
                                .data()
                                .unique()
                                .sort()
                                .each(function (d, j) {
                                    select.add(new Option(d));
                                });
                        });
                }
            });

            // Create context menu element
            const contextMenu = document.createElement('div');
            contextMenu.className = 'custom-context-menu position-fixed d-none';
            contextMenu.style.cssText = `
                background: var(--bs-dark);
                border: 1px solid var(--bs-secondary);
                border-radius: 4px;
                padding: 9px 0;
                min-width: 150px;
                z-index: 1000;
                box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            `;
            contextMenu.innerHTML = `
                <div class="context-item d-flex align-items-center px-3 py-2" style="cursor: pointer;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard me-2" viewBox="0 0 16 16">
                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
                    </svg>
                    Copy Share URL
                </div>
                <div class="context-item d-flex align-items-center px-3 py-2" style="cursor: pointer;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-discord me-2" viewBox="0 0 16 16">
                        <path d="M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.01-.059.051.051 0 0 0-.018-.011 8.875 8.875 0 0 1-1.248-.595.05.05 0 0 1-.02-.066.051.051 0 0 1 .015-.019c.084-.063.168-.129.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 0 1 .053.007c.08.066.164.132.248.195a.051.051 0 0 1-.004.085 8.254 8.254 0 0 1-1.249.594.05.05 0 0 0-.03.03.052.052 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.235 13.235 0 0 0 4.001-2.02.049.049 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019Zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612Zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612Z"/>
                    </svg>
                    Copy Discord Share URL (with metadata)
                </div>
                <div class="context-item d-flex align-items-center px-3 py-2" style="cursor: pointer;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-up-right me-2" viewBox="0 0 16 16">
                        <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5v-10a.5.5 0 0 1 .5-.5h6.636a.5.5 0 0 0 .5-.5z"/>
                        <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0v-5z"/>
                    </svg>
                    View Static Page
                </div>
            `;
            document.body.appendChild(contextMenu);

            // Style for hover effect - update to handle both menu items
            const contextItems = contextMenu.querySelectorAll('.context-item');
            contextItems.forEach(item => {
                item.addEventListener('mouseover', () => {
                    item.style.backgroundColor = 'var(--bs-secondary)';
                });
                item.addEventListener('mouseout', () => {
                    item.style.backgroundColor = 'transparent';
                });
            });

            // Handle clicking the context menu items
            contextItems[0].addEventListener('click', () => {
                const mapfile = contextMenu.dataset.mapfile;
                if (mapfile) {
                    // Create the regular share URL
                    const shareUrl = `${window.location.protocol}//${window.location.host}/maps/?map=${mapfile}`;
                    copyToClipboard(shareUrl, contextMenu);
                }
                contextMenu.classList.add('d-none');
            });

            contextItems[1].addEventListener('click', () => {
                const mapfile = contextMenu.dataset.mapfile;
                if (mapfile) {
                    // Create the Discord share URL with metadata
                    const shareUrl = `${window.location.protocol}//${window.location.host}/maps/m/${mapfile}/`;
                    copyToClipboard(shareUrl, contextMenu);
                }
                contextMenu.classList.add('d-none');
            });

            // Add handler for the third menu item (View Static Page)
            contextItems[2].addEventListener('click', () => {
                const mapfile = contextMenu.dataset.mapfile;
                if (mapfile) {
                    // Navigate to the static page
                    window.location.href = `/maps/m/${mapfile}/`;
                }
                contextMenu.classList.add('d-none');
            });

            // Helper function for copying and showing feedback
            function copyToClipboard(text, menu) {
                navigator.clipboard.writeText(text).then(() => {
                    const feedback = document.createElement('div');
                    feedback.className = 'position-fixed p-2 bg-success text-white rounded';
                    feedback.style.cssText = `
                        top: ${menu.style.top};
                        left: ${menu.style.left};
                        z-index: 1001;
                    `;
                    feedback.textContent = 'URL Copied!';
                    document.body.appendChild(feedback);
                    
                    // Remove feedback after delay
                    setTimeout(() => feedback.remove(), 1000);
                });
            }

            // Hide context menu when clicking elsewhere
            document.addEventListener('click', () => {
                contextMenu.classList.add('d-none');
            });

            // Hide context menu when scrolling - move this inside initComplete
            dt.on('init', function() {
                const scrollBody = document.querySelector('.dataTables_scrollBody');
                if (scrollBody) {
                    scrollBody.addEventListener('scroll', () => {
                        contextMenu.classList.add('d-none');
                    });
                }
            });

            dt.on('click', 'tbody tr', function() {
                let mapfile = dt.row(this).data()[5];
                let map = MapData.find((e) => e.File === mapfile);
                let protocol = window.location.protocol;

                document.querySelector("#MapViewer").innerHTML = `                   
                    <div class="border bg-dark-subtle rounded-top w-100">
                        <div class="mv-header bg-dark-subtle rounded-top py-2 px-3 border-bottom d-flex justify-content-between align-items-center">
                            <span>
                                <span class="fw-bold">${map.Name}</span>
                                <span class="text-secondary ms-2 border rounded px-1 small">${map.File}</span>
                            </span>
                            <span class="">
                                <div class="dropdown d-inline-block">
                                    <button class="btn btn-sm btn-purple bg-gradient dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-share me-1 mb-1" viewBox="0 0 16 16">
                                            <path d="M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5m-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3m11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3"/>
                                        </svg>
                                        Share
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end">
                                        <li>
                                            <button class="dropdown-item d-flex align-items-center share-url" data-url="${protocol}//${window.location.host}/maps/?map=${map.File}">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard me-2" viewBox="0 0 16 16">
                                                    <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
                                                    <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
                                                </svg>
                                                Copy Share URL
                                            </button>
                                        </li>
                                        <li>
                                            <button class="dropdown-item d-flex align-items-center share-url" data-url="${protocol}//${window.location.host}/maps/m/${map.File}/">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-discord me-2" viewBox="0 0 16 16">
                                                    <path d="M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.01-.059.051.051 0 0 0-.018-.011 8.875 8.875 0 0 1-1.248-.595.05.05 0 0 1-.02-.066.051.051 0 0 1 .015-.019c.084-.063.168-.129.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 0 1 .053.007c.08.066.164.132.248.195a.051.051 0 0 1-.004.085 8.254 8.254 0 0 1-1.249.594.05.05 0 0 0-.03.03.052.052 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.235 13.235 0 0 0 4.001-2.02.049.049 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019Zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612Zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612Z"/>
                                                </svg>
                                                Copy Discord Share URL (with metadata)
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </span>
                        </div>
                        <div class="mv-image text-center">
                            <img class="border border-secondary-subtle border-2 rounded my-3" width="325" height="325" style="filter:brightness(1.25)" height="auto" src="${map.Image}" onerror="this.src='/img/no_steam_pfp.jpg'">
                        </div>
                        <div class="mv-body bg-secondary-subtle">
                            <ul class="list-group list-group-flush">
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <strong>Pools</strong>
                                    <span>${map.Pools}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <strong>Loose</strong>
                                    <span>${map.Loose == -2 ? "INF" : map.Loose}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <strong>Base-To-Base Distance (m)</strong>
                                    <span>${map.Size.binarySave ? '<span class="text-danger">N/A (Binary Save)</span>' : map.Size.baseToBase}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <strong>TER Size (m)</strong>
                                    <span>${map.Size.formattedSize}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <strong>Author</strong>
                                    <span>${map.Author}</span>
                                </li>
                                <li class="list-group-item text-secondary p-3">
                                    <span>${map.Description}</span>
                                    <br>
                                    <span>${map.Tags !== '' ? 'tags: ' + map.Tags : ''}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                `;

                // Add click handler for the share buttons
                document.querySelectorAll('.share-url').forEach(button => {
                    button.addEventListener('click', function() {
                        const url = this.dataset.url;
                        navigator.clipboard.writeText(url).then(() => {
                            // Show feedback
                            const feedback = document.createElement('div');
                            feedback.className = 'position-fixed p-2 bg-success text-white rounded';
                            
                            // Get the share button's position
                            const shareButton = document.querySelector('.dropdown-toggle');
                            const buttonRect = shareButton.getBoundingClientRect();
                            
                            // Position feedback to the left of the share button
                            feedback.style.cssText = `
                                top: ${buttonRect.top}px;
                                left: ${buttonRect.left - 110}px;  // 90px for feedback width + 20px gap
                                z-index: 1001;
                            `;
                            feedback.textContent = 'URL Copied!';
                            document.body.appendChild(feedback);
                            
                            // Remove feedback after delay
                            setTimeout(() => feedback.remove(), 1000);
                        });
                    });
                });
            });

            // Add context menu event handler
            dt.on('contextmenu', 'tr', function(e) {
                e.preventDefault();
                const row = dt.row(this);
                if (row.data()) {
                    // Position the menu
                    contextMenu.style.left = `${e.pageX}px`;
                    contextMenu.style.top = `${e.pageY}px`;
                    contextMenu.classList.remove('d-none');
                    
                    // Store the map file for this row
                    contextMenu.dataset.mapfile = row.data()[5];
                }
            });

            // Hide context menu when clicking elsewhere
            document.addEventListener('click', () => {
                contextMenu.classList.add('d-none');
            });

            // Hide context menu when scrolling
            dt.on('init', function() {
                const scrollBody = document.querySelector('.dataTables_scrollBody');
                if (scrollBody) {
                    scrollBody.addEventListener('scroll', () => {
                        contextMenu.classList.add('d-none');
                    });
                }
            });

            if (mapTarget) {
                // Select the row and scroll to it
                dt.row(`[data-mapfile="${mapTarget}"]`).select().scrollTo({
                    animate: true,
                    offset: 150
                });
                
                // Trigger click to show the map details
                document.querySelector(`[data-mapfile="${mapTarget}"]`).click();
            }

            // Add keyboard navigation
            document.addEventListener('keydown', function(e) {
                // Only handle up/down arrows
                if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
                
                // Prevent default scrolling behavior
                e.preventDefault();
                
                // Get all visible rows
                const visibleRows = dt.rows({ search: 'applied' }).nodes();
                const currentRow = dt.row({ selected: true });
                let newRowIndex;
                
                if (!currentRow.any()) {
                    // If no row is selected, select the first visible row
                    newRowIndex = 0;
                } else {
                    // Find the current row's position in visible rows
                    const currentIndex = Array.from(visibleRows).indexOf(currentRow.node());
                    
                    if (e.key === 'ArrowUp') {
                        // Move up one row, or wrap to bottom
                        newRowIndex = currentIndex <= 0 ? visibleRows.length - 1 : currentIndex - 1;
                    } else {
                        // Move down one row, or wrap to top
                        newRowIndex = currentIndex >= visibleRows.length - 1 ? 0 : currentIndex + 1;
                    }
                }
                
                // Select the new row and let DataTables handle scrolling with offset
                dt.row(visibleRows[newRowIndex]).select().scrollTo({
                    animate: true,
                    offset: 150  // Add pixels above the selected row
                });
                
                // Trigger click on the row to load map data
                visibleRows[newRowIndex].click();
            });
        });
});