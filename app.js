// ============================================================================
// APPLICATION STATE & CONFIGURATION
// ============================================================================

// Placed items on map
let placedMembers = [];
let placedGroups = [];
let placedObjectives = [];
let placedBosses = [];
let placedBlueTowers = [];
let placedRedTowers = [];
let placedBlueTrees = [];
let placedRedTrees = [];
let placedBlueGeese = [];
let placedRedGeese = [];
let placedEnemies = [];

// UI State
let filteredMembers = [...members];
let currentFilter = 'all';
let currentRoleFilter = 'all';
let currentView = 'grouped'; // 'grouped' or 'list'
let placingMode = null; // 'enemy-dps' or 'enemy-healer' or 'eh-marker' or 'enemy-marker' or 'boss' or 'blue-tower' or 'red-tower' or 'blue-tree' or 'red-tree' or 'blue-goose' or 'red-goose' or null
let selectedObjectiveType = null; // Stores the selected objective marker type

// Drawing State
let drawingMode = false;
let autoDeleteDrawings = false;
let drawingPaths = [];
let drawingDeleteTimers = [];
let drawingHistory = [];
let drawingRedoStack = [];
let drawingColor = '#ff0000'; // Default red color

// Split UI State
let activeSplitGroupId = null;

// Constants
const MAX_PLAYERS = 30;
const MAX_ENEMIES = 30;
const ENEMIES_PER_CLICK = 5;
const GROUP_MERGE_DISTANCE = 80;
const AUTO_DELETE_DELAY = 10000;
const TEAM_ORDER = ['FLEX', 'ATTACK', 'DEFENCE', 'TOP JUNGLE', 'BOT JUNGLE', 'GATE KEEPERS', 'BOSS TEAM', 'ASSASSINS'];
// Add after TEAM_ORDER constant

// Custom team name mappings
let teamNameMappings = {};

// Load custom team names from localStorage
function loadTeamNames() {
    const saved = localStorage.getItem('mightylabs-gvg-team-names');
    if (saved) {
        try {
            let mappings = JSON.parse(saved);
            // Migrate old team names in mappings
            const migrationMap = {
                'FrontLine': 'Team 1',
                'Jungle': 'Team 2',
                'Defence 1': 'Team 3',
                'Defence 2': 'Team 4',
                'Backline 1': 'Team 5',
                'Backline 2': 'Team 6'
            };
            
            // Convert old keys to new keys
            const newMappings = {};
            for (const [oldKey, value] of Object.entries(mappings)) {
                const newKey = migrationMap[oldKey] || oldKey;
                newMappings[newKey] = value;
            }
            
            teamNameMappings = newMappings;
            // Save migrated mappings
            if (Object.keys(migrationMap).some(old => old in mappings)) {
                saveTeamNames();
            }
        } catch (e) {
            console.error('Error loading team names:', e);
            teamNameMappings = {};
        }
    }
}

// Save team names to localStorage
function saveTeamNames() {
    localStorage.setItem('mightylabs-gvg-team-names', JSON.stringify(teamNameMappings));
}

// Get display name for team (custom or default)
function getTeamDisplayName(teamName) {
    return teamNameMappings[teamName] || teamName;
}

// Rename team
async function renameTeam(teamName) {
    const currentName = getTeamDisplayName(teamName);
    const newName = await showPrompt(
        'Rename Team',
        `Enter new name for "${currentName}":`,
        currentName
    );
    
    if (newName !== null && newName !== '') {
        if (newName === teamName) {
            // Reset to default
            delete teamNameMappings[teamName];
        } else {
            teamNameMappings[teamName] = newName;
        }
        saveTeamNames();
        renderMemberList();
    }
}

// ============================================================================
// DOM ELEMENT REFERENCES
// ============================================================================

const memberList = document.getElementById('memberList');
const mapArea = document.getElementById('mapArea');
const searchInput = document.getElementById('searchInput');
const roleFilterButtons = document.querySelectorAll('.role-filter-btn');
const viewToggleButtons = document.querySelectorAll('.view-toggle-btn');
const clearMapBtn = document.getElementById('clearMapBtn');
const screenshotBtn = document.getElementById('screenshotBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFileInput = document.getElementById('importFileInput');
const importPlayersFileInput = document.getElementById('importPlayersFileInput');
const playerCount = document.getElementById('playerCount');
const placedCount = document.getElementById('placedCount');
const addObjectiveBtn = document.getElementById('addObjectiveBtn');
const addBossBtn = document.getElementById('addBossBtn');
const addBlueTowerBtn = document.getElementById('addBlueTowerBtn');
const addRedTowerBtn = document.getElementById('addRedTowerBtn');
const addBlueTreeBtn = document.getElementById('addBlueTreeBtn');
const addRedTreeBtn = document.getElementById('addRedTreeBtn');
const addBlueGooseBtn = document.getElementById('addBlueGooseBtn');
const addRedGooseBtn = document.getElementById('addRedGooseBtn');
const drawBtn = document.getElementById('drawBtn');
const clearDrawBtn = document.getElementById('clearDrawBtn');
const undoDrawBtn = document.getElementById('undoDrawBtn');
const redoDrawBtn = document.getElementById('redoDrawBtn');
const autoDeleteToggle = document.getElementById('autoDeleteToggle');
const drawColorPicker = document.getElementById('drawColorPicker');
const drawingCanvas = document.getElementById('drawingCanvas');
const ctx = drawingCanvas.getContext('2d');
const addEnemiesBtn = document.getElementById('addEnemiesBtn');
const enemyCount = document.getElementById('enemyCount');
const managePlayersBtn = document.getElementById('managePlayersBtn');
const playerManagementModal = document.getElementById('playerManagementModal');
const playerEditModal = document.getElementById('playerEditModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeEditModalBtn = document.getElementById('closeEditModalBtn');
const addNewPlayerBtn = document.getElementById('addNewPlayerBtn');
const playerManagementList = document.getElementById('playerManagementList');
const playerEditForm = document.getElementById('playerEditForm');
const objectiveTypeModal = document.getElementById('objectiveTypeModal');
const closeObjectiveTypeModal = document.getElementById('closeObjectiveTypeModal');
const cancelEditBtn = document.getElementById('cancelEditBtn');
// const themeToggleBtn = document.getElementById('themeToggleBtn'); // Removed - dark mode only
const confirmModal = document.getElementById('confirmModal');
const confirmModalTitle = document.getElementById('confirmModalTitle');
const confirmModalMessage = document.getElementById('confirmModalMessage');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmCancelBtn = document.getElementById('confirmCancelBtn');
const promptModal = document.getElementById('promptModal');
const promptModalTitle = document.getElementById('promptModalTitle');
const promptModalMessage = document.getElementById('promptModalMessage');
const promptModalInput = document.getElementById('promptModalInput');
const promptOkBtn = document.getElementById('promptOkBtn');
const promptCancelBtn = document.getElementById('promptCancelBtn');
const hotkeyHelpModal = document.getElementById('hotkeyHelpModal');
const closeHotkeyModalBtn = document.getElementById('closeHotkeyModalBtn');

// ============================================================================
// CUSTOM CONFIRM DIALOG
// ============================================================================

function showConfirm(title, message) {
    return new Promise((resolve) => {
        confirmModalTitle.textContent = title;
        confirmModalMessage.textContent = message;
        confirmModal.style.display = 'flex';
        
        const handleOk = () => {
            cleanup();
            resolve(true);
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(false);
        };
        
        const cleanup = () => {
            confirmModal.style.display = 'none';
            confirmOkBtn.removeEventListener('click', handleOk);
            confirmCancelBtn.removeEventListener('click', handleCancel);
        };
        
        confirmOkBtn.addEventListener('click', handleOk);
        confirmCancelBtn.addEventListener('click', handleCancel);
    });
}

function showPrompt(title, message, defaultValue = '') {
    return new Promise((resolve) => {
        promptModalTitle.textContent = title;
        promptModalMessage.textContent = message;
        promptModalInput.value = defaultValue;
        promptModal.style.display = 'flex';
        
        // Focus and select the input
        setTimeout(() => {
            promptModalInput.focus();
            promptModalInput.select();
        }, 100);
        
        const handleOk = () => {
            const value = promptModalInput.value.trim();
            cleanup();
            resolve(value || null);
        };
        
        const handleCancel = () => {
            cleanup();
            resolve(null);
        };
        
        const handleEnter = (e) => {
            if (e.key === 'Enter') {
                handleOk();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        };
        
        const cleanup = () => {
            promptModal.style.display = 'none';
            promptOkBtn.removeEventListener('click', handleOk);
            promptCancelBtn.removeEventListener('click', handleCancel);
            promptModalInput.removeEventListener('keydown', handleEnter);
        };
        
        promptOkBtn.addEventListener('click', handleOk);
        promptCancelBtn.addEventListener('click', handleCancel);
        promptModalInput.addEventListener('keydown', handleEnter);
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================


// Load default marker positions (towers, bosses, trees, geese)
function loadDefaultMarkers() {
    const defaultMarkers = {
        "bosses": [
            {"id": "boss-default-1", "x": 759, "y": 345},
            {"id": "boss-default-2", "x": 767, "y": 659}
        ],
        "blueTowers": [
            {"id": "blue-tower-default-1", "x": 470, "y": 802},
            {"id": "blue-tower-default-2", "x": 470, "y": 473},
            {"id": "blue-tower-default-3", "x": 470, "y": 251}
        ],
        "redTowers": [
            {"id": "red-tower-default-1", "x": 1019, "y": 787},
            {"id": "red-tower-default-2", "x": 1019, "y": 468},
            {"id": "red-tower-default-3", "x": 1019, "y": 226}
        ],
        "blueTrees": [
            {"id": "blue-tree-default-1", "x": 34, "y": 492}
        ],
        "redTrees": [
            {"id": "red-tree-default-1", "x": 1466, "y": 480}
        ],
        "blueGeese": [
            {"id": "blue-goose-default-1", "x": 93, "y": 508}
        ],
        "redGeese": [
            {"id": "red-goose-default-1", "x": 1417, "y": 490}
        ]
    };
    
    // Load bosses
    defaultMarkers.bosses.forEach(boss => {
        placedBosses.push({
            id: boss.id,
            x: boss.x,
            y: boss.y
        });
    });
    
    // Load blue towers
    defaultMarkers.blueTowers.forEach(tower => {
        placedBlueTowers.push({
            id: tower.id,
            x: tower.x,
            y: tower.y
        });
    });
    
    // Load red towers
    defaultMarkers.redTowers.forEach(tower => {
        placedRedTowers.push({
            id: tower.id,
            x: tower.x,
            y: tower.y
        });
    });
    
    // Load blue trees
    defaultMarkers.blueTrees.forEach(tree => {
        placedBlueTrees.push({
            id: tree.id,
            x: tree.x,
            y: tree.y
        });
    });
    
    // Load red trees
    defaultMarkers.redTrees.forEach(tree => {
        placedRedTrees.push({
            id: tree.id,
            x: tree.x,
            y: tree.y
        });
    });
    
    // Load blue geese
    defaultMarkers.blueGeese.forEach(goose => {
        placedBlueGeese.push({
            id: goose.id,
            x: goose.x,
            y: goose.y
        });
    });
    
    // Load red geese
    defaultMarkers.redGeese.forEach(goose => {
        placedRedGeese.push({
            id: goose.id,
            x: goose.x,
            y: goose.y
        });
    });
    
    console.log('Default markers loaded:', {
        bosses: placedBosses.length,
        blueTowers: placedBlueTowers.length,
        redTowers: placedRedTowers.length,
        blueTrees: placedBlueTrees.length,
        redTrees: placedRedTrees.length,
        blueGeese: placedBlueGeese.length,
        redGeese: placedRedGeese.length
    });
}

function init() {
    // loadDefaultMarkers(); // REMOVED - markers depend on resolution/zoom
    // ALWAYS use fresh data from data.js - DO NOT load from localStorage
    // This ensures the player list is always current from your Excel/data.js file
    // loadPlayersFromStorage(); // DISABLED - always use data.js
    
    loadTeamNames();
    loadThemePreference();
    loadScreenshotGallery(); // Load saved screenshots
    renderMemberList();
    setupEventListeners();
    
    // DO NOT load saved positions - start fresh every time
    // Use Export/Import for session management instead
    // loadSavedPositions(); // DISABLED - start fresh
    
    updateCounts();
    initializeCanvas();
    setupClickOutsideHandler();
    setupPlayerManagementHandlers();
    updateGalleryBadge(); // Update screenshot count
    
    // Render default markers on the map
    renderMap();
    updatePlaceholder();
    
    console.log('🎯 Strategy Tool Loaded - Fresh state from data.js');
    console.log(`📊 ${members.length} players loaded from data.js`);
}

// ============================================================================
// MEMBER LIST RENDERING
// ============================================================================

// Render member list
function renderMemberList() {
    memberList.innerHTML = '';
    
    if (currentView === 'grouped') {
        renderGroupedView();
    } else {
        renderListView();
    }
}

// Render grouped view by team
function renderGroupedView() {
    TEAM_ORDER.forEach(teamName => {
        // Get all team members first (not filtered yet)
        const allTeamMembers = members.filter(m => m.team === teamName);
        
        // Then filter out placed members and apply search/role filters
        const teamMembers = allTeamMembers.filter(m => {
            // Check if member is already placed individually
            if (isPlayerPlaced(m.id)) return false;
            
            // Apply search filter
            const searchTerm = searchInput.value.toLowerCase();
            const matchesSearch = !searchTerm || 
                                 m.name.toLowerCase().includes(searchTerm) ||
                                 m.role.toLowerCase().includes(searchTerm) ||
                                 m.team.toLowerCase().includes(searchTerm);
            if (!matchesSearch) return false;
            
            // Apply role filter
            const matchesRole = currentRoleFilter === 'all' || m.role === currentRoleFilter;
            if (!matchesRole) return false;
            
            return true;
        });
        
        // Always show team headers, even if empty
        const groupDiv = document.createElement('div');
        groupDiv.className = 'team-group';
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'team-group-header';
        headerDiv.draggable = true;
        headerDiv.dataset.teamName = teamName;
        const displayName = getTeamDisplayName(teamName);
        headerDiv.innerHTML = `
            <span class="team-name-wrapper">
                <span class="toggle-icon">▼</span> 
                <span class="team-name">${displayName}</span>
                <button class="rename-team-btn" onclick="renameTeam('${teamName}')" title="Rename team">✏️</button>
            </span>
            <span class="team-count">${teamMembers.length}</span>
        `;
        headerDiv.addEventListener('click', (e) => {
            if (e.target === headerDiv || e.target.closest('.toggle-icon') || e.target.closest('.team-name')) {
                toggleTeamGroup(groupDiv);
            }
        });
        headerDiv.addEventListener('dragstart', handleTeamDragStart);
        headerDiv.addEventListener('dragend', handleDragEnd);
        
        const playersDiv = document.createElement('div');
        playersDiv.className = 'team-group-players';
        
        teamMembers.forEach(member => {
            const memberElement = createMemberElement(member);
            playersDiv.appendChild(memberElement);
        });
        
        groupDiv.appendChild(headerDiv);
        groupDiv.appendChild(playersDiv);
        memberList.appendChild(groupDiv);
    });
    
    // Add unassigned players (those with empty team)
    const unassignedMembers = members.filter(m => {
        if (!m.team || m.team === '') {
            // Check if member is already placed individually
            if (isPlayerPlaced(m.id)) return false;
            
            // Apply search filter
            const searchTerm = searchInput.value.toLowerCase();
            const matchesSearch = !searchTerm || 
                                 m.name.toLowerCase().includes(searchTerm) ||
                                 m.role.toLowerCase().includes(searchTerm);
            if (!matchesSearch) return false;
            
            // Apply role filter
            const matchesRole = currentRoleFilter === 'all' || m.role === currentRoleFilter;
            if (!matchesRole) return false;
            
            return true;
        }
        return false;
    });
    
    if (unassignedMembers.length > 0) {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'team-group';
        
        const headerDiv = document.createElement('div');
        headerDiv.className = 'team-group-header';
        headerDiv.innerHTML = `
            <span class="team-name-wrapper">
                <span class="toggle-icon">▼</span> 
                <span class="team-name">Unassigned Players</span>
            </span>
            <span class="team-count">${unassignedMembers.length}</span>
        `;
        headerDiv.addEventListener('click', (e) => {
            if (e.target === headerDiv || e.target.closest('.toggle-icon') || e.target.closest('.team-name')) {
                toggleTeamGroup(groupDiv);
            }
        });
        
        const playersDiv = document.createElement('div');
        playersDiv.className = 'team-group-players';
        
        unassignedMembers.forEach(member => {
            const memberElement = createMemberElement(member);
            playersDiv.appendChild(memberElement);
        });
        
        groupDiv.appendChild(headerDiv);
        groupDiv.appendChild(playersDiv);
        memberList.appendChild(groupDiv);
    }
}

// Render list view (all players)
function renderListView() {
    // Filter members that aren't placed
    const availableMembers = members.filter(m => {
        // Skip if member is already placed
        if (isPlayerPlaced(m.id)) return false;
        
        // Apply search filter
        const searchTerm = searchInput.value.toLowerCase();
        const matchesSearch = !searchTerm || 
                             m.name.toLowerCase().includes(searchTerm) ||
                             m.role.toLowerCase().includes(searchTerm) ||
                             m.team.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return false;
        
        // Apply role filter
        const matchesRole = currentRoleFilter === 'all' || m.role === currentRoleFilter;
        if (!matchesRole) return false;
        
        return true;
    });
    
    availableMembers.forEach(member => {
        const memberElement = createMemberElement(member);
        memberList.appendChild(memberElement);
    });
}

// Toggle team group collapse
function toggleTeamGroup(groupDiv) {
    groupDiv.classList.toggle('collapsed');
}

// Create member element
function createMemberElement(member) {
    const div = document.createElement('div');
    div.className = 'member-item';
    div.draggable = true;
    div.dataset.memberId = member.id;
    
    div.innerHTML = `
        <div class="member-info">
            <div class="member-name">${member.name}</div>
            <div class="member-team">${member.team}</div>
            <div class="member-weapons">
                <div class="weapon-item">W1: ${member.weapon1 || 'None'}</div>
                <div class="weapon-item">W2: ${member.weapon2 || 'None'}</div>
            </div>
        </div>
        <div class="role-badge ${member.role}">${member.role}</div>
    `;
    
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);
    
    return div;
}

// ============================================================================
// EVENT HANDLERS & SETUP
// ============================================================================

// Setup event listeners
function setupEventListeners() {
    
    // Guild page button (now in nav bar)
    const guildPageBtn = document.getElementById('guildPageBtn');
    if (guildPageBtn) {
        guildPageBtn.addEventListener('click', () => {
            window.location.href = 'guild.html';
        });
    }
    
    // Map area drop events
    mapArea.addEventListener('dragover', handleDragOver);
    mapArea.addEventListener('dragleave', handleDragLeave);
    mapArea.addEventListener('drop', handleDrop);
    mapArea.addEventListener('click', handleMapClick);
    
    // Search functionality
    searchInput.addEventListener('input', handleSearch);
    
    // View toggle buttons
    viewToggleButtons.forEach(btn => {
        btn.addEventListener('click', handleViewToggle);
    });
    
    // Role filter buttons
    roleFilterButtons.forEach(btn => {
        btn.addEventListener('click', handleRoleFilter);
    });
    
    // Objective and Boss buttons
    addObjectiveBtn.addEventListener('click', toggleObjectiveMode);
    addBossBtn.addEventListener('click', toggleBossMode);
    addBlueTowerBtn.addEventListener('click', toggleBlueTowerMode);
    addRedTowerBtn.addEventListener('click', toggleRedTowerMode);
    addBlueTreeBtn.addEventListener('click', toggleBlueTreeMode);
    addRedTreeBtn.addEventListener('click', toggleRedTreeMode);
    addBlueGooseBtn.addEventListener('click', toggleBlueGooseMode);
    addRedGooseBtn.addEventListener('click', toggleRedGooseMode);
    
    // Drawing buttons
    drawBtn.addEventListener('click', toggleDrawingMode);
    clearDrawBtn.addEventListener('click', clearAllDrawings);
    undoDrawBtn.addEventListener('click', undoDrawing);
    redoDrawBtn.addEventListener('click', redoDrawing);
    autoDeleteToggle.addEventListener('change', handleAutoDeleteToggle);
    drawColorPicker.addEventListener('change', (e) => {
        drawingColor = e.target.value;
    });
    
    // Enemy button
    addEnemiesBtn.addEventListener('click', addEnemies);
    
    // Clear map button
    clearMapBtn.addEventListener('click', clearAllPlacements);
    
    // Screenshot button
    screenshotBtn.addEventListener('click', takeMapScreenshot);
    
    // Export button
    exportBtn.addEventListener('click', exportPositions);
    
    // Import button
    // Import button - shows dropdown with two options
    importBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dropdown = document.getElementById('importDropdown');
        dropdown.classList.toggle('show');
    });
    
    // Close import dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const wrapper = document.getElementById('importWrapper');
        if (wrapper && !wrapper.contains(e.target)) {
            document.getElementById('importDropdown').classList.remove('show');
        }
    });
    
    // Import Strategy option
    document.getElementById('importStrategyBtn').addEventListener('click', () => {
        document.getElementById('importDropdown').classList.remove('show');
        importFileInput.click();
    });
    
    // Import Players option
    document.getElementById('importPlayersBtn').addEventListener('click', () => {
        document.getElementById('importDropdown').classList.remove('show');
        importPlayersFileInput.click();
    });
    
    importFileInput.addEventListener('change', handleImportFile);
    importPlayersFileInput.addEventListener('change', handlePlayersFileImport);
    
    // Hot Key button
    const hotKeyBtn = document.getElementById('hotKeyBtn');
    hotKeyBtn.addEventListener('click', showHotkeyHelp);
    
    // Known Issues button
    const knownIssuesBtn = document.getElementById('knownIssuesBtn');
    if (knownIssuesBtn) {
        knownIssuesBtn.addEventListener('click', showKnownIssues);
    }
    
    // Changelog button
    const changelogBtn = document.getElementById('changelogBtn');
    if (changelogBtn) {
        changelogBtn.addEventListener('click', showChangelog);
    }
    
    // Gallery button
    const galleryBtn = document.getElementById('galleryBtn');
    if (galleryBtn) {
        galleryBtn.addEventListener('click', showScreenshotGallery);
    }
    
    // Theme toggle button
    // Theme toggle removed - dark mode only
// themeToggleBtn.addEventListener('click', toggleTheme);
    
    // Window resize
    window.addEventListener('resize', resizeCanvas);
    
    // Hotkey modal
    closeHotkeyModalBtn.addEventListener('click', closeHotkeyHelp);
    
    // Known Issues modal close buttons
    const closeKnownIssuesModal = document.getElementById('closeKnownIssuesModal');
    const closeKnownIssuesModalBtn = document.getElementById('closeKnownIssuesModalBtn');
    if (closeKnownIssuesModal) {
        closeKnownIssuesModal.addEventListener('click', hideKnownIssues);
    }
    if (closeKnownIssuesModalBtn) {
        closeKnownIssuesModalBtn.addEventListener('click', hideKnownIssues);
    }
    
    // Gallery modal close buttons
    const closeGalleryModal = document.getElementById('closeGalleryModal');
    const closeGalleryModalBtn = document.getElementById('closeGalleryModalBtn');
    if (closeGalleryModal) {
        closeGalleryModal.addEventListener('click', hideScreenshotGallery);
    }
    if (closeGalleryModalBtn) {
        closeGalleryModalBtn.addEventListener('click', hideScreenshotGallery);
    }
    
    // Changelog modal close buttons
    const closeChangelogModal = document.getElementById('closeChangelogModal');
    const closeChangelogModalBtn = document.getElementById('closeChangelogModalBtn');
    if (closeChangelogModal) {
        closeChangelogModal.addEventListener('click', hideChangelog);
    }
    if (closeChangelogModalBtn) {
        closeChangelogModalBtn.addEventListener('click', hideChangelog);
    }
    
    // Player Import modal
    const closePlayerImportModal = document.getElementById('closePlayerImportModal');
    const cancelPlayerImportBtn  = document.getElementById('cancelPlayerImportBtn');
    const confirmPlayerImportBtn = document.getElementById('confirmPlayerImportBtn');
    if (closePlayerImportModal)  closePlayerImportModal.addEventListener('click', hidePlayerImportModal);
    if (cancelPlayerImportBtn)   cancelPlayerImportBtn.addEventListener('click', hidePlayerImportModal);
    if (confirmPlayerImportBtn)  confirmPlayerImportBtn.addEventListener('click', confirmPlayerImport);
    
    const playerImportModal = document.getElementById('playerImportModal');
    if (playerImportModal) {
        playerImportModal.addEventListener('click', e => {
            if (e.target === playerImportModal) hidePlayerImportModal();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcut);
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

function handleKeyboardShortcut(e) {
    // Ignore shortcuts when typing in input fields
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
        return;
    }
    
    // Shift + ? - Show hotkey help
    if (e.shiftKey && e.key === '?') {
        e.preventDefault();
        showHotkeyHelp();
        return;
    }
    
    // Escape - Deselect tool
    if (e.key === 'Escape') {
        e.preventDefault();
        deactivatePlacingMode();
        if (drawingMode) {
            toggleDrawingMode();
        }
        return;
    }
    
    // Ctrl + Z - Undo drawing
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        if (!autoDeleteDrawings && drawingHistory.length > 0) {
            undoDrawing();
        }
        return;
    }
    
    // Ctrl + Y - Redo drawing
    if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        if (!autoDeleteDrawings && drawingRedoStack.length > 0) {
            redoDrawing();
        }
        return;
    }
    
    // Single key shortcuts
    const key = e.key.toLowerCase();
    
    switch(key) {
        case 'o':
            e.preventDefault();
            toggleObjectiveMode();
            break;
        case 'b':
            e.preventDefault();
            toggleBossMode();
            break;
        case '1':
            e.preventDefault();
            toggleBlueTowerMode();
            break;
        case '2':
            e.preventDefault();
            toggleRedTowerMode();
            break;
        case '3':
            e.preventDefault();
            toggleBlueTreeMode();
            break;
        case '4':
            e.preventDefault();
            toggleRedTreeMode();
            break;
        case '5':
            e.preventDefault();
            toggleBlueGooseMode();
            break;
        case '6':
            e.preventDefault();
            toggleRedGooseMode();
            break;
        case 'd':
            e.preventDefault();
            toggleDrawingMode();
            break;
    }
}

function showHotkeyHelp() {
    hotkeyHelpModal.style.display = 'flex';
}

function closeHotkeyHelp() {
    hotkeyHelpModal.style.display = 'none';
}

// Known Issues modal functions
function showKnownIssues() {
    const modal = document.getElementById('knownIssuesModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideKnownIssues() {
    const modal = document.getElementById('knownIssuesModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Click outside Known Issues modal to close
const knownIssuesModal = document.getElementById('knownIssuesModal');
if (knownIssuesModal) {
    knownIssuesModal.addEventListener('click', (e) => {
        if (e.target === knownIssuesModal) {
            hideKnownIssues();
        }
    });
}

// Changelog modal functions
function showChangelog() {
    const modal = document.getElementById('changelogModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideChangelog() {
    const modal = document.getElementById('changelogModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Click outside Changelog modal to close
const changelogModal = document.getElementById('changelogModal');
if (changelogModal) {
    changelogModal.addEventListener('click', (e) => {
        if (e.target === changelogModal) {
            hideChangelog();
        }
    });
}

// Click outside modal to close
hotkeyHelpModal.addEventListener('click', (e) => {
    if (e.target === hotkeyHelpModal) {
        closeHotkeyHelp();
    }
});

// Objective type modal event listeners
closeObjectiveTypeModal.addEventListener('click', () => {
    objectiveTypeModal.style.display = 'none';
});

objectiveTypeModal.addEventListener('click', (e) => {
    if (e.target === objectiveTypeModal) {
        objectiveTypeModal.style.display = 'none';
    }
});

// Handle objective type selection
document.querySelectorAll('.objective-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        selectedObjectiveType = type;
        placingMode = `objective-${type}`;
        
        // Close modal
        objectiveTypeModal.style.display = 'none';
        
        // Activate placing mode
        drawingMode = false;
        addObjectiveBtn.classList.add('active');
        addBossBtn.classList.remove('active');
        addBlueTowerBtn.classList.remove('active');
        addRedTowerBtn.classList.remove('active');
        addBlueTreeBtn.classList.remove('active');
        addRedTreeBtn.classList.remove('active');
        addBlueGooseBtn.classList.remove('active');
        addRedGooseBtn.classList.remove('active');
        drawBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode', 'drawing-mode');
        mapArea.classList.add('placing-mode');
        drawingCanvas.classList.remove('active');
    });
});

function deactivatePlacingMode() {
    placingMode = null;
    selectedObjectiveType = null;
    addObjectiveBtn.classList.remove('active');
    addBossBtn.classList.remove('active');
    addBlueTowerBtn.classList.remove('active');
    addRedTowerBtn.classList.remove('active');
    addBlueTreeBtn.classList.remove('active');
    addRedTreeBtn.classList.remove('active');
    addBlueGooseBtn.classList.remove('active');
    addRedGooseBtn.classList.remove('active');
    mapArea.style.cursor = 'default';
}


// ============================================================================
// DRAG & DROP HANDLERS
// ============================================================================

// Drag handlers for member list
function handleDragStart(e) {
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.memberId);
    e.dataTransfer.setData('type', 'member');
}

// Handle team group drag
function handleTeamDragStart(e) {
    e.stopPropagation();
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.teamName);
    e.dataTransfer.setData('type', 'team');
}

function handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
}

// Map drag over
function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    mapArea.classList.add('drag-over');
}

// Map drag leave
function handleDragLeave(e) {
    if (e.target === mapArea) {
        mapArea.classList.remove('drag-over');
    }
}

// Handle drop on map
function handleDrop(e) {
    e.preventDefault();
    mapArea.classList.remove('drag-over');
    
    const type = e.dataTransfer.getData('type');
    const data = e.dataTransfer.getData('text/plain');
    
    const rect = mapArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (type === 'team') {
        // Dropping a team group
        const teamName = data;
        // Adjust position to top-right of cursor for better visibility
        const adjustedX = x + 21; // 16px radius + 5px offset
        const adjustedY = y - 21;
        placeTeamGroupOnMap(teamName, adjustedX, adjustedY);
    } else if (type === 'member') {
        // Dropping individual member
        const memberId = parseInt(data);
        const member = members.find(m => m.id === memberId);
        
        if (!member) return;
        
        // Check if already placed
        if (isPlayerPlaced(memberId)) {
            alert(`${member.name} is already placed on the map!`);
            return;
        }
        
        // Check max players limit
        if (getTotalPlacedPlayers() >= MAX_PLAYERS) {
            alert(`Maximum ${MAX_PLAYERS} players allowed on the map!`);
            return;
        }
        
        placeMemberOnMap(member, x, y);
    } else {
        // Legacy support - assume it's a member
        const memberId = parseInt(data);
        const member = members.find(m => m.id === memberId);
        
        if (!member) return;
        
        if (isPlayerPlaced(memberId)) {
            alert(`${member.name} is already placed on the map!`);
            return;
        }
        
        if (getTotalPlacedPlayers() >= MAX_PLAYERS) {
            alert(`Maximum ${MAX_PLAYERS} players allowed on the map!`);
            return;
        }
        
        // Adjust position to top-right of cursor for better visibility
        const adjustedX = x + 13; // 8px radius + 5px offset
        const adjustedY = y - 13;
        placeMemberOnMap(member, adjustedX, adjustedY);
    }
}

// Check if player is already placed (in individual or group)
function isPlayerPlaced(memberId) {
    // Check individual placements
    if (placedMembers.find(p => p.memberId === memberId)) {
        return true;
    }
    
    // Check group placements
    for (const group of placedGroups) {
        if (group.memberIds.includes(memberId)) {
            return true;
        }
    }
    
    return false;
}

// Constrain position within map boundaries
function constrainToMapBounds(x, y, markerSize = 32) {
    const mapRect = mapArea.getBoundingClientRect();
    const mapWidth = mapRect.width;
    const mapHeight = mapRect.height;
    
    // Add padding to keep markers fully visible
    const padding = markerSize / 2;
    
    // Constrain X
    let constrainedX = Math.max(padding, x);
    constrainedX = Math.min(mapWidth - padding, constrainedX);
    
    // Constrain Y
    let constrainedY = Math.max(padding, y);
    constrainedY = Math.min(mapHeight - padding, constrainedY);
    
    return { x: constrainedX, y: constrainedY };
}

// Get total placed players count
function getTotalPlacedPlayers() {
    let total = placedMembers.length;
    placedGroups.forEach(group => {
        total += group.memberIds.length;
    });
    return total;
}

// ============================================================================
// MAP PLACEMENT - TEAMS & MEMBERS
// ============================================================================

// Place team group on map
function placeTeamGroupOnMap(teamName, x, y) {
    const teamMembers = members.filter(m => m.team === teamName && !isPlayerPlaced(m.id));
    
    // Allow placing team even if empty or all members are placed
    // If there are no available members, we still create a group marker with the team name
    
    // Check max players limit only if there are members to add
    if (teamMembers.length > 0 && getTotalPlacedPlayers() + teamMembers.length > MAX_PLAYERS) {
        alert(`Cannot place ${teamName}: would exceed maximum ${MAX_PLAYERS} players!`);
        return;
    }
    
    // MERGE DISABLED - Always create new group
    // const nearbyGroup = findNearbyGroup(x, y);
    // if (nearbyGroup) {
    //     mergeGroups(nearbyGroup, teamName, teamMembers);
    // } else {
    //     createNewGroup(teamName, teamMembers, x, y);
    // }
    
    // Always create new group (even if empty)
    createNewGroup(teamName, teamMembers, x, y);
    
    renderMemberList(); // Re-render to hide placed members
}

// Find nearby group within merge distance
function findNearbyGroup(x, y) {
    for (const group of placedGroups) {
        const distance = Math.sqrt(Math.pow(group.x - x, 2) + Math.pow(group.y - y, 2));
        if (distance < GROUP_MERGE_DISTANCE) {
            return group;
        }
    }
    return null;
}

// Create new group marker
function createNewGroup(teamName, teamMembers, x, y) {
    const groupId = `group-${Date.now()}`;
    const memberIds = teamMembers.map(m => m.id);
    
    // Adjust position to top-right of cursor
    const adjustedX = x + 21; // 16px radius + 5px offset
    const adjustedY = y - 21;
    
    const group = {
        id: groupId,
        teams: [teamName],
        memberIds: memberIds,
        x: adjustedX,
        y: adjustedY
    };
    
    placedGroups.push(group);
    renderGroupMarker(group);
    savePositions();
    updateCounts();
    updatePlaceholder();
}

// Merge groups
function mergeGroups(existingGroup, newTeamName, newMembers) {
    // Add new team if not already in list
    if (!existingGroup.teams.includes(newTeamName)) {
        existingGroup.teams.push(newTeamName);
    }
    
    // Add new member IDs
    const newMemberIds = newMembers.map(m => m.id);
    existingGroup.memberIds.push(...newMemberIds);
    
    // Update the marker
    const marker = mapArea.querySelector(`[data-group-id="${existingGroup.id}"]`);
    if (marker) {
        updateGroupMarker(marker, existingGroup);
    }
    
    savePositions();
    updateCounts();
}

// Render group marker on map
function renderGroupMarker(group) {
    const marker = document.createElement('div');
    marker.className = 'group-marker';
    marker.dataset.groupId = group.id;
    marker.style.left = `${group.x - 16}px`; // Center the 32px marker
    marker.style.top = `${group.y - 16}px`;
    marker.draggable = true;
    
    updateGroupMarker(marker, group);
    
    // Make marker draggable
    marker.addEventListener('dragstart', handleGroupMarkerDragStart);
    marker.addEventListener('dragend', handleGroupMarkerDragEnd);
    
    mapArea.appendChild(marker);
}

// Update group marker content
function updateGroupMarker(marker, group) {
    const roleCount = countRoles(group.memberIds);
    const groupMembers = group.memberIds.map(id => members.find(m => m.id === id)).filter(m => m);
    
    // Get display names for teams
    const displayTeamNames = group.teams.map(teamName => getTeamDisplayName(teamName)).join(', ');
    
    marker.innerHTML = `
        <div class="group-number">${displayTeamNames}</div>
        <div class="group-tooltip">
            <div class="tooltip-header">Group: ${displayTeamNames}</div>
            <div class="tooltip-roles">
                ${roleCount.Tank > 0 ? `<div class="role-item"><span class="role-dot role-Tank"></span> ${roleCount.Tank} Tank</div>` : ''}
                ${roleCount.DPS > 0 ? `<div class="role-item"><span class="role-dot role-DPS"></span> ${roleCount.DPS} DPS</div>` : ''}
                ${roleCount.Healer > 0 ? `<div class="role-item"><span class="role-dot role-Healer"></span> ${roleCount.Healer} Healer</div>` : ''}
                ${roleCount.Support > 0 ? `<div class="role-item"><span class="role-dot role-Support"></span> ${roleCount.Support} Support</div>` : ''}
            </div>
        </div>
        <button class="remove-btn" onclick="removeGroupMarker('${group.id}')">×</button>
    `;
}

// Count roles in a group
function countRoles(memberIds) {
    const count = { Tank: 0, DPS: 0, Healer: 0, Support: 0 };
    memberIds.forEach(id => {
        const member = members.find(m => m.id === id);
        if (member && count[member.role] !== undefined) {
            count[member.role]++;
        }
    });
    return count;
}

// Handle group marker drag
function handleGroupMarkerDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.groupId);
    e.dataTransfer.setData('type', 'group-marker');
    e.currentTarget.style.opacity = '0.5';
}

function handleGroupMarkerDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    
    const groupId = e.currentTarget.dataset.groupId;
    const rect = mapArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Constrain position within map bounds
    const constrained = constrainToMapBounds(x, y, 32);
    
    // Update position
    const group = placedGroups.find(g => g.id === groupId);
    if (group) {
        group.x = constrained.x;
        group.y = constrained.y;
        e.currentTarget.style.left = `${constrained.x - 16}px`; // Center the 32px marker
        e.currentTarget.style.top = `${constrained.y - 16}px`;
        
        // MERGE DISABLED - Groups no longer merge when dragged close together
        // checkAndMergeNearbyGroups(group);
        
        savePositions();
    }
}

// Check and merge nearby groups after moving
function checkAndMergeNearbyGroups(movedGroup) {
    for (const otherGroup of placedGroups) {
        if (otherGroup.id !== movedGroup.id) {
            const distance = Math.sqrt(
                Math.pow(movedGroup.x - otherGroup.x, 2) + 
                Math.pow(movedGroup.y - otherGroup.y, 2)
            );
            
            if (distance < GROUP_MERGE_DISTANCE) {
                // Merge the groups
                otherGroup.teams.push(...movedGroup.teams.filter(t => !otherGroup.teams.includes(t)));
                otherGroup.memberIds.push(...movedGroup.memberIds);
                
                // Remove moved group
                const movedMarker = mapArea.querySelector(`[data-group-id="${movedGroup.id}"]`);
                if (movedMarker) movedMarker.remove();
                
                placedGroups = placedGroups.filter(g => g.id !== movedGroup.id);
                
                // Update the other group marker
                const otherMarker = mapArea.querySelector(`[data-group-id="${otherGroup.id}"]`);
                if (otherMarker) {
                    updateGroupMarker(otherMarker, otherGroup);
                }
                
                savePositions();
                updateCounts();
                break;
            }
        }
    }
}

// Remove group marker
function removeGroupMarker(groupId) {
    const marker = mapArea.querySelector(`[data-group-id="${groupId}"]`);
    if (marker) {
        marker.remove();
    }
    placedGroups = placedGroups.filter(g => g.id !== groupId);
    savePositions();
    updateCounts();
    updatePlaceholder();
    renderMemberList(); // Re-render to show members again
}

// Update groups after individual member placement
function updateGroupsAfterMemberPlacement(memberId) {
    placedGroups.forEach(group => {
        const index = group.memberIds.indexOf(memberId);
        if (index > -1) {
            // Remove member from group
            group.memberIds.splice(index, 1);
            
            // Update the group marker display
            const marker = mapArea.querySelector(`[data-group-id="${group.id}"]`);
            if (marker) {
                if (group.memberIds.length === 0) {
                    // Remove empty group
                    marker.remove();
                    placedGroups = placedGroups.filter(g => g.id !== group.id);
                } else {
                    // Update group number
                    updateGroupMarker(marker, group);
                }
            }
        }
    });
}

// Toggle objective placing mode
function toggleObjectiveMode() {
    if (placingMode && placingMode.startsWith('objective-')) {
        // Deactivate
        placingMode = null;
        selectedObjectiveType = null;
        addObjectiveBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode');
    } else {
        // Show objective type selection modal
        objectiveTypeModal.style.display = 'flex';
    }
}

// Toggle boss placing mode
function toggleBossMode() {
    if (placingMode === 'boss') {
        // Deactivate
        placingMode = null;
        addBossBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode');
    } else {
        // Activate boss mode
        placingMode = 'boss';
        drawingMode = false;
        addBossBtn.classList.add('active');
        addObjectiveBtn.classList.remove('active');
        addBlueTowerBtn.classList.remove('active');
        addRedTowerBtn.classList.remove('active');
        addBlueTreeBtn.classList.remove('active');
        addRedTreeBtn.classList.remove('active');
    addBlueGooseBtn.classList.remove('active');
    addRedGooseBtn.classList.remove('active');
        drawBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode', 'drawing-mode');
        mapArea.classList.add('placing-mode');
        drawingCanvas.classList.remove('active');
    }
}

// Toggle tower placing mode
// Toggle blue tower placing mode
function toggleBlueTowerMode() {
    if (placingMode === 'blue-tower') {
        // Deactivate
        placingMode = null;
        addBlueTowerBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode');
    } else {
        // Activate blue tower mode
        placingMode = 'blue-tower';
        drawingMode = false;
        addBlueTowerBtn.classList.add('active');
        addObjectiveBtn.classList.remove('active');
        addBossBtn.classList.remove('active');
        addRedTowerBtn.classList.remove('active');
        addBlueTreeBtn.classList.remove('active');
        addRedTreeBtn.classList.remove('active');
    addBlueGooseBtn.classList.remove('active');
    addRedGooseBtn.classList.remove('active');
        drawBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode', 'drawing-mode');
        mapArea.classList.add('placing-mode');
        drawingCanvas.classList.remove('active');
    }
}

// Toggle red tower placing mode
function toggleRedTowerMode() {
    if (placingMode === 'red-tower') {
        // Deactivate
        placingMode = null;
        addRedTowerBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode');
    } else {
        // Activate red tower mode
        placingMode = 'red-tower';
        drawingMode = false;
        addRedTowerBtn.classList.add('active');
        addObjectiveBtn.classList.remove('active');
        addBossBtn.classList.remove('active');
        addBlueTowerBtn.classList.remove('active');
        addBlueTreeBtn.classList.remove('active');
        addRedTreeBtn.classList.remove('active');
    addBlueGooseBtn.classList.remove('active');
    addRedGooseBtn.classList.remove('active');
        drawBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode', 'drawing-mode');
        mapArea.classList.add('placing-mode');
        drawingCanvas.classList.remove('active');
    }
}

// Toggle blue tree placing mode
function toggleBlueTreeMode() {
    if (placingMode === 'blue-tree') {
        // Deactivate
        placingMode = null;
        addBlueTreeBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode');
    } else {
        // Activate blue tree mode
        placingMode = 'blue-tree';
        drawingMode = false;
        addBlueTreeBtn.classList.add('active');
        addObjectiveBtn.classList.remove('active');
        addBossBtn.classList.remove('active');
        addBlueTowerBtn.classList.remove('active');
        addRedTowerBtn.classList.remove('active');
        addRedTreeBtn.classList.remove('active');
    addBlueGooseBtn.classList.remove('active');
    addRedGooseBtn.classList.remove('active');
        drawBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode', 'drawing-mode');
        mapArea.classList.add('placing-mode');
        drawingCanvas.classList.remove('active');
    }
}

// Toggle red tree placing mode
function toggleRedTreeMode() {
    if (placingMode === 'red-tree') {
        // Deactivate
        placingMode = null;
        addRedTreeBtn.classList.remove('active');
    addBlueGooseBtn.classList.remove('active');
    addRedGooseBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode');
    } else {
        // Activate red tree mode
        placingMode = 'red-tree';
        drawingMode = false;
        addRedTreeBtn.classList.add('active');
        addObjectiveBtn.classList.remove('active');
        addBossBtn.classList.remove('active');
        addBlueTowerBtn.classList.remove('active');
        addRedTowerBtn.classList.remove('active');
        addBlueTreeBtn.classList.remove('active');
        drawBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode', 'drawing-mode');
        mapArea.classList.add('placing-mode');
        drawingCanvas.classList.remove('active');
    }
}

// Handle map click for placing objectives/bosses
function handleMapClick(e) {
    if (!placingMode) return;
    
    // Don't place if clicking on existing markers or buttons
    if (e.target !== mapArea && !e.target.classList.contains('map-placeholder')) {
        return;
    }
    
    const rect = mapArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (placingMode && placingMode.startsWith('objective-')) {
        placeObjectiveMarker(x, y, selectedObjectiveType);
    } else if (placingMode === 'boss') {
        placeBossMarker(x, y);
    } else if (placingMode === 'blue-tower') {
        placeBlueTowerMarker(x, y);
    } else if (placingMode === 'red-tower') {
        placeRedTowerMarker(x, y);
    } else if (placingMode === 'blue-tree') {
        placeBlueTreeMarker(x, y);
    } else if (placingMode === 'red-tree') {
        placeRedTreeMarker(x, y);
    } else if (placingMode === 'blue-goose') {
        placeBlueGooseMarker(x, y);
    } else if (placingMode === 'red-goose') {
        placeRedGooseMarker(x, y);
    }
}

// ============================================================================
// MAP PLACEMENT - OBJECTIVE MARKERS (RED DOTS, BOSSES, TOWERS, TREES)
// ============================================================================

// Place objective marker
function placeObjectiveMarker(x, y, type = 'enemy-dps') {
    const objectiveId = `objective-${Date.now()}`;
    
    const marker = document.createElement('div');
    marker.className = `objective-marker objective-${type}`;
    marker.dataset.objectiveId = objectiveId;
    marker.dataset.objectiveType = type;
    
    // Center the marker on cursor (20px width/height + 3px border = 26px total, so offset by 13px)
    marker.style.left = `${x - 13}px`;
    marker.style.top = `${y - 13}px`;
    marker.draggable = true;
    
    // Set marker content based on type
    let markerContent = '';
    switch(type) {
        case 'enemy-dps':
            markerContent = '<div class="objective-dot" style="background: #e74c3c;"></div>';
            break;
        case 'enemy-healer':
            markerContent = '<div class="objective-dot" style="background: #2ecc71;"></div>';
            break;
        case 'attack':
            markerContent = '<div class="objective-icon">⚔️</div>';
            break;
        case 'danger':
            markerContent = '<div class="objective-icon">💀</div>';
            break;
        case 'defend':
            markerContent = '<div class="objective-icon">🛡️</div>';
            break;
        case 'hold':
            markerContent = '<div class="objective-icon">✋</div>';
            break;
        case 'yes':
            markerContent = '<div class="objective-icon">✅</div>';
            break;
        case 'no':
            markerContent = '<div class="objective-icon">❌</div>';
            break;
        // Legacy support for old marker types
        case 'eh-marker':
            markerContent = '<div class="objective-icon">⚔️</div>';
            break;
        case 'enemy-marker':
            markerContent = '<div class="objective-icon">💀</div>';
            break;
        default:
            markerContent = '<div class="objective-dot" style="background: #e74c3c;"></div>';
    }
    
    marker.innerHTML = `
        ${markerContent}
        <button class="remove-btn" onclick="removeObjectiveMarker('${objectiveId}')">×</button>
    `;
    
    marker.addEventListener('dragstart', handleObjectiveDragStart);
    marker.addEventListener('dragend', handleObjectiveDragEnd);
    
    mapArea.appendChild(marker);
    
    // Save the centered coordinates (same as marker position)
    const centeredX = x - 13;
    const centeredY = y - 13;
    
    placedObjectives.push({
        id: objectiveId,
        x: centeredX,
        y: centeredY,
        type: type
    });
    
    savePositions();
    updatePlaceholder();
}

// Place boss marker
function placeBossMarker(x, y) {
    const bossId = `boss-${Date.now()}`;
    
    const marker = document.createElement('div');
    marker.className = 'boss-marker';
    marker.dataset.bossId = bossId;
    marker.style.left = `${x - 28}px`; // Center the 56px image
    marker.style.top = `${y - 28}px`;
    marker.draggable = true;
    
    marker.innerHTML = `
        <img src="images/boss.png" alt="Boss" draggable="false">
        <button class="remove-btn" onclick="removeBossMarker('${bossId}')">×</button>
    `;
    
    marker.addEventListener('dragstart', handleBossDragStart);
    marker.addEventListener('dragend', handleBossDragEnd);
    
    mapArea.appendChild(marker);
    
    placedBosses.push({
        id: bossId,
        x: x,
        y: y
    });
    
    savePositions();
    updatePlaceholder();
}

// Handle objective drag
function handleObjectiveDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.objectiveId);
    e.dataTransfer.setData('type', 'objective-marker');
    e.currentTarget.style.opacity = '0.5';
}

function handleObjectiveDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    
    const objectiveId = e.currentTarget.dataset.objectiveId;
    const rect = mapArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Constrain position within map bounds
    const constrained = constrainToMapBounds(x, y, 26);
    
    const objective = placedObjectives.find(o => o.id === objectiveId);
    if (objective) {
        // Center the marker (13px offset for 26px total size)
        const centeredX = constrained.x - 13;
        const centeredY = constrained.y - 13;
        objective.x = centeredX;
        objective.y = centeredY;
        e.currentTarget.style.left = `${centeredX}px`;
        e.currentTarget.style.top = `${centeredY}px`;
        savePositions();
    }
}

// Handle boss drag
function handleBossDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.bossId);
    e.dataTransfer.setData('type', 'boss-marker');
    e.currentTarget.style.opacity = '0.5';
}

function handleBossDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    
    const bossId = e.currentTarget.dataset.bossId;
    const rect = mapArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Constrain position within map bounds
    const constrained = constrainToMapBounds(x, y, 56);
    
    const boss = placedBosses.find(b => b.id === bossId);
    if (boss) {
        boss.x = constrained.x;
        boss.y = constrained.y;
        e.currentTarget.style.left = `${constrained.x - 28}px`; // Center the 56px image
        e.currentTarget.style.top = `${constrained.y - 28}px`;
        savePositions();
    }
}

// Remove objective marker
function removeObjectiveMarker(objectiveId) {
    const marker = mapArea.querySelector(`[data-objective-id="${objectiveId}"]`);
    if (marker) {
        marker.remove();
    }
    placedObjectives = placedObjectives.filter(o => o.id !== objectiveId);
    savePositions();
    updatePlaceholder();
}

// Remove boss marker
function removeBossMarker(bossId) {
    const marker = mapArea.querySelector(`[data-boss-id="${bossId}"]`);
    if (marker) {
        marker.remove();
    }
    placedBosses = placedBosses.filter(b => b.id !== bossId);
    savePositions();
    updatePlaceholder();
}

// Place blue tower marker
function placeBlueTowerMarker(x, y) {
    const towerId = `blue-tower-${Date.now()}`;
    
    const marker = document.createElement('div');
    marker.className = 'tower-marker blue-tower';
    marker.dataset.towerId = towerId;
    marker.dataset.towerType = 'blue';
    marker.style.left = `${x - 28}px`; // Center the 56px image
    marker.style.top = `${y - 28}px`;
    marker.draggable = true;
    
    marker.innerHTML = `
        <img src="images/tower_blue.png" alt="Blue Tower" draggable="false">
        <button class="remove-btn" onclick="removeBlueTowerMarker('${towerId}')">×</button>
    `;
    
    marker.addEventListener('dragstart', handleBlueTowerDragStart);
    marker.addEventListener('dragend', handleBlueTowerDragEnd);
    
    mapArea.appendChild(marker);
    
    placedBlueTowers.push({
        id: towerId,
        x: x,
        y: y
    });
    
    savePositions();
    updatePlaceholder();
}

// Handle blue tower drag
function handleBlueTowerDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.towerId);
    e.dataTransfer.setData('type', 'blue-tower-marker');
    e.currentTarget.style.opacity = '0.5';
}

function handleBlueTowerDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    
    const towerId = e.currentTarget.dataset.towerId;
    const rect = mapArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Constrain position within map bounds
    const constrained = constrainToMapBounds(x, y, 56);
    
    const tower = placedBlueTowers.find(t => t.id === towerId);
    if (tower) {
        tower.x = constrained.x;
        tower.y = constrained.y;
        e.currentTarget.style.left = `${constrained.x - 28}px`; // Center the 56px image
        e.currentTarget.style.top = `${constrained.y - 28}px`;
        savePositions();
    }
}

// Remove blue tower marker
function removeBlueTowerMarker(towerId) {
    const marker = mapArea.querySelector(`[data-tower-id="${towerId}"]`);
    if (marker) {
        marker.remove();
    }
    placedBlueTowers = placedBlueTowers.filter(t => t.id !== towerId);
    savePositions();
    updatePlaceholder();
}

// Place red tower marker
function placeRedTowerMarker(x, y) {
    const towerId = `red-tower-${Date.now()}`;
    
    const marker = document.createElement('div');
    marker.className = 'tower-marker red-tower';
    marker.dataset.towerId = towerId;
    marker.dataset.towerType = 'red';
    marker.style.left = `${x - 28}px`; // Center the 56px image
    marker.style.top = `${y - 28}px`;
    marker.draggable = true;
    
    marker.innerHTML = `
        <img src="images/tower_red.png" alt="Red Tower" draggable="false">
        <button class="remove-btn" onclick="removeRedTowerMarker('${towerId}')">×</button>
    `;
    
    marker.addEventListener('dragstart', handleRedTowerDragStart);
    marker.addEventListener('dragend', handleRedTowerDragEnd);
    
    mapArea.appendChild(marker);
    
    placedRedTowers.push({
        id: towerId,
        x: x,
        y: y
    });
    
    savePositions();
    updatePlaceholder();
}

// Handle red tower drag
function handleRedTowerDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.towerId);
    e.dataTransfer.setData('type', 'red-tower-marker');
    e.currentTarget.style.opacity = '0.5';
}

function handleRedTowerDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    
    const towerId = e.currentTarget.dataset.towerId;
    const rect = mapArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Constrain position within map bounds
    const constrained = constrainToMapBounds(x, y, 56);
    
    const tower = placedRedTowers.find(t => t.id === towerId);
    if (tower) {
        tower.x = constrained.x;
        tower.y = constrained.y;
        e.currentTarget.style.left = `${constrained.x - 28}px`; // Center the 56px image
        e.currentTarget.style.top = `${constrained.y - 28}px`;
        savePositions();
    }
}

// Remove red tower marker
function removeRedTowerMarker(towerId) {
    const marker = mapArea.querySelector(`[data-tower-id="${towerId}"]`);
    if (marker) {
        marker.remove();
    }
    placedRedTowers = placedRedTowers.filter(t => t.id !== towerId);
    savePositions();
    updatePlaceholder();
}

// Place tree marker
// Place blue tree marker
function placeBlueTreeMarker(x, y) {
    const treeId = `blue-tree-${Date.now()}`;
    
    const marker = document.createElement('div');
    marker.className = 'tree-marker blue-tree';
    marker.dataset.treeId = treeId;
    marker.dataset.treeType = 'blue';
    marker.style.left = `${x - 28}px`; // Center the 56px image
    marker.style.top = `${y - 28}px`;
    marker.draggable = true;
    
    marker.innerHTML = `
        <img src="images/tree_blue.png" alt="Blue Tree" draggable="false">
        <button class="remove-btn" onclick="removeBlueTreeMarker('${treeId}')">×</button>
    `;
    
    marker.addEventListener('dragstart', handleBlueTreeDragStart);
    marker.addEventListener('dragend', handleBlueTreeDragEnd);
    
    mapArea.appendChild(marker);
    
    placedBlueTrees.push({
        id: treeId,
        x: x,
        y: y
    });
    
    savePositions();
    updatePlaceholder();
}

// Handle blue tree drag
function handleBlueTreeDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.treeId);
    e.dataTransfer.setData('type', 'blue-tree-marker');
    e.currentTarget.style.opacity = '0.5';
}

function handleBlueTreeDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    
    const treeId = e.currentTarget.dataset.treeId;
    const rect = mapArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Constrain position within map bounds
    const constrained = constrainToMapBounds(x, y, 56);
    
    const tree = placedBlueTrees.find(t => t.id === treeId);
    if (tree) {
        tree.x = constrained.x;
        tree.y = constrained.y;
        e.currentTarget.style.left = `${constrained.x - 28}px`; // Center the 56px image
        e.currentTarget.style.top = `${constrained.y - 28}px`;
        savePositions();
    }
}

// Remove blue tree marker
function removeBlueTreeMarker(treeId) {
    const marker = mapArea.querySelector(`[data-tree-id="${treeId}"]`);
    if (marker) {
        marker.remove();
    }
    placedBlueTrees = placedBlueTrees.filter(t => t.id !== treeId);
    savePositions();
    updatePlaceholder();
}

// Place red tree marker
function placeRedTreeMarker(x, y) {
    const treeId = `red-tree-${Date.now()}`;
    
    const marker = document.createElement('div');
    marker.className = 'tree-marker red-tree';
    marker.dataset.treeId = treeId;
    marker.dataset.treeType = 'red';
    marker.style.left = `${x - 28}px`; // Center the 56px image
    marker.style.top = `${y - 28}px`;
    marker.draggable = true;
    
    marker.innerHTML = `
        <img src="images/tree_red.png" alt="Red Tree" draggable="false">
        <button class="remove-btn" onclick="removeRedTreeMarker('${treeId}')">×</button>
    `;
    
    marker.addEventListener('dragstart', handleRedTreeDragStart);
    marker.addEventListener('dragend', handleRedTreeDragEnd);
    
    mapArea.appendChild(marker);
    
    placedRedTrees.push({
        id: treeId,
        x: x,
        y: y
    });
    
    savePositions();
    updatePlaceholder();
}

// Handle red tree drag
function handleRedTreeDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.treeId);
    e.dataTransfer.setData('type', 'red-tree-marker');
    e.currentTarget.style.opacity = '0.5';
}

function handleRedTreeDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    
    const treeId = e.currentTarget.dataset.treeId;
    const rect = mapArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Constrain position within map bounds
    const constrained = constrainToMapBounds(x, y, 56);
    
    const tree = placedRedTrees.find(t => t.id === treeId);
    if (tree) {
        tree.x = constrained.x;
        tree.y = constrained.y;
        e.currentTarget.style.left = `${constrained.x - 28}px`; // Center the 56px image
        e.currentTarget.style.top = `${constrained.y - 28}px`;
        savePositions();
    }
}

// Remove red tree marker
function removeRedTreeMarker(treeId) {
    const marker = mapArea.querySelector(`[data-tree-id="${treeId}"]`);
    if (marker) {
        marker.remove();
    }
    placedRedTrees = placedRedTrees.filter(t => t.id !== treeId);
    savePositions();
    updatePlaceholder();
}

// ============================================================================

// ============================================================================
// GOOSE SYSTEM
// ============================================================================

// Toggle blue goose placing mode
function toggleBlueGooseMode() {
    if (placingMode === 'blue-goose') {
        placingMode = null;
        addBlueGooseBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode');
    } else {
        placingMode = 'blue-goose';
        drawingMode = false;
        addBlueGooseBtn.classList.add('active');
        addObjectiveBtn.classList.remove('active');
        addBossBtn.classList.remove('active');
        addBlueTowerBtn.classList.remove('active');
        addRedTowerBtn.classList.remove('active');
        addBlueTreeBtn.classList.remove('active');
        addRedTreeBtn.classList.remove('active');
    addBlueGooseBtn.classList.remove('active');
    addRedGooseBtn.classList.remove('active');
        addRedGooseBtn.classList.remove('active');
        drawBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode', 'drawing-mode');
        mapArea.classList.add('placing-mode');
        drawingCanvas.classList.remove('active');
    }
}

// Toggle red goose placing mode
function toggleRedGooseMode() {
    if (placingMode === 'red-goose') {
        placingMode = null;
        addRedGooseBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode');
    } else {
        placingMode = 'red-goose';
        drawingMode = false;
        addRedGooseBtn.classList.add('active');
        addObjectiveBtn.classList.remove('active');
        addBossBtn.classList.remove('active');
        addBlueTowerBtn.classList.remove('active');
        addRedTowerBtn.classList.remove('active');
        addBlueTreeBtn.classList.remove('active');
        addRedTreeBtn.classList.remove('active');
    addBlueGooseBtn.classList.remove('active');
    addRedGooseBtn.classList.remove('active');
        addBlueGooseBtn.classList.remove('active');
        drawBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode', 'drawing-mode');
        mapArea.classList.add('placing-mode');
        drawingCanvas.classList.remove('active');
    }
}

// Place blue goose marker
function placeBlueGooseMarker(x, y) {
    const gooseId = `blue-goose-${Date.now()}`;
    
    const marker = document.createElement('div');
    marker.className = 'goose-marker blue-goose';
    marker.dataset.gooseId = gooseId;
    marker.dataset.gooseType = 'blue';
    marker.style.left = `${x - 28}px`;
    marker.style.top = `${y - 28}px`;
    marker.draggable = true;
    
    marker.innerHTML = `
        <img src="images/goose_blue.png" alt="Blue Goose" draggable="false">
        <button class="remove-btn" onclick="removeBlueGooseMarker('${gooseId}')">×</button>
    `;
    
    marker.addEventListener('dragstart', handleBlueGooseDragStart);
    marker.addEventListener('dragend', handleBlueGooseDragEnd);
    
    mapArea.appendChild(marker);
    
    placedBlueGeese.push({
        id: gooseId,
        x: x,
        y: y
    });
    
    savePositions();
    updatePlaceholder();
}

function handleBlueGooseDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.gooseId);
    e.dataTransfer.setData('type', 'blue-goose-marker');
    e.currentTarget.style.opacity = '0.5';
}

function handleBlueGooseDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    
    const gooseId = e.currentTarget.dataset.gooseId;
    const rect = mapArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const goose = placedBlueGeese.find(g => g.id === gooseId);
    if (goose) {
        goose.x = x;
        goose.y = y;
        e.currentTarget.style.left = `${x - 28}px`;
        e.currentTarget.style.top = `${y - 28}px`;
        savePositions();
    }
}

function removeBlueGooseMarker(gooseId) {
    const marker = mapArea.querySelector(`[data-goose-id="${gooseId}"]`);
    if (marker) {
        marker.remove();
    }
    placedBlueGeese = placedBlueGeese.filter(g => g.id !== gooseId);
    savePositions();
    updatePlaceholder();
}

// Place red goose marker
function placeRedGooseMarker(x, y) {
    const gooseId = `red-goose-${Date.now()}`;
    
    const marker = document.createElement('div');
    marker.className = 'goose-marker red-goose';
    marker.dataset.gooseId = gooseId;
    marker.dataset.gooseType = 'red';
    marker.style.left = `${x - 28}px`;
    marker.style.top = `${y - 28}px`;
    marker.draggable = true;
    
    marker.innerHTML = `
        <img src="images/goose_red.png" alt="Red Goose" draggable="false">
        <button class="remove-btn" onclick="removeRedGooseMarker('${gooseId}')">×</button>
    `;
    
    marker.addEventListener('dragstart', handleRedGooseDragStart);
    marker.addEventListener('dragend', handleRedGooseDragEnd);
    
    mapArea.appendChild(marker);
    
    placedRedGeese.push({
        id: gooseId,
        x: x,
        y: y
    });
    
    savePositions();
    updatePlaceholder();
}

function handleRedGooseDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.gooseId);
    e.dataTransfer.setData('type', 'red-goose-marker');
    e.currentTarget.style.opacity = '0.5';
}

function handleRedGooseDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    
    const gooseId = e.currentTarget.dataset.gooseId;
    const rect = mapArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const goose = placedRedGeese.find(g => g.id === gooseId);
    if (goose) {
        goose.x = x;
        goose.y = y;
        e.currentTarget.style.left = `${x - 28}px`;
        e.currentTarget.style.top = `${y - 28}px`;
        savePositions();
    }
}

function removeRedGooseMarker(gooseId) {
    const marker = mapArea.querySelector(`[data-goose-id="${gooseId}"]`);
    if (marker) {
        marker.remove();
    }
    placedRedGeese = placedRedGeese.filter(g => g.id !== gooseId);
    savePositions();
    updatePlaceholder();
}

// ENEMY SYSTEM
// ============================================================================

// Add enemies to the map
function addEnemies() {
    const currentEnemyCount = placedEnemies.length;
    
    if (currentEnemyCount >= MAX_ENEMIES) {
        alert(`Maximum ${MAX_ENEMIES / ENEMIES_PER_CLICK} enemy groups already placed!`);
        return;
    }
    
    const mapRect = mapArea.getBoundingClientRect();
    
    // Place a group in the center
    const centerX = mapRect.width / 2;
    const centerY = mapRect.height / 2;
    
    placeEnemyGroup(centerX, centerY);
    
    updateEnemyCount();
}

// Place enemy group marker on map
function placeEnemyGroup(x, y) {
    const enemyGroupId = `enemy-group-${Date.now()}`;
    
    const marker = document.createElement('div');
    marker.className = 'group-marker enemy-group';
    marker.dataset.enemyGroupId = enemyGroupId;
    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
    marker.draggable = true;
    
    marker.innerHTML = `
        <div class="group-number">5</div>
        <div class="group-tooltip">
            <div class="tooltip-header">Enemy Group</div>
            <div class="tooltip-info">5 Enemy Players</div>
        </div>
        <button class="remove-btn" onclick="removeEnemyGroup('${enemyGroupId}')">×</button>
    `;
    
    marker.addEventListener('dragstart', handleEnemyGroupDragStart);
    marker.addEventListener('dragend', handleEnemyGroupDragEnd);
    
    mapArea.appendChild(marker);
    
    placedEnemies.push({
        id: enemyGroupId,
        x: x,
        y: y,
        count: ENEMIES_PER_CLICK
    });
    
    savePositions();
    updatePlaceholder();
}

// Handle enemy group drag
function handleEnemyGroupDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.enemyGroupId);
    e.dataTransfer.setData('type', 'enemy-group-marker');
    e.currentTarget.style.opacity = '0.5';
}

function handleEnemyGroupDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    
    const enemyGroupId = e.currentTarget.dataset.enemyGroupId;
    const rect = mapArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const enemyGroup = placedEnemies.find(eg => eg.id === enemyGroupId);
    if (enemyGroup) {
        enemyGroup.x = x;
        enemyGroup.y = y;
        e.currentTarget.style.left = `${x}px`;
        e.currentTarget.style.top = `${y}px`;
        savePositions();
    }
}

// Remove enemy group
function removeEnemyGroup(enemyGroupId) {
    const marker = mapArea.querySelector(`[data-enemy-group-id="${enemyGroupId}"]`);
    if (marker) {
        marker.remove();
    }
    placedEnemies = placedEnemies.filter(e => e.id !== enemyGroupId);
    savePositions();
    updatePlaceholder();
    updateEnemyCount();
}

// Update enemy count display
function updateEnemyCount() {
    const totalEnemies = placedEnemies.length * ENEMIES_PER_CLICK;
    enemyCount.textContent = totalEnemies;
    
    // Disable button if max reached
    if (placedEnemies.length >= MAX_ENEMIES / ENEMIES_PER_CLICK) {
        addEnemiesBtn.disabled = true;
    } else {
        addEnemiesBtn.disabled = false;
    }
}

// Initialize drawing canvas
function initializeCanvas() {
    resizeCanvas();
    
    let isDrawing = false;
    let currentPath = [];
    
    drawingCanvas.addEventListener('mousedown', (e) => {
        if (!drawingMode) return;
        e.preventDefault();
        
        isDrawing = true;
        const rect = drawingCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        currentPath = [{ x, y }];
        
        // Start drawing immediately
        ctx.strokeStyle = drawingColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
    });
    
    drawingCanvas.addEventListener('mousemove', (e) => {
        if (!drawingMode || !isDrawing) return;
        e.preventDefault();
        
        const rect = drawingCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        currentPath.push({ x, y });
        
        // Draw line segment
        ctx.lineTo(x, y);
        ctx.stroke();
    });
    
    drawingCanvas.addEventListener('mouseup', (e) => {
        if (!drawingMode || !isDrawing) return;
        e.preventDefault();
        
        isDrawing = false;
        
        if (currentPath.length > 1) {
            const pathData = {
                points: [...currentPath],
                timestamp: Date.now(),
                color: drawingColor,
                width: 3
            };
            
            drawingPaths.push(pathData);
            
            // Only add to history if auto-delete is OFF
            if (!autoDeleteDrawings) {
                // Create a deep copy of the current state
                const stateCopy = drawingPaths.map(path => ({
                    points: [...path.points],
                    timestamp: path.timestamp,
                    color: path.color,
                    width: path.width
                }));
                drawingHistory.push(stateCopy);
                drawingRedoStack = []; // Clear redo stack when new action is made
                updateUndoRedoButtons();
            }
            
            // Set up auto-delete if enabled
            if (autoDeleteDrawings) {
                schedulePathDeletion(drawingPaths.length - 1);
            }
        }
        
        currentPath = [];
    });
    
    drawingCanvas.addEventListener('mouseleave', () => {
        if (isDrawing) {
            isDrawing = false;
            currentPath = [];
        }
    });
    
    // Touch support for mobile/tablets
    drawingCanvas.addEventListener('touchstart', (e) => {
        if (!drawingMode) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = drawingCanvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        isDrawing = true;
        currentPath = [{ x, y }];
        
        ctx.strokeStyle = drawingColor;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(x, y);
    });
    
    drawingCanvas.addEventListener('touchmove', (e) => {
        if (!drawingMode || !isDrawing) return;
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = drawingCanvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        currentPath.push({ x, y });
        ctx.lineTo(x, y);
        ctx.stroke();
    });
    
    drawingCanvas.addEventListener('touchend', (e) => {
        if (!drawingMode || !isDrawing) return;
        e.preventDefault();
        
        isDrawing = false;
        
        if (currentPath.length > 1) {
            const pathData = {
                points: [...currentPath],
                timestamp: Date.now(),
                color: drawingColor,
                width: 3
            };
            
            drawingPaths.push(pathData);
            
            // Only add to history if auto-delete is OFF
            if (!autoDeleteDrawings) {
                const stateCopy = drawingPaths.map(path => ({
                    points: [...path.points],
                    timestamp: path.timestamp,
                    color: path.color,
                    width: path.width
                }));
                drawingHistory.push(stateCopy);
                drawingRedoStack = [];
                updateUndoRedoButtons();
            }
            
            if (autoDeleteDrawings) {
                schedulePathDeletion(drawingPaths.length - 1);
            }
        }
        
        currentPath = [];
    });
}

// Resize canvas to match map area
function resizeCanvas() {
    const rect = mapArea.getBoundingClientRect();
    drawingCanvas.width = rect.width;
    drawingCanvas.height = rect.height;
    redrawAllPaths();
}

// ============================================================================
// DRAWING SYSTEM
// ============================================================================

// Draw a single path
function drawPath(points, color, width) {
    if (points.length < 2) return;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.stroke();
}

// Redraw all paths
function redrawAllPaths() {
    ctx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    
    drawingPaths.forEach(pathData => {
        drawPath(pathData.points, pathData.color, pathData.width);
    });
}

// Toggle drawing mode
function toggleDrawingMode() {
    if (drawingMode) {
        // Deactivate
        drawingMode = false;
        drawBtn.classList.remove('active');
        mapArea.classList.remove('drawing-mode');
        drawingCanvas.classList.remove('active');
    } else {
        // Activate drawing mode
        drawingMode = true;
        placingMode = null;
        drawBtn.classList.add('active');
        addObjectiveBtn.classList.remove('active');
        addBossBtn.classList.remove('active');
        addBlueTowerBtn.classList.remove('active');
        addRedTowerBtn.classList.remove('active');
        addBlueTreeBtn.classList.remove('active');
        addRedTreeBtn.classList.remove('active');
    addBlueGooseBtn.classList.remove('active');
    addRedGooseBtn.classList.remove('active');
        mapArea.classList.remove('placing-mode');
        mapArea.classList.add('drawing-mode');
        drawingCanvas.classList.add('active');
    }
}

// Clear all drawings
async function clearAllDrawings() {
    if (drawingPaths.length === 0) return;
    
    const confirmed = await showConfirm(
        'Clear All Drawings',
        'Are you sure you want to clear all drawings?'
    );
    
    if (confirmed) {
        // Save current state to history before clearing (deep copy)
        if (!autoDeleteDrawings && drawingPaths.length > 0) {
            const stateCopy = drawingPaths.map(path => ({
                points: [...path.points],
                timestamp: path.timestamp,
                color: path.color,
                width: path.width
            }));
            drawingHistory.push(stateCopy);
        }
        
        drawingPaths = [];
        drawingDeleteTimers.forEach(timer => clearTimeout(timer));
        drawingDeleteTimers = [];
        redrawAllPaths();
        updateUndoRedoButtons();
    }
}

// Undo drawing
function undoDrawing() {
    if (autoDeleteDrawings) {
        alert('Undo is not available when auto-delete is enabled. Please disable auto-delete first.');
        return;
    }
    
    if (drawingHistory.length === 0) return;
    
    // Save current state to redo stack (deep copy)
    const currentStateCopy = drawingPaths.map(path => ({
        points: [...path.points],
        timestamp: path.timestamp,
        color: path.color,
        width: path.width
    }));
    drawingRedoStack.push(currentStateCopy);
    
    // Restore previous state (pop returns the last element)
    drawingHistory.pop(); // Remove current state
    const previousState = drawingHistory[drawingHistory.length - 1]; // Get previous state
    
    if (previousState) {
        // Deep copy the previous state
        drawingPaths = previousState.map(path => ({
            points: [...path.points],
            timestamp: path.timestamp,
            color: path.color,
            width: path.width
        }));
    } else {
        // No previous state means go back to empty
        drawingPaths = [];
    }
    
    redrawAllPaths();
    updateUndoRedoButtons();
}

// Redo drawing
function redoDrawing() {
    if (autoDeleteDrawings) {
        alert('Redo is not available when auto-delete is enabled. Please disable auto-delete first.');
        return;
    }
    
    if (drawingRedoStack.length === 0) return;
    
    // Get the next state from redo stack
    const nextState = drawingRedoStack.pop();
    
    if (nextState) {
        // Save current state to history (deep copy)
        const currentStateCopy = drawingPaths.map(path => ({
            points: [...path.points],
            timestamp: path.timestamp,
            color: path.color,
            width: path.width
        }));
        drawingHistory.push(currentStateCopy);
        
        // Restore next state (deep copy)
        drawingPaths = nextState.map(path => ({
            points: [...path.points],
            timestamp: path.timestamp,
            color: path.color,
            width: path.width
        }));
    }
    
    redrawAllPaths();
    updateUndoRedoButtons();
}

// Update undo/redo button states
function updateUndoRedoButtons() {
    if (autoDeleteDrawings) {
        undoDrawBtn.disabled = true;
        redoDrawBtn.disabled = true;
    } else {
        undoDrawBtn.disabled = drawingHistory.length === 0;
        redoDrawBtn.disabled = drawingRedoStack.length === 0;
    }
}

// Handle auto-delete toggle
function handleAutoDeleteToggle(e) {
    autoDeleteDrawings = e.target.checked;
    
    if (autoDeleteDrawings) {
        // Clear history when enabling auto-delete
        drawingHistory = [];
        drawingRedoStack = [];
        updateUndoRedoButtons();
        
        // Schedule deletion for existing paths
        drawingPaths.forEach((path, index) => {
            const elapsed = Date.now() - path.timestamp;
            const remaining = AUTO_DELETE_DELAY - elapsed;
            
            if (remaining > 0) {
                schedulePathDeletion(index, remaining);
            } else {
                // Already expired, delete immediately
                drawingPaths[index] = null;
            }
        });
        
        // Clean up null entries
        drawingPaths = drawingPaths.filter(p => p !== null);
        redrawAllPaths();
    } else {
        // Clear all timers when disabling auto-delete
        drawingDeleteTimers.forEach(timer => clearTimeout(timer));
        drawingDeleteTimers = [];
        
        // Initialize history with current state (deep copy)
        if (drawingPaths.length > 0) {
            const stateCopy = drawingPaths.map(path => ({
                points: [...path.points],
                timestamp: path.timestamp,
                color: path.color,
                width: path.width
            }));
            drawingHistory = [stateCopy];
        } else {
            drawingHistory = [[]]; // Empty state
        }
        updateUndoRedoButtons();
    }
}

// Schedule path deletion
function schedulePathDeletion(index, delay = AUTO_DELETE_DELAY) {
    const timer = setTimeout(() => {
        if (drawingPaths[index]) {
            drawingPaths.splice(index, 1);
            redrawAllPaths();
            
            // Remove this timer from the list
            const timerIndex = drawingDeleteTimers.indexOf(timer);
            if (timerIndex > -1) {
                drawingDeleteTimers.splice(timerIndex, 1);
            }
        }
    }, delay);
    
    drawingDeleteTimers.push(timer);
}

// ============================================================================
// SPLIT MEMBER FEATURE
// ============================================================================

// Toggle split member view
function toggleSplitView(groupId) {
    const splitDiv = document.getElementById(`split-${groupId}`);
    if (splitDiv) {
        const isCurrentlyOpen = splitDiv.style.display !== 'none';
        
        // Close any other open split views
        if (activeSplitGroupId && activeSplitGroupId !== groupId) {
            const otherSplitDiv = document.getElementById(`split-${activeSplitGroupId}`);
            if (otherSplitDiv) {
                otherSplitDiv.style.display = 'none';
            }
        }
        
        // Toggle current split view
        if (isCurrentlyOpen) {
            splitDiv.style.display = 'none';
            activeSplitGroupId = null;
        } else {
            splitDiv.style.display = 'block';
            activeSplitGroupId = groupId;
        }
    }
}

// Split member from group - place near the group
function splitMemberFromGroup(groupId, memberId) {
    const group = placedGroups.find(g => g.id === groupId);
    if (!group) return;
    
    // Get member info
    const member = members.find(m => m.id === memberId);
    if (!member) return;
    
    // Remove member from group
    group.memberIds = group.memberIds.filter(id => id !== memberId);
    
    // Calculate position near the group (offset by 50px to the right)
    const offsetX = 50;
    const offsetY = 0;
    const newX = group.x + offsetX;
    const newY = group.y + offsetY;
    
    // If group is empty, remove it
    if (group.memberIds.length === 0) {
        removeGroupMarker(groupId);
    } else {
        // Update the group marker
        const marker = mapArea.querySelector(`[data-group-id="${groupId}"]`);
        if (marker) {
            updateGroupMarker(marker, group);
        }
    }
    
    // Place member individually near the group
    placeMemberOnMap(member, newX, newY);
    
    savePositions();
    updateCounts();
    renderMemberList();
}

function splitGroup(groupId) {
    const group = placedGroups.find(g => g.id === groupId);
    if (!group) return;
    
    if (group.teams.length <= 1) {
        alert('This group only contains one team. Nothing to split.');
        return;
    }
    
    // Remove the original group marker
    const marker = mapArea.querySelector(`[data-group-id="${groupId}"]`);
    if (marker) {
        marker.remove();
    }
    
    // Remove from placedGroups array
    placedGroups = placedGroups.filter(g => g.id !== groupId);
    
    // Create separate groups for each team
    const baseX = group.x;
    const baseY = group.y;
    const offset = 45; // pixels to offset each new group (reduced from 60)
    
    group.teams.forEach((teamName, index) => {
        // Get members for this team
        const teamMemberIds = group.memberIds.filter(id => {
            const member = members.find(m => m.id === id);
            return member && member.team === teamName;
        });
        
        if (teamMemberIds.length > 0) {
            // Calculate position with offset in a circular pattern
            const angle = (index / group.teams.length) * 2 * Math.PI;
            const newX = baseX + Math.cos(angle) * offset;
            const newY = baseY + Math.sin(angle) * offset;
            
            // Create new group
            const newGroupId = `group-${Date.now()}-${index}`;
            const newGroup = {
                id: newGroupId,
                teams: [teamName],
                memberIds: teamMemberIds,
                x: newX,
                y: newY
            };
            
            placedGroups.push(newGroup);
            renderGroupMarker(newGroup);
        }
    });
    
    savePositions();
    updateCounts();
}

// Place member marker on map
function placeMemberOnMap(member, x, y) {
    const marker = document.createElement('div');
    marker.className = `member-marker role-${member.role}`;
    marker.dataset.memberId = member.id;
    marker.style.left = `${x - 8}px`; // Center the marker
    marker.style.top = `${y - 8}px`;
    marker.draggable = true;
    
    const displayTeamName = getTeamDisplayName(member.team);
    
    marker.innerHTML = `
        <div class="member-name">${member.name}</div>
        <div class="marker-tooltip">
            <div class="tooltip-info">${member.role} | ${displayTeamName || 'No Team'}</div>
            <div class="tooltip-weapons">⚔️ ${member.weapon1 || 'N/A'} | ${member.weapon2 || 'N/A'}</div>
        </div>
        <button class="remove-btn" onclick="removeMemberMarker(${member.id})">×</button>
    `;
    
    // Make marker draggable within map
    marker.addEventListener('dragstart', handleMarkerDragStart);
    marker.addEventListener('dragend', handleMarkerDragEnd);
    
    mapArea.appendChild(marker);
    
    placedMembers.push({
        memberId: member.id,
        x: x,
        y: y
    });
    
    // Check if this member was part of a group and update the group
    updateGroupsAfterMemberPlacement(member.id);
    
    savePositions();
    updateCounts();
    updatePlaceholder();
    renderMemberList(); // Re-render to hide placed member
}

// Handle marker drag
function handleMarkerDragStart(e) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.currentTarget.dataset.memberId);
    e.currentTarget.style.opacity = '0.5';
}

function handleMarkerDragEnd(e) {
    e.currentTarget.style.opacity = '1';
    
    const memberId = parseInt(e.currentTarget.dataset.memberId);
    const rect = mapArea.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Constrain position within map bounds (member markers are smaller, ~60px width for names)
    const constrained = constrainToMapBounds(x, y, 60);
    
    // Update position
    const placement = placedMembers.find(p => p.memberId === memberId);
    if (placement) {
        placement.x = constrained.x;
        placement.y = constrained.y;
        e.currentTarget.style.left = `${constrained.x - 8}px`; // Center the marker
        e.currentTarget.style.top = `${constrained.y - 8}px`;
        savePositions();
    }
}

// Remove member marker
function removeMemberMarker(memberId) {
    const marker = mapArea.querySelector(`[data-member-id="${memberId}"]`);
    if (marker) {
        marker.remove();
    }
    placedMembers = placedMembers.filter(p => p.memberId !== memberId);
    savePositions();
    updateCounts();
    updatePlaceholder();
    renderMemberList(); // Re-render to show member again
}

// Search functionality
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    applyFilters(searchTerm);
}

// View toggle functionality
function handleViewToggle(e) {
    viewToggleButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    currentView = e.target.dataset.view;
    renderMemberList();
}

// Role filter functionality
function handleRoleFilter(e) {
    roleFilterButtons.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    
    currentRoleFilter = e.target.dataset.role;
    const searchTerm = searchInput.value.toLowerCase();
    applyFilters(searchTerm);
}

// Apply all filters
function applyFilters(searchTerm = '') {
    filteredMembers = members.filter(member => {
        const matchesSearch = member.name.toLowerCase().includes(searchTerm) ||
                            member.role.toLowerCase().includes(searchTerm) ||
                            member.team.toLowerCase().includes(searchTerm);
        
        const matchesRole = currentRoleFilter === 'all' || member.role === currentRoleFilter;
        
        return matchesSearch && matchesRole;
    });
    
    renderMemberList();
}

// Clear all placements
async function clearAllPlacements() {
    const totalPlaced = getTotalPlacedPlayers();
    const totalMarkers = placedObjectives.length + placedBosses.length + placedBlueTowers.length + placedRedTowers.length + placedBlueTrees.length + placedRedTrees.length + placedBlueGeese.length + placedRedGeese.length + placedEnemies.length;
    if (totalPlaced === 0 && totalMarkers === 0) return;
    
    const confirmed = await showConfirm(
        'Clear All Placements',
        'Are you sure you want to remove all players and markers from the map?'
    );
    
    if (confirmed) {
        const markers = mapArea.querySelectorAll('.member-marker, .group-marker, .objective-marker, .boss-marker, .tower-marker, .tree-marker, .goose-marker, .enemy-marker');
        markers.forEach(marker => marker.remove());
        placedMembers = [];
        placedGroups = [];
        placedObjectives = [];
        placedBosses = [];
        placedBlueTowers = [];
        placedRedTowers = [];
        placedBlueTrees = [];
        placedRedTrees = [];
        placedBlueGeese = [];
        placedRedGeese = [];
        placedEnemies = [];
        savePositions();
        updateCounts();
        updatePlaceholder();
        updateEnemyCount();
        renderMemberList(); // Re-render to show all members again
    }
}

// Update player counts
function updateCounts() {
    playerCount.textContent = `(${members.length}/${MAX_PLAYERS})`;
    const totalPlaced = getTotalPlacedPlayers();
    placedCount.textContent = `(${totalPlaced}/${MAX_PLAYERS} Placed)`;
}

// Update placeholder visibility
function updatePlaceholder() {
    const placeholder = document.querySelector('.map-placeholder');
    if (placeholder) {
        const hasContent = placedMembers.length > 0 || placedGroups.length > 0 || 
                          placedObjectives.length > 0 || placedBosses.length > 0 ||
                          placedBlueTowers.length > 0 || placedRedTowers.length > 0 || placedBlueTrees.length > 0 || placedRedTrees.length > 0 || placedBlueGeese.length > 0 || placedRedGeese.length > 0 || placedEnemies.length > 0;
        placeholder.style.display = hasContent ? 'none' : 'block';
    }
}

// ============================================================================
// DATA PERSISTENCE & EXPORT
// ============================================================================

// Render all map markers from data
function renderMap() {
    // Clear existing markers
    const existingMarkers = mapArea.querySelectorAll('.member-marker, .group-marker, .objective-marker, .boss-marker, .tower-marker, .tree-marker, .enemy-marker');
    existingMarkers.forEach(marker => marker.remove());
    
    // Render individual member markers
    placedMembers.forEach(placement => {
        const member = members.find(m => m.id === placement.memberId);
        if (!member) return;
        
        const marker = document.createElement('div');
        marker.className = 'member-marker';
        marker.dataset.memberId = placement.memberId;
        marker.style.left = `${placement.x - 12}px`;
        marker.style.top = `${placement.y - 12}px`;
        marker.draggable = true;
        
        const roleCount = { Tank: 0, DPS: 0, Healer: 0, Support: 0 };
        roleCount[member.role] = 1;
        
        marker.innerHTML = `
            <div class="member-tooltip">
                <div class="tooltip-roles">
                    ${roleCount.Tank > 0 ? `<div class="role-item"><span class="role-dot role-Tank"></span> ${roleCount.Tank} Tank</div>` : ''}
                    ${roleCount.DPS > 0 ? `<div class="role-item"><span class="role-dot role-DPS"></span> ${roleCount.DPS} DPS</div>` : ''}
                    ${roleCount.Healer > 0 ? `<div class="role-item"><span class="role-dot role-Healer"></span> ${roleCount.Healer} Healer</div>` : ''}
                    ${roleCount.Support > 0 ? `<div class="role-item"><span class="role-dot role-Support"></span> ${roleCount.Support} Support</div>` : ''}
                </div>
            </div>
            <button class="remove-btn" onclick="removeMemberMarker(${placement.memberId})">×</button>
        `;
        
        marker.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', placement.memberId);
            e.dataTransfer.setData('type', 'member-marker');
            e.currentTarget.style.opacity = '0.5';
        });
        
        marker.addEventListener('dragend', (e) => {
            e.currentTarget.style.opacity = '1';
            const rect = mapArea.getBoundingClientRect();
            const x = e.clientX - rect.left + 12;
            const y = e.clientY - rect.top + 12;
            const placementIndex = placedMembers.findIndex(p => p.memberId === placement.memberId);
            if (placementIndex !== -1) {
                placedMembers[placementIndex].x = x;
                placedMembers[placementIndex].y = y;
                marker.style.left = `${x - 12}px`;
                marker.style.top = `${y - 12}px`;
                savePositions();
            }
        });
        
        mapArea.appendChild(marker);
    });
    
    // Render group markers
    placedGroups.forEach(group => {
        renderGroupMarker(group);
    });
    
    // Render objectives
    placedObjectives.forEach(obj => {
        const marker = document.createElement('div');
        marker.className = `objective-marker objective-${obj.type || 'enemy-dps'}`;
        marker.dataset.objectiveId = obj.id;
        marker.dataset.objectiveType = obj.type || 'enemy-dps';
        marker.style.left = `${obj.x}px`;
        marker.style.top = `${obj.y}px`;
        marker.draggable = true;
        
        // Set marker content based on type
        let markerContent = '';
        const objType = obj.type || 'enemy-dps';
        switch(objType) {
            case 'enemy-dps':
                markerContent = '<div class="objective-dot" style="background: #e74c3c;"></div>';
                break;
            case 'enemy-healer':
                markerContent = '<div class="objective-dot" style="background: #2ecc71;"></div>';
                break;
            case 'attack':
                markerContent = '<div class="objective-icon">⚔️</div>';
                break;
            case 'danger':
                markerContent = '<div class="objective-icon">💀</div>';
                break;
            case 'defend':
                markerContent = '<div class="objective-icon">🛡️</div>';
                break;
            case 'hold':
                markerContent = '<div class="objective-icon">✋</div>';
                break;
            case 'yes':
                markerContent = '<div class="objective-icon">✅</div>';
                break;
            case 'no':
                markerContent = '<div class="objective-icon">❌</div>';
                break;
            // Legacy support
            case 'eh-marker':
                markerContent = '<div class="objective-icon">⚔️</div>';
                break;
            case 'enemy-marker':
                markerContent = '<div class="objective-icon">💀</div>';
                break;
            default:
                markerContent = '<div class="objective-dot" style="background: #e74c3c;"></div>';
        }
        
        marker.innerHTML = `
            ${markerContent}
            <button class="remove-btn" onclick="removeObjectiveMarker('${obj.id}')">×</button>
        `;
        
        marker.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', obj.id);
            e.dataTransfer.setData('type', 'objective-marker');
            e.currentTarget.style.opacity = '0.5';
        });
        
        marker.addEventListener('dragend', (e) => {
            e.currentTarget.style.opacity = '1';
            const rect = mapArea.getBoundingClientRect();
            const x = e.clientX - rect.left + 12;
            const y = e.clientY - rect.top + 12;
            const objIndex = placedObjectives.findIndex(o => o.id === obj.id);
            if (objIndex !== -1) {
                placedObjectives[objIndex].x = x;
                placedObjectives[objIndex].y = y;
                marker.style.left = `${x - 12}px`;
                marker.style.top = `${y - 12}px`;
                savePositions();
            }
        });
        
        mapArea.appendChild(marker);
    });
    
    // Render bosses
    placedBosses.forEach(boss => {
        const marker = document.createElement('div');
        marker.className = 'boss-marker';
        marker.dataset.bossId = boss.id;
        marker.style.left = `${boss.x - 28}px`;
        marker.style.top = `${boss.y - 28}px`;
        marker.draggable = true;
        marker.innerHTML = '<button class="remove-btn" onclick="removeBossMarker(\'' + boss.id + '\')">×</button>';
        
        marker.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', boss.id);
            e.dataTransfer.setData('type', 'boss-marker');
            e.currentTarget.style.opacity = '0.5';
        });
        
        marker.addEventListener('dragend', (e) => {
            e.currentTarget.style.opacity = '1';
            const rect = mapArea.getBoundingClientRect();
            const x = e.clientX - rect.left + 28;
            const y = e.clientY - rect.top + 28;
            const bossIndex = placedBosses.findIndex(b => b.id === boss.id);
            if (bossIndex !== -1) {
                placedBosses[bossIndex].x = x;
                placedBosses[bossIndex].y = y;
                marker.style.left = `${x - 28}px`;
                marker.style.top = `${y - 28}px`;
                savePositions();
            }
        });
        
        mapArea.appendChild(marker);
    });
    
    // Render blue towers
    placedBlueTowers.forEach(tower => {
        const marker = document.createElement('div');
        marker.className = 'tower-marker blue-tower';
        marker.dataset.towerId = tower.id;
        marker.dataset.towerType = 'blue';
        marker.style.left = `${tower.x - 28}px`;
        marker.style.top = `${tower.y - 28}px`;
        marker.draggable = true;
        marker.innerHTML = `
            <img src="images/tower_blue.png" alt="Blue Tower" draggable="false">
            <button class="remove-btn" onclick="removeBlueTowerMarker('${tower.id}')">×</button>
        `;
        
        marker.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', tower.id);
            e.dataTransfer.setData('type', 'blue-tower-marker');
            e.currentTarget.style.opacity = '0.5';
        });
        
        marker.addEventListener('dragend', (e) => {
            e.currentTarget.style.opacity = '1';
            const rect = mapArea.getBoundingClientRect();
            const x = e.clientX - rect.left + 28;
            const y = e.clientY - rect.top + 28;
            const towerIndex = placedBlueTowers.findIndex(t => t.id === tower.id);
            if (towerIndex !== -1) {
                placedBlueTowers[towerIndex].x = x;
                placedBlueTowers[towerIndex].y = y;
                marker.style.left = `${x - 28}px`;
                marker.style.top = `${y - 28}px`;
                savePositions();
            }
        });
        
        mapArea.appendChild(marker);
    });
    
    // Render red towers
    placedRedTowers.forEach(tower => {
        const marker = document.createElement('div');
        marker.className = 'tower-marker red-tower';
        marker.dataset.towerId = tower.id;
        marker.dataset.towerType = 'red';
        marker.style.left = `${tower.x - 28}px`;
        marker.style.top = `${tower.y - 28}px`;
        marker.draggable = true;
        marker.innerHTML = `
            <img src="images/tower_red.png" alt="Red Tower" draggable="false">
            <button class="remove-btn" onclick="removeRedTowerMarker('${tower.id}')">×</button>
        `;
        
        marker.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', tower.id);
            e.dataTransfer.setData('type', 'red-tower-marker');
            e.currentTarget.style.opacity = '0.5';
        });
        
        marker.addEventListener('dragend', (e) => {
            e.currentTarget.style.opacity = '1';
            const rect = mapArea.getBoundingClientRect();
            const x = e.clientX - rect.left + 28;
            const y = e.clientY - rect.top + 28;
            const towerIndex = placedRedTowers.findIndex(t => t.id === tower.id);
            if (towerIndex !== -1) {
                placedRedTowers[towerIndex].x = x;
                placedRedTowers[towerIndex].y = y;
                marker.style.left = `${x - 28}px`;
                marker.style.top = `${y - 28}px`;
                savePositions();
            }
        });
        
        mapArea.appendChild(marker);
    });
    
    // Render trees
    placedTrees.forEach(tree => {
        const marker = document.createElement('div');
        marker.className = 'tree-marker';
        marker.dataset.treeId = tree.id;
        marker.style.left = `${tree.x - 20}px`;
        marker.style.top = `${tree.y - 20}px`;
        marker.draggable = true;
        marker.innerHTML = '<button class="remove-btn" onclick="removeTreeMarker(\'' + tree.id + '\')">×</button>';
        
        marker.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', tree.id);
            e.dataTransfer.setData('type', 'tree-marker');
            e.currentTarget.style.opacity = '0.5';
        });
        
        marker.addEventListener('dragend', (e) => {
            e.currentTarget.style.opacity = '1';
            const rect = mapArea.getBoundingClientRect();
            const x = e.clientX - rect.left + 20;
            const y = e.clientY - rect.top + 20;
            const treeIndex = placedTrees.findIndex(t => t.id === tree.id);
            if (treeIndex !== -1) {
                placedTrees[treeIndex].x = x;
                placedTrees[treeIndex].y = y;
                marker.style.left = `${x - 20}px`;
                marker.style.top = `${y - 20}px`;
                savePositions();
            }
        });
        
        mapArea.appendChild(marker);
    });
    
    
    // Render blue geese
    placedBlueGeese.forEach(goose => {
        const marker = document.createElement('div');
        marker.className = 'goose-marker blue-goose';
        marker.dataset.gooseId = goose.id;
        marker.dataset.gooseType = 'blue';
        marker.style.left = `${goose.x - 28}px`;
        marker.style.top = `${goose.y - 28}px`;
        marker.draggable = true;
        marker.innerHTML = `
            <img src="images/goose_blue.png" alt="Blue Goose" draggable="false">
            <button class="remove-btn" onclick="removeBlueGooseMarker('${goose.id}')">×</button>
        `;
        
        marker.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', goose.id);
            e.dataTransfer.setData('type', 'blue-goose-marker');
            e.currentTarget.style.opacity = '0.5';
        });
        
        marker.addEventListener('dragend', (e) => {
            e.currentTarget.style.opacity = '1';
            const rect = mapArea.getBoundingClientRect();
            const x = e.clientX - rect.left + 28;
            const y = e.clientY - rect.top + 28;
            const gooseIndex = placedBlueGeese.findIndex(g => g.id === goose.id);
            if (gooseIndex !== -1) {
                placedBlueGeese[gooseIndex].x = x;
                placedBlueGeese[gooseIndex].y = y;
                marker.style.left = `${x - 28}px`;
                marker.style.top = `${y - 28}px`;
                savePositions();
            }
        });
        
        mapArea.appendChild(marker);
    });
    
    // Render red geese
    placedRedGeese.forEach(goose => {
        const marker = document.createElement('div');
        marker.className = 'goose-marker red-goose';
        marker.dataset.gooseId = goose.id;
        marker.dataset.gooseType = 'red';
        marker.style.left = `${goose.x - 28}px`;
        marker.style.top = `${goose.y - 28}px`;
        marker.draggable = true;
        marker.innerHTML = `
            <img src="images/goose_red.png" alt="Red Goose" draggable="false">
            <button class="remove-btn" onclick="removeRedGooseMarker('${goose.id}')">×</button>
        `;
        
        marker.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', goose.id);
            e.dataTransfer.setData('type', 'red-goose-marker');
            e.currentTarget.style.opacity = '0.5';
        });
        
        marker.addEventListener('dragend', (e) => {
            e.currentTarget.style.opacity = '1';
            const rect = mapArea.getBoundingClientRect();
            const x = e.clientX - rect.left + 28;
            const y = e.clientY - rect.top + 28;
            const gooseIndex = placedRedGeese.findIndex(g => g.id === goose.id);
            if (gooseIndex !== -1) {
                placedRedGeese[gooseIndex].x = x;
                placedRedGeese[gooseIndex].y = y;
                marker.style.left = `${x - 28}px`;
                marker.style.top = `${y - 28}px`;
                savePositions();
            }
        });
        
        mapArea.appendChild(marker);
    });
    // Render enemies
    placedEnemies.forEach(enemy => {
        const marker = document.createElement('div');
        marker.className = 'enemy-marker';
        marker.dataset.enemyId = enemy.id;
        marker.style.left = `${enemy.x - 16}px`;
        marker.style.top = `${enemy.y - 16}px`;
        marker.draggable = true;
        marker.innerHTML = `
            <div class="group-number">${enemy.count}</div>
            <button class="remove-btn" onclick="removeEnemyMarker('${enemy.id}')">×</button>
        `;
        
        marker.addEventListener('dragstart', (e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', enemy.id);
            e.dataTransfer.setData('type', 'enemy-marker');
            e.currentTarget.style.opacity = '0.5';
        });
        
        marker.addEventListener('dragend', (e) => {
            e.currentTarget.style.opacity = '1';
            const rect = mapArea.getBoundingClientRect();
            const x = e.clientX - rect.left + 16;
            const y = e.clientY - rect.top + 16;
            const enemyIndex = placedEnemies.findIndex(en => en.id === enemy.id);
            if (enemyIndex !== -1) {
                placedEnemies[enemyIndex].x = x;
                placedEnemies[enemyIndex].y = y;
                marker.style.left = `${x - 16}px`;
                marker.style.top = `${y - 16}px`;
                savePositions();
            }
        });
        
        mapArea.appendChild(marker);
    });
    
    // Update placeholder and counts
    updatePlaceholder();
}

// Screenshot gallery storage
let screenshotGallery = [];
const MAX_SCREENSHOTS = 10;

// Take screenshot of map
// Take screenshot of map
function takeMapScreenshot() {
    if (typeof html2canvas === 'undefined') {
        alert('Screenshot library not loaded. Please refresh the page.');
        return;
    }

    screenshotBtn.disabled = true;
    screenshotBtn.innerHTML = '<span class="btn-icon">⏳</span>';

    const removeButtons = mapArea.querySelectorAll('.remove-btn');
    const tooltips = mapArea.querySelectorAll('.member-tooltip, .group-tooltip');
    removeButtons.forEach(b => b.style.display = 'none');
    tooltips.forEach(t => t.style.display = 'none');

    function finish(blob) {
        removeButtons.forEach(b => b.style.display = '');
        tooltips.forEach(t => t.style.display = '');
        screenshotBtn.disabled = false;
        screenshotBtn.innerHTML = '<span class="btn-icon">📸</span>';

        if (!blob) { alert('Screenshot failed. Please try again.'); return; }

        const reader = new FileReader();
        reader.onload = e => {
            screenshotGallery.unshift({ id: Date.now(), dataUrl: e.target.result, timestamp: new Date() });
            if (screenshotGallery.length > MAX_SCREENSHOTS) screenshotGallery = screenshotGallery.slice(0, MAX_SCREENSHOTS);
            saveScreenshotGallery();
            updateGalleryBadge();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = `GvG-Strategy-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.png`;
            link.href = url;
            link.click();
            setTimeout(() => URL.revokeObjectURL(url), 200);
            showNotification('Screenshot saved to gallery!', 'success');
        };
        reader.readAsDataURL(blob);
    }

    // Step 1: load map image as data URL to avoid CORS taint
    const img = new Image();
    const mapStyle = window.getComputedStyle(mapArea);
    const bgUrl = mapStyle.backgroundImage.replace(/url\(["']?|["']?\)/g, '');

    function captureWithCanvas(mapDataUrl) {
        setTimeout(() => {
            const rect = mapArea.getBoundingClientRect();
            const W = rect.width;
            const H = rect.height;
            const scale = 2;

            // Create offscreen canvas
            const offscreen = document.createElement('canvas');
            offscreen.width = W * scale;
            offscreen.height = H * scale;
            const ctx = offscreen.getContext('2d');
            ctx.scale(scale, scale);

            // Draw dark background
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, W, H);

            function drawMarkersAndSave() {
                // Use html2canvas on mapArea with background stripped, then composite
                html2canvas(mapArea, {
                    backgroundColor: null,
                    scale: scale,
                    logging: false,
                    useCORS: false,
                    allowTaint: false,
                    width: Math.floor(W),
                    height: Math.floor(H),
                    onclone: (doc) => {
                        const cloned = doc.getElementById('mapArea');
                        if (cloned) {
                            cloned.style.backgroundImage = 'none';
                            cloned.style.background = 'transparent';
                        }
                    }
                }).then(markersCanvas => {
                    // Final composite: background + map image + markers
                    const final = document.createElement('canvas');
                    final.width = W * scale;
                    final.height = H * scale;
                    const fctx = final.getContext('2d');

                    // 1. Dark bg
                    fctx.fillStyle = '#1a1a2e';
                    fctx.fillRect(0, 0, final.width, final.height);

                    // 2. Map image (if loaded)
                    if (mapDataUrl) {
                        const mImg = new Image();
                        mImg.onload = () => {
                            // Draw map image centered with contain scaling
                            const iw = mImg.naturalWidth, ih = mImg.naturalHeight;
                            const fw = final.width, fh = final.height;
                            const ratio = Math.min(fw / iw, fh / ih);
                            const dw = iw * ratio, dh = ih * ratio;
                            const dx = (fw - dw) / 2, dy = (fh - dh) / 2;
                            fctx.drawImage(mImg, dx, dy, dw, dh);

                            // 3. Markers on top
                            fctx.drawImage(markersCanvas, 0, 0);
                            final.toBlob(finish, 'image/png');
                        };
                        mImg.onerror = () => {
                            fctx.drawImage(markersCanvas, 0, 0);
                            final.toBlob(finish, 'image/png');
                        };
                        mImg.src = mapDataUrl;
                    } else {
                        fctx.drawImage(markersCanvas, 0, 0);
                        final.toBlob(finish, 'image/png');
                    }
                }).catch(err => {
                    console.error('html2canvas error:', err);
                    removeButtons.forEach(b => b.style.display = '');
                    tooltips.forEach(t => t.style.display = '');
                    screenshotBtn.disabled = false;
                    screenshotBtn.innerHTML = '<span class="btn-icon">📸</span>';
                    alert('Screenshot failed: ' + err.message);
                });
            }

            drawMarkersAndSave();
        }, 150);
    }

    if (bgUrl && bgUrl !== 'none') {
        fetch(bgUrl)
            .then(r => r.blob())
            .then(blob => {
                const r = new FileReader();
                r.onload = e => captureWithCanvas(e.target.result);
                r.readAsDataURL(blob);
            })
            .catch(() => captureWithCanvas(null)); // If fetch fails, skip map bg
    } else {
        captureWithCanvas(null);
    }
}


function saveScreenshotGallery() {
    try {
        const galleryData = screenshotGallery.map(item => ({
            id: item.id,
            dataUrl: item.dataUrl,
            timestamp: item.timestamp.toISOString()
        }));
        localStorage.setItem('mightylabs-screenshot-gallery', JSON.stringify(galleryData));
    } catch (e) {
        console.error('Failed to save gallery:', e);
    }
}

// Load gallery from localStorage
function loadScreenshotGallery() {
    try {
        const saved = localStorage.getItem('mightylabs-screenshot-gallery');
        if (saved) {
            const galleryData = JSON.parse(saved);
            screenshotGallery = galleryData.map(item => ({
                id: item.id,
                dataUrl: item.dataUrl,
                timestamp: new Date(item.timestamp),
                blob: null // Will regenerate if needed
            }));
        }
    } catch (e) {
        console.error('Failed to load gallery:', e);
    }
}

// Update gallery badge count
function updateGalleryBadge() {
    const badge = document.querySelector('.gallery-badge');
    if (badge) {
        badge.textContent = screenshotGallery.length;
        badge.style.display = screenshotGallery.length > 0 ? 'flex' : 'none';
    }
}

// Show screenshot gallery
function showScreenshotGallery() {
    const modal = document.getElementById('screenshotGalleryModal');
    if (!modal) return;
    
    const container = document.getElementById('galleryContainer');
    container.innerHTML = '';
    
    if (screenshotGallery.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No screenshots yet. Take some screenshots to see them here!</p>';
    } else {
        screenshotGallery.forEach((screenshot, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.innerHTML = `
                <img src="${screenshot.dataUrl}" alt="Screenshot ${index + 1}">
                <div class="gallery-item-info">
                    <span class="gallery-timestamp">${formatTimestamp(screenshot.timestamp)}</span>
                    <div class="gallery-actions">
                        <button class="gallery-btn" onclick="viewScreenshot(${index})" title="View Full Size">👁️</button>
                        <button class="gallery-btn" onclick="downloadScreenshot(${index})" title="Download">💾</button>
                        <button class="gallery-btn" onclick="deleteScreenshot(${index})" title="Delete">🗑️</button>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    }
    
    modal.style.display = 'flex';
}

function formatTimestamp(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}

function viewScreenshot(index) {
    const screenshot = screenshotGallery[index];
    if (!screenshot) return;
    
    // Open in new window
    const win = window.open('', '_blank');
    win.document.write(`
        <html>
        <head><title>Screenshot ${index + 1}</title></head>
        <body style="margin:0;background:#000;display:flex;justify-content:center;align-items:center;min-height:100vh;">
            <img src="${screenshot.dataUrl}" style="max-width:100%;max-height:100vh;">
        </body>
        </html>
    `);
}

function downloadScreenshot(index) {
    const screenshot = screenshotGallery[index];
    if (!screenshot) return;
    
    const link = document.createElement('a');
    link.download = `GvG-Strategy-${formatTimestamp(screenshot.timestamp).replace(/ /g, '-')}.png`;
    link.href = screenshot.dataUrl;
    link.click();
}

function deleteScreenshot(index) {
    if (confirm('Delete this screenshot?')) {
        screenshotGallery.splice(index, 1);
        saveScreenshotGallery();
        showScreenshotGallery();
        updateGalleryBadge();
        showNotification('Screenshot deleted', 'info');
    }
}

function hideScreenshotGallery() {
    const modal = document.getElementById('screenshotGalleryModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#2ecc71' : '#667eea'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        z-index: 100000;
        font-weight: 600;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Export positions
function exportPositions() {
    // Show progress indicator
    showExportProgress();
    
    // Use setTimeout to allow UI to update
    setTimeout(() => {
        try {
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                // Export the complete player list
                players: members.map(member => ({
                    id: member.id,
                    name: member.name,
                    role: member.role,
                    team: member.team,
                    weapon1: member.weapon1 || '',
                    weapon2: member.weapon2 || ''
                })),
                // Export placed items
                individuals: placedMembers.map(placement => ({
                    memberId: placement.memberId,
                    x: Math.round(placement.x),
                    y: Math.round(placement.y)
                })),
                groups: placedGroups.map(group => ({
                    id: group.id,
                    teams: group.teams,
                    memberIds: group.memberIds,
                    x: Math.round(group.x),
                    y: Math.round(group.y)
                })),
                objectives: placedObjectives.map(obj => ({
                    id: obj.id,
                    x: Math.round(obj.x),
                    y: Math.round(obj.y),
                    type: obj.type || 'enemy-dps'
                })),
                bosses: placedBosses.map(boss => ({
                    id: boss.id,
                    x: Math.round(boss.x),
                    y: Math.round(boss.y)
                })),
                blueTowers: placedBlueTowers.map(tower => ({
                    id: tower.id,
                    x: Math.round(tower.x),
                    y: Math.round(tower.y)
                })),
                redTowers: placedRedTowers.map(tower => ({
                    id: tower.id,
                    x: Math.round(tower.x),
                    y: Math.round(tower.y)
                })),
                blueTrees: placedBlueTrees.map(tree => ({
                    id: tree.id,
                    x: Math.round(tree.x),
                    y: Math.round(tree.y)
                })),
                                redTrees: placedRedTrees.map(tree => ({
                    id: tree.id,
                    x: Math.round(tree.x),
                    y: Math.round(tree.y)
                })),
                blueGeese: placedBlueGeese.map(goose => ({
                    id: goose.id,
                    x: Math.round(goose.x),
                    y: Math.round(goose.y)
                })),
                redGeese: placedRedGeese.map(goose => ({
                    id: goose.id,
                    x: Math.round(goose.x),
                    y: Math.round(goose.y)
                })),
                enemies: placedEnemies.map(enemy => ({
                    id: enemy.id,
                    x: Math.round(enemy.x),
                    y: Math.round(enemy.y),
                    count: enemy.count
                })),
                // Export drawings
                drawings: drawingPaths.map(path => ({
                    id: path.id,
                    points: path.points,
                    color: path.color || '#ff0000',
                    width: path.width || 3
                })),
                // Export team name mappings (custom renamed teams)
                teamNames: teamNameMappings
            };
            
            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `guild-war-strategy-${Date.now()}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up
            setTimeout(() => {
                URL.revokeObjectURL(url);
                hideExportProgress();
            }, 500);
        } catch (error) {
            console.error('Export failed:', error);
            hideExportProgress();
            alert('Failed to export strategy: ' + error.message);
        }
    }, 100);
}

function showExportProgress() {
    const progressBar = document.createElement('div');
    progressBar.id = 'exportProgressBar';
    progressBar.innerHTML = `
        <div class="progress-overlay">
            <div class="progress-container">
                <div class="progress-text">Preparing export...</div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(progressBar);
}

function hideExportProgress() {
    const progressBar = document.getElementById('exportProgressBar');
    if (progressBar) {
        progressBar.remove();
    }
}

// Import strategy from JSON file
function importPositions() {
    importFileInput.click();
}

// ============================================================================
// PLAYER ROSTER IMPORT (CSV / XLSX)
// ============================================================================

let pendingImportedPlayers = []; // Holds parsed players waiting for user confirm

function handlePlayersFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    importPlayersFileInput.value = '';
    
    const ext = file.name.split('.').pop().toLowerCase();
    
    if (ext === 'csv') {
        const reader = new FileReader();
        reader.onload = e => parseAndPreviewPlayers(e.target.result, 'csv');
        reader.readAsText(file);
    } else if (ext === 'xlsx' || ext === 'xls') {
        const reader = new FileReader();
        reader.onload = e => parseAndPreviewPlayers(e.target.result, 'xlsx');
        reader.readAsArrayBuffer(file);
    } else {
        alert('Unsupported file type. Please use .csv, .xlsx, or .xls');
    }
}

function parseAndPreviewPlayers(data, type) {
    let rows = [];
    
    if (type === 'csv') {
        // Parse CSV
        const lines = data.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
        
        for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            if (vals.every(v => !v)) continue; // skip empty rows
            const row = {};
            headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
            rows.push(row);
        }
    } else {
        // Parse XLSX using SheetJS
        if (typeof XLSX === 'undefined') {
            alert('Excel library not loaded. Please refresh and try again.');
            return;
        }
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        // Normalise keys to lowercase
        rows = rawRows.map(r => {
            const norm = {};
            Object.entries(r).forEach(([k, v]) => { norm[k.toLowerCase().trim()] = String(v).trim(); });
            return norm;
        });
    }
    
    if (rows.length === 0) {
        alert('No data found in file. Please check your file and try again.');
        return;
    }
    
    // Map flexible column names
    const COLUMN_ALIASES = {
        name:    ['name', 'player', 'playername', 'player name', 'ign', 'username'],
        role:    ['role', 'class', 'type', 'position'],
        team:    ['team', 'group', 'squad', 'teamname', 'team name'],
        weapon1: ['weapon1', 'weapon 1', 'w1', 'main weapon', 'primary', 'weapon'],
        weapon2: ['weapon2', 'weapon 2', 'w2', 'off weapon', 'secondary', 'offhand'],
    };
    
    function findCol(row, aliases) {
        const keys = Object.keys(row).map(k => k.toLowerCase());
        for (const alias of aliases) {
            const match = keys.find(k => k === alias || k.includes(alias));
            if (match) return row[match] || '';
        }
        return '';
    }
    
    // Validate roles
    const VALID_ROLES = ['Tank', 'DPS', 'Healer', 'Support'];
    function normaliseRole(raw) {
        if (!raw) return 'DPS';
        const r = raw.trim();
        const match = VALID_ROLES.find(v => v.toLowerCase() === r.toLowerCase());
        return match || 'DPS';
    }
    
    // Build player objects
    pendingImportedPlayers = rows.map((row, i) => ({
        id: `imported-${Date.now()}-${i}`,
        name: findCol(row, COLUMN_ALIASES.name) || `Player${i+1}`,
        role: normaliseRole(findCol(row, COLUMN_ALIASES.role)),
        team: findCol(row, COLUMN_ALIASES.team) || '',
        weapon1: findCol(row, COLUMN_ALIASES.weapon1) || '',
        weapon2: findCol(row, COLUMN_ALIASES.weapon2) || '',
        placed: false
    })).filter(p => p.name);
    
    if (pendingImportedPlayers.length === 0) {
        alert('Could not find any valid players. Make sure your file has a "Name" column.');
        return;
    }
    
    showPlayerImportPreview(pendingImportedPlayers, rows[0]);
}

function showPlayerImportPreview(players, sampleRow) {
    const modal = document.getElementById('playerImportModal');
    const info  = document.getElementById('importPreviewInfo');
    const table = document.getElementById('importPreviewTable');
    
    // Count unique teams
    const teams = [...new Set(players.map(p => p.team).filter(t => t))];
    const newTeams = teams.filter(t => !teamNames.includes(t));
    
    info.innerHTML = `
        <strong>${players.length}</strong> players found &nbsp;|&nbsp;
        <strong>${teams.length}</strong> teams found &nbsp;|&nbsp;
        ${newTeams.length > 0 
            ? `<span style="color:#f39c12">⚠️ ${newTeams.length} new team(s) will be created: <strong>${newTeams.join(', ')}</strong></span>` 
            : '<span style="color:#2ecc71">✅ All teams match existing groups</span>'}
        <br><br>
        <span style="color:#999; font-size:0.85rem;">
            Detected columns: ${Object.keys(sampleRow).join(', ')}
        </span>
    `;
    
    // Build preview table (max 50 rows shown)
    const preview = players.slice(0, 50);
    table.innerHTML = `
        <div class="import-preview-table-wrap">
            <table>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Team</th>
                        <th>Weapon 1</th>
                        <th>Weapon 2</th>
                    </tr>
                </thead>
                <tbody>
                    ${preview.map((p, i) => `
                        <tr>
                            <td style="color:#666">${i+1}</td>
                            <td><strong>${p.name}</strong></td>
                            <td><span class="role-chip ${p.role}">${p.role}</span></td>
                            <td>${p.team || '<span style="color:#666">—</span>'}</td>
                            <td>${p.weapon1 || '<span style="color:#666">—</span>'}</td>
                            <td>${p.weapon2 || '<span style="color:#666">—</span>'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${players.length > 50 ? `<p style="text-align:center;color:#666;padding:10px">...and ${players.length - 50} more</p>` : ''}
        </div>
    `;
    
    modal.style.display = 'flex';
}

function confirmPlayerImport() {
    if (!pendingImportedPlayers.length) return;
    
    // Create new team names from imported players if needed
    const importedTeams = [...new Set(pendingImportedPlayers.map(p => p.team).filter(t => t))];
    
    // Add any new teams (replace existing team slots or append)
    importedTeams.forEach(teamName => {
        if (!teamNames.includes(teamName)) {
            // Find a slot to add (look for default/empty team name)
            const emptyIdx = teamNames.findIndex(t => 
                t === '' || t === `Team ${teamNames.indexOf(t)+1}` || 
                ['FLEX','ATTACK','DEFENCE','TOP JUNGLE','BOT JUNGLE','GATE KEEPERS','BOSS TEAM','ASSASSINS'].includes(t) === false
            );
            if (emptyIdx >= 0 && teamNames.length < 30) {
                teamNames.push(teamName);
            } else {
                teamNames.push(teamName);
            }
        }
    });
    
    // Replace members array with imported players
    members = pendingImportedPlayers.map(p => ({
        ...p,
        id: p.id || `player-${Date.now()}-${Math.random()}`,
        placed: false
    }));
    
    // Save team names
    saveTeamNames();
    
    // Re-render everything
    renderMemberList();
    updateCounts();
    
    // Close modal
    document.getElementById('playerImportModal').style.display = 'none';
    pendingImportedPlayers = [];
    
    const teamMsg = importedTeams.length > 0 
        ? ` Teams created: ${importedTeams.join(', ')}.` 
        : '';
    showNotification(`✅ Imported ${members.length} players!${teamMsg}`, 'success');
}

function hidePlayerImportModal() {
    document.getElementById('playerImportModal').style.display = 'none';
    pendingImportedPlayers = [];
}

function handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importData = JSON.parse(e.target.result);
            
            // Validate import data structure
            if (!importData.version || !importData.players) {
                throw new Error('Invalid file format');
            }
            
            // Import player list first
            if (importData.players && Array.isArray(importData.players)) {
                members.length = 0; // Clear existing members
                importData.players.forEach(player => {
                    members.push({
                        id: player.id,
                        name: player.name,
                        role: player.role,
                        team: player.team,
                        weapon1: player.weapon1 || '',
                        weapon2: player.weapon2 || ''
                    });
                });
                // Players loaded from import - not saved to localStorage
            }
            
            // Clear current placements without confirmation
            const markers = mapArea.querySelectorAll('.member-marker, .group-marker, .objective-marker, .boss-marker, .tower-marker, .tree-marker, .goose-marker, .enemy-marker');
            markers.forEach(marker => marker.remove());
            placedMembers = [];
            placedGroups = [];
            placedObjectives = [];
            placedBosses = [];
            placedBlueTowers = [];
            placedRedTowers = [];
            placedBlueTrees = [];
            placedRedTrees = [];
            placedBlueGeese = [];
            placedRedGeese = [];
            placedEnemies = [];
            enemiesCount = 0;
            
            // Import individuals
            if (importData.individuals && Array.isArray(importData.individuals)) {
                importData.individuals.forEach(placement => {
                    const member = members.find(m => m.id === placement.memberId);
                    if (member) {
                        placedMembers.push({
                            memberId: placement.memberId,
                            x: placement.x,
                            y: placement.y
                        });
                    }
                });
            }
            
            // Import groups
            if (importData.groups && Array.isArray(importData.groups)) {
                importData.groups.forEach(groupData => {
                    const memberIds = groupData.memberIds.filter(id => members.find(mem => mem.id === id));
                    // Allow empty groups (just team names without players)
                    placedGroups.push({
                        id: groupData.id || (Date.now() + Math.random()),
                        teams: groupData.teams,
                        memberIds: memberIds,
                        x: groupData.x,
                        y: groupData.y
                    });
                });
            }
            
            // Import objectives
            if (importData.objectives && Array.isArray(importData.objectives)) {
                importData.objectives.forEach(obj => {
                    placedObjectives.push({
                        id: obj.id,
                        x: obj.x,
                        y: obj.y,
                        type: obj.type || 'enemy-dps'
                    });
                });
            }
            
            // Import bosses
            if (importData.bosses && Array.isArray(importData.bosses)) {
                importData.bosses.forEach(boss => {
                    placedBosses.push({
                        id: boss.id,
                        x: boss.x,
                        y: boss.y
                    });
                });
            }
            
            // Import blue towers
            if (importData.blueTowers && Array.isArray(importData.blueTowers)) {
                importData.blueTowers.forEach(tower => {
                    placedBlueTowers.push({
                        id: tower.id,
                        x: tower.x,
                        y: tower.y
                    });
                });
            }
            
            // Import red towers
            if (importData.redTowers && Array.isArray(importData.redTowers)) {
                importData.redTowers.forEach(tower => {
                    placedRedTowers.push({
                        id: tower.id,
                        x: tower.x,
                        y: tower.y
                    });
                });
            }
            
            // Backwards compatibility: Import old single 'towers' array
            if (importData.towers && Array.isArray(importData.towers)) {
                importData.towers.forEach(tower => {
                    // Default old towers to blue (ally) towers
                    placedBlueTowers.push({
                        id: tower.id,
                        x: tower.x,
                        y: tower.y
                    });
                });
            }
            
            // Import blue trees
            if (importData.blueTrees && Array.isArray(importData.blueTrees)) {
                importData.blueTrees.forEach(tree => {
                    placedBlueTrees.push({
                        id: tree.id,
                        x: tree.x,
                        y: tree.y
                    });
                });
            }
            
            // Import red trees
            if (importData.redTrees && Array.isArray(importData.redTrees)) {
                importData.redTrees.forEach(tree => {
                    placedRedTrees.push({
                        id: tree.id,
                        x: tree.x,
                        y: tree.y
                    });
                });
            }
            
            // Backwards compatibility: Import old single 'trees' array as blue trees
            if (importData.trees && Array.isArray(importData.trees) && !importData.blueTrees && !importData.redTrees) {
                importData.trees.forEach(tree => {
                    placedBlueTrees.push({
                        id: tree.id,
                        x: tree.x,
                        y: tree.y
                    });
                });
            }
            
            // Import blue geese
            if (importData.blueGeese && Array.isArray(importData.blueGeese)) {
                importData.blueGeese.forEach(goose => {
                    placedBlueGeese.push({
                        id: goose.id,
                        x: goose.x,
                        y: goose.y
                    });
                });
            }
            
            // Import red geese
            if (importData.redGeese && Array.isArray(importData.redGeese)) {
                importData.redGeese.forEach(goose => {
                    placedRedGeese.push({
                        id: goose.id,
                        x: goose.x,
                        y: goose.y
                    });
                });
            }
            
            // Import enemies
            if (importData.enemies && Array.isArray(importData.enemies)) {
                importData.enemies.forEach(enemy => {
                    placedEnemies.push({
                        id: enemy.id,
                        x: enemy.x,
                        y: enemy.y,
                        count: enemy.count
                    });
                });
            }
            
            // Restore enemies count
            if (typeof importData.enemiesCount === 'number') {
                enemiesCount = importData.enemiesCount;
            } else {
                // Calculate from enemies array
                enemiesCount = placedEnemies.reduce((sum, enemy) => sum + (enemy.count || 0), 0);
            }
            
            // Import drawings
            if (importData.drawings && Array.isArray(importData.drawings)) {
                drawingPaths = [];
                drawingDeleteTimers = [];
                drawingHistory = [];
                drawingRedoStack = [];
                
                importData.drawings.forEach(drawing => {
                    if (drawing.points && Array.isArray(drawing.points)) {
                        drawingPaths.push({
                            id: drawing.id || Date.now() + Math.random(),
                            points: drawing.points,
                            color: drawing.color || '#ff0000',
                            width: drawing.width || 3
                        });
                    }
                });
                
                // Save initial drawing state to history
                if (drawingPaths.length > 0) {
                    drawingHistory = [JSON.parse(JSON.stringify(drawingPaths))];
                }
                
                // Redraw canvas with imported drawings
                redrawAllPaths();
            }
            
            // Import team name mappings (custom renamed teams)
            if (importData.teamNames && typeof importData.teamNames === 'object') {
                teamNameMappings = { ...importData.teamNames };
                saveTeamNames();
            }
            
            // Update display
            renderMap();
            renderMemberList();
            updateCounts();
            savePositions();
            
            alert('Strategy imported successfully!');
        } catch (error) {
            console.error('Error importing strategy:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);
            alert('Failed to import strategy. Error: ' + error.message + '\n\nCheck browser console for details.');
        }
        
        // Reset file input
        importFileInput.value = '';
    };
    
    reader.readAsText(file);
}

// Save positions to localStorage
function savePositions() {
    // DISABLED - Do not auto-save positions to localStorage
    // Positions are only saved via Export function
    // This ensures a fresh start every time the page loads
    
    /* const data = {
        members: placedMembers,
        groups: placedGroups,
        objectives: placedObjectives,
        bosses: placedBosses,
        blueTowers: placedBlueTowers,
        redTowers: placedRedTowers,
        blueTrees: placedBlueTrees,
        redTrees: placedRedTrees,
        blueGeese: placedBlueGeese,
        redGeese: placedRedGeese,
        enemies: placedEnemies
    };
    localStorage.setItem('mightylabs-gvg-positions', JSON.stringify(data)); */
}

// Load saved positions
function loadSavedPositions() {
    const saved = localStorage.getItem('mightylabs-gvg-positions');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            
            // Support old format (just array of members)
            if (Array.isArray(data)) {
                placedMembers = [];
                data.forEach(placement => {
                    const member = members.find(m => m.id === placement.memberId);
                    if (member && getTotalPlacedPlayers() < MAX_PLAYERS) {
                        placeMemberOnMap(member, placement.x, placement.y);
                    }
                });
            } else {
                // New format with members and groups
                placedMembers = [];
                placedGroups = [];
                placedObjectives = [];
                placedBosses = [];
                placedBlueTowers = [];
                placedRedTowers = [];
                placedEnemies = [];
                
                // Load individual members
                if (data.members) {
                    data.members.forEach(placement => {
                        const member = members.find(m => m.id === placement.memberId);
                        if (member && getTotalPlacedPlayers() < MAX_PLAYERS) {
                            placeMemberOnMap(member, placement.x, placement.y);
                        }
                    });
                }
                
                // Load groups
                if (data.groups) {
                    data.groups.forEach(groupData => {
                        if (getTotalPlacedPlayers() + groupData.memberIds.length <= MAX_PLAYERS) {
                            placedGroups.push(groupData);
                            renderGroupMarker(groupData);
                        }
                    });
                }
                
                // Load objectives
                if (data.objectives) {
                    data.objectives.forEach(obj => {
                        placeObjectiveMarker(obj.x, obj.y, obj.type || 'enemy-dps');
                    });
                }
                
                // Load bosses
                if (data.bosses) {
                    data.bosses.forEach(boss => {
                        placeBossMarker(boss.x, boss.y);
                    });
                }
                
                // Load blue towers
                if (data.blueTowers) {
                    data.blueTowers.forEach(tower => {
                        placeBlueTowerMarker(tower.x, tower.y);
                    });
                }
                
                // Load red towers
                if (data.redTowers) {
                    data.redTowers.forEach(tower => {
                        placeRedTowerMarker(tower.x, tower.y);
                    });
                }
                
                // Backwards compatibility: Load old single 'towers' array as blue towers
                if (data.towers && !data.blueTowers && !data.redTowers) {
                    data.towers.forEach(tower => {
                        placeBlueTowerMarker(tower.x, tower.y);
                    });
                }
                
                // Load blue trees
                if (data.blueTrees) {
                    data.blueTrees.forEach(tree => {
                        placeBlueTreeMarker(tree.x, tree.y);
                    });
                }
                
                // Load red trees
                if (data.redTrees) {
                    data.redTrees.forEach(tree => {
                        placeRedTreeMarker(tree.x, tree.y);
                    });
                }
                
                // Backwards compatibility: Load old single 'trees' array as blue trees
                if (data.trees && !data.blueTrees && !data.redTrees) {
                    data.trees.forEach(tree => {
                        placeBlueTreeMarker(tree.x, tree.y);
                    });                }
                
                // Load blue geese
                if (data.blueGeese) {
                    data.blueGeese.forEach(goose => {
                        placeBlueGooseMarker(goose.x, goose.y);
                    });
                }
                
                // Load red geese
                if (data.redGeese) {
                    data.redGeese.forEach(goose => {
                        placeRedGooseMarker(goose.x, goose.y);
                    });
                }
                
                // Load enemies
                if (data.enemies) {
                    data.enemies.forEach(enemy => {
                        placeEnemyGroup(enemy.x, enemy.y);
                    });
                }
            }
            
            updateEnemyCount();
        } catch (e) {
            console.error('Error loading saved positions:', e);
        }
    }
}

// Setup click outside handler to close split view
function setupClickOutsideHandler() {
    document.addEventListener('click', function(e) {
        // If no split view is active, do nothing
        if (!activeSplitGroupId) return;
        
        // Check if click is on a group marker or its children (tooltip, buttons, etc.)
        const clickedMarker = e.target.closest('.group-marker');
        if (clickedMarker) {
            // If clicking on the same group marker, let toggleSplitView handle it
            const clickedGroupId = clickedMarker.dataset.groupId;
            if (clickedGroupId === activeSplitGroupId) {
                return; // Let the button click handle toggling
            }
        }
        
        // Check if click is on a draggable item being dragged
        if (e.target.closest('[draggable="true"]') && e.target.closest('[draggable="true"]').style.opacity === '0.5') {
            return; // Don't close while dragging
        }
        
        // Check if click is on a split member item (for dragging)
        if (e.target.closest('.split-member-item')) {
            return; // Allow interaction with split members
        }
        
        // Click is outside - close the split view
        const splitDiv = document.getElementById(`split-${activeSplitGroupId}`);
        if (splitDiv) {
            splitDiv.style.display = 'none';
        }
        activeSplitGroupId = null;
    });
}

// Player Management Functions
function setupPlayerManagementHandlers() {
    // Open player management modal
    managePlayersBtn.addEventListener('click', openPlayerManagementModal);
    
    // Close modals
    closeModalBtn.addEventListener('click', closePlayerManagementModal);
    closeEditModalBtn.addEventListener('click', closePlayerEditModal);
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === playerManagementModal) {
            closePlayerManagementModal();
        }
        if (e.target === playerEditModal) {
            closePlayerEditModal();
        }
    });
    
    // Add new player button
    addNewPlayerBtn.addEventListener('click', () => {
        openPlayerEditModal();
    });
    
    // Cancel edit button
    cancelEditBtn.addEventListener('click', closePlayerEditModal);
    
    // Form submission
    playerEditForm.addEventListener('submit', handlePlayerFormSubmit);
}

// ============================================================================
// PLAYER MANAGEMENT (CRUD Operations)
// ============================================================================

function openPlayerManagementModal() {
    renderPlayerManagementList();
    playerManagementModal.style.display = 'flex';
}

function closePlayerManagementModal() {
    playerManagementModal.style.display = 'none';
}

function openPlayerEditModal(playerId = null) {
    const editModalTitle = document.getElementById('editModalTitle');
    const editPlayerId = document.getElementById('editPlayerId');
    const editPlayerName = document.getElementById('editPlayerName');
    const editPlayerRole = document.getElementById('editPlayerRole');
    const editPlayerTeam = document.getElementById('editPlayerTeam');
    const editPlayerWeapon1 = document.getElementById('editPlayerWeapon1');
    const editPlayerWeapon2 = document.getElementById('editPlayerWeapon2');
    
    // Populate team dropdown dynamically with current team names (including renamed ones)
    editPlayerTeam.innerHTML = '';
    
    // Add "Unassigned" option first
    const unassignedOption = document.createElement('option');
    unassignedOption.value = '';
    unassignedOption.textContent = '-- Unassigned --';
    editPlayerTeam.appendChild(unassignedOption);
    
    TEAM_ORDER.forEach(teamName => {
        const option = document.createElement('option');
        option.value = teamName;
        option.textContent = getTeamDisplayName(teamName);
        editPlayerTeam.appendChild(option);
    });
    
    if (playerId) {
        // Edit existing player
        const player = members.find(m => m.id === playerId);
        if (player) {
            editModalTitle.textContent = 'Edit Player';
            editPlayerId.value = playerId;
            editPlayerName.value = player.name;
            editPlayerRole.value = player.role;
            editPlayerTeam.value = player.team;
            editPlayerWeapon1.value = player.weapon1 || 'Nameless Sword';
            editPlayerWeapon2.value = player.weapon2 || 'Nameless Spear';
        }
    } else {
        // Add new player
        editModalTitle.textContent = 'Add New Player';
        editPlayerId.value = '';
        editPlayerName.value = '';
        editPlayerRole.value = 'DPS';
        editPlayerTeam.value = TEAM_ORDER[0]; // Default to first team (FLEX)
        editPlayerWeapon1.value = 'Nameless Sword';
        editPlayerWeapon2.value = 'Nameless Spear';
    }
    
    playerEditModal.style.display = 'flex';
    editPlayerName.focus();
}

function closePlayerEditModal() {
    playerEditModal.style.display = 'none';
    playerEditForm.reset();
}

function handlePlayerFormSubmit(e) {
    e.preventDefault();
    
    const editPlayerId = document.getElementById('editPlayerId');
    const editPlayerName = document.getElementById('editPlayerName');
    const editPlayerRole = document.getElementById('editPlayerRole');
    const editPlayerTeam = document.getElementById('editPlayerTeam');
    const editPlayerWeapon1 = document.getElementById('editPlayerWeapon1');
    const editPlayerWeapon2 = document.getElementById('editPlayerWeapon2');
    
    const playerId = editPlayerId.value ? parseInt(editPlayerId.value) : null;
    const playerName = editPlayerName.value.trim();
    const playerRole = editPlayerRole.value;
    const playerTeam = editPlayerTeam.value;
    const playerWeapon1 = editPlayerWeapon1.value;
    const playerWeapon2 = editPlayerWeapon2.value;
    
    if (!playerName) {
        alert('Player name is required!');
        return;
    }
    
    if (playerId) {
        // Edit existing player
        const player = members.find(m => m.id === playerId);
        if (player) {
            player.name = playerName;
            player.role = playerRole;
            player.team = playerTeam;
            player.weapon1 = playerWeapon1;
            player.weapon2 = playerWeapon2;
            
            // Update any placed markers for this player
            updatePlacedPlayerInfo(playerId);
        }
    } else {
        // Add new player
        if (members.length >= MAX_PLAYERS) {
            alert(`Maximum ${MAX_PLAYERS} players allowed!`);
            return;
        }
        
        const newId = members.length > 0 ? Math.max(...members.map(m => m.id)) + 1 : 1;
        const newPlayer = {
            id: newId,
            name: playerName,
            role: playerRole,
            team: playerTeam,
            weapon1: playerWeapon1,
            weapon2: playerWeapon2
        };
        
        members.push(newPlayer);
    }
    
    // Save to localStorage
    savePlayersToStorage();
    
    // Re-render lists
    renderMemberList();
    renderPlayerManagementList();
    updateCounts();
    
    closePlayerEditModal();
}

function renderPlayerManagementList() {
    playerManagementList.innerHTML = '';
    
    if (members.length === 0) {
        playerManagementList.innerHTML = '<div class="no-players">No players yet. Add your first player!</div>';
        return;
    }
    
    members.forEach(member => {
        const isPlaced = isPlayerPlaced(member.id);
        
        const playerItem = document.createElement('div');
        playerItem.className = 'player-management-item';
        if (isPlaced) {
            playerItem.classList.add('placed');
        }
        
        playerItem.innerHTML = `
            <div class="player-management-info">
                <div class="player-management-name">${member.name}</div>
                <div class="player-management-details">
                    <span class="role-badge-small role-${member.role}">${member.role}</span>
                    <span class="team-badge-small">${member.team}</span>
                    ${isPlaced ? '<span class="placed-badge">On Map</span>' : ''}
                </div>
                <div class="player-management-weapons">
                    <small>⚔️ ${member.weapon1 || 'N/A'} | ${member.weapon2 || 'N/A'}</small>
                </div>
            </div>
            <div class="player-management-actions">
                <button class="btn-edit" onclick="openPlayerEditModal(${member.id})" title="Edit">✏️</button>
                <button class="btn-delete" onclick="deletePlayer(${member.id})" title="Delete">🗑️</button>
            </div>
        `;
        
        playerManagementList.appendChild(playerItem);
    });
}

function deletePlayer(playerId) {
    const player = members.find(m => m.id === playerId);
    if (!player) return;
    
    const isPlaced = isPlayerPlaced(playerId);
    
    let confirmMsg = `Are you sure you want to delete ${player.name}?`;
    if (isPlaced) {
        confirmMsg += '\n\nThis player is currently placed on the map and will be removed.';
    }
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    // Remove from placed members
    if (isPlaced) {
        removeMemberMarker(playerId);
        
        // Remove from groups
        placedGroups.forEach(group => {
            const index = group.memberIds.indexOf(playerId);
            if (index > -1) {
                group.memberIds.splice(index, 1);
                
                const marker = mapArea.querySelector(`[data-group-id="${group.id}"]`);
                if (marker) {
                    if (group.memberIds.length === 0) {
                        marker.remove();
                        placedGroups = placedGroups.filter(g => g.id !== group.id);
                    } else {
                        updateGroupMarker(marker, group);
                    }
                }
            }
        });
    }
    
    // Remove from members array
    members = members.filter(m => m.id !== playerId);
    
    // Save and refresh
    savePlayersToStorage();
    savePositions();
    renderMemberList();
    renderPlayerManagementList();
    updateCounts();
}

function updatePlacedPlayerInfo(playerId) {
    // Update individual marker tooltips
    const marker = mapArea.querySelector(`[data-member-id="${playerId}"]`);
    if (marker) {
        const member = members.find(m => m.id === playerId);
        if (member) {
            marker.className = `member-marker role-${member.role}`;
            const tooltip = marker.querySelector('.marker-tooltip .tooltip-info');
            if (tooltip) {
                const displayTeamName = getTeamDisplayName(member.team);
                tooltip.textContent = `${member.role} | ${displayTeamName}`;
            }
            const weaponsTooltip = marker.querySelector('.marker-tooltip .tooltip-weapons');
            if (weaponsTooltip) {
                weaponsTooltip.textContent = `⚔️ ${member.weapon1 || 'N/A'} | ${member.weapon2 || 'N/A'}`;
            } else if (tooltip) {
                // Add weapons tooltip if it doesn't exist
                const weaponsDiv = document.createElement('div');
                weaponsDiv.className = 'tooltip-weapons';
                weaponsDiv.textContent = `⚔️ ${member.weapon1 || 'N/A'} | ${member.weapon2 || 'N/A'}`;
                tooltip.parentElement.appendChild(weaponsDiv);
            }
        }
    }
    
    // Update group markers that contain this player
    placedGroups.forEach(group => {
        if (group.memberIds.includes(playerId)) {
            const groupMarker = mapArea.querySelector(`[data-group-id="${group.id}"]`);
            if (groupMarker) {
                updateGroupMarker(groupMarker, group);
            }
        }
    });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Panel toggle functionality
function savePlayersToStorage() {
    // DISABLED - Players are always loaded fresh from data.js
    // Player changes during session are temporary and not persisted
    // Use Export function to save complete session state
    
    // localStorage.setItem('mightylabs-gvg-players', JSON.stringify(members));
}


// Migrate old team names to new team names
function migrateTeamNames(members) {
    const teamNameMap = {
        'FrontLine': 'Team 1',
        'Jungle': 'Team 2',
        'Defence 1': 'Team 3',
        'Defence 2': 'Team 4',
        'Backline 1': 'Team 5',
        'Backline 2': 'Team 6'
    };
    
    return members.map(member => {
        let updatedMember = { ...member };
        
        // Migrate team names
        if (teamNameMap[member.team]) {
            updatedMember.team = teamNameMap[member.team];
        }
        
        // Migrate Support role to DPS
        if (member.role === 'Support') {
            updatedMember.role = 'DPS';
        }
        
        return updatedMember;
    });
}
function loadPlayersFromStorage() {
    const saved = localStorage.getItem('mightylabs-gvg-players');
    if (saved) {
        try {
            let loadedMembers = JSON.parse(saved);
            if (Array.isArray(loadedMembers) && loadedMembers.length > 0) {
                // Migrate old team names to new team names
                loadedMembers = migrateTeamNames(loadedMembers);
                members = loadedMembers;
                // Save the migrated data back to storage
                savePlayersToStorage();
            }
        } catch (e) {
            console.error('Error loading players:', e);
            // If there's an error, save the default data
            savePlayersToStorage();
        }
    } else {
        // No saved data, save the default data from data.js
        savePlayersToStorage();
    }
}

// ============================================================================
// THEME FUNCTIONS
// ============================================================================

// Theme toggle removed - dark mode only
function toggleTheme() {
    // Disabled - dark mode only
    /*
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    
    // Update icon
    const icon = themeToggleBtn.querySelector('.theme-icon');
    icon.textContent = isDark ? '☀️' : '🌙';
    
    // Save preference
    localStorage.setItem('mightylabs-gvg-theme', isDark ? 'dark' : 'light');
    */
}

function loadThemePreference() {
    // Always use dark theme
    document.body.classList.add('dark-theme');
    
    /* Removed - no theme toggle button
    const savedTheme = localStorage.getItem('mightylabs-gvg-theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        const icon = themeToggleBtn.querySelector('.theme-icon');
        icon.textContent = '☀️';
    }
    */
}

// Initialize on load
init();
