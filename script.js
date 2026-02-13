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
const hamburgerBtn = document.getElementById('hamburger-btn');
const mainNav = document.getElementById('main-nav');
const navOverlay = document.getElementById('nav-overlay');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check for saved session
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
    
    // Hamburger menu
    hamburgerBtn.addEventListener('click', toggleNav);
    navOverlay.addEventListener('click', closeNav);
    
    // Close nav when a link is clicked (mobile)
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            // Close mobile nav on any click
            closeNav();
            
            // Allow navigation for links to other pages
            if (href.includes('.html') || href.startsWith('http')) {
                return;
            }
            
            // Only prevent default for same-page anchors
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
});

// ============================================
// HAMBURGER NAV
// ============================================

function toggleNav() {
    hamburgerBtn.classList.toggle('open');
    mainNav.classList.toggle('open');
    navOverlay.classList.toggle('active');
    document.body.style.overflow = mainNav.classList.contains('open') ? 'hidden' : '';
}

function closeNav() {
    hamburgerBtn.classList.remove('open');
    mainNav.classList.remove('open');
    navOverlay.classList.remove('active');
    document.body.style.overflow = '';
}

// Close nav on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mainNav.classList.contains('open')) {
        closeNav();
    }
});

// ============================================
// CLEARANCE & LOGIN
// ============================================

function handleClearanceChange() {
    const selected = clearanceSelect.value;
    emailInput.style.display = 
        (selected === 'observer' || selected === 'initiate' || selected === 'vibraline') 
        ? 'block' : 'none';
}

function handleEnter() {
    const selected = clearanceSelect.value;
    const email = document.getElementById('email').value;
    
    // Validation for non-guest tiers
    if (selected !== 'guest') {
        if (!email || !validateEmail(email)) {
            showNotification('Valid email required for this clearance level', 'error');
            return;
        }
    }
    
    // Future: Check Substack subscription for paid tiers
    if (selected === 'initiate' || selected === 'vibraline') {
        console.log('[AUTH] Checking subscription status for:', email);
    }
    
    currentClearance = selected;
    userEmail = email;
    
    localStorage.setItem('clearance', currentClearance);
    localStorage.setItem('email', userEmail);
    
    enterHub();
}

function enterHub() {
    loginScreen.classList.remove('active');
    mainHub.classList.add('active');
    
    // Update clearance badge
    clearanceBadge.textContent = currentClearance.toUpperCase();
    clearanceBadge.style.borderColor = getClearanceColor(currentClearance);
    clearanceBadge.style.color = getClearanceColor(currentClearance);
    
    if (currentClearance === 'vibraline') {
        clearanceBadge.classList.add('vibraline-tier');
    } else {
        clearanceBadge.classList.remove('vibraline-tier');
    }
    
    // Load hub data
    loadHubConfig();
    applyAccessRestrictions();
}

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
        
        closeNav();
    }
}

// ============================================
// HUB DATA
// ============================================

async function loadHubConfig() {
    try {
        const response = await fetch('hub-config.json');
        if (!response.ok) return;
        
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
                    return `<div class="file-card file-card--system">
                        <span class="file-date">${f.date}</span>
                        <span class="file-type file-type--${f.type.toLowerCase()}">${f.type}</span>
                        <span class="file-link">${f.label}</span>
                    </div>`;
                }
            }).join('');
        }
        
        console.log('[HUB] Config loaded.');
    } catch (err) {
        console.log('[HUB] Could not load hub-config.json:', err.message);
    }
}

// ============================================
// ACCESS CONTROL
// ============================================

function applyAccessRestrictions() {
    const restrictedElements = document.querySelectorAll('[data-clearance]');
    
    restrictedElements.forEach(element => {
        const requiredClearance = element.getAttribute('data-clearance');
        
        if (!hasAccess(requiredClearance)) {
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

function hasAccess(requiredClearance) {
    const levels = { 'guest': 0, 'observer': 1, 'initiate': 2, 'vibraline': 3 };
    return levels[currentClearance] >= levels[requiredClearance];
}

// ============================================
// UTILITIES
// ============================================

function getClearanceColor(clearance) {
    const colors = {
        'guest': '#7BA7BC',
        'observer': '#00D9FF',
        'initiate': '#00FFFF',
        'vibraline': '#00FF88'
    };
    return colors[clearance] || '#7BA7BC';
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const color = type === 'error' ? '#FF0055' : '#00D9FF';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: rgba(10, 14, 39, 0.95);
        border: 2px solid ${color};
        color: ${color};
        font-family: 'Courier New', monospace;
        font-size: 0.85rem;
        z-index: 10000;
        box-shadow: 0 0 20px ${color}33;
        max-width: 90vw;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.transition = 'opacity 0.5s ease';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Redacted overlay styles
const redactedStyles = document.createElement('style');
redactedStyles.textContent = `
    .redacted-overlay {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
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
        font-size: 2.5rem;
        display: block;
        margin-bottom: 0.75rem;
        filter: drop-shadow(0 0 10px #FF0055);
    }
    .redacted-content p {
        margin: 0.4rem 0;
        letter-spacing: 0.2rem;
        font-weight: bold;
    }
    .redacted-requirement {
        font-size: 0.7rem;
        color: #7BA7BC;
    }
`;
document.head.appendChild(redactedStyles);
