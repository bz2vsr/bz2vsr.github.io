// Function to create an audio player card
function createAudioCard(fileName) {
    const column = document.createElement('div');
    column.className = 'col-4 mb-3';
    
    const card = document.createElement('div');
    card.className = 'card h-100';
    
    card.innerHTML = `
        <div class="card-header bg-secondary-subtle">
            <h6 class="mb-0">${fileName}</h6>
        </div>
        <div class="card-body p-3">
            <audio class="w-100" controls>
                <source src="/data/library/sounds/${fileName}" type="audio/${fileName.split('.').pop()}">
                Your browser does not support the audio element.
            </audio>
        </div>
    `;
    
    column.appendChild(card);
    return column;
}

// Function to create a search bar
function createSearchBar() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'row mb-4';
    
    searchContainer.innerHTML = `
        <div class="col-6 mx-auto">
            <input type="text" 
                   class="form-control" 
                   id="soundSearch" 
                   placeholder="Type here to filter...">
        </div>
    `;
    
    return searchContainer;
}

// Function to filter audio cards
function filterCards(searchTerm) {
    const cards = document.querySelectorAll('.col-4');
    const normalizedSearch = searchTerm.toLowerCase();
    
    cards.forEach(card => {
        const fileName = card.querySelector('h6').textContent.toLowerCase();
        if (fileName.includes(normalizedSearch)) {
            card.style.display = '';
        } else {
            card.style.display = 'none';
        }
    });
}

// Function to load and display sounds
async function loadSounds() {
    try {
        const response = await fetch('/data/library/sounds/sounds.json');
        if (!response.ok) throw new Error('Failed to load sounds data');
        
        const soundFiles = await response.json();
        const container = document.getElementById('LibrarySounds');
        
        // Add search bar
        const searchBar = createSearchBar();
        container.appendChild(searchBar);
        
        // Add event listener to search input
        const searchInput = document.getElementById('soundSearch');
        searchInput.addEventListener('input', (e) => {
            filterCards(e.target.value);
        });
        
        // Create a row to hold the cards
        const row = document.createElement('div');
        row.className = 'row';
        container.appendChild(row);
        
        soundFiles.forEach(fileName => {
            const audioCard = createAudioCard(fileName);
            row.appendChild(audioCard);
        });
    } catch (error) {
        console.error('Error loading sounds:', error);
    }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    loadSounds();
});
