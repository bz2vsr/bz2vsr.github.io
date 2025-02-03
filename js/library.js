// Function to create an audio player card
function createAudioCard(soundData) {
    const column = document.createElement('div');
    column.className = 'col-4 mb-3';
    
    const card = document.createElement('div');
    card.className = 'card';
    
    // Determine footer content based on transcript availability
    const hasTranscript = soundData.transcript && soundData.transcript !== "Not available";
    const transcriptFooter = hasTranscript 
        ? `<div class="card-footer bg-secondary-subtle p-2">
             <a href="#" class="text-muted small text-decoration-none d-flex justify-content-between align-items-center" 
                onclick="toggleTranscript(this); return false;">
                <span>Transcript</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="bi bi-chevron-down" viewBox="0 0 16 16">
                    <path fill-rule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708"/>
                </svg>
             </a>
             <div class="transcript mt-2" style="display: none;">
                 <p class="mb-0 small">${soundData.transcript}</p>
             </div>
           </div>`
        : `<div class="card-footer bg-secondary-subtle p-2">
             <span class="text-secondary text-opacity-25 small">No transcript available</span>
           </div>`;
    
    card.innerHTML = `
        <div class="card-header bg-secondary-subtle">
            <h6 class="mb-0">${soundData.file}</h6>
        </div>
        <div class="card-body p-3 d-flex align-items-center">
            <audio class="w-100" controls>
                <source src="/data/library/sounds/${soundData.file}" type="audio/${soundData.file.split('.').pop()}">
                Your browser does not support the audio element.
            </audio>
        </div>
        ${transcriptFooter}
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
        const transcript = card.querySelector('.transcript p')?.textContent.toLowerCase() || '';
        
        if (fileName.includes(normalizedSearch) || transcript.includes(normalizedSearch)) {
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
        
        soundFiles.forEach(soundData => {
            const audioCard = createAudioCard(soundData);
            row.appendChild(audioCard);
        });
    } catch (error) {
        console.error('Error loading sounds:', error);
    }
}

// Function to toggle transcript visibility
function toggleTranscript(button) {
    const footer = button.closest('.card-footer');
    const transcript = footer.querySelector('.transcript');
    const chevron = button.querySelector('svg');
    
    if (transcript.style.display === 'none') {
        transcript.style.display = 'block';
        chevron.style.transform = 'rotate(180deg)';
    } else {
        transcript.style.display = 'none';
        chevron.style.transform = 'rotate(0)';
    }
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    loadSounds();
});
