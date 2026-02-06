// State management
let currentClearance = 'guest';
let userEmail = '';

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainHub = document.getElementById('main-hub');
const clearanceSelect = document.getElementById('clearance');
const emailInput = document.getElementById('email-input');
const enterBtn = document.getElementById('enter-btn');
const logoutBtn = document.getElementById('logout-btn');
const clearanceBadge = document.getElementById('clearance-badge');
const navLinks = document.querySelectorAll('.nav-link');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if user has a saved session
    const savedClearance = localStorage.getItem('clearance');
    const savedEmail = localStorage.getItem('email');
    
    if (savedClearance) {
        currentClearance = savedClearance;
        userEmail = savedEmail || '';
        enterHub();
    }
    
    // Event listeners
    clearanceSelect.addEventListener('change', handleClearanceChange);
    enterBtn.addEventListener('click', handleEnter);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            // Allow actual navigation for links to other pages
            if (href.includes('.html') || href.startsWith('http')) {
                return; // Let the link navigate normally
            }
            
            // Only prevent default for same-page anchors
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            console.log('Navigating to:', href);
        });
    });
});

// Handle clearance selection
function handleClearanceChange() {
    const selected = clearanceSelect.value;
    
    if (selected === 'observer' || selected === 'initiate' || selected === 'vibraline') {
        emailInput.style.display = 'block';
    } else {
        emailInput.style.display = 'none';
    }
}

// Handle enter button
function handleEnter() {
    const selected = clearanceSelect.value;
    const email = document.getElementById('email').value;
    
    // Validation for paid tiers
    if (selected === 'observer' || selected === 'initiate' || selected === 'vibraline') {
        if (!email || !validateEmail(email)) {
            showNotification('Valid email required for this clearance level', 'error');
            return;
        }
    }
    
    // In a real implementation, this would check Substack subscription status
    if (selected === 'initiate' || selected === 'vibraline') {
        // For now, we'll simulate the check
        console.log('Checking subscription status for:', email);
        // This would integrate with Substack API
    }
    
    currentClearance = selected;
    userEmail = email;
    
    // Save to localStorage
    localStorage.setItem('clearance', currentClearance);
    localStorage.setItem('email', userEmail);
    
    enterHub();
}

// Enter the hub
function enterHub() {
    loginScreen.classList.remove('active');
    mainHub.classList.add('active');
    
    // Update clearance badge
    clearanceBadge.textContent = currentClearance.toUpperCase();
    clearanceBadge.style.borderColor = getClearanceColor(currentClearance);
    clearanceBadge.style.color = getClearanceColor(currentClearance);
    
    // Add vibraline-tier class for green styling
    if (currentClearance === 'vibraline') {
        clearanceBadge.classList.add('vibraline-tier');
    } else {
        clearanceBadge.classList.remove('vibraline-tier');
    }
    
    // Load initial content
    loadSystemFeed();
    applyAccessRestrictions();
}

// Handle logout
function handleLogout() {
    if (confirm('Terminate session and logout?')) {
        localStorage.removeItem('clearance');
        localStorage.removeItem('email');
        
        currentClearance = 'guest';
        userEmail = '';
        
        mainHub.classList.remove('active');
        loginScreen.classList.add('active');
        
        clearanceSelect.value = 'guest';
        document.getElementById('email').value = '';
        emailInput.style.display = 'none';
    }
}

// Get clearance color
function getClearanceColor(clearance) {
    const colors = {
        'guest': '#7BA7BC',
        'observer': '#00D9FF',
        'initiate': '#00FFFF',
        'vibraline': '#00FF88'
    };
    return colors[clearance] || '#7BA7BC';
}

// Validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: rgba(10, 14, 39, 0.95);
        border: 2px solid ${type === 'error' ? '#FF0055' : '#00D9FF'};
        color: ${type === 'error' ? '#FF0055' : '#00D9FF'};
        font-family: 'Courier New', monospace;
        font-size: 0.85rem;
        z-index: 10000;
        box-shadow: 0 0 20px ${type === 'error' ? 'rgba(255, 0, 85, 0.3)' : 'rgba(0, 217, 255, 0.3)'};
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transition = 'opacity 0.5s ease';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Load system feed from hub-config.json and Substack RSS
async function loadSystemFeed() {
    try {
        // Load hub config
        const response = await fetch('hub-config.json');
        if (response.ok) {
            const config = await response.json();
            
            // Update system status
            const statusMsg = document.getElementById('creator-status');
            const statusTimestamp = document.querySelector('.status-timestamp');
            if (statusMsg && config.systemStatus) {
                statusMsg.textContent = config.systemStatus.message;
            }
            if (statusTimestamp && config.systemStatus) {
                statusTimestamp.textContent = `LAST UPDATE: ${config.systemStatus.lastUpdate}`;
            }
            
            // Update recent files
            const recentFiles = document.getElementById('recent-files');
            if (recentFiles && config.recentFiles) {
                recentFiles.innerHTML = config.recentFiles.map(f => {
                    if (f.link) {
                        return `<a href="${f.link}" class="file-card">
                            <span class="file-date">${f.date}</span>
                            <span class="file-type">${f.type}</span>
                            <span class="file-link">${f.label}</span>
                        </a>`;
                    } else {
                        return `<div class="file-card non-clickable">
                            <span class="file-date">${f.date}</span>
                            <span class="file-type">${f.type}</span>
                            <span class="file-link">${f.label}</span>
                        </div>`;
                    }
                }).join('');
            }
            
            // Try to load Substack RSS feed
            if (config.substackUrl && config.substackUrl !== 'https://yoursubstack.com') {
                loadSubstackFeed(config.substackUrl);
            }
            
            console.log('[HUB] Config loaded.');
        }
    } catch (err) {
        console.log('[HUB] Could not load hub-config.json:', err.message);
    }
}

// Load Substack RSS into system feed
async function loadSubstackFeed(substackUrl) {
    const feedContainer = document.getElementById('feed-container');
    
    try {
        // Call our serverless function (no CORS issues)
        const response = await fetch(`/api/substack?url=${encodeURIComponent(substackUrl)}`);
        
        if (!response.ok) throw new Error('API returned ' + response.status);
        
        const data = await response.json();
        
        if (data.posts && data.posts.length > 0 && feedContainer) {
            feedContainer.innerHTML = '';
            
            data.posts.slice(0, 5).forEach(p => {
                const date = new Date(p.date);
                const formatted = `${date.getFullYear()}.${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}`;
                
                feedContainer.innerHTML += `
                    <a href="${p.link}" target="_blank" class="substack-note" style="text-decoration:none;display:block;">
                        <span class="note-timestamp">${formatted}</span>
                        <p class="note-content" style="font-weight:bold;margin-bottom:0.25rem;">${p.title}</p>
                        ${p.excerpt ? `<p class="note-content" style="font-size:0.8rem;opacity:0.7;">${p.excerpt}</p>` : ''}
                    </a>
                `;
            });
            
            console.log('[HUB] Substack feed loaded:', data.posts.length, 'posts');
        } else if (feedContainer) {
            feedContainer.innerHTML = '<p class="feed-note" style="text-align:center;opacity:0.4;">No transmissions yet.</p>';
        }
    } catch (err) {
        console.log('[HUB] Substack feed error:', err.message);
        if (feedContainer) {
            feedContainer.innerHTML = '<p class="feed-note" style="text-align:center;opacity:0.4;">Feed temporarily unavailable.</p>';
        }
    }
}

// Apply access restrictions based on clearance
function applyAccessRestrictions() {
    const restrictedElements = document.querySelectorAll('[data-clearance]');
    
    restrictedElements.forEach(element => {
        const requiredClearance = element.getAttribute('data-clearance');
        
        if (!hasAccess(requiredClearance)) {
            // Add redacted overlay
            const overlay = document.createElement('div');
            overlay.className = 'redacted-overlay';
            overlay.innerHTML = `
                <div class="redacted-content">
                    <span class="redacted-icon">🔒</span>
                    <p>CLASSIFIED</p>
                    <p class="redacted-requirement">REQUIRES: ${requiredClearance.toUpperCase()} CLEARANCE</p>
                </div>
            `;
            element.style.position = 'relative';
            element.appendChild(overlay);
        }
    });
}

// Check if user has access to content
function hasAccess(requiredClearance) {
    const clearanceLevels = {
        'guest': 0,
        'observer': 1,
        'initiate': 2,
        'vibraline': 3
    };
    
    return clearanceLevels[currentClearance] >= clearanceLevels[requiredClearance];
}

// Add styles for redacted content dynamically
const style = document.createElement('style');
style.textContent = `
    .redacted-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(10px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
        border: 2px solid #FF0055;
    }
    
    .redacted-content {
        text-align: center;
        color: #FF0055;
    }
    
    .redacted-icon {
        font-size: 3rem;
        display: block;
        margin-bottom: 1rem;
        filter: drop-shadow(0 0 10px #FF0055);
    }
    
    .redacted-content p {
        margin: 0.5rem 0;
        letter-spacing: 0.2rem;
        font-weight: bold;
    }
    
    .redacted-requirement {
        font-size: 0.75rem;
        color: #7BA7BC;
    }
`;
document.head.appendChild(style);

// Simulated API functions (to be replaced with real API calls)
async function fetchSubstackPosts() {
    // This would use the Substack API
    // Example: https://yoursubstack.substack.com/api/v1/posts
    return [];
}

async function fetchYouTubeVideos() {
    // This would use the YouTube Data API
    // Example: https://www.googleapis.com/youtube/v3/search
    return [];
}

async function fetchSiteUpdates() {
    // This would read from a JSON file you update
    // Example: /data/updates.json
    return [];
}
