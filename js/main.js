async function getLobbyData() {
    
    // Requesting data directly gets blocked by CORS policy, so we use klugey CORS Proxy workaround
    const sourceURL = "http://multiplayersessionlist.iondriver.com/api/1.0/sessions?game=bigboat:battlezone_combat_commander";
    const proxyURL = 'https://api.codetabs.com/v1/proxy/?quest=' + sourceURL;

    try {
        let fetchResponse = await fetch(proxyURL);

        if( !fetchResponse.ok ) {
            console.log(`Error with response. Make sure source and proxy URLs are accessible and returning valid data.`);
        }

        let data = await fetchResponse.json();

        let prettyJSON = JSON.stringify(data, null, 2);
        document.querySelector('#json').innerHTML = prettyJSON; 

    } catch {
        console.log(`Catch Error: Make sure source and proxy URLs are accessible and returning valid data.`);
    }
}
window.addEventListener('DOMContentLoaded', (event) => {
    getLobbyData();
});