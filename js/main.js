// used to cancel auto-updates
let interval_id = null;

// simple string truncation
const truncate = (str, len, end = "...") => {
    return str.length <= len ? str : str.substring(0, len) + end
}

// clean input strings; not a full-proof solution, but feukers will be feukers
function clean(str) { 
    const stripThatShit = str.replace(/<[^>]*>/g, '');
    const cleanThatShit = stripThatShit.replace(/\s+/g, ' ').trim();

    if( cleanThatShit === "" ) {
        return "Invalid Input"
    }

    return cleanThatShit;
}

async function getLobbyData() {
    console.log('Fetching data.');

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

        // clear everything first
        document.querySelector('#lobbyList').innerHTML = "";

        // all players currently online - list of objects
        let SteamPlayerList = data.DataCache.Players.IDs.Steam;

        for( const [sid, steam] of Object.entries(SteamPlayerList)) {
            // console.log("Steam ID: " + sid);
            // console.log("Steam Name: " + steam.Nickname);
            // console.log("-");
        };

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
            console.log(gameName+" "+gameMod);

            // only show vsr games
            if( gameMod !== "1325933293") {
                return;
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
                <div class="col-12 col-sm-6 col-xxl-4 mb-3 uid-${uniqueGameID}">
                    <div class="card">
                        <!-- Card Header -->
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span id="gameTitle">
                                <strong>Lobby ${currentLobbyID}</strong>
                            </span>
                            <span class="font-monospace">
                                <span class="btn btn-sm btn-primary">
                                    <span id="playerCount">${playerCount}</span>/<span id="playerMax">${playerCountMax}</span>
                                </span>
                                    ${(() => {
                                        if( gameState === "PreGame") {
                                            return `<span id="gameState" class="btn btn-sm btn-secondary btn-vsr">Lobby</span>`
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
                                        return `<div class="col-6 player-slot player-slot-open">
                                            <div class="d-block p-2">
                                                ${truncate(clean(PlayerList[player].Name), 24)}
                                            </div>
                                        </div>
                                        `
                                    }
                                    // Empty Player Slot
                                    else if( PlayerList[player].Name === "Empty") {
                                        return `<div class="col-6 player-slot text-secondary" style="--bs-text-opacity: 0">
                                            <div class="d-block p-2">
                                                ${truncate(clean(PlayerList[player].Name), 24)}
                                            </div>
                                        </div>
                                        `
                                    }
                                    // List Player as Commander
                                    else if( (PlayerList[player].Team !== undefined) && PlayerList[player].Team.Leader === true ) {
                                        return `<div class="col-6 player-slot d-flex justify-content-between align-items-center bg-primary bg-opacity-25">
                                            <div class="d-block p-2 fw-bold text-light">
                                                ${truncate(clean(PlayerList[player].Name), 24)}
                                            </div>
                                            <span class="badge text-bg-secondary">CMD</span>
                                        </div>
                                        `
                                    }
                                    // Normal Player Listing
                                    else {
                                        return `<div class="col-6 player-slot bg-primary bg-opacity-25">
                                            <div class="d-block p-2 fw-bold text-light">
                                                ${truncate(clean(PlayerList[player].Name), 24)}
                                            </div>
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
                            <span id="NATType" class="btn btn-sm btn-warning btn-vsr fw-bold">
                                ${(() => {
                                    if( netType === "FULL CONE") {
                                        return `Full Cone`
                                    }
                                    else if( netType === "SYMMETRIC") {
                                        return `Symmetric`
                                    }
                                })()}
                            </span>
                        </div>
                    </div>
                </div>
                `
            )
        });
    } catch(err) {
        console.log(`Catch Error: ${err}`);
    }
}

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
});