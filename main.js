/**
 * Gacha-Log Tracker (仮)
 */

// --- State Management ---
let state = {
    games: [],
    currentGameId: null,
    history: []
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log('Gacha-Log Tracker Initializing...');
    try {
        loadState();
        setupEventListeners();
        renderSidebar();

        setNowDate();

        if (state.currentGameId) {
            selectGame(state.currentGameId);
        } else if (state.games.length > 0) {
            selectGame(state.games[0].id);
        }
        console.log('Gacha-Log Tracker Initialized Successfully');
        document.title = "Gacha-Log Tracker (Ready)"; // Visual indicator
    } catch (error) {
        console.error('Initialization failed:', error);
        alert('ツールの起動に失敗しました。ブラウザのキャッシュをクリアして再試行してください。');
    }
});

// --- Local Storage ---
function loadState() {
    try {
        const saved = localStorage.getItem('gacha_tracker_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Basic structure validation
            if (parsed && typeof parsed === 'object') {
                state = { ...state, ...parsed };
            }
        }
    } catch (e) {
        console.warn('Failed to load state from localStorage:', e);
    }

    if (!state.games || state.games.length === 0) {
        state.games = [
            {
                id: '1',
                name: 'サンプルゲーム',
                rarities: [
                    { name: 'SSR', rate: 3, color: '#fbbf24' },
                    { name: 'SR', rate: 12, color: '#a855f7' },
                    { name: 'R', rate: 85, color: '#64748b' }
                ]
            }
        ];
        saveState();
    }
}

function saveState() {
    localStorage.setItem('gacha_tracker_state', JSON.stringify(state));
}

// --- Event Listeners ---
function setupEventListeners() {
    const addBtn = document.getElementById('add-game-btn');
    if (addBtn) addBtn.addEventListener('click', () => openModal());

    const editBtn = document.getElementById('edit-game-btn');
    if (editBtn) editBtn.addEventListener('click', () => {
        if (state.currentGameId) openModal(state.currentGameId);
    });

    const closeBtn = document.getElementById('close-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => closeModal());

    const settingsForm = document.getElementById('game-settings-form');
    if (settingsForm) settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveGameSettings();
    });

    const deleteBtn = document.getElementById('delete-game-btn');
    if (deleteBtn) deleteBtn.addEventListener('click', () => {
        const gameId = document.getElementById('settings-modal').dataset.gameId;
        if (gameId) deleteGame(gameId);
    });

    const addRowBtn = document.getElementById('add-rarity-row');
    if (addRowBtn) addRowBtn.addEventListener('click', () => addRarityRow());

    const submitBtn = document.getElementById('submit-pull');
    if (submitBtn) submitBtn.addEventListener('click', () => submitPull());

    const nowBtn = document.getElementById('set-now-btn');
    if (nowBtn) nowBtn.addEventListener('click', () => setNowDate());

    // Data handling
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.addEventListener('click', exportData);

    const importBtn = document.getElementById('import-btn');
    const importFileInput = document.getElementById('import-file');
    if (importBtn && importFileInput) {
        importBtn.addEventListener('click', () => importFileInput.click());
        importFileInput.addEventListener('change', importData);
    }

    // Mobile Sidebar UI
    const menuBtn = document.getElementById('menu-toggle-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const overlay = document.getElementById('sidebar-overlay');
    const sidebar = document.getElementById('sidebar');

    const toggleSidebar = (show) => {
        if (show) {
            sidebar.classList.add('open');
            overlay.classList.add('active');
        } else {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        }
    };

    if (menuBtn) menuBtn.addEventListener('click', () => toggleSidebar(true));
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', () => toggleSidebar(false));
    if (overlay) overlay.addEventListener('click', () => toggleSidebar(false));
}

function exportData() {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `gacha-log-tracker-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (!confirm('現在のデータが上書きされます。よろしいですか？')) {
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedState = JSON.parse(event.target.result);
            if (!importedState.games || !importedState.history) {
                throw new Error('Invalid data format');
            }
            state = importedState;
            saveState();
            location.reload(); // Refresh to apply everything easily
        } catch (err) {
            alert('データの読み込みに失敗しました。正しいJSONファイルかご確認ください。');
        }
    };
    reader.readAsText(file);
}

function setNowDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    document.getElementById('pull-date').value = `${year}-${month}-${day}`;
}

// --- Sidebar ---
function renderSidebar() {
    const list = document.getElementById('game-list-items');
    list.innerHTML = '';
    state.games.forEach(game => {
        const li = document.createElement('li');
        li.className = `game-item ${game.id === state.currentGameId ? 'active' : ''}`;
        li.textContent = game.name;
        li.onclick = () => selectGame(game.id);
        list.appendChild(li);
    });
}

function selectGame(id) {
    state.currentGameId = id;
    const game = state.games.find(g => g.id === id);
    if (!game) {
        state.currentGameId = state.games.length > 0 ? state.games[0].id : null;
        if (state.currentGameId) selectGame(state.currentGameId);
        return;
    }
    document.getElementById('current-game-title').textContent = game.name;

    renderSidebar();
    renderRarityInputs(game);
    updateDashboard();
    renderHistory();
    saveState();

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (window.innerWidth <= 768 && sidebar) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    }
}

// --- Rarity Inputs ---
function renderRarityInputs(game) {
    const container = document.getElementById('rarity-inputs-container');
    container.innerHTML = '';
    game.rarities.forEach(rarity => {
        const div = document.createElement('div');
        div.className = 'rarity-input-item';
        div.innerHTML = `
            <label style="color: ${rarity.color}">${rarity.name} 数</label>
            <input type="number" class="rarity-count-input" data-rarity="${rarity.name}" value="0" min="0">
        `;
        container.appendChild(div);
    });
}

// --- Dashboard & Chart ---
let rateChart = null;

function updateDashboard() {
    const game = state.games.find(g => g.id === state.currentGameId);
    if (!game) {
        document.getElementById('total-pulls').textContent = '0';
        if (rateChart) rateChart.destroy();
        return;
    }

    const gameHistory = state.history.filter(h => h.gameId === state.currentGameId);

    const totalPulls = gameHistory.reduce((sum, h) => sum + h.totalCount, 0);
    document.getElementById('total-pulls').textContent = totalPulls;

    // Calculate actual counts from history
    const actualCounts = {};
    game.rarities.forEach(r => actualCounts[r.name] = 0);

    gameHistory.forEach(h => {
        Object.entries(h.results).forEach(([rarity, count]) => {
            if (actualCounts.hasOwnProperty(rarity)) {
                actualCounts[rarity] += count;
            }
        });
    });

    const labels = game.rarities.map(r => r.name);
    const expectedData = game.rarities.map(r => r.rate);
    const actualData = game.rarities.map(r => {
        return totalPulls > 0 ? (actualCounts[r.name] / totalPulls * 100).toFixed(2) : 0;
    });

    renderChart(labels, expectedData, actualData, game.rarities.map(r => r.color));
    renderStatsDetail(game.rarities, actualCounts, totalPulls);
    renderRaritySummary(game.rarities, actualCounts);
}

function renderRaritySummary(rarities, actualCounts) {
    const container = document.getElementById('rarity-totals-summary');
    container.innerHTML = '';
    rarities.forEach(r => {
        const div = document.createElement('div');
        div.className = 'rarity-total-item';
        div.innerHTML = `
            <span class="label" style="color: ${r.color}">${r.name} 累計</span>
            <span class="value">${actualCounts[r.name]}</span>
        `;
        container.appendChild(div);
    });
}

function renderStatsDetail(rarities, actualCounts, totalPulls) {
    const container = document.getElementById('stats-detail-list');
    container.innerHTML = '';

    rarities.forEach(r => {
        const actualRate = totalPulls > 0 ? (actualCounts[r.name] / totalPulls * 100).toFixed(2) : '0.00';
        const div = document.createElement('div');
        div.className = 'detail-item';
        div.innerHTML = `
            <span class="detail-label" style="color: ${r.color}">${r.name}</span>
            <div class="detail-values">
                <span class="detail-actual">${actualRate}%</span>
                <span class="detail-expected">理論値: ${r.rate}%</span>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderChart(labels, expected, actual, colors) {
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js is not loaded yet.');
        return;
    }
    const ctx = document.getElementById('rate-chart').getContext('2d');

    if (rateChart) {
        rateChart.destroy();
    }

    rateChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '理論値 (%)',
                    data: expected,
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 1
                },
                {
                    label: '実測値 (%)',
                    data: actual,
                    backgroundColor: colors,
                    borderRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    ticks: { color: '#94a3b8' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8' }
                }
            },
            plugins: {
                legend: {
                    labels: { color: '#f1f5f9' }
                }
            }
        }
    });
}

// --- Pull Logic ---
function submitPull() {
    if (!state.currentGameId) return;

    const totalCount = parseInt(document.getElementById('total-pull-count').value);
    const pullDate = document.getElementById('pull-date').value;
    const memo = document.getElementById('pull-memo').value;

    const results = {};
    const inputs = document.querySelectorAll('.rarity-count-input');
    let enteredCount = 0;

    inputs.forEach(input => {
        const count = parseInt(input.value) || 0;
        results[input.dataset.rarity] = count;
        enteredCount += count;
    });

    if (enteredCount > totalCount) {
        alert('レアリティごとの合計数が、総引いた回数を超えています。');
        return;
    }

    // Handle date properly without time
    const dateParts = pullDate.split('-');
    const dateObj = pullDate ? new Date(dateParts[0], dateParts[1] - 1, dateParts[2]) : new Date();
    const displayDate = dateObj.toLocaleDateString([], {
        year: 'numeric', month: '2-digit', day: '2-digit'
    });

    const pullEntry = {
        id: Date.now().toString(),
        gameId: state.currentGameId,
        timestamp: displayDate,
        rawDate: dateObj.getTime(),
        totalCount: totalCount,
        results: results,
        memo: memo
    };

    state.history.unshift(pullEntry);
    state.history.sort((a, b) => b.rawDate - a.rawDate);

    saveState();
    updateDashboard();
    renderHistory();

    inputs.forEach(input => input.value = 0);
    document.getElementById('pull-memo').value = '';
}

function renderHistory() {
    const body = document.getElementById('history-body');
    body.innerHTML = '';

    const game = state.games.find(g => g.id === state.currentGameId);
    if (!game) return;

    const gameHistory = state.history.filter(h => h.gameId === state.currentGameId);
    const gameRarities = game.rarities;

    gameHistory.forEach(h => {
        const row = document.createElement('tr');

        const resultString = Object.entries(h.results)
            .filter(([name, count]) => count > 0)
            .map(([name, count]) => {
                const color = gameRarities.find(r => r.name === name)?.color || '#fff';
                return `<span style="color: ${color}; font-weight: bold;">${name}x${count}</span>`;
            })
            .join(', ') || 'なし';

        row.innerHTML = `
            <td>${h.timestamp}</td>
            <td>${h.totalCount}</td>
            <td>${resultString}</td>
            <td>${h.memo}</td>
            <td><button class="btn-ghost" onclick="deleteHistory('${h.id}')">削除</button></td>
        `;
        body.appendChild(row);
    });
}

window.deleteHistory = function (id) {
    state.history = state.history.filter(h => h.id !== id);
    saveState();
    updateDashboard();
    renderHistory();
};

// --- Modal Management ---
function openModal(gameId = null) {
    const modal = document.getElementById('settings-modal');
    const title = document.getElementById('modal-title');
    const nameInput = document.getElementById('setting-game-name');
    const rarityContainer = document.getElementById('rarity-settings-list');
    const deleteBtn = document.getElementById('delete-game-btn');

    rarityContainer.innerHTML = '';
    modal.dataset.gameId = gameId || '';

    if (gameId) {
        const game = state.games.find(g => g.id === gameId);
        title.textContent = 'ゲーム設定を編集';
        nameInput.value = game.name;
        game.rarities.forEach(r => addRarityRow(r.name, r.rate, r.color));
        deleteBtn.style.display = 'block';
    } else {
        title.textContent = '新しいゲームを追加';
        nameInput.value = '';
        addRarityRow('SSR', 3, '#fbbf24');
        addRarityRow('SR', 12, '#a855f7');
        addRarityRow('R', 85, '#64748b');
        deleteBtn.style.display = 'none';
    }

    modal.classList.add('open');
}

function closeModal() {
    document.getElementById('settings-modal').classList.remove('open');
}

function addRarityRow(name = '', rate = '', color = '#ffffff') {
    const container = document.getElementById('rarity-settings-list');
    const row = document.createElement('div');
    row.className = 'rarity-setting-row';
    row.innerHTML = `
        <input type="text" placeholder="名" value="${name}" required style="flex: 2">
        <input type="number" placeholder="%" value="${rate}" step="0.01" required style="flex: 1">
        <input type="color" value="${color}" style="flex: 0.5; padding: 0; height: 38px">
        <button type="button" class="btn-icon" onclick="this.parentElement.remove()">×</button>
    `;
    container.appendChild(row);
}

function saveGameSettings() {
    const modal = document.getElementById('settings-modal');
    const gameId = modal.dataset.gameId;
    const name = document.getElementById('setting-game-name').value;
    const rarityRows = document.querySelectorAll('.rarity-setting-row');
    const rarities = Array.from(rarityRows).map(row => {
        const inputs = row.querySelectorAll('input');
        return {
            name: inputs[0].value,
            rate: parseFloat(inputs[1].value),
            color: inputs[2].value
        };
    });

    if (gameId) {
        const index = state.games.findIndex(g => g.id === gameId);
        state.games[index] = { ...state.games[index], name, rarities };
    } else {
        const newGame = {
            id: Date.now().toString(),
            name: name,
            rarities: rarities
        };
        state.games.push(newGame);
        state.currentGameId = newGame.id;
    }

    saveState();
    renderSidebar();
    selectGame(state.currentGameId);
    closeModal();
}

function deleteGame(id) {
    if (!confirm('このゲームとその履歴を全て削除してもよろしいですか？')) return;

    state.games = state.games.filter(g => g.id !== id);
    state.history = state.history.filter(h => h.gameId !== id);

    if (state.currentGameId === id) {
        state.currentGameId = state.games.length > 0 ? state.games[0].id : null;
    }

    saveState();
    renderSidebar();
    if (state.currentGameId) selectGame(state.currentGameId);
    else {
        document.getElementById('current-game-title').textContent = 'Select or Add a Game';
        updateDashboard();
        renderHistory();
    }
    closeModal();
}
