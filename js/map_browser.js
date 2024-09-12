const vsrModID = "1325933293";
const proxyURL = 'https://api.codetabs.com/v1/proxy/?quest=';
const assetsURL = "https://gamelistassets.iondriver.com/bzcc/";

const MapList  = document.querySelector("#MapList");
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

// this was only needed for original data grab
function addMap(url, mapfile) {
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

    let mapItems = document.querySelectorAll('.map-item');

    mapItems.forEach(el => el.addEventListener("click", event => {

        document.querySelector("#MapViewer").innerHTML = `
            <div class="d-flex justify-content-center spinner mt-4">
                <div class="spinner-border text-light" style="width:4rem;height:4rem;" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </div>
        `;

        let mapfile = event.target.closest(".map-item").getAttribute("data-mapfile");
        let url = proxyURL + encodeURIComponent(`https://gamelistassets.iondriver.com/bzcc/getdata.php?mod=${vsrModID}&map=${mapfile}`);

        fetch(url)
            .then(response => response.json())
            .then(response => { 
                console.log(response.description);
                document.querySelector("#MapViewer").innerHTML = 
                `
                    <div class="border rounded-0 rounded-top w-100">
                        <div class="bg-dark-subtle rounded-top text-center font-monospace py-2 px-3 d-flex justify-content-between align-items-center"><span>${(response.title).replace("VSR: ","").replace("ST: ","")}</span> <span class="text-secondary small">${mapfile}</span></div>
                        <img class="rounded-0" width="100%" style="filter:brightness(1.25)" height="auto" src="${assetsURL + response.image}" onerror="this.src='/img/no_steam_pfp.jpg'">
                    </div>
                    <div class="alert alert-secondary py-3 px-4 font-monospace rounded-0 rounded-bottom border-top-0">
                        ${(response.description).replace(/\r?\n|\r/g, '<br>')}
                    </div>
                `;
            })
            .catch(err => console.error(err));
    }));

    // loop to grab api data for ALL maps; staggers requests so it doesn't send all 100+ at once
    // this was only used once to generate map data, and the resulting html was placed in 
    // maps/index.html so we wouldn't need to request the data every time we load the page
    // MapListFull.forEach((map, index) => { 
    //     let url = proxyURL + encodeURIComponent(`https://gamelistassets.iondriver.com/bzcc/getdata.php?mod=${vsrModID}&map=${map}`);
    //     setTimeout(() => {
    //         addMap(url, map);
    //     }, (index * 500))
    // });
});