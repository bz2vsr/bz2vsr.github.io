const legendConfig = {
    labels: {
        usePointStyle: true, 
        pointStyle: 'rectRounded',
    }
};

// Add this shared plugin configuration
const datalabelsConfig = {
    anchor: 'center',  // Center point of attachment to the bar
    align: 'center',   // Center the text relative to the anchor point
    clamp: true,      // Prevent labels from exceeding chart area
    font: {
        weight: 'bold'
    },
    // Display labels with different opacities
    color: (context) => {
        const playerFilter = getPlayerParam();
        const label = context.dataset.labels ? 
            context.dataset.labels[context.dataIndex] : // For stacked charts
            context.chart.data.labels[context.dataIndex]; // For regular charts
            
        // Target player gets full opacity
        if (playerFilter && label.toLowerCase() === playerFilter) {
            return 'rgba(255, 255, 255, 0.65)';
        }
        
        // Top 3 get 65% opacity
        if (context.dataIndex < 3) {
            return 'rgba(255, 255, 255, 0.65)';
        }
        
        // Others get 25% opacity
        return 'rgba(255, 255, 255, 0.25)';
    },
    // Only display labels for target player and top 3
    display: (context) => {
        if (context.chart.canvas.id === 'mapsChart') {
            return false;  // No labels for maps chart
        }
        
        const playerFilter = getPlayerParam();
        const label = context.dataset.labels ? 
            context.dataset.labels[context.dataIndex] : 
            context.chart.data.labels[context.dataIndex];
            
        // Show label if it's target player or in top 3
        return (playerFilter && label.toLowerCase() === playerFilter) || 
               context.dataIndex < 3;
    }
};

// Register the plugin
Chart.register(ChartDataLabels);

// Add this helper function at the top
function getPlayerParam() {
    const urlParams = new URLSearchParams(window.location.search);
    const player = urlParams.get('player');
    return player ? player.toLowerCase().replace('_', ' ') : null;
}

// Load stats data
fetch('/data/stats/stats.json')
    .then(response => response.json())
    .then(data => {
        createMapsChart(data.all_maps_played);
        createPlayersChart(data.all_players_commanded);
        createFactionsChart(data.most_played_factions);
        createWinrateChart(data.player_winrate_by_commanding);
        createFactionChoiceChart(data.player_faction_choice);
    });

function createMapsChart(mapsData) {
    const ctx = document.getElementById('mapsChart').getContext('2d');
    
    const sortedData = Object.entries(mapsData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(([map]) => map),
            datasets: [{
                label: 'Times Played',
                data: sortedData.map(([,count]) => count),
                backgroundColor: 'rgba(54, 162, 235, 0.75)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            }]
        },
        options: {
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

function createPlayersChart(playersData) {
    const ctx = document.getElementById('playersChart').getContext('2d');
    const playerFilter = getPlayerParam();
    
    const sortedData = Object.entries(playersData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(([player]) => player),
            datasets: [{
                label: 'Times Commanded',
                data: sortedData.map(([,count]) => count),
                backgroundColor: playerFilter 
                    ? sortedData.map(([player]) => 
                        player.toLowerCase() === playerFilter 
                            ? 'rgba(255, 215, 0, 0.75)'
                            : 'rgba(128, 128, 128, 0.35)'
                    )
                    : 'rgba(255, 99, 132, 0.75)',  // Default color if no player filter
                borderColor: playerFilter
                    ? sortedData.map(([player]) => 
                        player.toLowerCase() === playerFilter 
                            ? 'rgba(255, 215, 0, 1)'
                            : 'rgba(128, 128, 128, 0.5)'
                    )
                    : 'rgba(255, 99, 132, 1)',  // Default border if no player filter
                borderWidth: 1,
            }]
        },
        options: {
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
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createFactionsChart(factionsData) {
    const ctx = document.getElementById('factionsChart').getContext('2d');
    
    // Calculate total games for max x-axis value
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

    new Chart(ctx, {
        type: 'bar',
        data: data,
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 14,
            plugins: {
                title: {
                    display: true,
                    text: 'Faction Distribution Totals'
                },
                legend: legendConfig,
                datalabels: datalabelsConfig
            },
            scales: {
                x: {
                    stacked: true,
                    beginAtZero: true,
                    max: totalGames  // Set max to total games
                },
                y: {
                    stacked: true
                }
            }
        }
    });
} 

function createWinrateChart(winrateData) {
    const ctx = document.getElementById('winrateChart').getContext('2d');
    const playerFilter = getPlayerParam();
    
    const filteredData = winrateData
        .filter(player => player[1] >= 5)
        .sort((a, b) => b[3] - a[3])
        .slice(0, 15);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: filteredData.map(player => player[0]),
            datasets: [{
                label: 'Winrate %',
                data: filteredData.map(player => player[3]),
                backgroundColor: playerFilter
                    ? filteredData.map(player => 
                        player[0].toLowerCase() === playerFilter 
                            ? 'rgba(255, 215, 0, 0.75)'
                            : 'rgba(128, 128, 128, 0.35)'
                    )
                    : 'rgba(75, 192, 192, 0.75)',  // Default color if no player filter
                borderColor: playerFilter
                    ? filteredData.map(player => 
                        player[0].toLowerCase() === playerFilter 
                            ? 'rgba(255, 215, 0, 1)'
                            : 'rgba(128, 128, 128, 0.5)'
                    )
                    : 'rgba(75, 192, 192, 1)',  // Default border if no player filter
                borderWidth: 1,
            }]
        },
        options: {
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
                datalabels: {
                    ...datalabelsConfig,
                    formatter: (value) => value.toFixed(1) + '%'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

function createFactionChoiceChart(factionChoiceData) {
    const ctx = document.getElementById('factionChoiceChart').getContext('2d');
    const playerFilter = getPlayerParam();
    
    const topPlayers = Object.entries(factionChoiceData)
        .map(([player, factions]) => ({
            player,
            total: factions.reduce((sum, [,count]) => sum + count, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map(({player}) => player);

    const datasets = ['I.S.D.F', 'Hadean', 'Scion'].map(faction => ({
        label: faction,
        data: topPlayers.map(player => {
            const factionData = factionChoiceData[player].find(([f]) => f === faction);
            return factionData ? factionData[1] : 0;
        }),
        labels: topPlayers, // Add labels array for datalabels display condition
        borderWidth: 1,
        backgroundColor: topPlayers.map(player => {
            const baseColor = faction === 'I.S.D.F' ? 'rgba(54, 162, 235, 0.75)' :
                            faction === 'Hadean' ? 'rgba(255, 99, 132, 0.75)' :
                            'rgba(255, 206, 86, 0.75)';
            return playerFilter && player.toLowerCase() === playerFilter 
                ? baseColor
                : playerFilter ? baseColor.replace('0.75', '0.15') : baseColor;
        })
    }));

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: topPlayers,
            datasets: datasets
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Top Players Faction Distribution'
                },
                datalabels: datalabelsConfig
            },
            scales: {
                x: {
                    stacked: true
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