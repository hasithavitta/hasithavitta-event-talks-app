// Global Application State
let appState = {
    updates: [],
    selectedUpdate: null,
    activeFilter: 'all',
    searchQuery: '',
    tweetOptions: {
        date: true,
        link: true,
        tags: true,
        emojis: true
    },
    tweetPreset: 'summary', // 'summary', 'headline', 'detailed'
    theme: 'dark',
    userHasEditedTweet: false // Tracks if user manually edited the draft text
};

// SVG Emojis for each Update Type
const TYPE_EMOJIS = {
    'Feature': '🚀',
    'Announcement': '📢',
    'Breaking': '⚠️',
    'Change': '🔄',
    'Issue': '🐛',
    'General': '💡',
    'Update': '⚡'
};

// DOM Elements
const DOM = {
    appTitle: document.getElementById('app-title'),
    btnExport: document.getElementById('btn-export'),
    btnRefresh: document.getElementById('btn-refresh'),
    spinner: document.getElementById('spinner'),
    refreshIcon: document.getElementById('refresh-icon'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    sunIcon: document.querySelector('.sun-icon'),
    moonIcon: document.querySelector('.moon-icon'),
    feedStatusText: document.getElementById('feed-status-text'),
    feedStatusContainer: document.getElementById('feed-status-container'),
    
    searchInput: document.getElementById('search-input'),
    btnSearchClear: document.getElementById('btn-search-clear'),
    filtersContainer: document.getElementById('filters-container'),
    cardsContainer: document.getElementById('cards-container'),
    skeletonLoader: document.getElementById('skeleton-loader'),
    
    tweetStudio: document.getElementById('tweet-studio'),
    studioEmpty: document.getElementById('studio-empty'),
    studioActive: document.getElementById('studio-active'),
    btnDeselect: document.getElementById('btn-deselect'),
    
    selectedTypeBadge: document.getElementById('selected-type-badge'),
    selectedDate: document.getElementById('selected-date'),
    selectedSnippet: document.getElementById('selected-snippet'),
    
    chipDate: document.getElementById('chip-date'),
    chipLink: document.getElementById('chip-link'),
    chipTags: document.getElementById('chip-tags'),
    chipEmojis: document.getElementById('chip-emojis'),
    
    presetSummary: document.getElementById('preset-summary'),
    presetHeadline: document.getElementById('preset-headline'),
    presetDetailed: document.getElementById('preset-detailed'),
    
    tweetTextarea: document.getElementById('tweet-textarea'),
    charCount: document.getElementById('char-count'),
    charWarning: document.getElementById('char-warning'),
    charProgressCircle: document.getElementById('char-progress-circle'),
    
    btnCopyTweet: document.getElementById('btn-copy-tweet'),
    btnPostTweet: document.getElementById('btn-post-tweet'),
    toast: document.getElementById('toast'),
    toastMessage: document.getElementById('toast-message')
};

// Initialize the Application
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupEventListeners();
    fetchUpdates(false);
});

// Theme Management
function initTheme() {
    const savedTheme = localStorage.getItem('bq-theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    appState.theme = theme;
    if (theme === 'light') {
        document.body.classList.remove('dark-theme');
        document.body.classList.add('light-theme');
        DOM.sunIcon.classList.add('hidden');
        DOM.moonIcon.classList.remove('hidden');
    } else {
        document.body.classList.remove('light-theme');
        document.body.classList.add('dark-theme');
        DOM.moonIcon.classList.add('hidden');
        DOM.sunIcon.classList.remove('hidden');
    }
    localStorage.setItem('bq-theme', theme);
}

function toggleTheme() {
    const nextTheme = appState.theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
}

// Event Listeners Setup
function setupEventListeners() {
    // Theme Toggle
    DOM.btnThemeToggle.addEventListener('click', toggleTheme);

    // Export to CSV
    DOM.btnExport.addEventListener('click', exportFeedToCSV);

    // Refresh Feed
    DOM.btnRefresh.addEventListener('click', () => {
        fetchUpdates(true);
    });

    // Search input
    DOM.searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.trim();
        if (appState.searchQuery.length > 0) {
            DOM.btnSearchClear.classList.remove('hidden');
        } else {
            DOM.btnSearchClear.classList.add('hidden');
        }
        renderFeed();
    });

    // Clear Search
    DOM.btnSearchClear.addEventListener('click', () => {
        DOM.searchInput.value = '';
        appState.searchQuery = '';
        DOM.btnSearchClear.classList.add('hidden');
        renderFeed();
        DOM.searchInput.focus();
    });

    // Filter Chips
    DOM.filtersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        
        // Update active class
        DOM.filtersContainer.querySelectorAll('.filter-btn').forEach(el => el.classList.remove('active'));
        btn.classList.add('active');
        
        appState.activeFilter = btn.dataset.type;
        renderFeed();
    });

    // Close/Deselect Composer
    DOM.btnDeselect.addEventListener('click', deselectUpdate);

    // Tweet Option Chips (Date, Link, Tags, Emojis)
    const toggleOption = (chip, optionKey) => {
        chip.addEventListener('click', () => {
            appState.tweetOptions[optionKey] = !appState.tweetOptions[optionKey];
            chip.classList.toggle('active', appState.tweetOptions[optionKey]);
            appState.userHasEditedTweet = false; // Reset edit flag to regenerate
            updateTweetDraft();
        });
    };
    
    toggleOption(DOM.chipDate, 'date');
    toggleOption(DOM.chipLink, 'link');
    toggleOption(DOM.chipTags, 'tags');
    toggleOption(DOM.chipEmojis, 'emojis');

    // Preset selection buttons
    const setPreset = (btn, presetVal) => {
        btn.addEventListener('click', () => {
            DOM.presetSummary.classList.remove('active');
            DOM.presetHeadline.classList.remove('active');
            DOM.presetDetailed.classList.remove('active');
            btn.classList.add('active');
            
            appState.tweetPreset = presetVal;
            appState.userHasEditedTweet = false; // Reset edit flag to regenerate
            updateTweetDraft();
        });
    };
    
    setPreset(DOM.presetSummary, 'summary');
    setPreset(DOM.presetHeadline, 'headline');
    setPreset(DOM.presetDetailed, 'detailed');

    // Textarea manual edits
    DOM.tweetTextarea.addEventListener('input', () => {
        appState.userHasEditedTweet = true;
        validateTweetLength();
    });

    // Copy to clipboard
    DOM.btnCopyTweet.addEventListener('click', copyTweetToClipboard);

    // Post to Twitter/X
    DOM.btnPostTweet.addEventListener('click', postTweetToX);
}

// Fetch Release Notes
async function fetchUpdates(forceRefresh = false) {
    setLoadingState(true);
    
    let url = '/api/updates';
    if (forceRefresh) {
        url += '?refresh=true';
    }
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        if (data.status === 'success') {
            appState.updates = data.updates || [];
            
            // Update fetch status text
            const fetchTime = new Date();
            const timeStr = fetchTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            DOM.feedStatusText.textContent = `Updated at ${timeStr}`;
            DOM.feedStatusContainer.querySelector('.status-dot').className = 'status-dot green';
            
            if (data.warning) {
                showToast(data.warning, true);
            }
        } else {
            throw new Error(data.message || 'Unknown server error');
        }
        
    } catch (error) {
        console.error('Fetch failed:', error);
        DOM.feedStatusText.textContent = 'Failed to load updates';
        DOM.feedStatusContainer.querySelector('.status-dot').className = 'status-dot red';
        showToast(`Error: ${error.message || 'Could not fetch release notes'}`, true);
        
        // Show an error message inside the container if we have no entries
        if (appState.updates.length === 0) {
            DOM.cardsContainer.innerHTML = `
                <div class="no-results-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>
                    </svg>
                    <h3>Connection Error</h3>
                    <p>Failed to connect to the Google Cloud Release Notes Feed. Please verify your internet connection and click refresh.</p>
                    <button class="btn btn-secondary" onclick="fetchUpdates(true)">Try Again</button>
                </div>
            `;
        }
    } finally {
        setLoadingState(false);
        renderFeed();
    }
}

// Loading States
function setLoadingState(isLoading) {
    if (isLoading) {
        DOM.spinner.classList.remove('hidden');
        DOM.refreshIcon.classList.add('hidden');
        DOM.btnRefresh.disabled = true;
        DOM.feedStatusText.textContent = 'Syncing feed...';
        DOM.feedStatusContainer.querySelector('.status-dot').className = 'status-dot orange';
        
        // Show skeleton loaders if no updates are currently displayed
        if (appState.updates.length === 0) {
            DOM.skeletonLoader.classList.remove('hidden');
            DOM.cardsContainer.querySelectorAll('.note-card, .no-results-state').forEach(el => el.remove());
        }
    } else {
        DOM.spinner.classList.add('hidden');
        DOM.refreshIcon.classList.remove('hidden');
        DOM.btnRefresh.disabled = false;
        DOM.skeletonLoader.classList.add('hidden');
    }
}

// Render Release Notes Feed
function renderFeed() {
    // Clear old cards (except skeleton)
    DOM.cardsContainer.querySelectorAll('.note-card, .no-results-state').forEach(el => el.remove());
    
    // Filter updates
    let filtered = appState.updates;
    
    // Apply Category Filter
    if (appState.activeFilter !== 'all') {
        filtered = filtered.filter(u => u.type.toLowerCase() === appState.activeFilter.toLowerCase());
    }
    
    // Apply Search Query
    if (appState.searchQuery) {
        const query = appState.searchQuery.toLowerCase();
        filtered = filtered.filter(u => 
            u.date.toLowerCase().includes(query) || 
            u.type.toLowerCase().includes(query) || 
            u.plain_text.toLowerCase().includes(query)
        );
    }
    
    if (filtered.length === 0) {
        const emptyStateHTML = `
            <div class="no-results-state">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
                </svg>
                <h3>No Matching Updates</h3>
                <p>We couldn't find any release notes matching your search or filter criteria. Try checking your spelling or selecting another category.</p>
            </div>
        `;
        DOM.cardsContainer.insertAdjacentHTML('beforeend', emptyStateHTML);
        return;
    }
    
    // Create card elements
    filtered.forEach(update => {
        const typeClass = `badge-${update.type.toLowerCase()}`;
        const isSelected = appState.selectedUpdate && appState.selectedUpdate.id === update.id;
        
        const cardHTML = `
            <article class="note-card ${isSelected ? 'selected' : ''}" data-id="${update.id}" id="card-${update.id}">
                <div class="note-card-meta">
                    <div class="meta-left">
                        <span class="badge ${typeClass}">${update.type}</span>
                        <span class="note-date">${update.date}</span>
                    </div>
                    <div class="card-select-indicator" title="Select for Tweet">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    </div>
                </div>
                <div class="note-card-content">
                    ${update.content}
                </div>
                <div class="note-card-footer">
                    <a href="${update.link}" target="_blank" rel="noopener noreferrer" class="card-link-ref" onclick="event.stopPropagation()">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/>
                        </svg>
                        <span>Official Notes</span>
                    </a>
                    <button class="card-action-btn btn-copy-card" title="Copy update to clipboard" onclick="event.stopPropagation(); copyCardText('${update.id}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
                        </svg>
                        <span>Copy Text</span>
                    </button>
                </div>
            </article>
        `;
        
        DOM.cardsContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
    
    // Add Click Listeners to cards
    DOM.cardsContainer.querySelectorAll('.note-card').forEach(card => {
        card.addEventListener('click', () => {
            const updateId = card.dataset.id;
            selectUpdate(updateId);
        });
    });
}

// Select an Update Card
function selectUpdate(updateId) {
    const update = appState.updates.find(u => u.id === updateId);
    if (!update) return;
    
    appState.selectedUpdate = update;
    appState.userHasEditedTweet = false; // Reset manual edit flag for new selection
    
    // UI selection visual changes
    DOM.cardsContainer.querySelectorAll('.note-card').forEach(c => c.classList.remove('selected'));
    const selectedCard = document.getElementById(`card-${updateId}`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Show Composer Card active state
    DOM.studioEmpty.classList.add('hidden');
    DOM.studioActive.classList.remove('hidden');
    
    // Populate card details in Tweet Studio
    DOM.selectedTypeBadge.textContent = update.type;
    // Set class on badge inside composer
    DOM.selectedTypeBadge.className = `active-source-badge badge-${update.type.toLowerCase()}`;
    DOM.selectedDate.textContent = update.date;
    
    // Build snippet content (strip HTML but keep simple format)
    DOM.selectedSnippet.textContent = update.plain_text;
    
    // Generate draft
    updateTweetDraft();
    
    // Smooth scroll composer into view on mobile
    if (window.innerWidth <= 1024) {
        DOM.tweetStudio.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// Deselect selected update
function deselectUpdate() {
    appState.selectedUpdate = null;
    appState.userHasEditedTweet = false;
    
    // Remove selection outline
    DOM.cardsContainer.querySelectorAll('.note-card').forEach(c => c.classList.remove('selected'));
    
    // Hide active Composer view, show empty state
    DOM.studioActive.classList.add('hidden');
    DOM.studioEmpty.classList.remove('hidden');
}

// Generate & Update Tweet Text Area content
function updateTweetDraft() {
    if (!appState.selectedUpdate || appState.userHasEditedTweet) return;
    
    const update = appState.selectedUpdate;
    const descText = update.plain_text;
    
    // Elements of Tweet
    let emoji = appState.tweetOptions.emojis ? (TYPE_EMOJIS[update.type] || '⚡') + ' ' : '';
    let typeTag = `[BigQuery ${update.type}] `;
    let dateSuffix = appState.tweetOptions.date ? ` (${update.date})` : '';
    let linkUrl = appState.tweetOptions.link ? ` ${update.link}` : '';
    let hashtags = appState.tweetOptions.tags ? ' #BigQuery #GoogleCloud #GCP' : '';
    
    // Adjust tags/type formatting based on preset
    let tweetDraft = '';
    
    if (appState.tweetPreset === 'headline') {
        // Headline style: EMOJI BigQuery Headline: Content...
        const prefix = `${emoji}BigQuery Update: `;
        const maxDescLen = 280 - prefix.length - linkUrl.length - hashtags.length - dateSuffix.length;
        
        let truncatedDesc = descText;
        if (descText.length > maxDescLen) {
            truncatedDesc = descText.substring(0, maxDescLen - 3) + '...';
        }
        
        tweetDraft = `${prefix}${truncatedDesc}${dateSuffix}${linkUrl}${hashtags}`;
        
    } else if (appState.tweetPreset === 'detailed') {
        // Detailed style: Emoji [BigQuery Type] Full Description text
        const prefix = `${emoji}${typeTag}`;
        const maxDescLen = 280 - prefix.length - linkUrl.length - hashtags.length - dateSuffix.length;
        
        let truncatedDesc = descText;
        if (descText.length > maxDescLen) {
            truncatedDesc = descText.substring(0, maxDescLen - 3) + '...';
        }
        
        tweetDraft = `${prefix}${truncatedDesc}${dateSuffix}${linkUrl}${hashtags}`;
        
    } else {
        // Summary style (default): Emoji BigQuery Type: short text
        const prefix = `${emoji}${update.type}: `;
        // Let's summarize the description text. Cut at first sentence if possible
        let summaryText = descText;
        const sentenceEnd = descText.indexOf('. ');
        if (sentenceEnd > 40 && sentenceEnd < 140) {
            summaryText = descText.substring(0, sentenceEnd + 1);
        }
        
        const maxDescLen = 280 - prefix.length - linkUrl.length - hashtags.length - dateSuffix.length;
        if (summaryText.length > maxDescLen) {
            summaryText = summaryText.substring(0, maxDescLen - 3) + '...';
        }
        
        tweetDraft = `${prefix}${summaryText}${dateSuffix}${linkUrl}${hashtags}`;
    }
    
    DOM.tweetTextarea.value = tweetDraft;
    validateTweetLength();
}

// Validate Tweet Character Limits and update counts
function validateTweetLength() {
    const text = DOM.tweetTextarea.value;
    const len = text.length;
    
    DOM.charCount.textContent = len;
    
    // SVG Progress ring update
    // Circle radius = 9, circumference = 2 * PI * r = 56.54
    const circumference = 56.54;
    const percent = Math.min(len / 280, 1);
    const offset = circumference - (percent * circumference);
    DOM.charProgressCircle.style.strokeDashoffset = offset;
    
    // Progress Ring Color states
    if (len > 280) {
        DOM.charProgressCircle.style.stroke = '#EF4444'; // Red
        DOM.charWarning.classList.remove('hidden');
        DOM.btnPostTweet.disabled = true;
    } else if (len > 260) {
        DOM.charProgressCircle.style.stroke = '#F59E0B'; // Orange warning
        DOM.charWarning.classList.add('hidden');
        DOM.btnPostTweet.disabled = false;
    } else {
        DOM.charProgressCircle.style.stroke = '#10B981'; // Emerald
        DOM.charWarning.classList.add('hidden');
        DOM.btnPostTweet.disabled = false;
    }
}

// Copy Tweet text to clipboard
async function copyTweetToClipboard() {
    const tweetText = DOM.tweetTextarea.value;
    if (!tweetText) return;
    
    try {
        await navigator.clipboard.writeText(tweetText);
        showToast('Draft copied to clipboard!');
    } catch (err) {
        console.error('Clipboard copy failed:', err);
        // Fallback copy
        DOM.tweetTextarea.select();
        document.execCommand('copy');
        showToast('Draft copied to clipboard!');
    }
}

// Post Tweet to X / Twitter Web Intent
function postTweetToX() {
    const tweetText = DOM.tweetTextarea.value;
    if (!tweetText) return;
    
    if (tweetText.length > 280) {
        showToast('Cannot post: Tweet text exceeds 280 characters.', true);
        return;
    }
    
    const encodedText = encodeURIComponent(tweetText);
    const intentUrl = `https://x.com/intent/tweet?text=${encodedText}`;
    
    // Open in a new tab
    window.open(intentUrl, '_blank', 'noopener,noreferrer');
}

// Show Toast Message
let toastTimeout;
function showToast(message, isError = false) {
    clearTimeout(toastTimeout);
    
    DOM.toastMessage.textContent = message;
    DOM.toast.classList.remove('hidden');
    
    if (isError) {
        DOM.toast.classList.add('error');
    } else {
        DOM.toast.classList.remove('error');
    }
    
    // Transition trigger
    setTimeout(() => {
        DOM.toast.style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
    
    toastTimeout = setTimeout(() => {
        DOM.toast.classList.add('hidden');
    }, 3000);
}

// Export currently viewed release notes to CSV
function exportFeedToCSV() {
    let filtered = appState.updates;
    if (appState.activeFilter !== 'all') {
        filtered = filtered.filter(u => u.type.toLowerCase() === appState.activeFilter.toLowerCase());
    }
    if (appState.searchQuery) {
        const query = appState.searchQuery.toLowerCase();
        filtered = filtered.filter(u => 
            u.date.toLowerCase().includes(query) || 
            u.type.toLowerCase().includes(query) || 
            u.plain_text.toLowerCase().includes(query)
        );
    }
    
    if (filtered.length === 0) {
        showToast('No entries to export.', true);
        return;
    }
    
    const headers = ['Date', 'Type', 'Description', 'Link'];
    const csvRows = [headers.map(h => `"${h.replace(/"/g, '""')}"`).join(",")];
    
    filtered.forEach(u => {
        const row = [
            u.date,
            u.type,
            u.plain_text,
            u.link
        ];
        csvRows.push(row.map(val => `"${val.replace(/"/g, '""')}"`).join(","));
    });
    
    const csvString = csvRows.join("\n");
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const dateSuffix = new Date().toISOString().split('T')[0];
    link.setAttribute("download", `bigquery_releases_${appState.activeFilter}_${dateSuffix}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('CSV export downloaded!');
}

// Copy specific card's text to clipboard
async function copyCardText(updateId) {
    const update = appState.updates.find(u => u.id === updateId);
    if (!update) return;
    
    const textToCopy = `[BigQuery ${update.type}] ${update.date}\n${update.plain_text}\nLink: ${update.link}`;
    try {
        await navigator.clipboard.writeText(textToCopy);
        showToast('Update details copied!');
    } catch (err) {
        console.error('Clipboard copy failed:', err);
        showToast('Failed to copy text.', true);
    }
}

// Expose copyCardText globally for inline HTML click handlers
window.copyCardText = copyCardText;

