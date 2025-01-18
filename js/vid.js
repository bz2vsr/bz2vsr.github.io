// please dont misuse these keys :'-)
const API_KEYS = [
    { name: 'Primary', key: 'AIzaSyAG20W4JdfzXCmZ_QdG2-Ok8eYklVLiYWI' },
    { name: 'Backup 1', key: 'AIzaSyBAC0fk3NSW0CvlqTWg7d956a-OgI3QR7A' },
    { name: 'Backup 2', key: 'AIzaSyAmwnh2B7pirESOoY_qfORUjokiwsjB_mE' },
    { name: 'Backup 3', key: 'AIzaSyAewnnVcvmbxkdtXWEZEA2VJT76zwGr-f4' },
    { name: 'Backup 4', key: 'AIzaSyCDjPedRvNvvvyJGBnC1foOorr3CF-6pkU' }
];

let currentKeyIndex = 0;
const CHANNELS = {
    'f9bomber': '@F9bomber',
    'herp': '@HerpMcDerperson'
};

let allVideos = [];
const QUOTA_WARNING_THRESHOLD = 2000; // Warning at 2,000 units
const QUOTA_RESET_HOUR_UTC = 7; // 7 UTC = Midnight Pacific
let dailyQuotaUsed = 0;

let f9NextPageToken = null;
let herpNextPageToken = null;

function getCurrentApiKey() {
    return API_KEYS[currentKeyIndex].key;
}

function getNextApiKey() {
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    localStorage.setItem('currentKeyIndex', currentKeyIndex);
    return API_KEYS[currentKeyIndex].key;
}

function updateQuotaDisplay(quota) {
    const quotaDisplay = document.getElementById('quota-counter');
    const keyNameDisplay = document.getElementById('key-name');
    
    if (quotaDisplay) {
        quotaDisplay.textContent = `Quota: ${quota}`;
    }
    if (keyNameDisplay) {
        if (currentKeyIndex < 0) {  // Using cache
            keyNameDisplay.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-database-fill mb-1 me-1" viewBox="0 0 16 16">
                    <path d="M3.904 1.777C4.978 1.289 6.427 1 8 1s3.022.289 4.096.777C13.125 2.245 14 2.993 14 4s-.875 1.755-1.904 2.223C11.022 6.711 9.573 7 8 7s-3.022-.289-4.096-.777C2.875 5.755 2 5.007 2 4s.875-1.755 1.904-2.223Z"/>
                    <path d="M2 6.161V7c0 1.007.875 1.755 1.904 2.223C4.978 9.71 6.427 10 8 10s3.022-.289 4.096-.777C13.125 8.755 14 8.007 14 7v-.839c-.457.432-1.004.751-1.49.972C11.278 7.693 9.682 8 8 8s-3.278-.307-4.51-.867c-.486-.22-1.033-.54-1.49-.972Z"/>
                    <path d="M2 9.161V10c0 1.007.875 1.755 1.904 2.223C4.978 12.711 6.427 13 8 13s3.022-.289 4.096-.777C13.125 11.755 14 11.007 14 10v-.839c-.457.432-1.004.751-1.49.972-1.232.56-2.828.867-4.51.867s-3.278-.307-4.51-.867c-.486-.22-1.033-.54-1.49-.972Z"/>
                    <path d="M2 12.161V13c0 1.007.875 1.755 1.904 2.223C4.978 15.711 6.427 16 8 16s3.022-.289 4.096-.777C13.125 14.755 14 14.007 14 13v-.839c-.457.432-1.004.751-1.49.972-1.232.56-2.828.867-4.51.867s-3.278-.307-4.51-.867c-.486-.22-1.033-.54-1.49-.972Z"/>
                </svg>
                Cache`;
        } else {
            keyNameDisplay.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-key-fill mb-1 me-1" viewBox="0 0 16 16">
                    <path d="M3.5 11.5a3.5 3.5 0 1 1 3.163-5H14L15.5 8 14 9.5l-1-1-1 1-1-1-1 1-1-1-1 1H6.663a3.5 3.5 0 0 1-3.163 2zM2.5 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
                </svg>
                ${API_KEYS[currentKeyIndex].name}`;
        }
    }
}

function updateQuotaUsage(units) {
    dailyQuotaUsed += units;
    console.log('%cQuota: +' + units + ' units. Total: ' + dailyQuotaUsed, 'color: red; font-weight: bold');
    updateQuotaDisplay(dailyQuotaUsed);
}

async function fetchChannelInfo(handle, apiKey) {
    try {
        updateQuotaUsage(1);
        const url = `https://youtube.googleapis.com/youtube/v3/channels?key=${apiKey}&forHandle=${handle.substring(1)}&part=snippet,contentDetails`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            return data.items[0].id;
        }
        return null;
    } catch (error) {
        console.error('Error fetching channel:', error);
        return null;
    }
}

function videoMatchesFilter(video) {
    const title = video.snippet.title.toLowerCase();
    const description = video.snippet.description.toLowerCase();
    return title.includes('bzcc') || 
           title.includes('battlezone') || 
           description.includes('bzcc') || 
           description.includes('battlezone');
}

async function fetchVideos(channelId, pageToken = null, retryCount = 0) {
    if (retryCount >= API_KEYS.length) {
        console.error('All API keys exhausted');
        throw new Error('All API keys failed');
    }

    const apiKey = getCurrentApiKey();
    const maxResults = 12;
    let url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=${maxResults}`;
    
    if (pageToken) {
        url += `&pageToken=${pageToken}`;
    }

    try {
        console.log(`Using API Key: ${API_KEYS[currentKeyIndex].name}`);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }
        
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }

        updateQuotaUsage(100);
        const videos = data.items.filter(item => item.id.kind === 'youtube#video' && videoMatchesFilter(item));
        return {
            videos: videos,
            nextPageToken: data.nextPageToken
        };
    } catch (error) {
        console.error('Fetch error details:', error);
        const nextKey = getNextApiKey();
        console.log(`Error occurred, switching to: ${API_KEYS[currentKeyIndex].name}`);
        return fetchVideos(channelId, pageToken, retryCount + 1);
    }
}

function updateEmbeddedPlayer(videoId) {
    const embedContainer = document.getElementById('latest-video');
    if (embedContainer) {
        embedContainer.innerHTML = `
            <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
                title="YouTube video player" 
                frameborder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                allowfullscreen>
            </iframe>
        `;
    }
}

function createVideoCard(video, isSearchResult = false) {
    const date = new Date(video.snippet.publishedAt);
    const publishedDate = `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear().toString().slice(-2)}`;
    
    return `
        <div class="col-12 mb-4">
            <div class="card border-2 hover-border-primary" style="transition: border-color 0.2s ease; cursor: pointer;" onclick="handleVideoClick('${video.id.videoId}')">
                <div class="row g-0">
                    <div class="${isSearchResult ? 'col-md-2' : 'col-md-4'} position-relative">
                        <div>
                            <img src="${video.snippet.thumbnails.high.url}" 
                                class="img-fluid rounded-start w-100" 
                                alt="${video.snippet.title}">
                            <div class="position-absolute bottom-0 end-0 bg-dark opacity-75 text-white p-1 m-2 rounded" style="font-size: 0.75rem;">
                                ${publishedDate}
                            </div>
                        </div>
                    </div>
                    <div class="${isSearchResult ? 'col-md-10' : 'col-md-8'}">
                        <div class="card-body">
                            <h5 class="card-title">${video.snippet.title}</h5>
                            ${isSearchResult ? `<div class="text-muted mb-2" style="font-size: 0.9rem;">${video.snippet.channelTitle}</div>` : ''}
                            <div class="card-text description text-secondary" style="${isSearchResult ? '' : 'display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;'}">
                                ${video.snippet.description}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function handleVideoClick(videoId) {
    // Update the video player
    updateEmbeddedPlayer(videoId);
    
    // Scroll to the video player
    const player = document.getElementById('latest-video');
    if (player) {
        player.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

function performSearch() {
    const searchInput = document.getElementById('search-input');
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        document.getElementById('regular-content').classList.remove('d-none');
        document.getElementById('search-results').classList.add('d-none');
        return;
    }
    
    // Debounce search for better performance
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
        const results = allVideos.filter(video => 
            video.snippet.title.toLowerCase().includes(searchTerm) ||
            video.snippet.description.toLowerCase().includes(searchTerm)
        );
        
        const searchResultsSection = document.getElementById('search-results');
        const regularContent = document.getElementById('regular-content');
        const searchResultsContainer = document.getElementById('search-results-container');
        
        searchResultsContainer.innerHTML = '';
        
        if (results.length > 0) {
            results.forEach(video => {
                searchResultsContainer.insertAdjacentHTML('beforeend', createVideoCard(video, true));
            });
        } else {
            searchResultsContainer.innerHTML = '<div class="col-12"><p class="text-muted">No videos found matching your search.</p></div>';
        }
        
        searchResultsSection.classList.remove('d-none');
        regularContent.classList.add('d-none');
    }, 300);
}

// Add event listener for Enter key in search input
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => {
        performSearch();
    });
});

async function handleViewMore(event) {
    const channel = event.target.dataset.channel;
    console.log('Loading more videos for channel:', channel);
    
    try {
        if (channel === 'f9bomber') {
            const result = await fetchVideos(CHANNELS.f9bomber, f9NextPageToken);
            f9NextPageToken = result.nextPageToken;
            
            const container = document.getElementById('f9bomber-videos');
            result.videos.forEach(video => {
                container.insertAdjacentHTML('beforeend', createVideoCard(video));
            });
            
            // Hide button if no more pages
            if (!f9NextPageToken) {
                event.target.style.display = 'none';
            }
            
            // Add new videos to allVideos array for search
            allVideos = [...allVideos, ...result.videos];
            
        } else if (channel === 'herp') {
            const result = await fetchVideos(CHANNELS.herp, herpNextPageToken);
            herpNextPageToken = result.nextPageToken;
            
            const container = document.getElementById('herp-videos');
            result.videos.forEach(video => {
                container.insertAdjacentHTML('beforeend', createVideoCard(video));
            });
            
            // Hide button if no more pages
            if (!herpNextPageToken) {
                event.target.style.display = 'none';
            }
            
            // Add new videos to allVideos array for search
            allVideos = [...allVideos, ...result.videos];
        }
    } catch (error) {
        console.error('Error loading more videos:', error);
    }
}

async function performGlobalSearch() {
    const searchInput = document.getElementById('global-search-input');
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        document.getElementById('regular-content').classList.remove('d-none');
        document.getElementById('search-results').classList.add('d-none');
        return;
    }

    try {
        const apiKey = getCurrentApiKey();
        
        // Get channel IDs first
        const f9ChannelId = await fetchChannelInfo(CHANNELS.f9bomber, apiKey);
        const herpChannelId = await fetchChannelInfo(CHANNELS.herp, apiKey);
        
        // Make parallel requests for both channels
        const [f9Results, herpResults] = await Promise.all([
            fetch(`https://www.googleapis.com/youtube/v3/search?key=${apiKey}&q=${encodeURIComponent(searchTerm)}&part=snippet,id&type=video&maxResults=25&channelId=${f9ChannelId}`),
            fetch(`https://www.googleapis.com/youtube/v3/search?key=${apiKey}&q=${encodeURIComponent(searchTerm)}&part=snippet,id&type=video&maxResults=25&channelId=${herpChannelId}`)
        ]);

        if (!f9Results.ok || !herpResults.ok) {
            throw new Error('One or more search requests failed');
        }

        const [f9Data, herpData] = await Promise.all([
            f9Results.json(),
            herpResults.json()
        ]);

        updateQuotaUsage(202); // 100 per search + 2 for channel info

        // Combine and filter results
        const searchResults = [...f9Data.items, ...herpData.items]
            .filter(video => videoMatchesFilter(video))
            .sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));

        const searchResultsSection = document.getElementById('search-results');
        const regularContent = document.getElementById('regular-content');
        const searchResultsContainer = document.getElementById('search-results-container');
        
        searchResultsContainer.innerHTML = '';
        
        if (searchResults.length > 0) {
            searchResults.forEach(video => {
                searchResultsContainer.insertAdjacentHTML('beforeend', createVideoCard(video, true));
            });
        } else {
            searchResultsContainer.innerHTML = '<div class="col-12"><p class="text-muted">No videos found matching your search.</p></div>';
        }
        
        searchResultsSection.classList.remove('d-none');
        regularContent.classList.add('d-none');

    } catch (error) {
        console.error('Error performing global search:', error);
        const errorAlert = document.getElementById('api-error-alert');
        const errorMessage = document.getElementById('api-error-message');
        if (errorAlert && errorMessage) {
            errorMessage.textContent = error.message;
            errorAlert.classList.remove('d-none');
        }
    }
}

function resetSearch() {
    // Clear the search input
    const globalSearchInput = document.getElementById('global-search-input');
    globalSearchInput.value = '';
    
    // Show regular content and hide search results
    document.getElementById('regular-content').classList.remove('d-none');
    document.getElementById('search-results').classList.add('d-none');
    
    // Reload only the video listings, not the player
    const f9bomberContainer = document.getElementById('f9bomber-videos');
    const herpContainer = document.getElementById('herp-videos');
    
    f9bomberContainer.innerHTML = '';
    herpContainer.innerHTML = '';
    
    // Fetch and display initial videos for both channels
    fetchVideos(CHANNELS.f9bomber).then(result => {
        result.videos.forEach(video => {
            f9bomberContainer.insertAdjacentHTML('beforeend', createVideoCard(video));
        });
    });

    fetchVideos(CHANNELS.herp).then(result => {
        result.videos.forEach(video => {
            herpContainer.insertAdjacentHTML('beforeend', createVideoCard(video));
        });
    });
}

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    // Restore last used key index
    const savedKeyIndex = localStorage.getItem('currentKeyIndex');
    if (savedKeyIndex !== null) {
        currentKeyIndex = parseInt(savedKeyIndex);
    }
    
    const storedQuota = parseInt(localStorage.getItem('dailyQuotaUsed')) || 0;
    updateQuotaDisplay(storedQuota);
    
    loadVideos();
    
    document.querySelectorAll('.view-more').forEach(button => {
        button.addEventListener('click', handleViewMore);
    });

    // Add global search event listeners
    const globalSearchButton = document.getElementById('global-search-button');
    const globalSearchInput = document.getElementById('global-search-input');
    const resetSearchButton = document.getElementById('reset-search-button');
    
    // Add click handler only
    globalSearchButton.addEventListener('click', performGlobalSearch);
    
    resetSearchButton.addEventListener('click', resetSearch);

    // Add filter clear button functionality
    const searchInput = document.getElementById('search-input');
    const clearFilterButton = document.getElementById('clear-filter-button');
    
    searchInput.addEventListener('input', () => {
        const hasValue = Boolean(searchInput.value);
        clearFilterButton.classList.toggle('d-none', !hasValue);
        searchInput.classList.toggle('rounded', !hasValue);
        searchInput.classList.toggle('rounded-start', hasValue);
        performSearch();
    });
    
    clearFilterButton.addEventListener('click', () => {
        searchInput.value = '';
        clearFilterButton.classList.add('d-none');
        searchInput.classList.add('rounded');
        searchInput.classList.remove('rounded-start');
        performSearch();
    });
});

async function loadVideos() {
    try {
        const f9Container = document.getElementById('f9bomber-videos');
        const herpContainer = document.getElementById('herp-videos');
        
        if (f9Container) f9Container.innerHTML = '';
        if (herpContainer) herpContainer.innerHTML = '';
        allVideos = [];
        
        // Get channel IDs first
        const f9ChannelId = await fetchChannelInfo(CHANNELS.f9bomber, getCurrentApiKey());
        const f9Result = await fetchVideos(f9ChannelId);
        f9NextPageToken = f9Result.nextPageToken;
        
        if (f9Container && f9Result.videos.length > 0) {
            const f9Videos = f9Result.videos.slice(0, 6);
            f9Videos.forEach(video => {
                f9Container.insertAdjacentHTML('beforeend', createVideoCard(video));
            });
            allVideos = [...allVideos, ...f9Videos];
        }

        const herpChannelId = await fetchChannelInfo(CHANNELS.herp, getCurrentApiKey());
        const herpResult = await fetchVideos(herpChannelId);
        herpNextPageToken = herpResult.nextPageToken;
        
        if (herpContainer && herpResult.videos.length > 0) {
            const herpVideos = herpResult.videos.slice(0, 6);
            herpVideos.forEach(video => {
                herpContainer.insertAdjacentHTML('beforeend', createVideoCard(video));
            });
            allVideos = [...allVideos, ...herpVideos];
        }
        
        if (allVideos.length > 0) {
            allVideos.sort((a, b) => new Date(b.snippet.publishedAt) - new Date(a.snippet.publishedAt));
            const latestVideo = allVideos[0];
            updateEmbeddedPlayer(latestVideo.id.videoId);
        }

    } catch (error) {
        console.error('Error in loadVideos:', error);
    }
}

// Add a function to check latest video
async function getLatestVideo(channelId, apiKey) {
    try {
        const url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=1&type=video`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            return data.items[0];
        }
        return null;
    } catch (error) {
        console.error('Error checking latest video:', error);
        return null;
    }
}

// Add this CSS to handle the hover effect
const style = document.createElement('style');
style.textContent = `
    .hover-border-primary:hover {
        border-color: var(--bs-primary) !important;
        cursor: pointer;
    }
`;
document.head.appendChild(style);

// Reset quota at midnight
function resetQuotaAtMidnight() {
    const now = new Date();
    const night = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
        0, 0, 0
    );
    const msToMidnight = night.getTime() - now.getTime();

    setTimeout(() => {
        dailyQuotaUsed = 0;
        currentKeyIndex = 0;
        updateQuotaDisplay(0);
        resetQuotaAtMidnight();
    }, msToMidnight);
}

resetQuotaAtMidnight();