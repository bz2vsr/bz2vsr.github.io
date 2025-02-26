// Register the plugin immediately at the top of the file
if (window.Chart && window.ChartDataLabels) {
    Chart.register(ChartDataLabels);
}

const legendConfig = {
    labels: {
        usePointStyle: true, 
        pointStyle: 'rectRounded',
    }
};

// Add this shared plugin configuration
const datalabelsConfig = {
    anchor: 'center',
    align: 'center',
    clamp: true,
    font: {
        weight: 'bold',
        family: 'monospace'
    },
    color: (context) => {
        const playerFilter = getPlayerParam();
        const label = context.dataset.labels ? 
            context.dataset.labels[context.dataIndex] : 
            context.chart.data.labels[context.dataIndex];
            
        // Target player gets full opacity
        if (playerFilter && label.toLowerCase() === playerFilter.toLowerCase()) {
            return 'rgba(255, 255, 255, 0.65)';
        }
        
        // All rows get 65% opacity
        return 'rgba(255, 255, 255, 0.65)';
    },
    display: (context) => {
        if (context.chart.canvas.id === 'mapsChart') {
            return false;  // No labels for maps chart
        }
        
        // Show all labels
        return true;
    }
};

// Add this helper function at the top
function getPlayerParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const player = urlParams.get('player');
    return player ? player.toLowerCase().replace('_', ' ') : null;
}

// Add this function to populate the dropdown
function populatePlayerDropdown(data) {
    const playerSelect = document.getElementById('playerSelect');
    
    // Get unique players from various data sources
    const players = new Set([
        ...Object.keys(data.all_players_commanded),
        ...data.player_winrate_by_commanding.map(p => p[0]),
        ...Object.keys(data.player_faction_choice)
    ]);
    
    // Sort players alphabetically
    [...players].sort().forEach(player => {
        const option = document.createElement('option');
        option.value = player;  // Keep original case
        option.textContent = player;
        playerSelect.appendChild(option);
    });

    // Set initial value if URL has player parameter
    const urlPlayer = getPlayerParam();
    if (urlPlayer) {
        // Find the matching option regardless of case
        const matchingOption = Array.from(playerSelect.options)
            .find(option => option.value.toLowerCase() === urlPlayer.toLowerCase());
        if (matchingOption) {
            playerSelect.value = matchingOption.value;
        }
    }

    // Add event listeners
    playerSelect.addEventListener('change', (e) => {
        const player = e.target.value;
        if (player) {
            // Update URL with the original case-sensitive player name
            const url = new URL(window.location);
            url.searchParams.set('player', player);
            window.history.pushState({}, '', url);
        } else {
            // Remove parameter if no selection
            const url = new URL(window.location);
            url.searchParams.delete('player');
            window.history.pushState({}, '', url);
        }
        // Refresh all charts
        createMapsChart(data.all_maps_played);
        createPlayersChart(data.all_players_commanded);
        createFactionsChart(data.most_played_factions);
        createWinrateChart(data.player_winrate_by_commanding);
        createFactionChoiceChart(data.player_faction_choice);
    });

    // Add clear button handler
    document.getElementById('clearSelect').addEventListener('click', () => {
        playerSelect.value = '';
        const url = new URL(window.location);
        url.searchParams.delete('player');
        window.history.pushState({}, '', url);
        // Refresh all charts
        createMapsChart(data.all_maps_played);
        createPlayersChart(data.all_players_commanded);
        createFactionsChart(data.most_played_factions);
        createWinrateChart(data.player_winrate_by_commanding);
        createFactionChoiceChart(data.player_faction_choice);
    });
}

// Add at the top with other state variables
let expandedCharts = {
    mapsChart: false,
    playersChart: false,
    winrateChart: false,
    factionChoiceChart: false
};

// Add this function to adjust chart container height
function adjustChartHeight(chartId, expanded) {
    const container = document.querySelector(`#${chartId}`).parentElement;
    if (chartId === 'mapsChart' || chartId === 'factionChoiceChart') {
        container.style.height = expanded ? '1750px' : '400px';  // Maps and faction choice charts
    } else {
        container.style.height = expanded ? '1000px' : '400px';  // Other charts
    }
}

// Add event listeners after chart creation
function addExpandListeners(data) {
    document.getElementById('expandMaps').addEventListener('click', function() {
        expandedCharts.mapsChart = !expandedCharts.mapsChart;
        this.textContent = expandedCharts.mapsChart ? 'Show Less' : 'View More';
        adjustChartHeight('mapsChart', expandedCharts.mapsChart);
        createMapsChart(data.all_maps_played);
    });

    document.getElementById('expandPlayers').addEventListener('click', function() {
        expandedCharts.playersChart = !expandedCharts.playersChart;
        this.textContent = expandedCharts.playersChart ? 'Show Less' : 'View More';
        adjustChartHeight('playersChart', expandedCharts.playersChart);
        createPlayersChart(data.all_players_commanded);
    });

    document.getElementById('expandWinrate').addEventListener('click', function() {
        expandedCharts.winrateChart = !expandedCharts.winrateChart;
        this.textContent = expandedCharts.winrateChart ? 'Show Less' : 'View More';
        adjustChartHeight('winrateChart', expandedCharts.winrateChart);
        createWinrateChart(data.player_winrate_by_commanding);
    });

    document.getElementById('expandFactions').addEventListener('click', function() {
        expandedCharts.factionChoiceChart = !expandedCharts.factionChoiceChart;
        this.textContent = expandedCharts.factionChoiceChart ? 'Show Less' : 'View More';
        adjustChartHeight('factionChoiceChart', expandedCharts.factionChoiceChart);
        createFactionChoiceChart(data.player_faction_choice);
    });

    document.getElementById('expandAll').addEventListener('click', function() {
        const isExpanded = this.textContent === 'Collapse All';
        toggleAllCharts(data, !isExpanded);
    });

    document.getElementById('resetAll').addEventListener('click', function() {
        resetAllCharts(data);
    });
}

// Add this helper function at the top
function handlePlayerClick(playerName) {
    // Update dropdown selection
    const playerSelect = document.getElementById('playerSelect');
    const matchingOption = Array.from(playerSelect.options)
        .find(option => option.value.toLowerCase() === playerName.toLowerCase());
    if (matchingOption) {
        playerSelect.value = matchingOption.value;
        
        // Update URL
        const url = new URL(window.location);
        url.searchParams.set('player', matchingOption.value);
        window.history.pushState({}, '', url);
        
        // Refresh all charts
        createMapsChart(currentData.all_maps_played);
        createPlayersChart(currentData.all_players_commanded);
        createFactionsChart(currentData.most_played_factions);
        createWinrateChart(currentData.player_winrate_by_commanding);
        createFactionChoiceChart(currentData.player_faction_choice);
    }
}

// Store data globally
let currentData = null;

// Load stats data
fetch('https://raw.githubusercontent.com/HerndonE/battlezone-combat-commander-strategy-statistics/refs/heads/main/data/data.json')
    .then(response => response.json())
    .then(rawData => {
        // Use processed_data instead of the raw data
        const data = {
            all_maps_played: rawData.processed_data.processed_map_counts,
            all_players_commanded: rawData.processed_data.processed_commander_list.reduce((acc, [name, count]) => {
                acc[name] = count;
                return acc;
            }, {}),
            most_played_factions: rawData.processed_data.processed_most_played_factions,
            player_winrate_by_commanding: rawData.processed_data.processed_commander_win_percentages,
            // Transform the faction choice data into the expected format
            player_faction_choice: Object.entries(rawData.processed_data.processed_commander_faction_counts).reduce((acc, [player, factions]) => {
                acc[player] = Object.entries(factions).map(([faction, count]) => [faction, count]);
                return acc;
            }, {})
        };

        // Store processed data globally
        currentData = data;
        
        // Initialize charts and UI
        populatePlayerDropdown(data);
        createMapsChart(data.all_maps_played);
        createPlayersChart(data.all_players_commanded);
        createFactionsChart(data.most_played_factions);
        createWinrateChart(data.player_winrate_by_commanding);
        createFactionChoiceChart(data.player_faction_choice);
        addExpandListeners(data);
    })
    .catch(error => {
        console.error('Error loading data:', error);
        // Add error handling UI feedback here if needed
    });

// Add this at the top to store chart instances
let charts = {
    mapsChart: null,
    playersChart: null,
    factionsChart: null,
    winrateChart: null,
    factionChoiceChart: null
};

// Add this function to handle resize
function handleResize() {
    Object.values(charts).forEach(chart => {
        if (chart) {
            chart.resize();
        }
    });
}

// Add the resize event listener after chart registration
window.addEventListener('resize', handleResize);

// Add this shared grid configuration
const gridConfig = {
    display: true,
    drawBorder: true,
    drawOnChartArea: true,
    drawTicks: true,
    color: 'rgba(255, 255, 255, 0.05)'  // Changed from 0.5 to 0.05 for 5% opacity
};

// Modify each create function to destroy existing chart first
function createMapsChart(mapsData) {
    if (charts.mapsChart) {
        charts.mapsChart.destroy();
    }
    const ctx = document.getElementById('mapsChart').getContext('2d');
    
    const sortedData = Object.entries(mapsData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, expandedCharts.mapsChart ? undefined : 20);

    const maxValue = Math.max(...sortedData.map(([,count]) => count));

    charts.mapsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(([map]) => map),
            datasets: [{
                label: 'Times Played',
                data: sortedData.map(([,count]) => count),
                backgroundColor: 'rgba(54, 162, 235, 0.75)',
                hoverBackgroundColor: 'rgba(54, 162, 235, 1)',  // Full opacity on hover
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            }]
        },
        options: {
            maintainAspectRatio: false,
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Most Played Maps'
                },
                legend: {
                    display: false
                },
                datalabels: {
                    display: false  // Disable datalabels for maps chart
                }
            },
            scales: {
                x: {
                    grid: gridConfig,
                    max: maxValue,
                    beginAtZero: true
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        autoSkip: false  // Prevent skipping labels
                    }
                }
            }
        }
    });
}

// Add this helper function to check if a player is in the data
function isPlayerInData(player, data, accessor) {
    return data.some(item => accessor(item).toLowerCase() === player.toLowerCase());
}

function createPlayersChart(playersData) {
    if (charts.playersChart) {
        charts.playersChart.destroy();
    }
    const ctx = document.getElementById('playersChart').getContext('2d');
    const playerFilter = getPlayerParam();
    
    // Get all data first
    let sortedData = Object.entries(playersData)
        .sort(([,a], [,b]) => b - a);

    // If chart is collapsed and player is selected
    if (!expandedCharts.playersChart && playerFilter) {
        // Check if player is not in the top 15
        if (!sortedData.slice(0, 15).some(([player]) => player.toLowerCase() === playerFilter.toLowerCase())) {
            // Find the player's data
            const playerData = sortedData.find(([player]) => player.toLowerCase() === playerFilter.toLowerCase());
            if (playerData) {
                // Remove from current position and add to end of visible range
                sortedData = sortedData.filter(([player]) => player.toLowerCase() !== playerFilter.toLowerCase());
                sortedData = [...sortedData.slice(0, 14), playerData];
            }
        }
    }

    // Apply slice after player addition
    if (!expandedCharts.playersChart) {
        sortedData = sortedData.slice(0, 15);
    }

    const maxValue = Math.max(...sortedData.map(([,count]) => count));

    charts.playersChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(([player]) => player),
            datasets: [{
                label: 'Times Commanded',
                data: sortedData.map(([,count]) => count),
                backgroundColor: playerFilter 
                    ? sortedData.map(([player]) => 
                        player.toLowerCase() === playerFilter.toLowerCase()
                            ? 'rgba(255, 215, 0, 0.75)'
                            : 'rgba(128, 128, 128, 0.35)'
                    )
                    : 'rgba(255, 99, 132, 0.75)',
                hoverBackgroundColor: playerFilter
                    ? sortedData.map(([player]) => 
                        player.toLowerCase() === playerFilter.toLowerCase()
                            ? 'rgba(255, 215, 0, 1)'
                            : 'rgba(128, 128, 128, 0.6)'
                    )
                    : 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
            }]
        },
        options: {
            maintainAspectRatio: false,
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Most Active Commanders'
                },
                legend: {
                    display: false,
                },
                datalabels: datalabelsConfig
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const playerName = sortedData[index][0];
                    handlePlayerClick(playerName);
                }
            },
            scales: {
                x: {
                    grid: gridConfig,
                    max: maxValue,
                    beginAtZero: true
                },
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createFactionsChart(factionsData) {
    if (charts.factionsChart) {
        charts.factionsChart.destroy();
    }
    const ctx = document.getElementById('factionsChart').getContext('2d');
    
    // Calculate total games for max x-axis value and title
    const totalGames = Object.values(factionsData).reduce((sum, count) => sum + count, 0);
    
    // Create a single data point with all factions stacked
    const data = {
        labels: [''],
        datasets: Object.entries(factionsData).map(([faction, count]) => ({
            label: faction,
            data: [count],
            backgroundColor: faction === 'I.S.D.F' ? 'rgba(54, 162, 235, 0.75)' :
                           faction === 'Hadean' ? 'rgba(255, 99, 132, 0.75)' :
                           'rgba(255, 206, 86, 0.75)',
            borderColor: faction === 'I.S.D.F' ? 'rgba(54, 162, 235, 1)' :
                        faction === 'Hadean' ? 'rgba(255, 99, 132, 1)' :
                        'rgba(255, 206, 86, 1)',
            borderWidth: 1
        }))
    };

    const maxValue = Math.max(...Object.values(factionsData).map(count => count));

    charts.factionsChart = new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            maintainAspectRatio: false,
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Faction Distribution Totals (${totalGames} total games)`
                },
                legend: legendConfig,
                datalabels: datalabelsConfig
            },
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    max: totalGames,
                    ticks: {
                        display: false
                    },
                    grid: {
                        display: false  // Disable grid lines for this chart
                    }
                },
                y: {
                    stacked: true
                }
            }
        }
    });
} 

function createWinrateChart(winrateData) {
    if (charts.winrateChart) {
        charts.winrateChart.destroy();
    }
    const ctx = document.getElementById('winrateChart').getContext('2d');
    const playerFilter = getPlayerParam();
    
    // Filter and sort all data first
    let filteredData = winrateData
        .filter(player => player[2] >= 5)  // Check index 2 (third value) for minimum games
        .sort((a, b) => b[1] - a[1]);     // Still sort by win percentage at index 1

    // If chart is collapsed and player is selected
    if (!expandedCharts.winrateChart && playerFilter) {
        // Check if player is not in the top 15
        if (!filteredData.slice(0, 15).some(player => player[0].toLowerCase() === playerFilter.toLowerCase())) {
            // Find the player's data
            const playerData = filteredData.find(player => player[0].toLowerCase() === playerFilter.toLowerCase());
            if (playerData) {
                // Remove from current position and add to end of visible range
                filteredData = filteredData.filter(player => player[0].toLowerCase() !== playerFilter.toLowerCase());
                filteredData = [...filteredData.slice(0, 14), playerData];
            }
        }
    }

    // Apply slice after player addition
    if (!expandedCharts.winrateChart) {
        filteredData = filteredData.slice(0, 15);
    }

    const maxValue = Math.max(...filteredData.map(player => player[1]));

    charts.winrateChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: filteredData.map(player => player[0]),
            datasets: [{
                label: 'Winrate %',
                data: filteredData.map(player => player[1]),
                backgroundColor: playerFilter
                    ? filteredData.map(player => 
                        player[0].toLowerCase() === playerFilter.toLowerCase()
                            ? 'rgba(255, 215, 0, 0.75)'
                            : 'rgba(128, 128, 128, 0.35)'
                    )
                    : 'rgba(75, 192, 192, 0.75)',
                hoverBackgroundColor: playerFilter
                    ? filteredData.map(player => 
                        player[0].toLowerCase() === playerFilter.toLowerCase()
                            ? 'rgba(255, 215, 0, 1)'
                            : 'rgba(128, 128, 128, 0.6)'
                    )
                    : 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            }]
        },
        options: {
            maintainAspectRatio: false,
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Commander Winrates (min. 5 games)'
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const player = filteredData[context.dataIndex];
                            const winrate = player[1].toFixed(1);
                            const totalGames = player[2];
                            const wins = player[3];
                            return `Winrate: ${winrate}% (${totalGames} games/${wins} wins)`;
                        }
                    }
                },
                datalabels: {
                    ...datalabelsConfig,
                    formatter: (value, context) => {
                        const player = filteredData[context.dataIndex];
                        const winrate = player[1].toFixed(1);
                        const totalGames = player[2];
                        const wins = player[3];
                        
                        // Show detailed stats for all bars
                        return `${winrate}% (${totalGames}/${wins})`;
                    }
                }
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const playerName = filteredData[index][0];
                    handlePlayerClick(playerName);
                }
            },
            scales: {
                x: {
                    grid: gridConfig,
                    max: maxValue,
                    beginAtZero: true
                },
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function createFactionChoiceChart(factionChoiceData) {
    if (charts.factionChoiceChart) {
        charts.factionChoiceChart.destroy();
    }
    const ctx = document.getElementById('factionChoiceChart').getContext('2d');
    const playerFilter = getPlayerParam();
    
    // Get all players sorted by total games
    let topPlayers = Object.entries(factionChoiceData)
        .map(([player, factions]) => ({
            player,
            total: factions.reduce((sum, [,count]) => sum + count, 0)
        }))
        .sort((a, b) => b.total - a.total);

    // If chart is collapsed and player is selected
    if (!expandedCharts.factionChoiceChart && playerFilter) {
        // Check if player is not in the top 10
        if (!topPlayers.slice(0, 10).some(({player}) => player.toLowerCase() === playerFilter.toLowerCase())) {
            // Find the player's data
            const playerData = topPlayers.find(({player}) => player.toLowerCase() === playerFilter.toLowerCase());
            if (playerData) {
                // Remove from current position and add to end of visible range
                topPlayers = topPlayers.filter(({player}) => player.toLowerCase() !== playerFilter.toLowerCase());
                topPlayers = [...topPlayers.slice(0, 9), playerData];
            }
        }
    }

    // Apply slice after player addition
    if (!expandedCharts.factionChoiceChart) {
        topPlayers = topPlayers.slice(0, 10);
    }

    // Store the highest total before converting topPlayers to just names
    const maxTotal = Math.max(...topPlayers.map(p => p.total));
    
    topPlayers = topPlayers.map(({player}) => player);

    const datasets = ['I.S.D.F', 'Hadean', 'Scion'].map(faction => ({
        label: faction,
        data: topPlayers.map(player => {
            const factionData = factionChoiceData[player].find(([f]) => f === faction);
            return factionData ? factionData[1] : 0;
        }),
        backgroundColor: topPlayers.map(player => {
            const baseColor = faction === 'I.S.D.F' ? 'rgba(54, 162, 235, ' :
                            faction === 'Hadean' ? 'rgba(255, 99, 132, ' :
                            'rgba(255, 206, 86, ';
            // If no player is filtered, use 0.75 opacity for all
            // If player is filtered, use 0.75 for selected player and 0.35 for others
            return playerFilter 
                ? (player.toLowerCase() === playerFilter.toLowerCase() 
                    ? baseColor + '0.75)'
                    : baseColor + '0.35)')
                : baseColor + '0.75)';
        }),
        borderColor: faction === 'I.S.D.F' ? 'rgba(54, 162, 235, 1)' :
                    faction === 'Hadean' ? 'rgba(255, 99, 132, 1)' :
                    'rgba(255, 206, 86, 1)',
        borderWidth: 1
    }));

    charts.factionChoiceChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topPlayers,
            datasets: datasets
        },
        options: {
            maintainAspectRatio: false,
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Top Players Faction Distribution'
                },
                datalabels: datalabelsConfig
            },
            onClick: (event, elements) => {
                if (elements.length > 0) {
                    const index = elements[0].index;
                    const playerName = topPlayers[index];
                    handlePlayerClick(playerName);
                }
            },
            scales: {
                x: {
                    stacked: true,
                    grid: gridConfig,
                    max: maxTotal,
                    beginAtZero: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true
                }
            },
            legend: legendConfig
        }
    });
} 

// Add this function to handle expanding/collapsing all charts
function toggleAllCharts(data, expand) {
    // Update all chart states to the specified state
    Object.keys(expandedCharts).forEach(key => {
        expandedCharts[key] = expand;
    });

    // Update all button texts to match the specified state
    document.getElementById('expandMaps').textContent = expand ? 'Show Less' : 'View More';
    document.getElementById('expandPlayers').textContent = expand ? 'Show Less' : 'View More';
    document.getElementById('expandWinrate').textContent = expand ? 'Show Less' : 'View More';
    document.getElementById('expandFactions').textContent = expand ? 'Show Less' : 'View More';
    document.getElementById('expandAll').textContent = expand ? 'Collapse All' : 'Expand All';

    // Adjust heights and redraw charts
    adjustChartHeight('mapsChart', expand);
    adjustChartHeight('playersChart', expand);
    adjustChartHeight('winrateChart', expand);
    adjustChartHeight('factionChoiceChart', expand);

    createMapsChart(data.all_maps_played);
    createPlayersChart(data.all_players_commanded);
    createWinrateChart(data.player_winrate_by_commanding);
    createFactionChoiceChart(data.player_faction_choice);
} 

// Add this function to handle complete reset
function resetAllCharts(data) {
    // Reset dropdown
    document.getElementById('playerSelect').value = '';
    
    // Clear URL parameter
    const url = new URL(window.location);
    url.searchParams.delete('player');
    window.history.pushState({}, '', url);

    // Collapse all charts
    expandedCharts.mapsChart = false;
    expandedCharts.playersChart = false;
    expandedCharts.winrateChart = false;
    expandedCharts.factionChoiceChart = false;

    // Update all button texts
    document.getElementById('expandMaps').textContent = 'View More';
    document.getElementById('expandPlayers').textContent = 'View More';
    document.getElementById('expandWinrate').textContent = 'View More';
    document.getElementById('expandFactions').textContent = 'View More';
    document.getElementById('expandAll').textContent = 'Expand All';

    // Reset chart heights
    adjustChartHeight('mapsChart', false);
    adjustChartHeight('playersChart', false);
    adjustChartHeight('winrateChart', false);
    adjustChartHeight('factionChoiceChart', false);

    // Redraw all charts
    createMapsChart(data.all_maps_played);
    createPlayersChart(data.all_players_commanded);
    createFactionsChart(data.most_played_factions);
    createWinrateChart(data.player_winrate_by_commanding);
    createFactionChoiceChart(data.player_faction_choice);
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