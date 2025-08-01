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
const useCORSProxy = true;

// player list for better game identification - these are players most likely to be
// in a vsr community game; others who often join other lobbies are excluded to avoid
// potential duplicates
const ActivePlayerList = [
    "76561198006115793",  // Domakus
    "76561198846500539",  // Xohm
    "76561198824607769",  // Cyber
    "herpmcderperson",    // Herp
    "76561198043392032",  // blue_banana
    "76561198076339639",  // Sly
    "76561198820311491",  // m.s 
    "76561197974548434",  // VTrider
    "76561198068133931",  // Econchump
    "76561198825004088",  // Lamper
    "76561198026325621",  // F9Bomber
    "76561197970538803",  // Graves
    // "76561198088036138",  // dd
    // "76561198058690608",  // JudgeGuns
    // "76561199732480793",  // XPi
    // "76561198088149233",  // Muffin
    // "76561198064801924",  // HappyOtter
    // "76561198045619216",  // Zack
    // "76561198345909972",  // Vivify
    // "76561199653748651",  // Sev
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

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
function getRandomMaps() {
    fetch('/data/maps/vsrmaplist.json')
        .then(response => response.json())
        .then(MapData => {
            // Ensure we have at least 3 unique random indexes
            const indexes = new Set();
            while (indexes.size < 3) {
                indexes.add(Math.floor(Math.random() * MapData.length));
            }

            const Maps = Array.from(indexes).map(index => MapData[index]);

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
                document.querySelector(`#pickerMapSize-${index}`).textContent = map.Size.baseToBase;
                document.querySelector(`#pickerMapLoose-${index}`).textContent = map.Loose === -2 ? "INF" : (map.Loose === -1 ? "NA" : map.Loose);
            });
        })
        .catch(error => console.error('Error loading MapData: ', error));

}

// Add this function to handle context menu for player cards
function setupPlayerCardContextMenu() {
    // Create context menu element if it doesn't exist
    if (!document.getElementById('playerContextMenu')) {
        const contextMenu = document.createElement('div');
        contextMenu.id = 'playerContextMenu';
        contextMenu.className = 'dropdown-menu shadow';
        contextMenu.setAttribute('role', 'menu');
        contextMenu.style.position = 'fixed';
        contextMenu.style.zIndex = '1000';
        contextMenu.style.display = 'none';
        
        // Add menu items
        contextMenu.innerHTML = `
            <a class="dropdown-item" href="#" data-action="copy-nick">Copy In-Game Nick</a>
            <a class="dropdown-item" href="#" data-action="copy-account">Copy Account Name</a>
            <a class="dropdown-item" href="#" data-action="copy-both">Copy Both</a>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" href="#" data-action="copy-profile">Copy Profile URL</a>
            <a class="dropdown-item" href="#" data-action="copy-avatar">Copy Avatar URL</a>
        `;
        
        document.body.appendChild(contextMenu);
        
        // Add event listeners for menu items
        contextMenu.addEventListener('click', function(e) {
            e.preventDefault();
            const action = e.target.getAttribute('data-action');
            if (action) {
                handleContextMenuAction(action);
            }
        });
        
        // Hide menu when clicking outside
        document.addEventListener('click', function() {
            contextMenu.style.display = 'none';
        });
    }
    
    // Add right-click event listeners to player cards
    document.addEventListener('contextmenu', function(e) {
        const playerCard = e.target.closest('.player-card');
        if (playerCard && !playerCard.classList.contains('no-hover')) {
            e.preventDefault();
            
            // Get player data from the card
            const playerData = playerCard.getAttribute('data-player');
            if (playerData) {
                const player = JSON.parse(playerData);
                
                // Store player data for context menu actions
                window.currentContextPlayer = player;
                
                // Show context menu at cursor position
                const contextMenu = document.getElementById('playerContextMenu');
                contextMenu.style.display = 'block';
                contextMenu.style.left = e.pageX + 'px';
                contextMenu.style.top = e.pageY + 'px';
            }
        }
    });
}

// Handle context menu actions
function handleContextMenuAction(action) {
    const player = window.currentContextPlayer;
    if (!player) return;
    
    let valueToCopy = '';
    let toastMessage = '';
    
    switch (action) {
        case 'copy-nick':
            valueToCopy = player.Name;
            toastMessage = `Copied In-Game Nick: ${valueToCopy}`;
            break;
        case 'copy-account':
            // Get account name from Steam or GOG
            let accountName = '';
            if (player.Steam && player.Steam.Nickname) {
                accountName = player.Steam.Nickname;
            } else if (player.Gog && player.Gog.username) {
                accountName = player.Gog.username;
            }
            valueToCopy = accountName;
            toastMessage = `Copied Account Name: ${valueToCopy}`;
            break;
        case 'copy-both':
            // Get account name from Steam or GOG
            let accountName2 = '';
            if (player.Steam && player.Steam.Nickname) {
                accountName2 = player.Steam.Nickname;
            } else if (player.Gog && player.Gog.username) {
                accountName2 = player.Gog.username;
            }
            valueToCopy = `${accountName2} (${player.Name})`;
            toastMessage = `Copied: ${valueToCopy}`;
            break;
        case 'copy-profile':
            // Get profile URL from Steam or GOG
            if (player.Steam && player.Steam.ProfileUrl) {
                valueToCopy = player.Steam.ProfileUrl;
            } else if (player.Gog && player.Gog.ProfileUrl) {
                valueToCopy = player.Gog.ProfileUrl;
            }
            toastMessage = `Copied Profile URL`;
            break;
        case 'copy-avatar':
            // Get avatar URL from Steam or GOG
            if (player.Steam && player.Steam.AvatarUrl) {
                valueToCopy = player.Steam.AvatarUrl;
            } else if (player.Gog && player.Gog.AvatarUrl) {
                valueToCopy = player.Gog.AvatarUrl;
            }
            toastMessage = `Copied Avatar URL`;
            break;
    }
    
    // Copy to clipboard
    if (valueToCopy) {
        navigator.clipboard.writeText(valueToCopy).then(() => {
            showToast(toastMessage);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    }
    
    // Hide context menu
    document.getElementById('playerContextMenu').style.display = 'none';
}

// Show toast notification
function showToast(message) {
    // Create toast container if it doesn't exist
    if (!document.getElementById('toastContainer')) {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed top-0 start-50 translate-middle-x p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.className = 'toast text-bg-success';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.id = toastId;
    
    toast.innerHTML = `
        <div class="toast-header">
            <strong class="me-auto">Copied to Clipboard</strong>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
            ${message}
        </div>
    `;
    
    // Add toast to container
    document.getElementById('toastContainer').appendChild(toast);
    
    // Initialize and show toast
    const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
    bsToast.show();
    
    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function() {
        toast.remove();
    });
}

// this renders the individual player cards within each game card
function renderPlayerCard(player, SteamPlayerList, GogPlayerList, compactPlayerCards, gameMode) {
    // Check if this is a commander slot by looking for the Team.Leader property
    // For STRAT games, slot 1 is Team 1 commander and slot 6 is Team 2 commander
    const isCommanderSlot = (gameMode === "MPI" && player.Team && player.Team.Leader === true) ||
                    (gameMode === "STRAT" && (player.slot === 1 || player.slot === 6));

    if (player.Name === "Empty" || player.Name === "Open") {
        const warningClass = isCommanderSlot ? "text-warning" : "text-secondary";
        const bgClass = isCommanderSlot ? "bg-warning bg-opacity-10" : "";
        return `
        <li class="list-group-item d-flex justify-content-between align-items-center ${warningClass} ${bgClass} no-hover player-card">
            <div class="d-flex align-items-center">
                ${!compactPlayerCards ? `<div class="me-2" style="width: 1px; height: 48px;"></div>` : ''}
                <div>
                    <span style="${isCommanderSlot ? 'opacity: 0.85;' : ''}">${isCommanderSlot && player.Name === "Empty" ? "⌘ No Commander" : player.Name}</span>
                </div>
            </div>
        </li>`;
    }

    let playerName = escapeHtml(player.Name);
    let steamProfileUrl = "#";
    let steamNickname = "";
    let steamAvatarUrl = player.Name === "Computer" ? "/img/computer.png" : "/img/no_steam_pfp.jpg";
    let playerScore = player.Score !== undefined ? player.Score : "";

    // Handle Steam players
    if (player.IDs && player.IDs.Steam && player.IDs.Steam.ID !== undefined && player.IDs.Steam.ID !== null) {
        let steamId = player.IDs.Steam.ID.toString();
        if (SteamPlayerList && SteamPlayerList[steamId]) {
            steamProfileUrl = `https://steamcommunity.com/profiles/${steamId}`;
            steamNickname = SteamPlayerList[steamId].Nickname || "";
            steamAvatarUrl = SteamPlayerList[steamId].AvatarUrl || "/img/no_steam_pfp.jpg";
        }
    }
    // Handle GOG players
    else if (player.IDs && player.IDs.Gog && player.IDs.Gog.ID !== undefined && player.IDs.Gog.ID !== null) {
        let gogId = player.IDs.Gog.ID.toString();
        if (GogPlayerList && GogPlayerList[gogId]) {
            steamProfileUrl = `https://www.gog.com/u/${gogId}`;
            steamNickname = GogPlayerList[gogId].Username || "";
            steamAvatarUrl = GogPlayerList[gogId].AvatarUrl || "/img/no_steam_pfp.jpg";
        }
    }

    // Create a data attribute with player information for context menu
    const playerData = JSON.stringify({
        Name: player.Name,
        OriginalName: player.OriginalName,
        Score: player.Score,
        Steam: player.IDs && player.IDs.Steam ? {
            Nickname: steamNickname,
            ProfileUrl: steamProfileUrl,
            AvatarUrl: steamAvatarUrl
        } : null,
        Gog: player.IDs && player.IDs.Gog ? {
            username: steamNickname,
            ProfileUrl: steamProfileUrl,
            AvatarUrl: steamAvatarUrl
        } : null
    });

    // Determine if we should show the in-game name below the Steam/GOG name
    const showInGameName = (steamNickname && steamNickname !== playerName) || 
                          (player.OriginalName && player.OriginalName !== steamNickname);
    
    // Use the in-game name as the secondary display if it differs from the Steam/GOG name
    const inGameName = player.OriginalName || playerName;

    let cardContent = `
        <li class="list-group-item d-flex justify-content-between align-items-center${player.Name === "Computer" ? ' no-hover computer-team' : ''} player-card" data-player='${playerData}'>
            <div class="d-flex align-items-center">
                ${!compactPlayerCards ? `<img src="${steamAvatarUrl}" class="me-2 img-thumbnail" width="48" height="48" onError="this.src='/img/no_steam_pfp.jpg'">` : ''}
                <div>
                    <span class="text-light fw-bold">
                        ${isCommanderSlot ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-command me-1 mb-1" viewBox="0 0 16 16">
                            <path d="M3.5 2A1.5 1.5 0 0 1 5 3.5V5H3.5a1.5 1.5 0 1 1 0-3M6 5V3.5A2.5 2.5 0 1 0 3.5 6H5v4H3.5A2.5 2.5 0 1 0 6 12.5V11h4v1.5a2.5 2.5 0 1 0 2.5-2.5H11V6h1.5A2.5 2.5 0 1 0 10 3.5V5zm4 1v4H6V6zm1-1V3.5A1.5 1.5 0 1 1 12.5 5zm0 6h1.5a1.5 1.5 0 1 1-1.5 1.5zm-6 0v1.5A1.5 1.5 0 1 1 3.5 11z"/>
                        </svg>` : ''}${steamNickname || playerName}
                    </span>
                    ${showInGameName ? `<div class="text-secondary small">${escapeHtml(inGameName)}</div>` : ''}
                </div>
            </div>
            ${!compactPlayerCards && playerScore !== "" ? `<span class="badge bg-secondary">${playerScore}</span>` : ''}
        </li>`;
    
    // make entire card clickable if we have a valid profile URL
    if (steamProfileUrl !== "#") {
        return `<a href="${steamProfileUrl}" target="_blank" class="text-decoration-none">${cardContent}</a>`;
    }

    return cardContent;
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

        // fetch primary game data
        let fetchResponse = await fetch(sourceURL);

        // alternative static source data for testing
        // let fetchResponse = await fetch('/data/test/full-lobby-hidden.sample.json');
        // let fetchResponse = await fetch('/data/test/lobby-7-hidden.sample.json');
        // let fetchResponse = await fetch('/data/test/lobby-7.sample.json');
        // let fetchResponse = await fetch('/data/test/strat-test.sample.json');
        // let fetchResponse = await fetch('/data/test/pirate.sample.json');
        // let fetchResponse = await fetch('/data/test/gog.sample.json');
        // let fetchResponse = await fetch('/data/test/dm.sample.json');
        // let fetchResponse = await fetch('/data/test/ffa.sample.json');
        // let fetchResponse = await fetch('/data/test/slots.sample.json');

        // also fetch map data from local JSON file
        let fetchMapDataResponse = await fetch('/data/maps/vsrmaplist.json');

        if( !fetchResponse.ok || !fetchMapDataResponse.ok ) {
            console.log(`Error with response. Make sure source and proxy URLs are accessible and returning valid data.`);
        }

        let data = await fetchResponse.json();
        let MapData = await fetchMapDataResponse.json();

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
                // Check Steam IDs with proper null checking
                if(player.IDs && player.IDs.Steam && player.IDs.Steam.ID !== undefined && player.IDs.Steam.ID !== null) {
                    PlayerSteamID = player.IDs.Steam.ID.toString();

                    // use Steam IDs since those are less likely to change
                    for(const [SteamID, SteamData] of Object.entries(SteamPlayerList))
                    {
                        let SteamNick = SteamData.Nickname ? SteamData.Nickname.toString() : "";

                        if(PlayerSteamID === SteamID) 
                        {
                            if(ActivePlayerList.includes(SteamID)) 
                            {
                                console.log('%cFound: ' + SteamNick, "color:#bada55;font-weight:700;");
                                hasActivePlayers = true;
                                currentActivePlayerCount += 1;
                            }
                        }
                    }
                }
                // Check GOG IDs with proper null checking
                if(player.IDs && player.IDs.Gog && player.IDs.Gog.ID !== undefined && player.IDs.Gog.ID !== null) {
                    PlayerGogID = player.IDs.Gog.ID.toString();
                    for(const [GogID, GogData] of Object.entries(GogPlayerList)) {
                        let GogNick = GogData.Username ? GogData.Username.toString() : "";
                        if(PlayerGogID === GogID) {
                            if(ActivePlayerList.includes(GogID)) {
                                console.log('%cFound: ' + GogNick, "color:#bada55;font-weight:700;");
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
            let gameState       = (game.Status.State === "PreGame" ? "In-Lobby" : (game.Status.State === "InGame" ? "In-Game" : "N/A"));
            let hasPassword     = game.Status.HasPassword;
            let isLocked        = game.Status.IsLocked;
            let netType         = clean(game.Address.NAT_TYPE);
            let playerCount     = game.PlayerCount.Player;
            let playerCountMax  = game.PlayerTypes[0].Max;
            let openSpotCount   = playerCountMax - playerCount;
            let mapName         = game.Level.Name;
            let mapImage        = game.Level.Image;
            let mapFileName     = game.Level && game.Level.MapFile ? 
                ((game.Level.MapFile).replace('.bzn', '')).toLowerCase() : 
                "";
            let isVetStrat      = hasActivePlayers && index === 0;
            let compactPlayerCards = (localStorage.getItem("CompactCards") === "true" || document.querySelector("#CompactCardsToggle").checked ? true : false);

            // get matching map object from vsrmaplist.json
            let mapVSRObject    = MapData.find(map => map.File === mapFileName);

            console.log(mapVSRObject);
            console.log(mapFileName);

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

            // Print player names as a comma-separated string
            let playerNames = game.Players.map(player => player.Name).join(', ');

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
                    game.Name ? game.Name.length.toString() : "0",
                    clean(game.Name),
                    modList ? modList.length.toString() : "0",
                    modList || "",
                    game.Address.NAT || "",
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
                let shortIOPath = game.Address && game.Address.NAT ? 
                    ((game.Address.NAT).replaceAll("@","A")).replaceAll("-","0").replaceAll("_","L") : 
                    "";

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
                        const textareaElement = document.querySelector(`button[data-join-string="${encodedArgs}"] textarea`);
                        if (textareaElement) {
                            textareaElement.innerText = `${options.playerCount}/${options.playerCountMax} ${response.shortURL} @BZ2Player`;
                        }
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
                document.title = `${gameState}: ${playerCount}/${playerCountMax} (Host: ${clean(gameHost)})`;
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

            let Team1   = [];
            let Team2   = [];
            let Hidden  = [];

            if( gameMode === "STRAT" ) {
                // Create arrays of size 5 for each team
                Team1 = Array(5).fill().map((_, index) => {
                    let obj = {...vacantObj};
                    obj.slot = index + 1;
                    return obj;
                });
                Team2 = Array(5).fill().map((_, index) => {
                    let obj = {...vacantObj};
                    obj.slot = index + 6;
                    return obj;
                });

                // Fill in actual players
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

                // Calculate how many Open slots to show based on remaining capacity
                let remainingSlots = playerCountMax - playerCount;
                let team1OpenSlots = Math.ceil(remainingSlots / 2);  // First team gets the extra slot if odd
                let team2OpenSlots = Math.floor(remainingSlots / 2);
                
                // Add Open slots to each team
                for(let i = 0; i < team1OpenSlots && Team1.length < 5; i++) {
                    let obj = {...vacantObj};
                    obj.slot = Team1.length + 1;
                    Team1.push(obj);
                }

                for(let i = 0; i < team2OpenSlots && Team2.length < 5; i++) {
                    let obj = {...vacantObj};
                    obj.slot = Team2.length + 6;
                    Team2.push(obj);
                }
            }
            else if (gameMode === "MPI") {
                // For MPI games, all human players go to Team 1
                Team1 = PlayerList.slice(0, Math.min(5, PlayerList.length));

                // Add Open slots to Team 1 based on remaining capacity
                let remainingSlots = Math.min(5, playerCountMax - PlayerList.length);
                for(let i = 0; i < remainingSlots; i++) {
                    let obj = {...vacantObj};
                    obj.slot = Team1.length + i + 1;
                    Team1.push(obj);
                }

                // For MPI games, Team 2 only shows Computer once, no empty slots
                Team2 = [{Name: "Computer", slot: 6}];
            }
            else if (gameMode === "DM") {
                // For DM games, all players go to Team1
                Team1 = PlayerList.slice(0, Math.min(10, PlayerList.length));
                
                // Team2 is empty for DM games
                Team2 = [];
            }
            else if (gameMode === "FFA") {
                // For FFA games, all players go to Team1
                Team1 = PlayerList.slice(0, Math.min(10, PlayerList.length));
                
                // Team2 is empty for FFA games
                Team2 = [];
            }
            else {
                // For other game modes, create a single team list
                let sortedPlayers = PlayerList.sort((a, b) => {
                    // sort by SubTeam.ID, with nulls (hidden players) at the end
                    if (a.Team === undefined) {
                        return 1;
                    }
                    if (b.Team === undefined) {
                        return -1;
                    }
                    return parseInt(a.Team.SubTeam.ID) < parseInt(b.Team.SubTeam.ID) ? -1 : 1;
                });

                // Fill Team1 with actual players
                Team1 = sortedPlayers.slice(0, Math.min(5, sortedPlayers.length));

                // Add Open slots to Team 1 based on remaining capacity
                let remainingSlots = Math.min(5, playerCountMax - sortedPlayers.length);
                for(let i = 0; i < remainingSlots; i++) {
                    let obj = {...vacantObj};
                    obj.slot = Team1.length + i + 1;
                    Team1.push(obj);
                }

                // Team 2 stays empty for non-STRAT, non-MPI modes
                Team2 = [];
            }
           
            let LobbyList = document.querySelector('#lobbyList');

            // we now have all the necessary data to produce a lobby card for the current game;
            // we use a rather large template literal string to embed data where we need it
            LobbyList.insertAdjacentHTML(
                'beforeend',
                `
                <div class="col-12 col-xs-12 col-xl-4 mb-3">
                    <div class="card h-100 border-secondary" style="--bs-border-opacity: .15;">
                        <!-- Card Header -->
                        <div class="card-header d-flex justify-content-between align-items-center bg-dark-subtle shadow-lg">
                            <div id="gameTitle" class="d-flex align-items-center">
                            ${(() => {
                                if( isVetStrat) {
                                    return `<a href="https://discord.gg/UCTnN8Xt" target="_blank" class="shiny-cta btn btn-sm rounded">BZ2 Vet Strat
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-discord position-relative ms-1" viewBox="0 0 16 16" style="top:-1px;">
                                    <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612"/>
                                    </svg>
                                    </a>`
                                }
                                else {
                                    return `<strong>Game ${currentLobbyID}</strong>`
                                }
                            })()}
                            ${(() => {
                                if(playerCount < playerCountMax) {
                                    return `<span class="ms-2 btn btn-sm btn-outline-warning bg-warning-subtle btn-dead border-warning" style="--bs-border-opacity: .5 !important;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-person-fill" style="position:relative;top:-2;"
                                            viewBox="0 0 16 16">
                                        <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
                                        </svg>
                                        ${playerCount} / ${playerCountMax} 
                                    </span>`
                                }
                                else if(playerCount === playerCountMax) {
                                    return `<span class="ms-2 btn btn-sm btn-outline-primary bg-primary-subtle btn-dead border-primary" style="--bs-border-opacity: .5 !important;">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-person-fill" style="position:relative;top:-2;"
                                            viewBox="0 0 16 16">
                                        <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6" />
                                        </svg>
                                        ${playerCount} / ${playerCountMax} 
                                    </span>`;
                                }
                                else return ``;
                            })()}
                            </div>
                            <span>
                                ${(() => {
                                    if( isLocked) {
                                        return `<span title="Game is locked, no players allowed to join.">
                                            <svg class="me-1" fill="#ffc107" width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M18,8H17V7A5,5,0,0,0,7,7V8H6a2,2,0,0,0-2,2V20a2,2,0,0,0,2,2H18a2,2,0,0,0,2-2V10A2,2,0,0,0,18,8Zm-5,8.79V17a1,1,0,0,1-2,0v-.21a2.5,2.5,0,1,1,2,0ZM15,8H9V7a3,3,0,0,1,6,0Z"/>
                                            </svg>
                                        </span>
                                        `

                                    }
                                    else if( hasPassword ) {
                                        return `<span title="Host has set a password for this game.">
                                            <svg class="me-1" fill="#DC3545" width="24px" height="24px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M18,8H17V7A5,5,0,0,0,7,7V8H6a2,2,0,0,0-2,2V20a2,2,0,0,0,2,2H18a2,2,0,0,0,2-2V10A2,2,0,0,0,18,8Zm-5,8.79V17a1,1,0,0,1-2,0v-.21a2.5,2.5,0,1,1,2,0ZM15,8H9V7a3,3,0,0,1,6,0Z"/>
                                            </svg>
                                        </span>
                                        `
                                    }
                                    else { return `` }
                                })()}
                                <span id="gameState" class="btn btn-sm ${gameState === "In-Lobby" ? 'bg-secondary' : 'bg-success'} bg-gradient btn-dead">${gameState}</span>
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
                                    else return ``
                                })()}
                            </span>
                        </div>
                        <!-- Card Body -->
                        <div class="container-fluid h-100 pb-1">
                            <div class="row border-bottom">
                                <div class="col-3 p-1 border-0 border-end border-dotted text-center position-relative z-3">
                                        <img width="250" length="250" src="${mapImage}" onError="this.src='/img/no_steam_pfp.jpg'" class="img-thumbnail 
                                        ${mapVSRObject && isVetStrat 
                                            ? `vsr-cursor-pointer img-map" data-bs-toggle="modal" data-bs-target="#mapModal" 
                                                data-bs-map-name="${mapVSRObject.Name}" 
                                                data-bs-map-pools="${mapVSRObject.Pools}" 
                                                data-bs-map-size="${mapVSRObject.Size.formattedSize}" 
                                                data-bs-map-b2b="${mapVSRObject.Size.baseToBase}" 
                                                data-bs-map-binary="${mapVSRObject.Size.binarySave}"
                                                data-bs-map-loose="${mapVSRObject.Loose}" 
                                                data-bs-map-image="${mapImage}" 
                                                data-bs-map-file="${mapFileName}"
                                                data-bs-map-description="${escapeHtml(mapVSRObject.Description)}" 
                                                data-bs-map-author="${mapVSRObject.Author}"
                                                data-bs-map-tags="${mapVSRObject.Tags}"
                                                />
                                                <span class="position-absolute top-0 end-0 px-1 text-secondary rounded m-2 vsr-cursor-pointer">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-box-arrow-up-right" viewBox="0 0 16 16">
                                                        <path fill-rule="evenodd" d="M8.636 3.5a.5.5 0 0 0-.5-.5H1.5A1.5 1.5 0 0 0 0 4.5v10A1.5 1.5 0 0 0 1.5 16h10a1.5 1.5 0 0 0 1.5-1.5V7.864a.5.5 0 0 0-1 0V14.5a.5.5 0 0 1-.5.5h-10a.5.5 0 0 1-.5-.5h6.636a.5.5 0 0 0 .5-.5"/>
                                                        <path fill-rule="evenodd" d="M16 .5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0 0 1h3.793L6.146 9.146a.5.5 0 1 0 .708.708L15 1.707V5.5a.5.5 0 0 0 1 0z"/>
                                                    </svg>
                                                </span>
                                                ` 
                                            : '"/>'}
                                        ${(() => {
                                            if( mapVSRObject && isVetStrat ) {
                                                return `
                                                <div class="alert alert-secondary small px-3 py-1 my-1 mx-0 mb-0 d-flex flex-wrap justify-content-between">
                                                    <span>
                                                        ${mapVSRObject.Pools} Pools
                                                    </span>
                                                    <span>
                                                        B2B: ${mapVSRObject.Size.baseToBase}m 
                                                    </span>
                                                </div>
                                                `
                                            }
                                            else return ``;
                                        })()}
                                </div>
                                <div class="col-9 p-0 small">
                                    <ul class="list-group list-group-flush text-secondary">
                                        <li class="list-group-item d-flex justify-content-between align-items-center border-dotted">
                                            <strong class="text-muted pe-3">Map</strong>
                                            <span title="${mapFileName}">${mapName ? mapName : "N/A"} (${gameMode})</span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center border-dotted">
                                            <strong class="text-muted pe-3">Time</strong>
                                            <span">${gameState} for ${gameTime} mins</span>
                                        </li>
                                        <li class="list-group-item d-flex justify-content-between align-items-center border-dotted">
                                            <strong class="text-muted pe-3">Host</strong>
                                            <span class="text-light fw-bold">${truncate(gameHost, 32)}
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
                                            <strong class="text-muted pe-3">Name</strong>
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
                                    </div>
                            </div>
                            <div class="row player-list">
                                ${(() => {
                                    if (gameMode === "STRAT" || gameMode === "MPI") {
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
                                                            <strong>Hidden:</strong> ${Hidden.map(player => {
                                                                let displayName = clean(player.Name);
                                                                // Check if player has Steam ID
                                                                if (player.IDs && player.IDs.Steam && player.IDs.Steam.ID) {
                                                                    let steamId = player.IDs.Steam.ID.toString();
                                                                    if (SteamPlayerList && SteamPlayerList[steamId] && SteamPlayerList[steamId].Nickname) {
                                                                        displayName = `${SteamPlayerList[steamId].Nickname} (${clean(player.Name)})`;
                                                                    }
                                                                }
                                                                // Check if player has GOG ID
                                                                else if (player.IDs && player.IDs.Gog && player.IDs.Gog.ID) {
                                                                    let gogId = player.IDs.Gog.ID.toString();
                                                                    if (GogPlayerList && GogPlayerList[gogId] && GogPlayerList[gogId].Username) {
                                                                        displayName = `${GogPlayerList[gogId].Username} (${clean(player.Name)})`;
                                                                    }
                                                                }
                                                                return displayName;
                                                            }).join(', ')}
                                                        </div>
                                                    </div>
                                                </div>
                                                `;
                                            }
                                            return '';
                                        })()}
                                        <div class="col-12 col-md-6 p-2">
                                            <div class="card h-100 border-secondary-subtle">
                                                <div class="card-header text-center">
                                                    Team 1
                                                </div>
                                                <div class="card-body p-0">
                                                    <ul class="list-group list-group-flush">
                                                    ${Team1.map(player => renderPlayerCard(player, SteamPlayerList, GogPlayerList, compactPlayerCards, gameMode)).join('')}
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
                                                    <ul class="list-group list-group-flush">
                                                    ${Team2.map(player => renderPlayerCard(player, SteamPlayerList, GogPlayerList, compactPlayerCards, gameMode)).join('')}
                                                    </ul>
                                                                </div>
                                                            </div>
                                        </div>`;
                                    } else if (gameMode === "DM") {
                                        // For DM (Deathmatch) mode, list all players in a single column
                                        return `
                                        <div class="col-12 p-2">
                                            <div class="card h-100 border-secondary-subtle">
                                                <div class="card-header text-center">
                                                    Players
                                                </div>
                                                <div class="card-body p-0">
                                                    <ul class="list-group list-group-flush">
                                                    ${Team1.map(player => {
                                                        // Create a copy of the player object
                                                        let playerWithTeamID = {...player};
                                                        
                                                        // Get the team ID if available
                                                        let teamID = "";
                                                        if (player.Team && player.Team.SubTeam) {
                                                            teamID = `[${player.Team.SubTeam.ID}]`;
                                                        }
                                                        
                                                        // Store the original in-game name
                                                        let inGameName = player.Name;
                                                        let displayName = player.Name; // fallback
                                                        
                                                        if (player.IDs && player.IDs.Steam && player.IDs.Steam.ID) {
                                                            let steamID = player.IDs.Steam.ID.toString();
                                                            if (SteamPlayerList[steamID] && SteamPlayerList[steamID].Nickname) {
                                                                displayName = `${teamID} ${SteamPlayerList[steamID].Nickname}`;
                                                            }
                                                        } else if (player.IDs && player.IDs.Gog && player.IDs.Gog.ID) {
                                                            let gogID = player.IDs.Gog.ID.toString();
                                                            if (GogPlayerList[gogID] && GogPlayerList[gogID].Username) {
                                                                displayName = `${teamID} ${GogPlayerList[gogID].Username}`;
                                                            }
                                                        } else {
                                                            displayName = `${teamID} ${player.Name}`;
                                                        }
                                                        
                                                        // Set the display name and original name
                                                        playerWithTeamID.Name = displayName;
                                                        playerWithTeamID.OriginalName = inGameName;
                                                        
                                                        return renderPlayerCard(playerWithTeamID, SteamPlayerList, GogPlayerList, compactPlayerCards, gameMode);
                                                    }).join('')}
                                                    ${(() => {
                                                        // Add a single open slot showing the number of remaining slots
                                                        const remainingSlots = playerCountMax - PlayerList.length;
                                                        if (remainingSlots > 0) {
                                                            return `
                                                            <li class="list-group-item d-flex justify-content-between align-items-center text-secondary no-hover player-card">
                                                                <div class="d-flex align-items-center">
                                                                    <div class="me-2" style="width: 1px; height: 48px;"></div>
                                                                    <div>
                                                                        <span>${remainingSlots} ${remainingSlots === 1 ? 'Slot' : 'Slots'} Open</span>
                                                                    </div>
                                                                </div>
                                                            </li>`;
                                                        }
                                                        return '';
                                                    })()}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>`;
                                    } else if (gameMode === "FFA") {
                                        // For FFA mode, list all players in a single column
                                        return `
                                        <div class="col-12 p-2">
                                            <div class="card h-100 border-secondary-subtle">
                                                <div class="card-header text-center">
                                                    Players
                                                </div>
                                                <div class="card-body p-0">
                                                    <ul class="list-group list-group-flush">
                                                    ${Team1.map(player => {
                                                        // Create a copy of the player object
                                                        let playerWithTeamID = {...player};
                                                        
                                                        // Get the team ID if available
                                                        let teamID = "";
                                                        if (player.Team && player.Team.SubTeam) {
                                                            teamID = `[${player.Team.SubTeam.ID}]`;
                                                        }
                                                        
                                                        // Store the original in-game name
                                                        let inGameName = player.Name;
                                                        let displayName = player.Name; // fallback
                                                        
                                                        if (player.IDs && player.IDs.Steam && player.IDs.Steam.ID) {
                                                            let steamID = player.IDs.Steam.ID.toString();
                                                            if (SteamPlayerList[steamID] && SteamPlayerList[steamID].Nickname) {
                                                                displayName = `${teamID} ${SteamPlayerList[steamID].Nickname}`;
                                                            }
                                                        } else if (player.IDs && player.IDs.Gog && player.IDs.Gog.ID) {
                                                            let gogID = player.IDs.Gog.ID.toString();
                                                            if (GogPlayerList[gogID] && GogPlayerList[gogID].Username) {
                                                                displayName = `${teamID} ${GogPlayerList[gogID].Username}`;
                                                            }
                                                        } else {
                                                            displayName = `${teamID} ${player.Name}`;
                                                        }
                                                        
                                                        // Set the display name and original name
                                                        playerWithTeamID.Name = displayName;
                                                        playerWithTeamID.OriginalName = inGameName;
                                                        
                                                        return renderPlayerCard(playerWithTeamID, SteamPlayerList, GogPlayerList, compactPlayerCards, gameMode);
                                                    }).join('')}
                                                    ${(() => {
                                                        // Add a single open slot showing the number of remaining slots
                                                        const remainingSlots = playerCountMax - PlayerList.length;
                                                        if (remainingSlots > 0) {
                                                            return `
                                                            <li class="list-group-item d-flex justify-content-between align-items-center text-secondary no-hover player-card">
                                                                <div class="d-flex align-items-center">
                                                                    <div class="me-2" style="width: 1px; height: 48px;"></div>
                                                                    <div>
                                                                        <span>${remainingSlots} ${remainingSlots === 1 ? 'Slot' : 'Slots'} Open</span>
                                                                    </div>
                                                                </div>
                                                            </li>`;
                                                        }
                                                        return '';
                                                    })()}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>`;
                                    }
                                    return '';
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

                    // window.location.replace('discord:///channels/1137584338310017098/1137619558639874129');

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

        // initialize map modal to show dynamic content
        const mapModal = document.getElementById('mapModal')
        if (mapModal) {
        mapModal.addEventListener('show.bs.modal', event => {

            const button = event.relatedTarget;

            // Extract info from data-bs-* attributes
            const mapName = button.getAttribute('data-bs-map-name');
            const mapImage = button.getAttribute('data-bs-map-image');
            const mapFile = button.getAttribute('data-bs-map-file');
            const mapPools = button.getAttribute('data-bs-map-pools');
            const mapLoose = button.getAttribute('data-bs-map-loose');
            const mapDescription = button.getAttribute('data-bs-map-description');
            const mapAuthor = button.getAttribute('data-bs-map-author');
            const mapSize = button.getAttribute('data-bs-map-size');
            const mapB2B = button.getAttribute('data-bs-map-b2b');
            const mapTags = button.getAttribute('data-bs-map-tags');
            const mapBinarySave = button.getAttribute('data-bs-map-binary');

            // create references to modal elements
            const mmName = mapModal.querySelector('#mmName');
            const mmImage = mapModal.querySelector('#mmImage');
            const mmFile = mapModal.querySelector('#mmFile');
            const mmPools = mapModal.querySelector('#mmPools');
            const mmLoose = mapModal.querySelector('#mmLoose');
            const mmDescription = mapModal.querySelector('#mmDescription');
            const mmAuthor = mapModal.querySelector('#mmAuthor');
            const mmSize = mapModal.querySelector('#mmSize');
            const mmB2B = mapModal.querySelector('#mmB2B');
            const mmTags = mapModal.querySelector('#mmTags');

            mmName.textContent = mapName;
            mmImage.src = mapImage;
            mmFile.textContent = mapFile;
            mmPools.textContent = mapPools;
            mmLoose.textContent = mapLoose;
            mmDescription.innerHTML = mapDescription;
            mmAuthor.textContent = mapAuthor;
            mmSize.textContent = mapSize;
            mmB2B.innerHTML = (mapBinarySave === "true" ? '<span class="text-danger">N/A (Binary Save)</span>': mapB2B);
            mmTags.textContent = (mapTags !== '' ? `tags: ${mapTags}` : 'N/A');
        })
}

    } catch(err) {
        console.log(`${err.stack}: Catch Error: ${err}`);
    }
}

/*-------------------------------------------------*/
/*------------------ MAIN CONTENT -----------------*/
/*-------------------------------------------------*/

window.addEventListener('DOMContentLoaded', (event) => {

    // set state of toggle switches on Settings modal if LocalStorage values exists
    if( localStorage.getItem("ShowVSROnly") === "true" ) {
        document.querySelector("#VSRToggle").checked = true;
    }

    // toggle the "Live Updates" switch based on localStorage value
    if( localStorage.getItem("LiveUpdatesOn") === "false" ) {
        document.querySelector("#LiveUpdateToggle").checked = false;
    }

    // toggle the "Live Updates" switch based on localStorage value
    if( localStorage.getItem("CompactCards") === "false" ) {
        document.querySelector("#CompactCardsToggle").checked = false;
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

    // allow user to toggle compact player cards
    let CompactCardToggle = document.querySelector("#CompactCardsToggle");
    CompactCardToggle.addEventListener('change', function () {
        if( this.checked ) {
            localStorage.setItem("CompactCards", "true");
        }
        else {
            localStorage.setItem("CompactCards", "false");
        }
        getLobbyData();
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

    // Call setupPlayerCardContextMenu when the page loads
    setupPlayerCardContextMenu();
});
