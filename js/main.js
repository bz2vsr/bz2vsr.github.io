async function getLobbyData() {
    
    /* source data served over HTTP, so having to use HTTPS CORS proxy as a workaround */
    let sourceURL = "http://multiplayersessionlist.iondriver.com/api/1.0/sessions?game=bigboat:battlezone_combat_commander";
    const proxyURL = 'https://api.codetabs.com/v1/proxy/?quest=' + sourceURL;

    try {
        let fetchResponse = await fetch(proxyURL);


        if( !fetchResponse.ok ) {
            console.log(`Error with data. Make sure ${sourceURL} is accessible and returning valid data.`);
        }

        let data = await fetchResponse.json();

        console.log(data["Sessions"]);

    } catch {
        console.log(`Catch: Make sure ${sourceURL} is accessible and returning valid data.`);
    }
}
window.addEventListener('DOMContentLoaded', (event) => {
    getLobbyData();
});