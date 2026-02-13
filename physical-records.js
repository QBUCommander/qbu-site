// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateClearanceBadge();
    checkVibralineAccess();
    setupSearch();
    setupFilters();
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

function checkVibralineAccess() {
    const currentClearance = localStorage.getItem('clearance') || 'guest';
    const vibralineNotice = document.querySelector('.vibraline-notice');
    
    // Hide the upgrade notice if user is already Vibraline
    if (currentClearance === 'vibraline' && vibralineNotice) {
        vibralineNotice.style.display = 'none';
    }
}

function setupSearch() {
    const searchInput = document.getElementById('search-records');
    const recordCards = document.querySelectorAll('.record-card');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            
            recordCards.forEach(card => {
                const title = card.querySelector('.record-title').textContent.toLowerCase();
                const description = card.querySelector('.record-description').textContent.toLowerCase();
                const artifactId = card.querySelector('.artifact-id').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || description.includes(searchTerm) || artifactId.includes(searchTerm)) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    }
}

function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const recordCards = document.querySelectorAll('.record-card');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Update active state
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            const category = this.getAttribute('data-category');
            
            // Clear search
            const searchInput = document.getElementById('search-records');
            if (searchInput) {
                searchInput.value = '';
            }
            
            // Filter cards
            recordCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');
                
                if (category === 'all') {
                    card.classList.remove('hidden');
                } else if (cardCategory === category) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    });
}

// Note: Gumroad buttons will work automatically with the gumroad.js script
// Just make sure to replace the href values with your actual Gumroad product links
