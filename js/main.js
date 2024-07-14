async function getLobbyData() {
    // Requesting data directly gets blocked by CORS policy, so we use klugey CORS Proxy workaround
    const sourceURL = "http://multiplayersessionlist.iondriver.com/api/1.0/sessions?game=bigboat:battlezone_combat_commander";
    const proxyURL = 'https://api.codetabs.com/v1/proxy/?quest=' + sourceURL;

    try {
        document.querySelector('#lobbyList').innerHTML = "";
        let fetchResponse = await fetch(proxyURL);
        // let fetchResponse = await fetch('/js/data.sample.json');

        if( !fetchResponse.ok ) {
            console.log(`Error with response. Make sure source and proxy URLs are accessible and returning valid data.`);
        }

        let data = await fetchResponse.json();

        // all players currently online - list of objects
        let SteamPlayerList = data.DataCache.Players.IDs.Steam;

        for( const [sid, steam] of Object.entries(SteamPlayerList)) {
            // console.log("---");
            // console.log("\tSteam ID: " + sid);
            // console.log("\tSteam Name: " + steam.Nickname);
            // console.log("---");
        };

        // all current games - array
        let GameList = data.Sessions;

        // iterate through each game
        GameList.forEach((game, index) => {
            // for each game, get all relevant data to build lobby card
            let currentLobbyID = (index + 1);
            let gameName = game.Name;
            let uniqueGameID = game.Address.NAT;
            let netType = game.Address.NAT_TYPE;
            let playerCount = game.PlayerCount.Player;
            let playerCountMax = game.PlayerTypes[0].Max;
            let gameState = game.Status.State;
            let mapName = game.Level.Name;

            let PlayerList = game.Players;

            let emptyObj = {};
            emptyObj.Name = "Empty";

            let total=(10-PlayerList.length);
            for(let i = 0; i < total; i++){
                PlayerList.push(emptyObj);
            }
           
            let LobbyList = document.querySelector('#lobbyList');
            LobbyList.insertAdjacentHTML(
                'beforeend',
                `
                <div class="col-12 col-sm-6 col-xxl-4 mb-3 uid-${uniqueGameID}">
                    <div class="card">
                        <!-- Card Header -->
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <strong id="gameTitle">
                                Lobby ${currentLobbyID}
                            </strong>
                            <span class="small fw-normal text-secondary border px-2 rounded">${gameName}</span>
                            <span class="font-monospace">
                                <span class="badge text-bg-primary">
                                    <span id="playerCount">${playerCount}</span>/<span id="playerMax">${playerCountMax}</span>
                                </span>
                                    ${(() => {
                                        if( gameState === "PreGame") {
                                            return `<span id="gameState" class="badge text-bg-secondary">Lobby</span>`
                                        }
                                        else if ( gameState === "InGame") {
                                            return `<span id="gameState" class="badge text-bg-success">In-Game</span>`
                                        }
                                    })()}
                            </span>
                        </div>
                        <!-- Card Body -->
                        <div class="container">
                            <div class="row player-list">
                                ${Object.keys(PlayerList).map(function (player) {
                                    if( PlayerList[player].Name === "Empty") {
                                        return `<div class="col-6 player-slot player-slot-empty">
                                            <div class="d-block p-2">
                                                ${PlayerList[player].Name}
                                            </div>
                                        </div>
                                        `
                                    }
                                    else if( PlayerList[player].Team.Leader === true ) {
                                        return `<div class="col-6 player-slot d-flex justify-content-between align-items-center">
                                            <div class="d-block p-2">
                                                ${PlayerList[player].Name}
                                            </div>
                                            <span class="badge text-bg-secondary">CMD</span>
                                        </div>
                                        `
                                    }
                                    else {
                                        return `<div class="col-6 player-slot">
                                                <div class="d-block p-2 fw-bold text-light">
                                                    ${PlayerList[player].Name}
                                                </div>
                                            </div>
                                        `
                                    }
                                }).join("")}
                            </div>
                        </div>
                        <!-- Card Footer -->
                        <div class="card-footer d-flex justify-content-between align-items-center font-monospace">
                            <strong id="mapName">
                                ${mapName}
                            </strong>
                            <span id="NATType" class="badge text-bg-warning">
                                ${netType}
                            </span>
                        </div>
                    </div>
                </div>
                `
            )
        });



    } catch {
        console.log(`Catch Error: Make sure source and proxy URLs are accessible and returning valid data.`);
    }
}
window.addEventListener('DOMContentLoaded', (event) => {
    getLobbyData();
    interval_id = setInterval(getLobbyData, 15000);
});