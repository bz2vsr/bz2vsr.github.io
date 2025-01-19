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

// Add cache management at the top of the file
const CACHE_KEY = 'videoCache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

function getCache() {
    const cache = localStorage.getItem(CACHE_KEY);
    if (!cache) {
        console.log('No cache found');
        return null;
    }
    
    const parsedCache = JSON.parse(cache);
    console.log('Retrieved raw cache:', parsedCache); // Debug log
    
    // Check if cache has expired or is missing required data
    if (Date.now() - parsedCache.timestamp > CACHE_DURATION || 
        !parsedCache.f9Videos || 
        !parsedCache.herpVideos || 
        !parsedCache.f9NextPageToken || 
        !parsedCache.herpNextPageToken) {
        console.log('Cache invalid or expired, clearing');
        localStorage.removeItem(CACHE_KEY);
        return null;
    }
    return parsedCache;
}

function setCache(data) {
    const cacheData = {
        timestamp: Date.now(),
        f9Videos: data.f9Videos || [],
        herpVideos: data.herpVideos || [],
        f9NextPageToken: data.f9NextPageToken || null,
        herpNextPageToken: data.herpNextPageToken || null
    };
    console.log('Setting cache with data:', cacheData); // Debug log
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
}

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

async function fetchVideos(channelId, pageToken = '', retryCount = 0) {
    try {
        console.log('Fetching videos with token:', pageToken); // Debug log
        const apiKey = getCurrentApiKey();
        const url = `https://www.googleapis.com/youtube/v3/search?key=${apiKey}&channelId=${channelId}&part=snippet,id&order=date&maxResults=6&pageToken=${pageToken}&type=video`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}`);
        }
        
        const data = await response.json();
        console.log('API Response:', data); // Debug log

        updateQuotaUsage(100);
        const videos = data.items.filter(item => item.id.kind === 'youtube#video' && videoMatchesFilter(item));
        console.log('Filtered videos:', videos.length, 'Next token:', data.nextPageToken); // Debug log
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
    const playerContainer = document.getElementById('latest-video');
    if (playerContainer) {
        playerContainer.innerHTML = `
            <iframe 
                width="100%" 
                height="100%" 
                src="https://www.youtube.com/embed/${videoId}" 
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
        <div class="col-12 mb-2">
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
    
    // Get both content containers
    const regularContent = document.getElementById('regular-content');
    const searchResults = document.getElementById('search-results');
    const searchResultsContainer = document.getElementById('search-results-container');
    
    // If search is empty, show appropriate content
    if (!searchTerm) {
        if (searchResults.classList.contains('d-none')) {
            // We're in regular view, show all videos
            document.querySelectorAll('.card').forEach(card => {
                card.closest('.col-12').classList.remove('d-none');
            });
        } else {
            // We're in search results view, show all results
            document.querySelectorAll('#search-results-container .card').forEach(card => {
                card.closest('.col-12').classList.remove('d-none');
            });
        }
        return;
    }
    
    // Filter function for both views
    const filterCard = (card) => {
        const title = card.querySelector('.card-title').textContent.toLowerCase();
        const description = card.querySelector('.description').textContent.toLowerCase();
        const matches = title.includes(searchTerm) || description.includes(searchTerm);
        card.closest('.col-12').classList.toggle('d-none', !matches);
    };
    
    // Apply filter to appropriate view
    if (searchResults.classList.contains('d-none')) {
        // Filter regular content
        document.querySelectorAll('#regular-content .card').forEach(filterCard);
    } else {
        // Filter search results
        document.querySelectorAll('#search-results-container .card').forEach(filterCard);
    }
}

// Add event listener for Enter key in search input
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => {
        performSearch();
    });
});

async function loadMoreVideos(channel) {
    try {
        console.log('LoadMoreVideos called for channel:', channel); // Debug log
        console.log('Current tokens - F9:', f9NextPageToken, 'Herp:', herpNextPageToken); // Debug log
        
        const container = channel === 'f9bomber' ? 
            document.getElementById('f9bomber-videos') : 
            document.getElementById('herp-videos');
        
        const pageToken = channel === 'f9bomber' ? f9NextPageToken : herpNextPageToken;
        
        console.log('Using page token:', pageToken); // Debug log

        if (!pageToken) {
            console.log('No page token available for', channel);
            const button = document.querySelector(`button[data-channel="${channel}"]`);
            if (button) {
                button.disabled = true;
                button.textContent = 'No More Videos';
            }
            return;
        }

        const channelId = await fetchChannelInfo(CHANNELS[channel], getCurrentApiKey());
        console.log('Channel ID:', channelId); // Debug log
        
        const result = await fetchVideos(channelId, pageToken);
        console.log('Fetch result:', result); // Debug log

        // Update next page token
        if (channel === 'f9bomber') {
            f9NextPageToken = result.nextPageToken;
        } else {
            herpNextPageToken = result.nextPageToken;
        }
        
        console.log('Updated tokens - F9:', f9NextPageToken, 'Herp:', herpNextPageToken); // Debug log

        // Add new videos to container
        if (container && result.videos.length > 0) {
            result.videos.forEach(video => {
                container.insertAdjacentHTML('beforeend', createVideoCard(video));
            });
            allVideos = [...allVideos, ...result.videos];
            console.log('Added', result.videos.length, 'new videos'); // Debug log
        }

        // Update cache with new videos and tokens
        const cache = getCache() || {};
        if (channel === 'f9bomber') {
            cache.f9Videos = [...(cache.f9Videos || []), ...result.videos];
            cache.f9NextPageToken = result.nextPageToken;
        } else {
            cache.herpVideos = [...(cache.herpVideos || []), ...result.videos];
            cache.herpNextPageToken = result.nextPageToken;
        }
        setCache(cache);

        // Disable button if no more videos
        if (!result.nextPageToken) {
            console.log('No next page token in result, disabling button'); // Debug log
            const button = document.querySelector(`button[data-channel="${channel}"]`);
            if (button) {
                button.disabled = true;
                button.textContent = 'No More Videos';
            }
        }

    } catch (error) {
        console.error('Error loading more videos:', error);
        const errorAlert = document.getElementById('api-error-alert');
        const errorMessage = document.getElementById('api-error-message');
        if (errorAlert && errorMessage) {
            errorMessage.textContent = error.message;
            errorAlert.classList.remove('d-none');
        }
    }
}

// Add event listeners for View More buttons
document.addEventListener('DOMContentLoaded', function() {
    // ... existing DOMContentLoaded code ...

    // Add View More button handlers
    document.querySelectorAll('.view-more').forEach(button => {
        button.addEventListener('click', function() {
            const channel = this.dataset.channel;
            loadMoreVideos(channel);
        });
    });
});

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
    // Clear both search inputs
    document.getElementById('search-input').value = '';
    document.getElementById('global-search-input').value = '';
    
    // Hide clear filter button if it exists
    const clearFilterButton = document.getElementById('clear-filter-button');
    if (clearFilterButton) {
        clearFilterButton.classList.add('d-none');
    }

    // Hide search results and show regular content
    document.getElementById('search-results').classList.add('d-none');
    document.getElementById('regular-content').classList.remove('d-none');
    
    // Reset page tokens
    f9NextPageToken = null;
    herpNextPageToken = null;
    
    // Clear any error messages
    const errorAlert = document.getElementById('api-error-alert');
    if (errorAlert) {
        errorAlert.classList.add('d-none');
    }

    // Load videos (will use cache if available)
    loadVideos();
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
    
    // Add View More button handlers - fixed to use loadMoreVideos directly
    document.querySelectorAll('.view-more').forEach(button => {
        button.addEventListener('click', function() {
            const channel = this.dataset.channel;
            loadMoreVideos(channel);
        });
    });

    // Add global search event listeners
    const globalSearchButton = document.getElementById('global-search-button');
    const globalSearchInput = document.getElementById('global-search-input');
    const resetSearchButton = document.getElementById('reset-search-button');
    
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

        // Check cache first
        const cache = getCache();
        if (cache) {
            console.log('Using cached videos and tokens:', cache);
            
            if (f9Container && cache.f9Videos.length > 0) {
                cache.f9Videos.forEach(video => {
                    f9Container.insertAdjacentHTML('beforeend', createVideoCard(video));
                });
                allVideos = [...allVideos, ...cache.f9Videos];
            }
            
            if (herpContainer && cache.herpVideos.length > 0) {
                cache.herpVideos.forEach(video => {
                    herpContainer.insertAdjacentHTML('beforeend', createVideoCard(video));
                });
                allVideos = [...allVideos, ...cache.herpVideos];
            }

            // Restore page tokens from cache
            f9NextPageToken = cache.f9NextPageToken;
            herpNextPageToken = cache.herpNextPageToken;
            
            // Find and play the most recent video from cache
            const allCachedVideos = [...cache.f9Videos, ...cache.herpVideos];
            if (allCachedVideos.length > 0) {
                const mostRecent = allCachedVideos.reduce((latest, current) => {
                    return new Date(current.snippet.publishedAt) > new Date(latest.snippet.publishedAt) ? current : latest;
                });
                updateEmbeddedPlayer(mostRecent.id.videoId);
            }
            
            console.log('Restored tokens from cache - F9:', f9NextPageToken, 'Herp:', herpNextPageToken);
            return;
        }

        // If no cache or expired, fetch from API
        console.log('No valid cache found, fetching from API');
        
        const f9ChannelId = await fetchChannelInfo(CHANNELS.f9bomber, getCurrentApiKey());
        const f9Result = await fetchVideos(f9ChannelId);
        console.log('Initial F9 fetch result:', f9Result);
        f9NextPageToken = f9Result.nextPageToken || null;
        
        const f9Videos = f9Result.videos;
        if (f9Container && f9Videos.length > 0) {
            f9Videos.forEach(video => {
                f9Container.insertAdjacentHTML('beforeend', createVideoCard(video));
            });
            allVideos = [...allVideos, ...f9Videos];
        }

        const herpChannelId = await fetchChannelInfo(CHANNELS.herp, getCurrentApiKey());
        const herpResult = await fetchVideos(herpChannelId);
        console.log('Initial Herp fetch result:', herpResult);
        herpNextPageToken = herpResult.nextPageToken || null;
        
        const herpVideos = herpResult.videos;
        if (herpContainer && herpVideos.length > 0) {
            herpVideos.forEach(video => {
                herpContainer.insertAdjacentHTML('beforeend', createVideoCard(video));
            });
            allVideos = [...allVideos, ...herpVideos];
        }

        // Find and play the most recent video from fresh data
        const allFetchedVideos = [...f9Videos, ...herpVideos];
        if (allFetchedVideos.length > 0) {
            const mostRecent = allFetchedVideos.reduce((latest, current) => {
                return new Date(current.snippet.publishedAt) > new Date(latest.snippet.publishedAt) ? current : latest;
            });
            updateEmbeddedPlayer(mostRecent.id.videoId);
        }

        // Cache the results including page tokens
        const cacheData = {
            f9Videos: f9Videos,
            herpVideos: herpVideos,
            f9NextPageToken: f9NextPageToken,
            herpNextPageToken: herpNextPageToken,
            timestamp: Date.now()
        };
        
        console.log('Caching initial data:', cacheData);
        setCache(cacheData);

        console.log('Initial page tokens set - F9:', f9NextPageToken, 'Herp:', herpNextPageToken);

    } catch (error) {
        console.error('Error loading videos:', error);
        const errorAlert = document.getElementById('api-error-alert');
        const errorMessage = document.getElementById('api-error-message');
        if (errorAlert && errorMessage) {
            errorMessage.textContent = error.message;
            errorAlert.classList.remove('d-none');
        }
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

document.addEventListener('DOMContentLoaded', function() {
    const hideWarning = localStorage.getItem('hideQuotaWarning');
    if (hideWarning !== 'true') {
        const modal = new bootstrap.Modal(document.getElementById('quotaWarningModal'));
        modal.show();
    }

    document.getElementById('dontShowAgainCheck').addEventListener('change', function(e) {
        if (e.target.checked) {
            localStorage.setItem('hideQuotaWarning', 'true');
        } else {
            localStorage.removeItem('hideQuotaWarning');
        }
    });
});

// Twitch integration
const channels = ['blue_banana_bz2', 'happyotter', 'hypervivify_'];

async function updateTwitchStreams() {
    const container = document.getElementById('twitchEmbeds');
    if (!container) return;
    
    container.innerHTML = '';

    for (const channel of channels) {
        const streamContainer = document.createElement('div');
        streamContainer.className = 'mb-4';
        container.appendChild(streamContainer);

        try {
            const embed = new Twitch.Embed(streamContainer, {
                channel: channel,
                width: '100%',
                height: 300,
                layout: 'video',
                parent: ['localhost', 'bz2vsr.com']
            });

            embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
                console.log(`${channel} stream is live!`);
            });

        } catch (error) {
            console.error('Error creating Twitch embed:', error);
            streamContainer.innerHTML = `
                <div class="alert alert-danger">
                    <small>Error loading stream for ${channel}</small>
                </div>
            `;
        }
    }
}

// Initialize Twitch embed after DOM content is loaded
document.addEventListener('DOMContentLoaded', function() {
    updateTwitchStreams();
    // Check for new streams every 30 seconds
    setInterval(updateTwitchStreams, 5 * 60 * 1000);
});