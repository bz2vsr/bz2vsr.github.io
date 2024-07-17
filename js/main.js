// used to cancel auto-updates
let interval_id = null;

const vsrModID = "1325933293";

function getSteamMatch(SteamPlayerList, Player) {

    // if(SteamPlayerList == undefined || Player == undefined )
    for( const [SteamID, Steam] of Object.entries(SteamPlayerList)) 
    {
        console.log(`${Steam.Nickname} ${SteamID}`);
        if( (Player.IDs.Steam.ID).toString() === SteamID.toString() ) {
            return `Name: ${Steam.Nickname} 
                <hr>
                ID: ${SteamID}
            `;
        }
    }

    return "No data found.";
}

if( localStorage.getItem("ShowVSROnly") === "false" ) {
    document.querySelector("#VSRToggle").checked = false;
}

// simple string truncation
const truncate = (str, len, end = "...") => {
    return str.length <= len ? str : str.substring(0, len) + end
}

// clean input strings; not a full-proof solution, but feukers will be feukers
function clean(str) { 
    if( str === undefined ) {
        return "Undefined";
    }

    const stripThatShit = str.replace(/<[^>]*>/g, '');
    const cleanThatShit = stripThatShit.replace(/\s+/g, ' ').trim();

    if( cleanThatShit === "" ) {
        return "Invalid Input"
    }

    return cleanThatShit;
}

async function getLobbyData() {
    console.log('Fetching data.');
    let vsrGameCount = 0;
    let otherGameCount = 0;

    // Requesting data directly gets blocked by CORS policy, so we use klugey CORS Proxy workaround
    const sourceURL = "http://multiplayersessionlist.iondriver.com/api/1.0/sessions?game=bigboat:battlezone_combat_commander";
    const proxyURL = 'https://api.codetabs.com/v1/proxy/?quest=' + sourceURL;

    try {

        let fetchResponse = await fetch(proxyURL);
        // let fetchResponse = await fetch('/js/data.sample.json');

        if( !fetchResponse.ok ) {
            console.log(`Error with response. Make sure source and proxy URLs are accessible and returning valid data.`);
        }

        let data = await fetchResponse.json();

        if( data.DataCache.Players === undefined ) {
            document.querySelector("#lobbyList").innerHTML = '<p class="text-center font-monospace">No players online.</p>';
            return;
        }

        // clear everything first
        document.querySelector('#lobbyList').innerHTML = "";

        // all players currently online - list of objects
        let SteamPlayerList = data.DataCache.Players.IDs.Steam;

        // console.log('Steam Players:')
        // for( const [sid, steam] of Object.entries(SteamPlayerList)) {
        //     console.log(`\t${steam.Nickname} (ID: ${sid})`)
        // };

        // all current games - array
        let GameList = data.Sessions;

        // iterate through each game
        GameList.forEach((game, index) => {

            // for each game, get all relevant data to build lobby card
            let currentLobbyID  = (index + 1);
            let gameName        = clean(game.Name);
            let uniqueGameID    = clean(game.Address.NAT);
            let netType         = clean(game.Address.NAT_TYPE);
            let playerCount     = game.PlayerCount.Player;
            let playerCountMax  = game.PlayerTypes[0].Max;
            let gameState       = clean(game.Status.State);
            let mapName         = game.Level.Name;
            let gameMod         = game.Game.Mod;

            // count vsr and non-vsr games
            if( gameMod === vsrModID ) {
                vsrGameCount = vsrGameCount + 1;
            }
            else if( gameMod !== vsrModID) {
                otherGameCount = otherGameCount + 1;
            }

            // if vsr-only is toggled, skip non-vsr games
            if( localStorage.getItem("ShowVSROnly") === "true" || document.querySelector("#VSRToggle").checked ) {
                if( gameMod !== vsrModID) {
                    return;
                }

            }

            let PlayerList = game.Players;

            // used to fill empty slots in player list, since we always show 10
            let emptyObj = {};
            emptyObj.Name = "Empty";

            let vacantObj = {};
            vacantObj.Name = "Open";

            // add open spots based on player max
            let total = (playerCountMax - PlayerList.length);
            for(let i = 0; i < total; i++){
                PlayerList.push(vacantObj);
            }

            // fill the rest with empty slots
            total = (10 - PlayerList.length);
            for(let i = 0; i < total; i++){
                PlayerList.push(emptyObj);
            }
           
            let LobbyList = document.querySelector('#lobbyList');

            // build the lobby cards
            LobbyList.insertAdjacentHTML(
                'beforeend',
                `
                <div class="col-12 col-xs-12 col-sm-9 col-lg-6 col-xxl-4 mb-3">
                    <div class="card">
                        <!-- Card Header -->
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span id="gameTitle">
                                <strong>Lobby ${currentLobbyID}</strong>
                            </span>
                            <span class="font-monospace">
                                <span class="btn btn-sm bg-purple">
                                    <span id="playerCount">${playerCount}</span>/<span id="playerMax">${playerCountMax}</span>
                                </span>
                                ${(() => {
                                    if( gameState === "PreGame") {
                                        return `<span id="gameState" class="btn btn-sm bg-secondary btn-vsr">In-Lobby</span>`
                                    }
                                    else if ( gameState === "InGame") {
                                        return `<span id="gameState" class="btn btn-sm btn-success btn-vsr">In-Game</span>`
                                    }
                                })()}
                            </span>
                        </div>
                        <!-- Card Body -->
                        <div class="container">
                            <div class="row player-list">
                                ${Object.keys(PlayerList).map(function (player) {
                                    // Open Spot
                                    if( PlayerList[player].Name === "Open") {
                                        return `<div class="col-6 player-slot player-slot-open p-2 font-monospace">
                                            <div class="d-block p-2 rounded border text-secondary ps-3 text-bg-secondary bg-opacity-10">
                                                <span class="text-nowrap overflow-hidden">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-fill mb-1" viewBox="0 0 16 16">
                                                    <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
                                                    </svg>
                                                    <span>
                                                        ${truncate(clean(PlayerList[player].Name), 24)}
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                        `
                                    }
                                    // Empty Player Slot
                                    else if( PlayerList[player].Name === "Empty") {
                                        return `<div class="col-6 player-slot p-2">
                                            <div class="d-block p-2 border border-secondary rounded text-secondary ps-3" style="--bs-text-opacity:0; --bs-border-opacity:0;">
                                                ${truncate(clean(PlayerList[player].Name), 24)}
                                            </div>
                                        </div>
                                        `
                                    }
                                    // List Players, include popover with Steam data, show "CMD" label if commander
                                    else if( (PlayerList[player].Team !== undefined) ) {
                                        return `<div class="col-6 player-slot p-2">
                                            <span tabindex="0" data-bs-toggle="popover" class="vsr-cursor-help font-monospace" data-bs-title="Steam Data" 
                                                data-bs-content="
                                                    ${getSteamMatch(SteamPlayerList, PlayerList[player])}
                                                ">
                                                <div class="d-block p-2 fw-bold bg-primary border border-dark bg-gradient bg-opacity-50 rounded ps-3 d-flex justify-content-between align-items-center" style="--bs-border-opacity: .25;">
                                                    <span class="text-nowrap overflow-hidden">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-fill mb-1 d-none d-lg-inline" viewBox="0 0 16 16">
                                                        <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
                                                        </svg>
                                                        <span>
                                                            ${truncate(clean(PlayerList[player].Name), 24)}
                                                        </span>
                                                    </span>
                                                    ${(() => {
                                                        if( PlayerList[player].Team.Leader === true) {
                                                            return `<span class="badge bg-secondary bg-opacity-50">CMD</span>`;
                                                        }
                                                        else return "";
                                                    })()}
                                                </div>
                                            </span>
                                        </div>
                                        `
                                    }
                                }).join("")}
                            </div>
                        </div>
                        <!-- Card Footer -->
                        <div class="card-footer d-flex justify-content-between align-items-center small">
                            <span id="gameName" class="font-monospace text-secondary">
                                ${truncate(gameName, 28)}
                            </span>
                            <span id="NATType" class="btn btn-sm btn-outline-secondary btn-vsr">
                                ${(() => {
                                    if( netType === "FULL CONE") {
                                        return `Full Cone`
                                    }
                                    else if( netType === "SYMMETRIC") {
                                        return `Symmetric`
                                    }
                                    else {
                                        return `N/A`
                                    }
                                })()}
                            </span>
                        </div>
                    </div>
                </div>
                `
            )
        });

        // initialize any popovers
        const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
        const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl, {
            html: true,
            trigger: "hover"
        }));

        // show alternative content if vsr is toggled and no vsr games found
        if( localStorage.getItem("ShowVSROnly") === "true" ) {
            if( vsrGameCount == 0 && otherGameCount !== 0) {
                document.querySelector("#lobbyList").innerHTML = '<p class="text-center font-monospace">No VSR games found.</p>';
            }
        }

    } catch(err) {
        console.log(`Catch Error: ${err}`);
    }
}

// Main Content
window.addEventListener('DOMContentLoaded', (event) => {

    getLobbyData();

    // allow user to turn on auto-refresh (not persistent)
    let LiveUpdateToggle = document.querySelector("#LiveUpdateToggle");

    LiveUpdateToggle.addEventListener('change', function () {
        if( this.checked ) {
            interval_id = setInterval(getLobbyData, 15000);
        }
        else {
            clearInterval(interval_id);
        }
    });

    // only show VSR mod games (persistent with localstorage)
    let VSRToggle = document.querySelector("#VSRToggle");

    VSRToggle.addEventListener('change', function () {
        if( this.checked ) {
            localStorage.setItem("ShowVSROnly", "true");
        }
        else {
            localStorage.setItem("ShowVSROnly", "false");
        }
        getLobbyData();
    });

});