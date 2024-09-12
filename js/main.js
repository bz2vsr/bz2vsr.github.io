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
    'vtrider',
    'sev',
    'domakus',
    'cyber',
    'f9bomber',
    'xohm',
    'herp mcderperson',
    'the best there is',
];

/*-------------------------------------------------*/
/*------------------- REDIRECTS -------------------*/
/*-------------------------------------------------*/

// if URL has a join string, process that immediately
const joinString = new URLSearchParams(window.location.search).get('join');

if( joinString !== undefined && joinString !== null ) {
    window.location.replace(baseSteamProtocol + joinString);
    window.location.href = "/";
}

/*-------------------------------------------------*/
/*------------------- FUNCTIONS -------------------*/
/*-------------------------------------------------*/

// simple string truncation
const truncate = (str, len, end = "...") => {
    return str.length <= len ? str : str.substring(0, len) + end
}

// convert single char into hexidecimal with 2 digit padding
function charToHex(char) {
    var hex = char.toString(16);

    if ((hex.length % 2) > 0) {
        hex = "0" + hex;
    }

    return hex;
}

// convert ASCII string into hexidecimal
function stringToHex(str)
{
    var hexString = "";

    for ( var i = 0; i < str.length; i++ ) {
        hexString = hexString + charToHex(str.charCodeAt(i));
    }

    return hexString;
}

// clean input strings; not a full-proof solution, but feukers will be feukers
function clean(str) 
{ 
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

// grabs 3 random maps when loading the Map Picker modal
async function getRandomMaps() 
{
    // get three random unique indexes in our map list array
    let indexes = [];

    for(let i = 0; i < 3; i++) {
        let randomIndex = Math.floor(Math.random() * MapListFull.length);

        if(!indexes.includes(randomIndex)) 
        {
            indexes.push(randomIndex);
        }
    }

    // build URLs based on selected maps
    proxyURL = 'https://api.codetabs.com/v1/proxy/?quest=';

    let url_0 = proxyURL + encodeURIComponent(`https://gamelistassets.iondriver.com/bzcc/getdata.php?mod=${vsrModID}&map=${MapListFull[indexes[0]]}`);
    let url_1 = proxyURL + encodeURIComponent(`https://gamelistassets.iondriver.com/bzcc/getdata.php?mod=${vsrModID}&map=${MapListFull[indexes[1]]}`)
    let url_2 = proxyURL + encodeURIComponent(`https://gamelistassets.iondriver.com/bzcc/getdata.php?mod=${vsrModID}&map=${MapListFull[indexes[2]]}`)

    // grab Map #1
    fetch(url_0)
        .then(response => response.json())
        .then(response => { 
            // only remove the main spinner if it still exists, as the first 
            // completed request of the three we do here will remove it
            if(document.querySelector("#pickerModal .spinner") !== null) 
            {
                document.querySelector("#pickerModal .spinner").remove();
            }

            document.querySelector("#pickerModal .picker-content").classList.remove("d-none");
            document.querySelector("#pickerMapTitle-0").innerHTML = response.title;
            document.querySelector("#pickerMapImage-0").src = "https://gamelistassets.iondriver.com/bzcc/" + response.image;
        })
        .catch(err => console.error(err));

    // grab Map #2
    fetch(url_1)
        .then(response => response.json())
        .then(response => { 
            if(document.querySelector("#pickerModal .spinner") !== null) 
            {
                document.querySelector("#pickerModal .spinner").remove();
            }

            document.querySelector("#pickerModal .picker-content").classList.remove("d-none");
            document.querySelector("#pickerMapTitle-1").innerHTML = response.title;
            document.querySelector("#pickerMapImage-1").src = "https://gamelistassets.iondriver.com/bzcc/" + response.image;
        })
        .catch(err => console.error(err));

    // grab Map #3
    fetch(url_2)
        .then(response => response.json())
        .then(response => { 
            if(document.querySelector("#pickerModal .spinner") !== null) 
            {
                document.querySelector("#pickerModal .spinner").remove();
            }

            document.querySelector("#pickerModal .picker-content").classList.remove("d-none");
            document.querySelector("#pickerMapTitle-2").innerHTML = response.title;
            document.querySelector("#pickerMapImage-2").src = "https://gamelistassets.iondriver.com/bzcc/" + response.image;
        })
        .catch(err => console.error(err));
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

        if( !fetchResponse.ok ) {
            console.log(`Error with response. Make sure source and proxy URLs are accessible and returning valid data.`);
        }

        let data = await fetchResponse.json();

        // steam players must be present if games exist, therefore this object being undefined means no players
        if( data.DataCache.Players === undefined ) {
            document.querySelector("#lobbyList").innerHTML = '<p class="text-center ">No players online.<br><br>Expecting to see games here and/or suspect an error?<br><br>Please send a snapshot of the <a href="http://battlezone99mp.webdev.rebellion.co.uk/lobbyServer" target="_blank">raw data</a> to Sev on Discord for troubleshooting, including the time and timezone.';
            return;
        }

        // clears the spinner on first-load, otherwise clears all the lobby cards when live updates are active
        document.querySelector('#lobbyList').innerHTML = "";

        // get all steam accounts
        let SteamPlayerList = data.DataCache.Players.IDs.Steam;

        // all current games, sorted by game name
        let GameList = data.Sessions;
        GameList.sort((a, b) => (b.Name < a.Name) ? 1 : -1);

        // first, move any VSR games to front of the list
        for(let i = 0; i < GameList.length; i++ ) 
        {
            let gName = GameList[i].Name;

            if((GameList[i].Name.toLowerCase()).includes('vsr') || GameList[i].Game.Mod === vsrModID ) 
            {
                let g = GameList[i];
                GameList.splice(i, 1);
                GameList.splice(0, 0, g);
            }
        }

        // now check if any games have players from our active player list
        // if so, move that to the front. this is an attempt to ensure any 
        // vsr community games are always listed first. since occasionally 
        // active vets may be in more than one game, we focus on the game 
        // with the highest count of vets
        let hasActivePlayers = false;
        let maxActivePlayerCount = 0;
        let VetStratGameIndex = 0;
        let VetStratGame = {};

        for(let i = 0; i < GameList.length; i++ ) 
        {
            let game = GameList[i];
            let Players = game.Players;
            let currentActivePlayerCount = 0;

            Players.forEach(function (player) 
            {
                PlayerSteamID = (player.IDs.Steam.ID).toString();

                // use Steam IDs since those are less likely to change
                for(const [SteamID, SteamData] of Object.entries(SteamPlayerList))
                {
                    let SteamNick = (SteamData.Nickname).toString();

                    if((PlayerSteamID).toString() === SteamID.toString()) 
                    {
                        if(ActivePlayerList.includes(SteamNick.toLowerCase())) 
                        {
                            hasActivePlayers = true;
                            currentActivePlayerCount += 1;
                        }
                    }
                }
            });

            if(currentActivePlayerCount > maxActivePlayerCount)
            {
                VetStratGameIndex = i;
                VetStratGame = game;
            }
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
            let gameMode        = game.Level.GameMode.ID;
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
            let mapName         = game.Level.Name;
            let mapFileName     = game.Level.MapFile;
            let mapImage        = game.Level.Image;

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
                shortIOPath = ((game.Address.NAT).replaceAll("@","A")).replaceAll("-","0");

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
            let gameHost = game.Players[0].Name;

            // since every card has 10 slots, we want to identify open spots (based on playerMax),
            // and fill anything beyond that with empty slots. this ensures we always end up with 
            // an array of size 10
            let emptyObj = {};
            emptyObj.Name = "Empty";

            let vacantObj = {};
            vacantObj.Name = "Open";

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
                                <strong>Game ${currentLobbyID}</strong>
                                ${(() => {
                                    // immediately-invoked function expressions allow us to return content based on target value
                                    if( hasActivePlayers && index === 0) {
                                        return `<span id="gameState" class="ms-2 shiny-cta btn btn-sm btn-dead px-3 rounded">BZ2 Vet Strats</span>`
                                    }
                                    else {
                                        return ``
                                    }
                                })()}
                            </span>
                            <span class="">
                                <span class="btn btn-sm bg-dark btn-dead border">
                                    <span id="playerCount">${playerCount}</span>/<span id="playerMax">${playerCountMax}</span>
                                </span>
                                ${(() => {
                                    // immediately-invoked function expressions allow us to return content based on target value
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
                                        <span class="d-none d-lg-inline">
                                            <div class="btn-group">
                                                <a href="${directJoinURL}" class="btn btn-sm btn-purple bg-gradient me-1" title="Join the game directly with Steam.">
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
                        <div class="container h-100 pb-1">
                            <div class="row border-bottom">
                                <div class="col-3 p-1 border-0 border-end border-dotted text-center">
                                    <img width="250" length="250" src="${mapImage}" onError="this.src='/img/no_steam_pfp.jpg'" style="filter:brightness(1.5)" class="img-thumbnail"/>
                                </div>
                                <div class="col-9 p-0 small">
                                    <ul class="list-group list-group-flush text-secondary">
                                        <li class="list-group-item d-flex justify-content-between align-items-center border-dotted">
                                            <strong class="text-muted">Map</strong>
                                            <span title="${mapFileName}">${mapName}</span>
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
                                            <strong class="text-muted">Name</strong>
                                            <span class="text-secondary">${truncate(gameName, 32)}</span>
                                        </li>
                                        <li class="list-group-item border-dotted">
                                            <div class="row">
                                                <div class="col-3">
                                                </div>
                                                <div class="col-9 text-end">
                                                    <span class="text-secondary">${truncate(gameMessage, 100)}</span>
                                                </div>
                                            </div>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                            <div class="row player-list">
                                ${Object.keys(PlayerList).map(function (player) {
                                    // we are now iterating through the 10-element array we built earlier
                                    // Open Slot
                                    if( PlayerList[player].Name === "Open") {
                                        return `<div class="col-6 player-slot player-slot-open p-2">
                                            <div class="d-block p-2 rounded border text-secondary ps-3 text-bg-secondary bg-opacity-10 d-flex align-items-center h-100">
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
                                        return `<div class="col-6 player-slot p-2">
                                            <div class="d-block p-2 border border-secondary rounded text-secondary ps-3" style="--bs-text-opacity:0; --bs-border-opacity:0;">
                                                ${truncate(clean(PlayerList[player].Name), 24)}
                                            </div>
                                        </div>
                                        `
                                    }
                                    // List Player - iterates through the Steam account list to get this player's steam data
                                    else {
                                        for( const [SteamID, Steam] of Object.entries(SteamPlayerList)) 
                                        {
                                            if( (PlayerList[player].IDs.Steam.ID).toString() === SteamID.toString() ) 
                                            {
                                                return `<div class="col-6 player-slot p-2">
                                                <a href="${Steam.ProfileUrl}" target="_blank" class="text-decoration-none text-light position-relative">
                                                    <div class="d-block p-2 bg-primary border border-dark bg-gradient bg-opacity-50 rounded ps-3 h-100" style="--bs-border-opacity: .25;">
                                                        <div class="row">
                                                            <div class="col-3 d-none d-lg-inline">
                                                                <img src="${Steam.AvatarUrl}" width="150" height="150" onError="this.src='/img/no_steam_pfp.jpg'" class="img-fluid img-thumbnail rounded"/>
                                                            </div>
                                                            <div class="col-9 text-nowrap overflow-hidden">
                                                                <span class="">
                                                                    <div class="mb-1">
                                                                        ${truncate(clean(PlayerList[player].Name), 24)}<br>
                                                                        S<span class="d-none d-lg-inline">team</span>: ${truncate(clean(Steam.Nickname), 24)}<br>
                                                                    </div>
                                                                    ${(() => {
                                                                        if( PlayerList[player].Team !== undefined ) {
                                                                            if( PlayerList[player].Team.Leader === true) {
                                                                                return `<strong class="badge text-bg-light bg-opacity-75">Command</strong>`;
                                                                            }
                                                                            else return "";
                                                                        }
                                                                        // I believe this returns undefined if user is hidden, but still need to test
                                                                        else return `<strong class="badge text-bg-danger bg-opacity-75">Hidden</strong>`;
                                                                    })()}
                                                                    ${(() => {
                                                                        if( PlayerList[player].Name === gameHost ) {
                                                                            return `<strong class="badge text-bg-warning bg-opacity-75">Host</strong>`;
                                                                        }
                                                                        else return "";
                                                                    })()}
                                                                    <span class="d-inline d-sm-none"><br></span>
                                                                    ${(() => {
                                                                        if (PlayerList[player].Team !== undefined && PlayerList[player].Team.SubTeam !== undefined) {
                                                                            if (parseInt(PlayerList[player].Team.SubTeam.ID) < 6) {
                                                                                return `<strong class="badge text-bg-dark bg-opacity-50 position-absolute top-0 end-0 me-1 mt-1 d-none d-lg-inline-block">1</strong>`;
                                                                            }
                                                                            else {
                                                                                return ``;
                                                                            }
                                                                        }
                                                                    })()}
                                                                    ${(() => {
                                                                        if (PlayerList[player].Stats !== undefined) {
                                                                            return `<span class="badge text-bg-light">${(PlayerList[player].Stats.Kills !== undefined ? PlayerList[player].Stats.Kills : "0")} <span class="opacity-25">|</span> ${(PlayerList[player].Stats.Deaths !== undefined ? PlayerList[player].Stats.Deaths : "0")}  <span class="opacity-25">|</span> ${(PlayerList[player].Stats.Score !== undefined ? PlayerList[player].Stats.Score : "0")} </span>`;
                                                                        }
                                                                        else {
                                                                            return ``;
                                                                        }
                                                                    })()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </a>
                                                </div>
                                                `
                                            }
                                        }
                                    }
                                }).join("")}
                            </div>
                        </div>
                        <!-- Card Footer -->
                        <div class="card-footer d-flex justify-content-between align-items-center bg-dark-subtle">
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
        if( localStorage.getItem("ShowVSROnly") === "true" ) {
            if( vsrGameCount == 0 && otherGameCount !== 0) {
                document.querySelector("#lobbyList").innerHTML = '<p class="text-center ">No VSR games found.</p>';
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
                    btn.innerHTML = `
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-lg" viewBox="0 0 16 16">
                        <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
                        </svg>
                    `;

                    // return copy button to original state after a few seconds
                    setTimeout(function(){
                        btn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
                                <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1z"/>
                                <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0z"/>
                            </svg>
                        `;
                        btn.classList.remove('btn-success');
                        btn.classList.add('btn-purple');
                    }, 5000);
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

    // run main data grab on interval if necessary, otherwise run once
    if( localStorage.getItem("LiveUpdatesOn") == "true" || document.querySelector("#LiveUpdateToggle").checked ) {
        getLobbyData();
        interval_id = setInterval(getLobbyData, 5000);
    }
    else {
        getLobbyData();
    }

    // allow user to toggle auto-refresh 
    let LiveUpdateToggle = document.querySelector("#LiveUpdateToggle");
    LiveUpdateToggle.addEventListener('change', function () {
        if( this.checked ) {
            localStorage.setItem("LiveUpdatesOn", "true");
            interval_id = setInterval(getLobbyData, 5000);
        }
        else {
            localStorage.setItem("LiveUpdatesOn", "false");
            clearInterval(interval_id);
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

    document.querySelector("#pickerModal").addEventListener("show.bs.modal", function(event)
    {
        getRandomMaps();
    });

    // load random map(s) when opening the map picker, pulls from /data/maps/map_lists.js)
    document.querySelector("#pickerButton").addEventListener("click", function(event)
    {
        getRandomMaps();
    });

});