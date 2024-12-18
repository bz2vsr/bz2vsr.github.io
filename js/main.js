/*-------------------------------------------------*/
/*------------------ GLOBAL VARS ------------------*/
/*-------------------------------------------------*/

// used to cancel auto-updates
let interval_id = null;

// unique Steam Mod ID for Vet Strat Recycler mod
const vsrModID = "1325933293";

// base Steam Browser protocol URL for directly joining games
const baseSteamProtocol = 'steam://rungame/624970/76561198955218468/-connect-mp%20'

// used to prepend cors proxy url in ajax request url (for dev environement only)
// !!! IGNORE this line in Git commits (must be FALSE for production) !!!
const useCORSProxy = false;

// player list for better game identification - these are players most likely to be
// in a vsr community game; others who often join other lobbies are excluded to avoid
// potential duplicates
const ActivePlayerList = [
    'vtrider', // 76561197974548434
    'sev', // 76561199653748651
    'domakus', // 76561198006115793
    'cyber',
    'xohm', // 76561198846500539
    'herp mcderperson', // 76561197962996353
    'the best there is',
    // 'happyotter', // 76561198064801924
    'lamper', // 76561198825004088
    'graves', // 76561197970538803
    'econchump',
    'm.s',
    'vivify', // 76561198345909972
    'blue',
];

// refresh rate in milliseconds, for live updates
const REFRESH_RATE = 3000; 

/*-------------------------------------------------*/
/*------------------- REDIRECTS -------------------*/
/*-------------------------------------------------*/

// if URL has a join string, process that immediately
const joinString = new URLSearchParams(window.location.search).get('join');

if (joinString) {
    window.location.replace(baseSteamProtocol + joinString);
    window.location.href = "/";
}

// if URL has ?host=true, cast the Steam Host command and pass user to homepage
const hostString = new URLSearchParams(window.location.search).get('host');

if (hostString) {
    if (hostString.toLowerCase() === "true") {
        window.location.replace('steam://rungame/624970/76561198955218468/-hostname%20"bz2vsr"%20-nomovies');
    } else {
        alert("Invalid input. Use bz2vsr.com/?host=true if you are trying to host a game.");
    }
    window.location.href = "/";
}

/*-------------------------------------------------*/
/*------------------- FUNCTIONS -------------------*/
/*-------------------------------------------------*/

// simple string truncation
const truncate = (str, len, end = "...") => {
    return (str.length <= len ? str : str.substring(0, len) + end)
}

// convert single char into hexidecimal with 2 digit padding
function charToHex(char) {
    return char.toString(16).padStart(2, '0');
}

// convert ASCII string into hexidecimal
function stringToHex(str) {
    return Array.from(str).map(char => charToHex(char.charCodeAt(0))).join('');
}

// clean input strings; not a full-proof solution, but feukers will be feukers
function clean(str) 
{ 
    if(str === undefined) { return "Undefined"; }

    const strippedString = str.replace(/<[^>]*>/g, '');
    const cleaned = strippedString.replace(/\s+/g, ' ').trim();

    if(cleaned === "") { return "Invalid Input" }

    return cleaned;
}

// grabs 3 random maps when loading the Map Picker modal
async function getRandomMaps() {
    // Ensure we have at least 3 unique random indexes
    const indexes = new Set();
    while (indexes.size < 3) {
        indexes.add(Math.floor(Math.random() * VSRMapList.length));
    }

    const Maps = Array.from(indexes).map(index => VSRMapList[index]);

    const pickerModal = document.querySelector("#pickerModal");
    const spinner = pickerModal.querySelector(".spinner");
    const pickerContent = pickerModal.querySelector(".picker-content");

    if (spinner) {
        spinner.remove();
    }

    pickerContent.classList.remove("d-none");

    Maps.forEach((map, index) => {
        document.querySelector(`#pickerMapTitle-${index}`).textContent = map.Name;
        document.querySelector(`#pickerMapImage-${index}`).src = map.Image;
        document.querySelector(`#pickerMapPools-${index}`).textContent = map.Pools;
        document.querySelector(`#pickerMapSize-${index}`).textContent = map.Size;
        document.querySelector(`#pickerMapLoose-${index}`).textContent = map.Loose === -2 ? "INF" : (map.Loose === -1 ? "NA" : map.Loose);
    });
}

// main function to get game data and produce content based on that data
async function getLobbyData() 
{
    console.log('Fetching data.');

    // used to count VSR and Non-VSR games as we loop
    let vsrGameCount = 0;
    let otherGameCount = 0;

    let sourceURL = "https://multiplayersessionlist.iondriver.com/api/1.0/sessions?game=bigboat:battlezone_combat_commander";

    if (useCORSProxy) { 
        sourceURL = 'https://api.codetabs.com/v1/proxy/?quest=' + sourceURL; 
    }

    try {

        let fetchResponse = await fetch(sourceURL);
        // let fetchResponse = await fetch('/data/test/full-lobby-hidden.sample.json');
        // let fetchResponse = await fetch('/data/test/lobby-7-hidden.sample.json');
        // let fetchResponse = await fetch('/data/test/lobby-7.sample.json');
        // let fetchResponse = await fetch('/data/test/strat-test-.sample.json');

        if( !fetchResponse.ok ) {
            console.log(`Error with response. Make sure source and proxy URLs are accessible and returning valid data.`);
        }

        let data = await fetchResponse.json();

        // players must be present if games exist, therefore relevant objects being empty undefined means no players
        if( JSON.stringify(data.DataCache) === '{}' || ( data.DataCache.Players.IDs.Steam === undefined && data.DataCache.Players.IDs.GOG === undefined ) ) 
        {
            document.querySelector("#NavPlayerCount").innerHTML     = "0";
            document.querySelector("#NavGameCount").innerHTML       = "0";
            document.querySelector("#NavPlayerCountSm").innerHTML   = "0";
            document.querySelector("#NavGameCountSm").innerHTML     = "0";

            document.querySelector("#lobbyList").innerHTML = `
                <div class="d-flex justify-content-center mt-4">
                    <div class="text-center alert alert-primary px-5">No players online.</div>
                </div>
                `;

            if(document.title !== 'Battlezone II: Game Watch') {
                document.title = 'Battlezone II: Game Watch';
            }
            return;
        }

        // clears the spinner on first-load, otherwise clears all the lobby cards when live updates are active
        document.querySelector('#lobbyList').innerHTML = "";

        // get all steam and GOG accounts
        let SteamPlayerList = data.DataCache.Players.IDs.Steam;
        let GogPlayerList = data.DataCache.Players.IDs.Gog;

        // all current games, sorted by game name
        let GameList = data.Sessions;
        GameList.sort((a, b) => (b.Name < a.Name) ? 1 : -1);

        // show player and game counts in top navbar
        let OnlinePlayers = 0;

        if(SteamPlayerList) OnlinePlayers += Object.entries(SteamPlayerList).length;
        if(GogPlayerList) OnlinePlayers += Object.entries(GogPlayerList).length;

        document.querySelector("#NavPlayerCount").innerHTML = OnlinePlayers;
        document.querySelector("#NavGameCount").innerHTML = GameList.length;
        document.querySelector("#NavPlayerCountSm").innerHTML = OnlinePlayers;
        document.querySelector("#NavGameCountSm").innerHTML = GameList.length;

        // now check if any games have players from our active player list
        // if so, move that to the front. this is an attempt to ensure any 
        // vsr community games are always listed first. since occasionally 
        // active vets may be in more than one game, we focus on the game 
        // with the highest count of vets
        let hasActivePlayers = false;
        let maxActivePlayerCount = 0;
        let VetStratGameIndex = 0;
        let VetStratGame = {};

        console.log("-----------------------------------------------------");

        for(let i = 0; i < GameList.length; i++ ) 
        {
            let game = GameList[i];
            let Players = game.Players;
            let currentActivePlayerCount = 0;
            
            Players.forEach(function (player) 
            {
                if(player.IDs.Steam) {
                    PlayerSteamID = (player.IDs.Steam.ID).toString();

                    // use Steam IDs since those are less likely to change
                    for(const [SteamID, SteamData] of Object.entries(SteamPlayerList))
                    {
                        let SteamNick = (SteamData.Nickname).toString();

                        if((PlayerSteamID).toString() === SteamID.toString()) 
                        {
                            if(ActivePlayerList.includes(SteamNick.toLowerCase())) 
                            {
                                console.log('%cFound: ' + SteamNick, "color:#bada55;font-weight:700;");
                                hasActivePlayers = true;
                                currentActivePlayerCount += 1;
                            }
                        }
                    }
                }
            });

            if(currentActivePlayerCount > maxActivePlayerCount)
            {
                console.log("%cMarking \"" + game.Name + "\" as BZ2 Vet Strat",
                    "background-color:#bada55;color:#1c1e1e;padding:6px 8px;border-radius:6px;font-weight:bold;margin-top:4px;margin-bottom:4px;"
                );
                VetStratGameIndex = i;
                VetStratGame = game;
                maxActivePlayerCount = currentActivePlayerCount;
            }
            else if(currentActivePlayerCount > 0) 
            {
                console.log("%cGame has active players (" + currentActivePlayerCount + "), but not more than current max (" + maxActivePlayerCount + ")",
                    "color:#EDD711;font-weight:bold;"
                );
            }

            console.log("-----------------------------------------------------");
        }

        if(hasActivePlayers) {
            GameList.splice(VetStratGameIndex, 1);
            GameList.splice(0, 0, VetStratGame);
        }

        let Mods = data.Mods;

        // build a lobby card for each game
        GameList.forEach((game, index) => {

            // get all relevant data 
            let currentLobbyID  = (index + 1);
            let gameName        = clean(game.Name);
            let gameMode        = (game.Level.GameMode === undefined ? "N/A" : game.Level.GameMode.ID)
            let gameVersion     = game.Game.Version;
            let gameMod         = game.Game.Mod;
            let gameModName     = (gameMod !== undefined ? (Mods[gameMod] !== undefined ? Mods[gameMod].Name : "Unknown Mod") : "Stock");
            let gameTime        = (game.Time.Seconds/60);
            let gameMessage     = (game.Message !== undefined ? clean(game.Message): "No game message");
            let gameState       = clean(game.Status.State);
            let hasPassword     = game.Status.HasPassword;
            let isLocked        = game.Status.IsLocked;
            let netType         = clean(game.Address.NAT_TYPE);
            let playerCount     = game.PlayerCount.Player;
            let playerCountMax  = game.PlayerTypes[0].Max;
            let openSpotCount   = playerCountMax - playerCount;
            let mapName         = game.Level.Name;
            let mapImage        = game.Level.Image;
            let mapFileName     = (game.Level.MapFile).replace('.bzn', '');
            let isVetStrat      = hasActivePlayers && index === 0;
            let linkedPlayerCards   = localStorage.getItem("LinkedPlayerCards") === "true" ? true : false;

            // soft test of showing VSR map data for BZ2 Vet Strat game cards
            let mapVSRObject    = VSRMapList.find(map => map.File == mapFileName);

            // if vsr-only is toggled, this exits the current iteration if it isn't VSR
            if( localStorage.getItem("ShowVSROnly") === "true" || document.querySelector("#VSRToggle").checked ) {
                if( gameMod !== vsrModID) {
                    return;
                }
            }

            // attempt to grab direct join URL
            let hasJoinURL = false; 
            let directJoinURL = "#";
            let modList;
            let encodedArgs;
            
            // we need at least one valid game mod to create a join URL
            // we also ignore locked and password-protected games
            if( gameMod !== undefined && !hasPassword && !isLocked ) 
            { 
                hasJoinURL = true;

                if( game.Game.Mods !== undefined ) {
                    modList = `${gameMod};${(game.Game.Mods).join(";")}` ;
                }
                else {
                    modList = gameMod;
                }

                let steamProtocolArgs = [
                    "N",
                    game.Name.length.toString(),
                    clean(game.Name),
                    modList.length,
                    modList,
                    game.Address.NAT,
                    "0"
                ];

                let plainTextArgs = (steamProtocolArgs.join(",")) + ",";
                encodedArgs = stringToHex(plainTextArgs);

                directJoinURL = baseSteamProtocol + encodedArgs;

                // we use short.io API to generate a short URL based on game's NAT ID,
                // which ensures we only generate one join URL per game. also, since
                // this is asynchronous, I put player counts in the options object
                // to preserve the original values

                // replace funky chars in NAT ID with something more URL friendly
                shortIOPath = ((game.Address.NAT).replaceAll("@","A")).replaceAll("-","0").replaceAll("_","L");

                const options = {
                    method: 'POST',
                    headers: {
                        accept: 'application/json',
                        'content-type': 'application/json',
                        Authorization: 'pk_gj3EhDNijDovvGvU'
                    },
                    body: JSON.stringify({ 
                        domain: 'join.bz2vsr.com', 
                        originalURL: 'https://bz2vsr.com/?join=' + encodedArgs, 
                        path: shortIOPath
                    }),
                    playerCount: playerCount,
                    playerCountMax: playerCountMax
                };

                fetch('https://api.short.io/links/public', options)
                    .then(response => response.json())
                    .then(response => { 
                        document.querySelector(`button[data-join-string="${encodedArgs}"] textarea`).innerText = `${options.playerCount}/${options.playerCountMax} ${response.shortURL} @BZ2Player`;
                    })
                    .catch(err => console.error(err));
            }

            // increment our game mod counts
            if( gameMod === vsrModID ) {
                vsrGameCount = vsrGameCount + 1;
            }
            else if( gameMod !== vsrModID) {
                otherGameCount = otherGameCount + 1;
            }

            let PlayerList = game.Players;

            // host should always be first player in the list
            let gameHost = PlayerList[0].Name;

            if(hasActivePlayers && index === 0) {
                document.title = `${(gameState === "PreGame" ? "In-Lobby" : (gameState === "InGame" ? "In-Game": "N/A"))}: ${playerCount}/${playerCountMax} (Host: ${clean(gameHost)})`;
            }
            else if(!hasActivePlayers) {
                document.title = `Battlezone II: Game Watch`;
            }

            // since every card has 10 slots, we want to identify open spots (based on playerMax),
            // and fill anything beyond that with empty slots. this ensures we always end up with 
            // an array of size 10
            let emptyObj = {};
            emptyObj.Name = "Empty";

            let vacantObj = {};
            vacantObj.Name = "Open";

            let isFull = (PlayerList.length === 10 ? true : false);
            let Team1   = [emptyObj, emptyObj, emptyObj, emptyObj, emptyObj];
            let Team2   = [emptyObj, emptyObj, emptyObj, emptyObj, emptyObj];
            let Hidden  = [];


            if( gameMode === "STRAT" ) {

                for(let i = 0; i < PlayerList.length; i++) 
                {
                    let player = PlayerList[i];

                    if(player.Team) { 
                        let slot = player.Team.SubTeam.ID;

                        if(slot < 6) {
                            Team1[(slot-1)] = player;
                        }
                        else if(slot > 5 && slot < 11) {
                            Team2[(slot-6)] = player;
                        }
                    }
                    else {
                        Hidden.push(player);
                    }
                }
            }
            else {
                PlayerList = PlayerList.sort((a, b) => {
                    // sort by SubTeam.ID, with nulls (hidden players) at the end
                    if (a.Team === undefined) {
                        return 1;
                    }
                    if (b.Team === undefined) {
                        return -1;
                    }

                    return parseInt(a.Team.SubTeam.ID) < parseInt(b.Team.SubTeam.ID) ? -1 : 1;
                });

                // current # of players minus the player max gives the amount of open spots to add
                let total = (playerCountMax - PlayerList.length);
                for(let i = 0; i < total; i++){
                    PlayerList.push(vacantObj);
                }

                // mark the rest of the slots as simply empty
                total = (10 - PlayerList.length);
                for(let i = 0; i < total; i++){
                    PlayerList.push(emptyObj);
                }
            }
           
            let LobbyList = document.querySelector('#lobbyList');

            // we now have all the necessary data to produce a lobby card for the current game;
            // we use a rather large template literal string to embed data where we need it
            LobbyList.insertAdjacentHTML(
                'beforeend',
                `
                <div class="col-12 col-xs-12 col-xl-6 mb-3">
                    <div class="card h-100 border-secondary" style="--bs-border-opacity: .15;">
                        <!-- Card Header -->
                        <div class="card-header d-flex justify-content-between align-items-center bg-dark-subtle shadow-lg">
                            <span id="gameTitle">
                            ${(() => {
                                if( isVetStrat) {
                                    return `<span class="shiny-cta btn btn-sm btn-dead rounded">BZ2 Vet Strat</span>`
                                }
                                else {
                                    return `<strong>Game ${currentLobbyID}</strong>`
                                }
                            })()}
                            ${(() => {
                                if( isVetStrat && (playerCount < playerCountMax) ) {
                                    return `<span class="ms-2 btn btn-sm btn-outline-warning bg-warning-subtle btn-dead border-warning" style="--bs-border-opacity: .5 !important;">
                                        ${openSpotCount} Spot${openSpotCount === 1 ? "" : "s" } Open
                                    </span>`
                                }
                                else if( isVetStrat && (playerCount === playerCountMax)) {
                                    return `<span class="ms-2 btn btn-sm btn-outline-primary bg-primary-subtle btn-dead border-primary" style="--bs-border-opacity: .5 !important;">
                                        Full Lobby
                                    </span>`;
                                }
                                else return ``;
                            })()}
                            </span>
                            <span class="">
                                ${(() => {
                                    if( gameState === "PreGame") {
                                        return `<span id="gameState" class="btn btn-sm bg-secondary bg-gradient btn-dead">In-Lobby</span>`
                                    }
                                    else if ( gameState === "InGame") {
                                        return `<span id="gameState" class="btn btn-sm btn-success bg-gradient btn-dead">In-Game</span>`
                                    }
                                })()}
                                ${(() => {
                                    if( hasJoinURL ) {
                                        return `
                                        <span class="">
                                            <div class="btn-group">
                                                <a href="${directJoinURL}" class="d-none d-md-inline btn btn-sm btn-purple bg-gradient me-1" title="Join the game directly with Steam.">
                                                    Join
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-play-fill mb-1" viewBox="0 0 16 16">
                                                    <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/>
                                                    </svg>
                                                </a> 
                                                <button data-join-string='${encodedArgs}' class="btn btn-sm btn-purple bg-gradient btn-join-copy" title="Get a shareable link for Discord.">
                                                    <textarea class="visually-hidden"></textarea>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
                                                        <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
                                                        <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
                                                    </svg>
                                                </button>
                                            </div>
                                        </span>
                                        `
                                    }
                                    else { return `` }
                                })()}
                            </span>
                        </div>
                        <!-- Card Body -->
                        <div class="container-fluid h-100 pb-1">
                            <div class="row border-bottom">
                                <div class="col-3 p-1 border-0 border-end border-dotted text-center">
                                        <img width="250" length="250" src="${mapImage}" onError="this.src='/img/no_steam_pfp.jpg'" class="img-thumbnail"/>
                                        ${(() => {
                                            if( mapVSRObject && isVetStrat ) {
                                                return `
                                                <div class="alert alert-secondary small px-3 py-1 my-1 mx-0 mb-0 d-flex flex-wrap justify-content-between">
                                                    <span>
                                                        ${mapVSRObject.Pools} Pools 
                                                    </span>
                                                    <span>
                                                        ${mapVSRObject.Loose == -2 ? "INF" : mapVSRObject.Loose } Loose
                                                    </span>
                                                </div>`
                                            }
                                            else return ``;
                                        })()}
                                </div>
                                <div class="col-9 p-0 small">
                                    <ul class="list-group list-group-flush text-secondary">
                                        <li class="list-group-item d-flex justify-content-between align-items-center border-dotted">
                                            <strong class="text-muted">Map</strong>
                                            <span title="${mapFileName}">${mapName ? mapName : "N/A"}</span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center border-dotted">
                                            <strong class="text-muted">Mode</strong>
                                            <span>${gameMode}</span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center border-dotted">
                                            <strong class="text-muted">Time</strong>
                                            <span">${gameTime} mins</span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center border-dotted">
                                            <strong class="text-muted">Count</strong>
                                            <span">${playerCount} player${playerCount === 1 ? "" : "s"} / ${playerCountMax}</span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center border-dotted">
                                            <strong class="text-muted">Host</strong>
                                            <span class="text-secondary">${truncate(gameHost, 32)}
                                            ${(() => {
                                                for( const [SteamID, Steam] of Object.entries(SteamPlayerList)) 
                                                {
                                                    if( PlayerList[0].IDs !== undefined && PlayerList[0].IDs.Steam !== undefined )
                                                    {
                                                        if( (PlayerList[0].IDs.Steam.ID).toString() === SteamID.toString() )
                                                        {
                                                            // only show the host's steam name if it's different from in-game nick
                                                            if( gameHost != Steam.Nickname) {
                                                                return `(${Steam.Nickname})`;
                                                            }
                                                        }
                                                    }
                                                }
                                                return '';
                                            })()}
                                            </span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center border-dotted">
                                            <strong class="text-muted">Name</strong>
                                            <span class="text-secondary">${truncate(gameName, 32)}</span>
                                        </li>
                                        <li class="list-group-item border-dotted">
                                            <div class="row">
                                                <div class="col-3">
                                                </div>
                                                <div class="col-9 text-end">
                                                    <span class="text-secondary">${gameMessage}</span>
                                                </div>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div class="row player-list">
                                ${(() => {
                                    if( gameMode === "STRAT" ) {
                                        return `
                                        ${(() => {
                                            if (Hidden.length > 0) {
                                                return `
                                                <div class="col-12 p-2 py-0">
                                                    <div class="alert alert-danger mt-2 mb-0 d-flex align-items-center">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-exclamation-triangle-fill" viewBox="0 0 16 16">
                                                            <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5m.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2"/>
                                                        </svg>
                                                        <div class="ms-2">
                                                            <strong>Hidden:</strong> ${Hidden.map(function (player, index, array) { return clean(player.Name) }).join(', ')}
                                                        </div>
                                                    </div>
                                                </div>
                                                `;
                                            }
                                            else return ``;
                                        })()}
                                        <div class="col-12 col-md-6 p-2">
                                            <div class="card h-100 border-secondary-subtle">
                                                <div class="card-header text-center">
                                                    Team 1
                                                </div>
                                                <div class="card-body p-0">
                                                    <ul class="list-group list-group-flush py-1">
                                                    ${Team1.map(function (player) {
                                                        if( player.Name === "Open") {
                                                            return `<div class="col-12 player-slot player-slot-open p-2">
                                                                <div class="p-2 py-3 rounded border text-secondary ps-3 text-bg-secondary bg-opacity-10 d-flex align-items-center h-100">
                                                                    <span class="text-nowrap overflow-hidden align-middle">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-fill mb-1" viewBox="0 0 16 16">
                                                                        <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
                                                                        </svg>
                                                                        <span>
                                                                            ${truncate(clean(player.Name), 24)}
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            `
                                                        }
                                                        else {
                                                        // List Players - iterates through the Steam and GOG accounts lists to get this player's steam data
                                                        for( const [SteamID, Steam] of Object.entries(SteamPlayerList)) 
                                                        {
                                                            if( player.IDs !== undefined && player.IDs.Steam !== undefined )
                                                            {
                                                                if( (player.IDs.Steam.ID).toString() === SteamID.toString() )
                                                                {
                                                                    return ` ${ linkedPlayerCards ?  `<a href="${Steam.ProfileUrl}" class="text-decoration-none text-light linked-card">` : '' }
                                                                    <li class="list-group-item bg-secondary-subtle mx-2 my-1 rounded border">
                                                                        <div class="p-1 bg-secondary-subtle" style="--bs-border-opacity: .5;">
                                                                            <div class="row">
                                                                                <div class="col-4 col-lg-3 px-1">
                                                                                    <img src="${Steam.AvatarUrl}" onError="this.src='/img/no_steam_pfp.jpg'" class="img-fluid img-thumbnail rounded"/>
                                                                                </div>
                                                                                <div class="col-8 col-lg-9 text-nowrap overflow-hidden">
                                                                                        <div class="mb-1">
                                                                                            ${truncate(clean(player.Name), 24)}
                                                                                        </div>
                                                                                        <div class="mb-1">
                                                                                            ${ linkedPlayerCards 
                                                                                                ? `<span class="btn-steam btn-dead text-decoration-none btn btn-sm btn-primary text-bg-primary border border-primary" href="${Steam.ProfileUrl}" style="--bs-bg-opacity:.3;--bs-border-opacity:.3;">` 
                                                                                                : `<a target="_blank" class="btn-steam text-decoration-none btn btn-sm btn-primary text-bg-primary border border-primary" href="${Steam.ProfileUrl}" style="--bs-bg-opacity:.3;--bs-border-opacity:.3;">` }
                                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-steam pe-1" viewBox="0 0 16 16" style="margin-bottom:3px;">
                                                                                                <path d="M.329 10.333A8.01 8.01 0 0 0 7.99 16C12.414 16 16 12.418 16 8s-3.586-8-8.009-8A8.006 8.006 0 0 0 0 7.468l.003.006 4.304 1.769A2.2 2.2 0 0 1 5.62 8.88l1.96-2.844-.001-.04a3.046 3.046 0 0 1 3.042-3.043 3.046 3.046 0 0 1 3.042 3.043 3.047 3.047 0 0 1-3.111 3.044l-2.804 2a2.223 2.223 0 0 1-3.075 2.11 2.22 2.22 0 0 1-1.312-1.568L.33 10.333Z"/>
                                                                                                <path d="M4.868 12.683a1.715 1.715 0 0 0 1.318-3.165 1.7 1.7 0 0 0-1.263-.02l1.023.424a1.261 1.261 0 1 1-.97 2.33l-.99-.41a1.7 1.7 0 0 0 .882.84Zm3.726-6.687a2.03 2.03 0 0 0 2.027 2.029 2.03 2.03 0 0 0 2.027-2.029 2.03 2.03 0 0 0-2.027-2.027 2.03 2.03 0 0 0-2.027 2.027m2.03-1.527a1.524 1.524 0 1 1-.002 3.048 1.524 1.524 0 0 1 .002-3.048"/>
                                                                                                </svg> 
                                                                                                ${truncate(clean(Steam.Nickname), 24)}
                                                                                            ${ linkedPlayerCards ? '</span>' : `</a>` }
                                                                                        </div>
                                                                                        <div class="mb-1 d-lg-inline-block">
                                                                                        ${(() => {
                                                                                            if( player.Team !== undefined ) 
                                                                                            {
                                                                                                if( player.Team.Leader === true) 
                                                                                                {
                                                                                                    return `<strong class="badge rounded-1 text-bg-light">Command</strong>`;
                                                                                                }
                                                                                                else return ``;
                                                                                            }
                                                                                            else return `<strong class="badge rounded-1 text-bg-danger">Hidden</strong>`;
                                                                                        })()}
                                                                                        ${(() => {
                                                                                            if( player.Name === gameHost ) 
                                                                                            {
                                                                                                return `<strong class="badge rounded-1 text-bg-warning">Host</strong>`;
                                                                                            }
                                                                                            else return ``;
                                                                                        })()}
                                                                                        </div>
                                                                                        <div class="d-lg-inline-block">
                                                                                        ${(() => {
                                                                                            if (player.Stats !== undefined) 
                                                                                            {
                                                                                                return `<span class="badge text-bg-dark bg-dark-subtle rounded-1 border border-secondary" style="--bs-border-opacity:.5;">
                                                                                                    ${(player.Stats.Kills !== undefined ? player.Stats.Kills : "0")} 
                                                                                                    <span class="opacity-25">&nbsp;&nbsp;|&nbsp;&nbsp;</span> 
                                                                                                    ${(player.Stats.Deaths !== undefined ? player.Stats.Deaths : "0")}
                                                                                                    <span class="opacity-25">&nbsp;&nbsp;|&nbsp;&nbsp;</span> 
                                                                                                    ${(player.Stats.Score !== undefined ? player.Stats.Score : "0")} 
                                                                                                    </span>
                                                                                                `;
                                                                                            }
                                                                                            else return ``;
                                                                                        })()}
                                                                                        <div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </li>
                                                                    ${ linkedPlayerCards ? `</a>` : '' }
                                                                    `
                                                                }
                                                            }
                                                        }
                                                    }}).join('')}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-12 col-md-6 p-2">
                                            <div class="card h-100 border-secondary-subtle">
                                                <div class="card-header text-center">
                                                    Team 2
                                                </div>
                                                <div class="card-body p-0">
                                                    <ul class="list-group list-group-flush py-1">
                                                    ${Team2.map(function (player) {
                                                        if( player.Name === "Open") {
                                                            return `<div class="col-12 player-slot player-slot-open p-2">
                                                                <div class="p-2 py-3 rounded border text-secondary ps-3 text-bg-secondary bg-opacity-10 d-flex align-items-center h-100">
                                                                    <span class="text-nowrap overflow-hidden align-middle">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-person-fill mb-1" viewBox="0 0 16 16">
                                                                        <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
                                                                        </svg>
                                                                        <span>
                                                                            ${truncate(clean(player.Name), 24)}
                                                                        </span>
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            `
                                                        }
                                                        else {
                                                        // List Players - iterates through the Steam and GOG accounts lists to get this player's steam data
                                                        for( const [SteamID, Steam] of Object.entries(SteamPlayerList)) 
                                                        {
                                                            if( player.IDs !== undefined && player.IDs.Steam !== undefined )
                                                            {
                                                                if( (player.IDs.Steam.ID).toString() === SteamID.toString() )
                                                                {
                                                                    return ` ${ linkedPlayerCards ?  `<a href="${Steam.ProfileUrl}" class="text-decoration-none text-light linked-card">` : '' }
                                                                    <li class="list-group-item bg-secondary-subtle mx-2 my-1 rounded border">
                                                                        <div class="p-1 bg-secondary-subtle" style="--bs-border-opacity: .5;">
                                                                            <div class="row">
                                                                                <div class="col-4 col-lg-3 px-1">
                                                                                    <img src="${Steam.AvatarUrl}" onError="this.src='/img/no_steam_pfp.jpg'" class="img-fluid img-thumbnail rounded"/>
                                                                                </div>
                                                                                <div class="col-8 col-lg-9 text-nowrap overflow-hidden">
                                                                                        <div class="mb-1">
                                                                                            ${truncate(clean(player.Name), 24)}
                                                                                        </div>
                                                                                        <div class="mb-1">
                                                                                            ${ linkedPlayerCards 
                                                                                                ? `<span class="btn-steam btn-dead text-decoration-none btn btn-sm btn-primary text-bg-primary border border-primary" href="${Steam.ProfileUrl}" style="--bs-bg-opacity:.3;--bs-border-opacity:.3;">` 
                                                                                                : `<a target="_blank" class="btn-steam text-decoration-none btn btn-sm btn-primary text-bg-primary border border-primary" href="${Steam.ProfileUrl}" style="--bs-bg-opacity:.3;--bs-border-opacity:.3;">` }
                                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-steam pe-1" viewBox="0 0 16 16" style="margin-bottom:3px;">
                                                                                                <path d="M.329 10.333A8.01 8.01 0 0 0 7.99 16C12.414 16 16 12.418 16 8s-3.586-8-8.009-8A8.006 8.006 0 0 0 0 7.468l.003.006 4.304 1.769A2.2 2.2 0 0 1 5.62 8.88l1.96-2.844-.001-.04a3.046 3.046 0 0 1 3.042-3.043 3.046 3.046 0 0 1 3.042 3.043 3.047 3.047 0 0 1-3.111 3.044l-2.804 2a2.223 2.223 0 0 1-3.075 2.11 2.22 2.22 0 0 1-1.312-1.568L.33 10.333Z"/>
                                                                                                <path d="M4.868 12.683a1.715 1.715 0 0 0 1.318-3.165 1.7 1.7 0 0 0-1.263-.02l1.023.424a1.261 1.261 0 1 1-.97 2.33l-.99-.41a1.7 1.7 0 0 0 .882.84Zm3.726-6.687a2.03 2.03 0 0 0 2.027 2.029 2.03 2.03 0 0 0 2.027-2.029 2.03 2.03 0 0 0-2.027-2.027 2.03 2.03 0 0 0-2.027 2.027m2.03-1.527a1.524 1.524 0 1 1-.002 3.048 1.524 1.524 0 0 1 .002-3.048"/>
                                                                                                </svg> 
                                                                                                ${truncate(clean(Steam.Nickname), 24)}
                                                                                            ${ linkedPlayerCards ? '</span>' : `</a>` }
                                                                                        </div>
                                                                                        <div class="mb-1 d-lg-inline-block">
                                                                                        ${(() => {
                                                                                            if( player.Team !== undefined ) 
                                                                                            {
                                                                                                if( player.Team.Leader === true) 
                                                                                                {
                                                                                                    return `<strong class="badge rounded-1 text-bg-light">Command</strong>`;
                                                                                                }
                                                                                                else return ``;
                                                                                            }
                                                                                            else return `<strong class="badge rounded-1 text-bg-danger">Hidden</strong>`;
                                                                                        })()}
                                                                                        ${(() => {
                                                                                            if( player.Name === gameHost ) 
                                                                                            {
                                                                                                return `<strong class="badge rounded-1 text-bg-warning">Host</strong>`;
                                                                                            }
                                                                                            else return ``;
                                                                                        })()}
                                                                                        </div>
                                                                                        <div class="d-lg-inline-block">
                                                                                        ${(() => {
                                                                                            if (player.Stats !== undefined) 
                                                                                            {
                                                                                                return `<span class="badge text-bg-dark bg-dark-subtle rounded-1 border border-secondary" style="--bs-border-opacity:.5;">
                                                                                                    ${(player.Stats.Kills !== undefined ? player.Stats.Kills : "0")} 
                                                                                                    <span class="opacity-25">&nbsp;&nbsp;|&nbsp;&nbsp;</span> 
                                                                                                    ${(player.Stats.Deaths !== undefined ? player.Stats.Deaths : "0")}
                                                                                                    <span class="opacity-25">&nbsp;&nbsp;|&nbsp;&nbsp;</span> 
                                                                                                    ${(player.Stats.Score !== undefined ? player.Stats.Score : "0")} 
                                                                                                    </span>
                                                                                                `;
                                                                                            }
                                                                                            else return ``;
                                                                                        })()}
                                                                                        </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </li>
                                                                    ${ linkedPlayerCards ? `</a>` : '' }
                                                                    `
                                                                }
                                                            }
                                                        }
                                                    }}).join('')}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                        `
                                        // END OF VET STRAT MODE
                                    }
                                    else {
                                        return `
                                        ${Object.keys(PlayerList).map(function (player) {
                                            // Open Slot
                                            if( PlayerList[player].Name === "Open") {
                                                return `<div class="col-6 player-slot player-slot-open p-2 pb-0">
                                                    <div class="p-2 rounded border text-secondary ps-3 text-bg-secondary bg-opacity-10 d-flex align-items-center h-100">
                                                        <span class="text-nowrap overflow-hidden align-middle">
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
                                            // Empty Slot
                                            else if( PlayerList[player].Name === "Empty") {
                                                return `<div class="col-6 player-slot p-2 pb-0">
                                                    <div class="p-2 border border-secondary rounded text-secondary ps-3" style="--bs-text-opacity:0; --bs-border-opacity:0;">
                                                        ${truncate(clean(PlayerList[player].Name), 24)}
                                                    </div>
                                                </div>
                                                `
                                            }
                                            // List Player - iterates through the Steam and GOG accounts lists to get this player's steam data
                                            else {
                                                for( const [SteamID, Steam] of Object.entries(SteamPlayerList)) 
                                                {
                                                    if( PlayerList[player].IDs.Steam !== undefined )
                                                    {
                                                        if( (PlayerList[player].IDs.Steam.ID).toString() === SteamID.toString() ) 
                                                        {
                                                            return `
                                                            <div class="col-6 player-slot p-2 pb-0">
                                                            ${ linkedPlayerCards ?  `<a href="${Steam.ProfileUrl}" class="text-decoration-none text-light linked-card">` : '' }
                                                                <div class="p-2 bg-secondary-subtle border rounded ps-3 h-100" style="--bs-border-opacity: .5;">
                                                                    <div class="row">
                                                                        <div class="col-3 d-none d-lg-inline px-1">
                                                                            <img src="${Steam.AvatarUrl}" onError="this.src='/img/no_steam_pfp.jpg'" class="img-fluid img-thumbnail rounded"/>
                                                                        </div>
                                                                        <div class="col-12 col-md-9 text-nowrap overflow-hidden">
                                                                            <div class="mb-1">
                                                                                ${truncate(clean(PlayerList[player].Name), 24)}
                                                                            </div>
                                                                            <div class="mb-1">
                                                                                ${ linkedPlayerCards 
                                                                                    ? `<span class="btn-steam btn-dead text-decoration-none btn btn-sm btn-primary text-bg-primary border border-primary" href="${Steam.ProfileUrl}" style="--bs-bg-opacity:.3;--bs-border-opacity:.3;">` 
                                                                                    : `<a target="_blank" class="btn-steam text-decoration-none btn btn-sm btn-primary text-bg-primary border border-primary" href="${Steam.ProfileUrl}" style="--bs-bg-opacity:.3;--bs-border-opacity:.3;">` }
                                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-steam pe-1" viewBox="0 0 16 16" style="margin-bottom:3px;">
                                                                                    <path d="M.329 10.333A8.01 8.01 0 0 0 7.99 16C12.414 16 16 12.418 16 8s-3.586-8-8.009-8A8.006 8.006 0 0 0 0 7.468l.003.006 4.304 1.769A2.2 2.2 0 0 1 5.62 8.88l1.96-2.844-.001-.04a3.046 3.046 0 0 1 3.042-3.043 3.046 3.046 0 0 1 3.042 3.043 3.047 3.047 0 0 1-3.111 3.044l-2.804 2a2.223 2.223 0 0 1-3.075 2.11 2.22 2.22 0 0 1-1.312-1.568L.33 10.333Z"/>
                                                                                    <path d="M4.868 12.683a1.715 1.715 0 0 0 1.318-3.165 1.7 1.7 0 0 0-1.263-.02l1.023.424a1.261 1.261 0 1 1-.97 2.33l-.99-.41a1.7 1.7 0 0 0 .882.84Zm3.726-6.687a2.03 2.03 0 0 0 2.027 2.029 2.03 2.03 0 0 0 2.027-2.029 2.03 2.03 0 0 0-2.027-2.027 2.03 2.03 0 0 0-2.027 2.027m2.03-1.527a1.524 1.524 0 1 1-.002 3.048 1.524 1.524 0 0 1 .002-3.048"/>
                                                                                    </svg> 
                                                                                    ${truncate(clean(Steam.Nickname), 24)}
                                                                                ${ linkedPlayerCards ? '</span>' : `</a>` }
                                                                            </div>
                                                                            <div class="mb-1 d-lg-inline-block">
                                                                                ${(() => {
                                                                                    if( PlayerList[player].Team !== undefined ) 
                                                                                    {
                                                                                        if( PlayerList[player].Team.Leader === true) 
                                                                                        {
                                                                                            return `<strong class="badge rounded-1 text-bg-light">Command</strong>`;
                                                                                        }
                                                                                        else return ``;
                                                                                    }
                                                                                    else return `<strong class="badge rounded-1 text-bg-danger">Hidden</strong>`;
                                                                                })()}
                                                                                ${(() => {
                                                                                    if( PlayerList[player].Name === gameHost ) 
                                                                                    {
                                                                                        return `<strong class="badge rounded-1 text-bg-warning">Host</strong>`;
                                                                                    }
                                                                                    else return ``;
                                                                                })()}
                                                                            </div>
                                                                            <div class="d-lg-inline-block">
                                                                                ${(() => {
                                                                                    if (PlayerList[player].Stats !== undefined) 
                                                                                    {
                                                                                        return `<span class="badge text-bg-dark bg-dark-subtle rounded-1 border border-secondary" style="--bs-border-opacity:.5;">
                                                                                            ${(PlayerList[player].Stats.Kills !== undefined ? PlayerList[player].Stats.Kills : "0")} 
                                                                                            <span class="opacity-25">&nbsp;&nbsp;|&nbsp;&nbsp;</span> 
                                                                                            ${(PlayerList[player].Stats.Deaths !== undefined ? PlayerList[player].Stats.Deaths : "0")}
                                                                                            <span class="opacity-25">&nbsp;&nbsp;|&nbsp;&nbsp;</span> 
                                                                                            ${(PlayerList[player].Stats.Score !== undefined ? PlayerList[player].Stats.Score : "0")} 
                                                                                            </span>
                                                                                        `;
                                                                                    }
                                                                                    else return ``;
                                                                                })()}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ${ linkedPlayerCards ? `</a>` : '' }
                                                            </div>
                                                            `
                                                        }
                                                    }
                                                    else if( PlayerList[player].IDs.Gog !== undefined ) {
                                                        for( const [GogID, GOG] of Object.entries(GogPlayerList)) 
                                                        {
                                                            if( (PlayerList[player].IDs.Gog.ID).toString() === GogID.toString() ) 
                                                            {
                                                                return `<div class="col-6 player-slot p-2">
                                                                <a href="${GOG.ProfileUrl}" target="_blank" class="text-decoration-none text-light position-relative">
                                                                    <div class="p-2 bg-primary border border-dark bg-gradient bg-opacity-50 rounded ps-3 h-100" style="--bs-border-opacity: .25;">
                                                                        <div class="row">
                                                                            <div class="col-3 d-none d-lg-inline px-1">
                                                                                <img src="${GOG.AvatarUrl}" onError="this.src='/img/no_steam_pfp.jpg'" class="img-fluid img-thumbnail rounded"/>
                                                                            </div>
                                                                            <div class="col-12 col-md-9 text-nowrap overflow-hidden">
                                                                                    <div class="mb-1">
                                                                                        ${truncate(clean(PlayerList[player].Name), 24)}
                                                                                    </div>
                                                                                    <div class="mb-1">
                                                                                        <a target="_blank" class="btn-steam text-decoration-none btn btn-sm btn-warning bg-warning text-light border border-warning" href="${Steam.ProfileUrl}" style="--bs-bg-opacity:.3;--bs-border-opacity:.3;">
                                                                                            ${truncate(clean(Steam.Nickname), 24)}
                                                                                        </a><br>
                                                                                    </div>
                                                                                    <div class="mb-1 d-lg-inline-block">
                                                                                    ${(() => {
                                                                                        if( PlayerList[player].Team !== undefined ) 
                                                                                        {
                                                                                            if( PlayerList[player].Team.Leader === true) 
                                                                                            {
                                                                                                return `<strong class="badge rounded-1 text-bg-light bg-opacity-75">Command</strong>`;
                                                                                            }
                                                                                            else return "";
                                                                                        }
                                                                                        else return `<strong class="badge rounded-1 text-bg-danger bg-opacity-75">Hidden</strong>`;
                                                                                    })()}
                                                                                    ${(() => {
                                                                                        if( PlayerList[player].Name === gameHost ) 
                                                                                        {
                                                                                            return `<strong class="badge rounded-1 text-bg-warning bg-opacity-75">Host</strong>`;
                                                                                        }
                                                                                        else return ``;
                                                                                    })()}
                                                                                    </div>
                                                                                    <div class="d-lg-inline-block">
                                                                                    ${(() => {
                                                                                        if (PlayerList[player].Team !== undefined && PlayerList[player].Team.SubTeam !== undefined) 
                                                                                        {
                                                                                            if (parseInt(PlayerList[player].Team.SubTeam.ID) < 11) {
                                                                                                return `<strong class="badge text-bg-dark bg-opacity-50 position-absolute top-0 end-0 me-1 mt-1 d-none d-lg-inline-block">${PlayerList[player].Team.SubTeam.ID})</strong>`;
                                                                                            }
                                                                                            else return ``;
                                                                                        }
                                                                                        else return ``;
                                                                                    })()}
                                                                                    ${(() => {
                                                                                        if (PlayerList[player].Stats !== undefined) 
                                                                                        {
                                                                                            return `<span class="badge text-bg-dark bg-dark-subtle rounded-1 border border-secondary" style="--bs-border-opacity:.5;">
                                                                                                ${(PlayerList[player].Stats.Kills !== undefined ? PlayerList[player].Stats.Kills : "0")} 
                                                                                                <span class="opacity-25">&nbsp;&nbsp;|&nbsp;&nbsp;</span> 
                                                                                                ${(PlayerList[player].Stats.Deaths !== undefined ? PlayerList[player].Stats.Deaths : "0")}
                                                                                                <span class="opacity-25">&nbsp;&nbsp;|&nbsp;&nbsp;</span> 
                                                                                                ${(PlayerList[player].Stats.Score !== undefined ? PlayerList[player].Stats.Score : "0")} 
                                                                                                </span>`;
                                                                                        }
                                                                                        else return ``;
                                                                                    })()}
                                                                                    </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </a>
                                                                </div>
                                                                `
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }).join("")}
                                        `;
                                    }
                                })()}
                            </div>
                        </div>
                        <!-- Card Footer -->
                        <div class="card-footer d-flex justify-content-between align-items-center bg-dark-subtle">
                            <span class="text-secondary d-none d-lg-inline-block">${gameVersion}</span>
                            <a href="https://steamcommunity.com/sharedfiles/filedetails/?id=${gameMod}" target="_blank" class="link-secondary link-underline-dark border border-secondary ps-0" style="--bs-border-opacity: 0;">
                                ${gameModName}
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-link-45deg" viewBox="0 0 16 16">
                                <path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1 1 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4 4 0 0 1-.128-1.287z"/>
                                <path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243z"/>
                                </svg>
                            </a>
                            <div class="d-flex justify-content-end align-items-center">
                                ${(() => {
                                    // IIFEs need a return value, otherwise it returns undefined, thus the else statement
                                    if( isLocked === true) {
                                        return `<span class="btn btn-sm btn-outline-warning opacity-75 btn-dead ms-2">Locked</span>`
                                    }
                                    else return ``
                                })()}
                                ${(() => {
                                    if( hasPassword === true) {
                                        return `<span class="btn btn-sm btn-outline-danger opacity-75 btn-dead ms-2">Password</span>`
                                    }
                                    else return ``
                                })()}
                                <span id="NATType" class="btn btn-sm btn-outline-secondary btn-vsr btn-dead ms-2">
                                    ${(() => {
                                        // there are more values than just these two, but they are the most common
                                        if( netType === "FULL CONE") {
                                            return `Full Cone`
                                        }
                                        else if( netType === "SYMMETRIC") {
                                            return `Symmetric`
                                        }
                                        else return `N/A`
                                    })()}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                `
            )
            /* [END OF] Lobby Card template literal */
        });
        /* [END OF] Game Loop (GameList.foreach()) */

        // this shows a message if all of the following is true:
        //   1. "VSR Only" is toggled on 
        //   2. No VSR games exist
        //   3. Other non-VSR games exist
        if( localStorage.getItem("ShowVSROnly") === "true" || document.querySelector("#VSRToggle").checked === true) {
            if( vsrGameCount == 0) {
                document.querySelector("#lobbyList").innerHTML = `
                    <div class="d-flex justify-content-center mt-4">
                        <div class="text-center alert alert-primary px-5">No VSR games found.</div>
                    </div>
                    `;
            }
        }

        // copy button for shareable short.io URL; the actual url is built in the game loop above
        let joinBtns = document.querySelectorAll('.btn-join-copy');
        if( joinBtns !== null )
        {
            joinBtns.forEach(btn => {
                btn.addEventListener('click', () => {

                    joinStr = btn.querySelector('textarea');
                    joinStr.focus();
                    joinStr.select();

                    // officially deprecated, but...still works :P
                    document.execCommand("copy");

                    btn.classList.remove('btn-purple');
                    btn.classList.add('btn-success');
                    
                    // change clipboard icon to a checkmark
                    btn.innerHTML = `${joinStr.outerHTML}
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-lg" viewBox="0 0 16 16">
                        <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
                        </svg>
                    `;

                    window.location.replace('discord:///channels/1137584338310017098/1137619558639874129');

                    // return copy button to original state after a few seconds
                    setTimeout(function(){
                        btn.innerHTML = `${joinStr.outerHTML}
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
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

    } catch(err) {
        console.log(`${err.stack}: Catch Error: ${err}`);
    }
}

/*-------------------------------------------------*/
/*------------------ MAIN CONTENT -----------------*/
/*-------------------------------------------------*/

window.addEventListener('DOMContentLoaded', (event) => {

    // toggle the "VSR Only" switch based on localStorage value
    if( localStorage.getItem("ShowVSROnly") === "false" ) {
        document.querySelector("#VSRToggle").checked = false;
    }

    // toggle the "Live Updates" switch based on localStorage value
    if( localStorage.getItem("LiveUpdatesOn") === "false" ) {
        document.querySelector("#LiveUpdateToggle").checked = false;
    }

    // toggle the "Linked Cards" switch based on localStorage value
    if( localStorage.getItem("LinkedPlayerCards") === "true" ) {
        document.querySelector("#LinkedCardsToggle").checked = true;
    }

    // run main data grab on interval if necessary, otherwise run once
    if( localStorage.getItem("LiveUpdatesOn") == "true" || document.querySelector("#LiveUpdateToggle").checked ) {
        document.querySelector("#liveIndicator").classList.remove("d-none");
        getLobbyData();
        interval_id = setInterval(getLobbyData, REFRESH_RATE);
    }
    else {
        getLobbyData();
    }

    // allow user to toggle auto-refresh 
    let LiveUpdateToggle = document.querySelector("#LiveUpdateToggle");
    LiveUpdateToggle.addEventListener('change', function () {
        if( this.checked ) {
            document.querySelector("#liveIndicator").classList.remove("d-none");
            localStorage.setItem("LiveUpdatesOn", "true");
            interval_id = setInterval(getLobbyData, REFRESH_RATE);
        }
        else {
            localStorage.setItem("LiveUpdatesOn", "false");
            clearInterval(interval_id);
            document.querySelector("#liveIndicator").classList.add("d-none");
        }
    });

    // allow user to toggle VSR mod games only
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

    // allow users to restore old format with linked player cards
    let LinkedCardsToggle = document.querySelector("#LinkedCardsToggle");
    LinkedCardsToggle.addEventListener('change', function () {
        if( this.checked ) {
            localStorage.setItem("LinkedPlayerCards", "true");
        }
        else {
            localStorage.setItem("LinkedPlayerCards", "false");
        }
        getLobbyData();
    });

    // let ctrl + shift + X be shortcut to open host modal
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey && event.shiftKey && event.key === 'X') {
            document.querySelector("#hostButton").click();
        }
    });

    // auto focus on enter button in host modal 
    document.querySelector("#hostModal").addEventListener("shown.bs.modal", function(event)
    {
        document.querySelector("#modalHostButton").focus({focusVisible:true});
    });

    // when host modal opens, allow user to immediately start typing without having to click on the input for focus
    document.querySelector("#hostModal").addEventListener("shown.bs.modal", function(event)
    {
        document.querySelector("#modalHostButton").focus({focusVisible:true});
    });

    // pick random maps when map picker modal loads
    document.querySelector("#pickerModal").addEventListener("show.bs.modal", function(event)
    {
        getRandomMaps();
    });

    // [re]pick random maps when the shuffle button is clicked on map picker modal
    document.querySelector("#pickerButton").addEventListener("click", function(event)
    {
        getRandomMaps();
    });
});