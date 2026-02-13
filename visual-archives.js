// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateClearanceBadge();
});

function updateClearanceBadge() {
    const currentClearance = localStorage.getItem('clearance') || 'guest';
    const badge = document.getElementById('clearance-badge');
    if (badge) {
        badge.textContent = currentClearance.toUpperCase();
        if (currentClearance === 'vibraline') {
            badge.classList.add('vibraline-tier');
        }
    }
}

function navigateToSection(page) {
    window.location.href = page;
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === '1') navigateToSection('evolution-logs.html');
    if (e.key === '2') navigateToSection('media-vault.html');
    if (e.key === '3') navigateToSection('inkternal-markings.html');
});
