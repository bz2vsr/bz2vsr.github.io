const vsrModID = "1325933293";
const proxyURL = 'https://api.codetabs.com/v1/proxy/?quest=';
const assetsURL = "https://gamelistassets.iondriver.com/bzcc/";
let VSRMapArray = [];

const MapList  = document.querySelector("#MapList tbody");
const maps = document.querySelectorAll(".map-item");

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

/*-------------------------------------------------*/
/*--------------- GENERATION TOOLS ----------------*/
/*-------------------------------------------------*/

function generate_new_map_object(url, mapfile) {
    const request = new XMLHttpRequest();
    request.open("GET", url, false); 
    request.send(null);

    if (request.status === 200) {
        map = JSON.parse(request.responseText);

        // {
        //     "Name" : "VSR: Red Slope",
        //     "File" : "vsrslope"
        //     "Pools" : 7,
        //     "Size" : Small,
        //     "Loose": 180,
        //     "Creator: : "appel"
        //     "Description" : "this is a map description",
        //     "Tags" : "played,popular"
        // } 

        // build a new map object
        let newMap = {};

        newMap.Name = ((map.title).replace("VSR: ","")).replace("ST: ","");
        newMap.File = mapfile;
        newMap.Image = assetsURL + map.image;
        newMap.Pools = -1;
        newMap.Loose = -2;
        newMap.Size = "size";
        newMap.Author = "creator"
        newMap.Description = (map.description).replace(/\r?\n|\r/g, '<br>');
        newMap.Tags = "tags"

        console.log(newMap.Name + " (" + mapfile + ")");

        return newMap;
    }
}

function generate_map_html(url, mapfile) {
    const request = new XMLHttpRequest();
    request.open("GET", url, false); 
    request.send(null);

    if (request.status === 200) {
        map = JSON.parse(request.responseText);

        MapList.insertAdjacentHTML('beforeend',
            `
            <div class="col-2 p-2 map-item" data-value="${map.title}" data-mapfile="${mapfile}">
                <div class="border rounded">
                    <div class="map-item-title bg-dark-subtle rounded-top text-center small font-monospace py-1" style="padding-bottom:.3rem !important">${truncate(((map.title).replace("VSR: ","")).replace("ST: ",""),21)}</div>
                    <img class="rounded-bottom map-image" width="100%" height="auto" src="${assetsURL + map.image}" onError="this.src='/img/no_steam_pfp.jpg'"/>
                </div>
            </div>
            `
        );
    }
}

window.addEventListener('DOMContentLoaded', (event) => {

    // loop to grab api data for ALL maps; staggers requests so it doesn't send all 100+ at once
    // this was originally used to generate map data as HTML for maps/index.html so we wouldn't 
    // need to request the data every time we load the page
    // MapListFull.forEach((map, index) => { 
    //     let url = proxyURL + encodeURIComponent(`https://gamelistassets.iondriver.com/bzcc/getdata.php?mod=${vsrModID}&map=${map}`);
    //     setTimeout(() => {
    //         // generate_map_html(url, map);
    //         // VSRMapArray.push(generate_new_map_object(url, map));
    //     }, (index * 250))
    // });

    // generates a table row for each object in VSRMapList (from vsrmaplist.js)
    VSRMapList.forEach((map, index) => { 
        MapList.insertAdjacentHTML('beforeend',
            `
            <tr class="map-item" data-mapfile="${map.File}">
                <td>
                    <img class="border border-secondary-subtle border-2 rounded" width="75" height="75px" src="${map.Image}" onerror="this.src='/img/no_steam_pfp.jpg'" style="filter:brightness(1.5)">
                </td>
                <td>${map.Name}</td>
                <td>${map.File}</td>
                <td>${map.Pools}</td>
                <td>${( map.Loose == -2 ? "INF" : map.Loose )}</td>
                <td>${map.Size}</td>
                <td>${map.Author}</td>
                <td>${map.Tags}</td>
            </tr>
            `
        );
    });


    // initialize map list table as a DataTable
    let dt = new DataTable('#MapList', {
        paging: false,
        scrollCollapse: true,
        scrollY: '70vh',
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

    let mapItems = document.querySelectorAll('.map-item');

    // mapItems.forEach(el => el.addEventListener("click", event => {
    dt.on('click', 'tbody tr', function() {
        // use index [2] to target 3rd column containing map filename
        let mapfile = dt.row(this).data()[2];

        document.querySelector("#MapViewer").innerHTML = `
            <div class="d-flex justify-content-center spinner mt-4">
                <div class="spinner-border text-light" style="width:4rem;height:4rem;" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;

        // let mapfile = event.target.closest(".map-item").getAttribute("data-mapfile");

        let map = VSRMapList.find((e) => e.File == mapfile);

        document.querySelector("#MapViewer").innerHTML = `                   
            <div class="border bg-dark-subtle rounded-top w-100">
                <div class="mv-header bg-dark-subtle rounded-top py-2 px-3 border-bottom d-flex justify-content-between align-items-center">
                    <span>${map.Name}</span>
                    <span class="text-secondary small">${map.File}</span>
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
                            <strong>Size</strong>
                            <span>${map.Size}</span>
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
    });
});