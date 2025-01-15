const vsrModID = "1325933293";
const proxyURL = 'https://api.codetabs.com/v1/proxy/?quest=';
const assetsURL = "https://gamelistassets.iondriver.com/bzcc/";
const REFRESH_RATE = 2000;

const MapList  = document.querySelector("#MapList tbody");

// if URL has a map string, process that immediately
const mapTarget = new URLSearchParams(window.location.search).get('map');

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
                select: true,
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

            dt.on('click', 'tbody tr', function() {
                // targets the map filename from 5th column of the row
                let mapfile = dt.row(this).data()[5];

                document.querySelector("#MapViewer").innerHTML = `
                    <div class="d-flex justify-content-center spinner mt-4">
                        <div class="spinner-border text-light" style="width:4rem;height:4rem;" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>
                `;

                let map = MapData.find((e) => e.File === mapfile);

                document.querySelector("#MapViewer").innerHTML = `                   
                    <div class="border bg-dark-subtle rounded-top w-100">
                        <div class="mv-header bg-dark-subtle rounded-top py-2 px-3 border-bottom d-flex justify-content-between align-items-center">
                            <span>
                                <span class="fw-bold">${map.Name}</span>
                                <span class="text-secondary ms-2 border rounded px-1 small">${map.File}</span>
                            </span>
                            <span class="">
                                <button data-join-string='${window.location.href}?map=${map.File}' class="btn btn-sm btn-purple bg-gradient btn-join-copy ms-2" title="Get a shareable link for Discord.">
                                    <textarea class="visually-hidden">${window.location.href}?map=${map.File}</textarea>
                                    Share
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard ms-1 position-relative" viewBox="0 0 16 16" style="top:-2;">
                                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
                                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
                                    </svg>
                                </button>
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
                                    <span>${map.Loose}</span>
                                </li>
                                <li class="list-group-item d-flex justify-content-between align-items-center">
                                    <strong>Base-To-Base Distance (m)</strong>
                                    <span>${map.Size.binarySave ? '<span class="text-danger">N/A (Binary Save)</span>': map.Size.baseToBase}</span>
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
                                    <span>
                                        ${map.Description}
                                    </span>
                                    <br>
                                    <span">${( map.Tags !== '' ? ('tags: ' + map.Tags) : '' )}</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                `;

                let mapShareBtn = document.querySelectorAll('.btn-join-copy');
                if( mapShareBtn !== null )
                {
                    mapShareBtn.forEach(btn => {
                        btn.addEventListener('click', () => {

                            joinStr = btn.querySelector('textarea');
                            joinStr.focus();
                            joinStr.select();

                            // officially deprecated, but...still works :P
                            document.execCommand("copy");

                            btn.classList.remove('btn-purple');
                            btn.classList.add('btn-success');
                            
                            let saveBtn = btn.innerHTML;
                            // change clipboard icon to a checkmark
                            btn.innerHTML = `${joinStr.outerHTML}
                                Copied
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-lg" viewBox="0 0 16 16">
                                <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
                                </svg>
                            `;

                            // return copy button to original state after a few seconds
                            setTimeout(function(){
                                btn.innerHTML = `${joinStr.outerHTML}
                                    Share
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard ms-1 position-relative" viewBox="0 0 16 16" style="top:-2;">
                                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
                                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
                                    </svg>
                                `;
                                btn.classList.remove('btn-success');
                                btn.classList.add('btn-purple');
                            }, REFRESH_RATE);
                        });
                    });
                }
            });
            
            if( mapTarget ){
                dt.row(`[data-mapfile="${mapTarget}"]`).select().scrollTo();
                document.querySelector(`[data-mapfile="${mapTarget}"]`).click();            
            }

        })
        .catch(error => console.error('Error loading MapData: ', error));

});