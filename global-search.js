// ============================================================
// GLOBAL SEARCH — Searches across all QBU data files
// ============================================================

let searchIndex = [];
let searchLoaded = false;

async function buildSearchIndex() {
    if (searchLoaded) return;
    searchIndex = [];

    // Load characters
    try {
        const r = await fetch('characters.json');
        if (r.ok) {
            const chars = await r.json();
            Object.entries(chars).forEach(([id, c]) => {
                if (!c.callsign) return;
                searchIndex.push({
                    type: 'DOSSIER',
                    title: c.callsign,
                    subtitle: c.designation || c.subtitle || '',
                    text: (c.profileOverview || '') + ' ' + (c.personalityVibe || []).join(' '),
                    url: `dossiers.html?agent=${id}`
                });
            });
        }
    } catch (e) { /* skip */ }

    // Load zones
    try {
        const r = await fetch('zones.json');
        if (r.ok) {
            const zones = await r.json();
            Object.entries(zones).forEach(([id, z]) => {
                searchIndex.push({
                    type: 'ZONE',
                    title: z.name,
                    subtitle: z.tagline || '',
                    text: z.description || '',
                    url: `zones.html?zone=${id}`
                });
            });
        }
    } catch (e) { /* skip */ }

    // Load transmissions
    try {
        const r = await fetch('transmissions.json');
        if (r.ok) {
            const trans = await r.json();
            trans.forEach(t => {
                searchIndex.push({
                    type: 'TRANSMISSION',
                    title: t.title,
                    subtitle: t.date,
                    text: t.excerpt + ' ' + (t.tags || []).join(' '),
                    url: t.url || `transmissions.html`
                });
            });
        }
    } catch (e) { /* skip */ }

    // Load command log entries
    try {
        const r = await fetch('command-log-entries.json');
        if (r.ok) {
            const entries = await r.json();
            entries.forEach(e => {
                searchIndex.push({
                    type: 'LOG',
                    title: e.title,
                    subtitle: e.date + ' // ' + e.type.toUpperCase(),
                    text: (e.text || []).join(' ') + ' ' + (e.transcript || ''),
                    url: 'command-log.html'
                });
            });
        }
    } catch (e) { /* skip */ }

    // Static pages
    searchIndex.push(
        { type: 'PAGE', title: 'ORIGIN FILE', subtitle: 'The Genesis of the QBU', text: 'origin genesis commander quantum body universe creation story', url: 'origin-file.html' },
        { type: 'PAGE', title: 'VISUAL ARCHIVES', subtitle: 'Evolution Logs, Media Vault, Inkternal Markings', text: 'drawings videos art sketches tattoos media gallery', url: 'visual-archives.html' },
        { type: 'PAGE', title: 'PHYSICAL RECORDS', subtitle: 'Merch, prints, services', text: 'shop store prints stickers journal commission worldbuilding', url: 'physical-records.html' },
        { type: 'PAGE', title: 'COMMAND LOG', subtitle: 'Raw creative diary', text: 'diary journal process audio reflection ritual poll', url: 'command-log.html' }
    );

    searchLoaded = true;
    console.log(`[SEARCH] Index built: ${searchIndex.length} entries`);
}

function toggleGlobalSearch(e) {
    e.preventDefault();
    const bar = document.getElementById('global-search-bar');
    if (bar.style.display === 'none') {
        bar.style.display = 'block';
        document.getElementById('global-search-input').focus();
        buildSearchIndex();
    } else {
        closeGlobalSearch();
    }
}

function closeGlobalSearch() {
    document.getElementById('global-search-bar').style.display = 'none';
    document.getElementById('global-search-input').value = '';
    document.getElementById('global-search-results').innerHTML = '';
}

function handleGlobalSearch(e) {
    if (e.key === 'Escape') { closeGlobalSearch(); return; }

    const query = e.target.value.toLowerCase().trim();
    const results = document.getElementById('global-search-results');

    if (query.length < 2) { results.innerHTML = ''; return; }

    const matches = searchIndex.filter(item => {
        const haystack = (item.title + ' ' + item.subtitle + ' ' + item.text).toLowerCase();
        return query.split(' ').every(word => haystack.includes(word));
    }).slice(0, 10);

    if (matches.length === 0) {
        results.innerHTML = '<div class="search-no-results">No signals found.</div>';
        return;
    }

    results.innerHTML = matches.map(m => `
        <a href="${m.url}" class="search-result-item">
            <span class="result-type">${m.type}</span>
            <span class="result-title">${highlightMatch(m.title, query)}</span>
            <span class="result-subtitle">${m.subtitle}</span>
        </a>
    `).join('');
}

function highlightMatch(text, query) {
    const words = query.split(' ');
    let result = text;
    words.forEach(word => {
        if (word.length < 2) return;
        const regex = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        result = result.replace(regex, '<mark>$1</mark>');
    });
    return result;
}

// Keyboard shortcut: Ctrl+K or Cmd+K to open search
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const bar = document.getElementById('global-search-bar');
        if (bar) {
            if (bar.style.display === 'none') {
                bar.style.display = 'block';
                document.getElementById('global-search-input').focus();
                buildSearchIndex();
            } else {
                closeGlobalSearch();
            }
        }
    }
});
