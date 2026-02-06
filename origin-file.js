// Initialize
document.addEventListener('DOMContentLoaded', () => {
    updateClearanceBadge();
    setupChapterNavigation();
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

function setupChapterNavigation() {
    const chapterButtons = document.querySelectorAll('.chapter-btn');
    const chapters = document.querySelectorAll('.chapter');
    
    chapterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active from all buttons and chapters
            chapterButtons.forEach(btn => btn.classList.remove('active'));
            chapters.forEach(chapter => chapter.classList.remove('active'));
            
            // Add active to clicked button
            this.classList.add('active');
            
            // Show corresponding chapter
            const chapterId = this.getAttribute('data-chapter');
            const targetChapter = document.getElementById(`chapter-${chapterId}`);
            if (targetChapter) {
                targetChapter.classList.add('active');
                
                // Smooth scroll to chapter
                targetChapter.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}
