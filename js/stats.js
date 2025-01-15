const legendConfig = {
    labels: {
        usePointStyle: true, 
        pointStyle: 'rectRounded',
    }
};

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
    
    // Sort data by play count descending
    const sortedData = Object.entries(mapsData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 20); // Show top 20 maps

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(([map]) => map),
            datasets: [{
                label: 'Times Played',
                data: sortedData.map(([,count]) => count),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
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
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function createPlayersChart(playersData) {
    const ctx = document.getElementById('playersChart').getContext('2d');
    
    // Sort data by command count descending
    const sortedData = Object.entries(playersData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 15); // Show top 15 players

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedData.map(([player]) => player),
            datasets: [{
                label: 'Times Commanded',
                data: sortedData.map(([,count]) => count),
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth:1,
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
                }
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
            backgroundColor: faction === 'I.S.D.F' ? 'rgba(54, 162, 235, 0.5)' :
                           faction === 'Hadean' ? 'rgba(255, 99, 132, 0.5)' :
                           'rgba(255, 206, 86, 0.5)',
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
                    text: 'Faction Distribution'
                },
                legend: legendConfig
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
    
    // Filter for players with at least 5 games and sort by winrate
    const filteredData = winrateData
        .filter(player => player[1] >= 5)
        .sort((a, b) => b[3] - a[3])
        .slice(0, 15); // Show top 15 players

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: filteredData.map(player => player[0]),
            datasets: [{
                label: 'Winrate %',
                data: filteredData.map(player => player[3]),
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth:1,
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
    
    // Get top 10 players by total games
    const topPlayers = Object.entries(factionChoiceData)
        .map(([player, factions]) => ({
            player,
            total: factions.reduce((sum, [,count]) => sum + count, 0)
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map(({player}) => player);

    // Prepare data for each faction
    const datasets = ['I.S.D.F', 'Hadean', 'Scion'].map(faction => ({
        label: faction,
        data: topPlayers.map(player => {
            const factionData = factionChoiceData[player].find(([f]) => f === faction);
            return factionData ? factionData[1] : 0;
        }),
        borderWidth: 1,
        backgroundColor: faction === 'I.S.D.F' ? 'rgba(54, 162, 235, 0.5)' :
                        faction === 'Hadean' ? 'rgba(255, 99, 132, 0.5)' :
                        'rgba(255, 206, 86, 0.5)'
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
                }
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