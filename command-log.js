// ============================================================
// COMMAND LOG — Loads entries from command-log-entries.json
// ============================================================

let entries = [];
let currentClearance = localStorage.getItem('clearance') || 'guest';

async function loadEntries() {
    try {
        const response = await fetch('command-log-entries.json');
        if (!response.ok) throw new Error('Failed to load entries');
        entries = await response.json();
        console.log(`[COMMAND LOG] Loaded ${entries.length} entries.`);
    } catch (err) {
        console.error('[COMMAND LOG] Error loading entries:', err);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadEntries();
    updateClearanceBadge();
    checkCommandLogAccess();
    setupFilters();
});

function updateClearanceBadge() {
    currentClearance = localStorage.getItem('clearance') || 'guest';
    const badge = document.getElementById('clearance-badge');
    if (badge) {
        badge.textContent = currentClearance.toUpperCase();
        if (currentClearance === 'vibraline') badge.classList.add('vibraline-tier');
    }
}

function hasAccess(level) {
    const levels = { guest: 0, observer: 1, initiate: 2, vibraline: 3 };
    return levels[currentClearance] >= levels[level];
}

function checkCommandLogAccess() {
    const gate = document.getElementById('clearance-gate');
    const feed = document.getElementById('command-feed');

    if (!hasAccess('initiate')) {
        gate.style.display = 'flex';
        feed.style.display = 'none';
    } else {
        gate.style.display = 'none';
        feed.style.display = 'block';
        renderEntries();
    }
}

// ============================================================
// RENDER ALL ENTRIES FROM JSON
// ============================================================

function renderEntries(filter = 'all') {
    const timeline = document.querySelector('.feed-timeline');
    if (!timeline) return;

    timeline.innerHTML = '';

    const filtered = filter === 'all' ? entries : entries.filter(e => e.type === filter);

    filtered.forEach(entry => {
        const isVibraline = entry.clearance === 'vibraline';
        const locked = isVibraline && currentClearance !== 'vibraline';

        const article = document.createElement('article');
        article.className = `feed-entry${isVibraline ? ' vibraline-only' : ''}`;
        article.setAttribute('data-type', entry.type);

        if (locked) {
            article.innerHTML = `
                <div class="entry-header">
                    <span class="entry-date">${entry.date}</span>
                    <span class="entry-type vibraline">VIBRALINE ONLY</span>
                    <span class="entry-clearance vibraline">VIBRALINE</span>
                </div>
                <div class="entry-content locked-content">
                    <div class="locked-icon">\uD83D\uDD12</div>
                    <h3 class="entry-title locked-title">VIBRALINE CLEARANCE REQUIRED</h3>
                    <p class="entry-text">This entry is restricted to Vibraline-tier supporters.</p>
                    <a href="https://yoursubstack.com/subscribe" class="vibraline-upgrade-btn" target="_blank">UPGRADE TO VIBRALINE</a>
                </div>
            `;
        } else {
            article.innerHTML = `
                <div class="entry-header">
                    <span class="entry-date">${entry.date}</span>
                    <span class="entry-type ${entry.type}">${typeLabel(entry.type)}</span>
                    <span class="entry-clearance ${entry.clearance}">${entry.clearance === 'vibraline' ? 'VIBRALINE' : 'INITIATE+'}</span>
                </div>
                <div class="entry-content">
                    <h3 class="entry-title">${entry.title}</h3>
                    ${renderEntryBody(entry)}
                    <div class="entry-interactions">
                        <button class="interaction-btn">\uD83D\uDCAC <span class="count">${entry.comments || 0}</span></button>
                        <button class="interaction-btn">\uD83D\uDD04 Share</button>
                    </div>
                </div>
            `;
        }

        timeline.appendChild(article);
    });
}

function typeLabel(type) {
    const labels = {
        decision: 'DECISION POINT',
        reflection: 'REFLECTION',
        audio: 'AUDIO LOG',
        scrapped: 'SCRAPPED IDEA',
        ritual: 'RITUAL',
        poll: 'POLL',
        ama: 'VIBRALINE Q&A'
    };
    return labels[type] || type.toUpperCase();
}

function renderEntryBody(entry) {
    let html = '';

    // Text paragraphs
    if (entry.text) {
        html += entry.text.map(p => `<p class="entry-text">${p}</p>`).join('');
    }

    // Image attachment
    if (entry.image !== undefined) {
        const src = entry.image || '';
        html += `<div class="scrapped-image">${src
            ? `<img src="${src}" alt="${entry.imageCaption || ''}" style="max-width:100%;border-radius:4px;">`
            : `<span class="image-placeholder">\uD83D\uDCCE ${entry.imageCaption || 'IMAGE PENDING'}</span>`
        }</div>`;
    }

    // Audio player
    if (entry.type === 'audio') {
        html += `
        <div class="audio-player">
            <div class="audio-waveform">
                ${Array(8).fill(0).map(() => `<div class="waveform-bar" style="height: ${30 + Math.random() * 60}%"></div>`).join('')}
            </div>
            <div class="audio-controls">
                <button class="play-btn" ${entry.audioUrl ? `onclick="playAudio('${entry.audioUrl}')"` : ''}>&#9654;</button>
                <span class="audio-duration">${entry.audioDuration || '--:--'}</span>
            </div>
        </div>`;
        if (entry.transcript) {
            html += `<p class="entry-text audio-transcript">${entry.transcript}</p>`;
        }
    }

    // Poll
    if (entry.poll) {
        html += `
        <div class="poll-widget">
            <h4 class="poll-question">${entry.poll.question}</h4>
            <div class="poll-options">
                ${entry.poll.options.map(opt => `
                <button class="poll-option">
                    <span class="option-text">${opt.text}</span>
                    <span class="option-votes">${opt.votes} votes</span>
                </button>`).join('')}
            </div>
        </div>`;
    }

    // Ritual steps
    if (entry.ritualSteps) {
        html += `<div class="ritual-steps">
            ${entry.ritualSteps.map((step, i) => `
            <div class="ritual-step">
                <span class="step-number">${String(i + 1).padStart(2, '0')}</span>
                <p class="step-text">${step}</p>
            </div>`).join('')}
        </div>`;
    }

    // Q&A thread
    if (entry.qaThread) {
        html += `<div class="ama-thread">
            ${entry.qaThread.map(qa => `
            <div class="ama-question">
                <span class="question-author">${qa.author}</span>
                <p class="question-text">"${qa.question}"</p>
            </div>
            <div class="ama-answer">
                <span class="answer-label">ANSWER:</span>
                <p class="answer-text">${qa.answer}</p>
            </div>`).join('')}
        </div>
        <button class="ask-question-btn">ASK A QUESTION</button>`;
    }

    return html;
}

// ============================================================
// FILTERS
// ============================================================

function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-tag');
    filterButtons.forEach(button => {
        button.addEventListener('click', function () {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            renderEntries(this.getAttribute('data-filter'));
        });
    });
}

// Placeholder interaction handlers
function playAudio(url) { console.log('Play audio:', url); }
function handleComment(id) { console.log('Comment:', id); }
function handleVote(pollId, opt) { console.log('Vote:', pollId, opt); }
