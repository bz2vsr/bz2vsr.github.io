async function getLobbyData() {
    
    let dataURL = "http://multiplayersessionlist.iondriver.com/api/1.0/sessions?game=bigboat:battlezone_combat_commander";

    try {
        let rawData = await fetch(dataURL);

        if( !rawData.ok ) {
            console.log(`Error with data. Make sure ${dataURL} is accessible and returning valid data.`);
        }

        let data = await rawData.json();

        console.log(data);

    } catch {

        console.log(`Catch: Make sure ${dataURL} is accessible and returning valid data.`);

    }
}
window.addEventListener('DOMContentLoaded', (event) => {

    getLobbyData();

})