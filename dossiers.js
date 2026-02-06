// ============================================================
// DOSSIERS — Loads character data from characters.json
// ============================================================

let characters = {};
let currentClearance = localStorage.getItem('clearance') || 'guest';

// Load character data from JSON file
async function loadCharacterData() {
    try {
        const response = await fetch('characters.json');
        if (!response.ok) throw new Error('Failed to load characters.json');
        characters = await response.json();
        console.log(`[DOSSIERS] Loaded ${Object.keys(characters).length} character files.`);
    } catch (err) {
        console.error('[DOSSIERS] Error loading character data:', err);
        const content = document.getElementById('dossier-content');
        if (content) {
            content.innerHTML = `<div style="padding: 2rem; color: #FF0055; font-family: 'Courier New', monospace; text-align: center;">
                <p>\u26A0 CHARACTER DATABASE OFFLINE</p>
                <p style="font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-top: 1rem;">Could not load characters.json \u2014 check file location.</p>
            </div>`;
            content.style.display = 'block';
        }
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    await loadCharacterData();
    updateClearanceBadge();
    
    const urlParams = new URLSearchParams(window.location.search);
    const agentId = urlParams.get('agent');
    
    if (agentId && characters[agentId]) {
        openDossier(agentId);
    }
});

function updateClearanceBadge() {
    const badge = document.getElementById('clearance-badge');
    if (badge) {
        badge.textContent = currentClearance.toUpperCase();
        if (currentClearance === 'vibraline') {
            badge.classList.add('vibraline-tier');
        } else {
            badge.classList.remove('vibraline-tier');
        }
    }
}

function openDossier(agentId) {
    const character = characters[agentId];
    if (!character) { console.error('Character not found:', agentId); return; }
    
    document.querySelectorAll('.folder-tab').forEach(tab => tab.classList.remove('active'));
    const clickedTab = document.querySelector(`[data-agent="${agentId}"]`);
    if (clickedTab) clickedTab.classList.add('active');
    
    document.getElementById('empty-state').style.display = 'none';
    document.getElementById('dossier-content').style.display = 'block';
    
    if (!hasAccess(character.clearanceRequired)) {
        loadClassifiedDossier(character);
    } else {
        loadDossierContent(character);
    }
    
    document.getElementById('dossier-display').scrollTop = 0;
}

function loadClassifiedDossier(char) {
    const content = document.getElementById('dossier-content');
    content.innerHTML = `
        <div class="dossier-full classified-dossier">
            <div class="dossier-blur-content">
                <div class="dossier-full-header">
                    <div class="dossier-portrait-large"><div class="portrait-scan"></div></div>
                    <div class="dossier-header-info">
                        <div class="dossier-title-block">
                            <div class="dossier-emoji">${char.emoji}</div>
                            <h1 class="dossier-callsign">${char.callsign}</h1>
                        </div>
                        <div class="dossier-meta-grid">
                            <div class="meta-field"><span class="meta-value">\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588</span></div>
                            <div class="meta-field"><span class="meta-value">\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588</span></div>
                            <div class="meta-field"><span class="meta-value">\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588</span></div>
                            <div class="meta-field"><span class="meta-value">\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588</span></div>
                        </div>
                    </div>
                </div>
                <div class="dossier-body">
                    <div class="dossier-section"><p>\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588</p></div>
                </div>
            </div>
            <div class="clearance-overlay">
                <div class="clearance-content">
                    <div class="clearance-icon">\uD83D\uDD12</div>
                    <h2 class="clearance-title">CLASSIFIED DOSSIER</h2>
                    <p class="clearance-level">REQUIRED CLEARANCE: ${char.clearanceRequired.toUpperCase()}</p>
                    <p class="clearance-message">This personnel file is restricted. Upgrade your clearance level to access full dossier information.</p>
                    <button class="upgrade-btn" onclick="requestUpgrade()">
                        <span class="btn-icon">\u26A1</span>
                        REQUEST CLEARANCE UPGRADE
                    </button>
                    <p class="clearance-note">You will be directed to subscription options while remaining on this site</p>
                </div>
            </div>
        </div>
    `;
}

function requestUpgrade() {
    showNotification('Opening subscription options...', 'info');
}

// ============================================================
// MAIN DOSSIER RENDERER
// ============================================================

function loadDossierContent(char) {
    const content = document.getElementById('dossier-content');
    
    let html = `<div class="dossier-full">`;
    
    // ---- HEADER ----
    html += `
        <div class="dossier-full-header">
            <div class="dossier-portrait-large">
                <div class="portrait-scan"></div>
                <span class="portrait-status">VISUAL DATA PENDING</span>
            </div>
            <div class="dossier-header-info">
                <div class="dossier-title-block">
                    <div class="dossier-emoji">${char.emoji || ''}</div>
                    <h1 class="dossier-callsign">${char.callsign || 'UNKNOWN'}</h1>
                    <p class="dossier-designation">${char.designation || ''}</p>
                </div>
                <div class="dossier-meta-grid">
                    ${metaField('FILE STATUS', char.fileStatus)}
                    ${metaField('CLEARANCE REQUIRED', char.clearanceRequired)}
                    ${metaField('ETHNICITY', char.ethnicity)}
                    ${metaField('PRIMARY FACTION', char.primaryFaction)}
                    ${metaField('SECONDARY FACTION', char.secondaryFaction)}
                    ${metaField('RESONANCE CORE', char.resonanceCore)}
                    ${metaField('DOMINANT HAND', char.dominantHand)}
                    ${metaField('VICKY LEVEL', char.vickyLevel)}
                    ${metaField('WEAPON', char.weapon)}
                </div>
            </div>
        </div>
        <div class="dossier-body">
    `;
    
    // ---- PROFILE OVERVIEW ----
    if (char.profileOverview) {
        html += section('\uD83D\uDCCB', 'PROFILE OVERVIEW', 
            char.profileOverview.split('\n\n').map(p => `<p>${p}</p>`).join(''));
    }
    
    // ---- VISUAL SIGNATURE ----
    if (char.visualSignature && char.visualSignature.length > 0 && char.visualSignature[0] !== 'DATA PENDING') {
        html += section('\uD83D\uDC41\uFE0F', 'VISUAL SIGNATURE',
            `<ul>${char.visualSignature.map(v => `<li>${v}</li>`).join('')}</ul>`);
    }
    
    // ---- PERSONALITY VIBE ----
    if (char.personalityVibe && char.personalityVibe.length > 0 && char.personalityVibe[0] !== 'DATA PENDING') {
        html += section('\u2728', 'PERSONALITY VIBE',
            `<ul>${char.personalityVibe.map(v => `<li>${v}</li>`).join('')}</ul>`);
    }
    
    // ---- CATCHPHRASES ----
    if (char.catchphrases && char.catchphrases.length > 0 && char.catchphrases[0] !== 'DATA PENDING') {
        html += `
        <div class="dossier-section">
            <div class="section-header">
                <span class="section-icon">\uD83D\uDCAC</span>
                <h2 class="section-title-small">CATCHPHRASES</h2>
            </div>
            <div class="catchphrase-list">
                ${char.catchphrases.map(p => `<div class="catchphrase-item">${p}</div>`).join('')}
            </div>
        </div>`;
    }
    
    // ---- VICKY STATUS ----
    if (char.vickyStatus) {
        html += section('\u26A1', 'VICKY STATUS', `<p>${char.vickyStatus}</p>`);
    }
    
    // ---- RESONANCE RESPONSE PROFILE ----
    if (char.resonanceResponseProfile && char.resonanceResponseProfile.length > 0) {
        html += `
        <div class="dossier-section">
            <div class="section-header">
                <span class="section-icon">\uD83E\uDEC0</span>
                <h2 class="section-title-small">RESONANCE RESPONSE PROFILE</h2>
            </div>
            <div class="section-content">
                <p style="color: rgba(255,255,255,0.5); font-style: italic; margin-bottom: 1rem; font-size: 0.85rem; border-left: 2px solid var(--neon-pink); padding-left: 1rem;">Your body is the monitor. Every agent has a unique RRP\u2014physiological tells that signal alignment or misalignment.</p>
                ${char.resonanceResponseProfile.map(m => `
                <div style="background: rgba(255,0,85,0.05); border: 1px solid rgba(255,0,85,0.2); border-radius: 4px; margin-bottom: 0.75rem; overflow: hidden;">
                    <div style="background: rgba(255,0,85,0.1); padding: 0.6rem 1rem; border-bottom: 1px solid rgba(255,0,85,0.15); display: flex; align-items: center; gap: 0.5rem;">
                        <span>${m.icon || '\u26A0'}</span>
                        <span style="color: var(--neon-pink); font-family: 'Courier New', monospace; font-weight: bold; letter-spacing: 0.1rem; font-size: 0.85rem;">${m.name}</span>
                    </div>
                    <div style="padding: 0.8rem 1rem;">
                        ${rrpField('LOCATION', m.location)}
                        ${rrpField('TRIGGERS', m.triggers)}
                        ${rrpField('SIGNAL', m.symbolism)}
                        <div style="background: rgba(0,255,136,0.05); border: 1px solid rgba(0,255,136,0.15); padding: 0.6rem; border-radius: 3px; margin-top: 0.4rem; font-size: 0.8rem; color: rgba(255,255,255,0.7);">
                            <span style="color: var(--neon-green); font-family: 'Courier New', monospace; font-size: 0.7rem; display: block; margin-bottom: 0.15rem;">REPAIR PROTOCOL:</span>${m.treatment}
                        </div>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>`;
    }
    
    // ---- UNIVERSAL LAWS ----
    if (char.universalLaws && char.universalLaws.length > 0) {
        html += `
        <div class="dossier-section">
            <div class="section-header">
                <span class="section-icon">\u2696\uFE0F</span>
                <h2 class="section-title-small">UNIVERSAL LAWS OF THE QBU</h2>
            </div>
            <div class="section-content">
                ${char.universalLaws.map(law => `
                <div style="background: rgba(0,217,255,0.03); border: 1px solid rgba(0,217,255,0.15); padding: 1rem; border-radius: 4px; margin-bottom: 0.75rem;">
                    <div style="color: var(--neon-blue); font-family: 'Courier New', monospace; font-weight: bold; letter-spacing: 0.1rem; font-size: 0.85rem; margin-bottom: 0.4rem; text-transform: uppercase;">${law.name}</div>
                    <div style="color: rgba(255,255,255,0.8); font-size: 0.85rem; line-height: 1.6;">${law.description}</div>
                </div>
                `).join('')}
            </div>
        </div>`;
    }
    
    // ---- AGENT RANKING ----
    if (char.agentRanking && char.agentRanking.length > 0) {
        html += `
        <div class="dossier-section">
            <div class="section-header">
                <span class="section-icon">\uD83D\uDCCA</span>
                <h2 class="section-title-small">AGENT RANKING SYSTEM</h2>
            </div>
            <div class="section-content">
                <p style="color: rgba(255,255,255,0.5); font-style: italic; margin-bottom: 1rem; font-size: 0.85rem;">Built off how many layers of VICKY an agent has integrated.</p>
                ${char.agentRanking.map((tier, i) => `
                <div style="display: grid; grid-template-columns: 1.2fr 1fr 2fr; gap: 0.75rem; padding: 0.6rem 0.8rem; background: rgba(0,255,136,${0.02 + i * 0.012}); border: 1px solid rgba(0,255,136,${0.1 + i * 0.04}); border-radius: 3px; margin-bottom: 0.4rem; align-items: center;">
                    <span style="color: var(--neon-green); font-family: 'Courier New', monospace; font-weight: bold; font-size: 0.8rem;">${tier.rank}</span>
                    <span style="color: var(--neon-blue); font-family: 'Courier New', monospace; font-size: 0.7rem;">${tier.activation}</span>
                    <span style="color: rgba(255,255,255,0.7); font-size: 0.8rem;">${tier.description}</span>
                </div>
                `).join('')}
            </div>
        </div>`;
    }
    
    // ---- IDENTITY SYSTEM ----
    if (char.identitySystem && char.identitySystem.length > 0) {
        html += `
        <div class="dossier-section">
            <div class="section-header">
                <span class="section-icon">\uD83E\uDDEC</span>
                <h2 class="section-title-small">QBU IDENTITY SYSTEM</h2>
            </div>
            <div class="section-content">
                <div style="border: 1px solid rgba(0,217,255,0.2); border-radius: 4px; overflow: hidden;">
                    <div style="display: grid; grid-template-columns: 1fr 2fr 2fr; background: rgba(0,217,255,0.1); border-bottom: 1px solid rgba(0,217,255,0.2);">
                        <div style="padding: 0.6rem; color: var(--neon-blue); font-family: 'Courier New', monospace; font-weight: bold; font-size: 0.7rem;">LAYER</div>
                        <div style="padding: 0.6rem; color: var(--neon-blue); font-family: 'Courier New', monospace; font-weight: bold; font-size: 0.7rem;">ROLE</div>
                        <div style="padding: 0.6rem; color: var(--neon-blue); font-family: 'Courier New', monospace; font-weight: bold; font-size: 0.7rem;">EXAMPLE</div>
                    </div>
                    ${char.identitySystem.map(row => `
                    <div style="display: grid; grid-template-columns: 1fr 2fr 2fr; border-bottom: 1px solid rgba(0,217,255,0.08);">
                        <div style="padding: 0.6rem; color: var(--neon-green); font-family: 'Courier New', monospace; font-weight: bold; font-size: 0.8rem;">${row.layer}</div>
                        <div style="padding: 0.6rem; color: rgba(255,255,255,0.75); font-size: 0.8rem;">${row.role}</div>
                        <div style="padding: 0.6rem; color: rgba(255,255,255,0.5); font-style: italic; font-size: 0.8rem;">${row.example}</div>
                    </div>
                    `).join('')}
                </div>
            </div>
        </div>`;
    }
    
    // ---- FUSION CHART ----
    if (char.fusionChart && char.fusionChart.length > 0) {
        html += `
        <div class="dossier-section">
            <div class="section-header">
                <span class="section-icon">\u2697\uFE0F</span>
                <h2 class="section-title-small">QUANTUM CHEMISTRY FUSION CHART</h2>
            </div>
            <div class="section-content">
                <div style="border: 1px solid rgba(0,255,136,0.2); border-radius: 4px; overflow-x: auto;">
                    <div style="display: grid; grid-template-columns: 0.8fr 1.2fr 1.2fr 1.2fr; background: rgba(0,255,136,0.08); border-bottom: 2px solid rgba(0,255,136,0.2);">
                        <div style="padding: 0.6rem 0.4rem; color: var(--neon-blue); font-family: 'Courier New', monospace; font-weight: bold; font-size: 0.65rem; text-align: center;">TRAIT</div>
                        <div style="padding: 0.6rem 0.4rem; color: #C87533; font-family: 'Courier New', monospace; font-weight: bold; font-size: 0.65rem; text-align: center;">\uD83E\uDD40 CSH (COPPER)</div>
                        <div style="padding: 0.6rem 0.4rem; color: #C0C0C0; font-family: 'Courier New', monospace; font-weight: bold; font-size: 0.65rem; text-align: center;">\uD83E\uDE9E TQB (SILVER)</div>
                        <div style="padding: 0.6rem 0.4rem; color: var(--neon-green); font-family: 'Courier New', monospace; font-weight: bold; font-size: 0.65rem; text-align: center;">\uD83C\uDF1F FUSION</div>
                    </div>
                    ${char.fusionChart.map(row => `
                    <div style="display: grid; grid-template-columns: 0.8fr 1.2fr 1.2fr 1.2fr; border-bottom: 1px solid rgba(0,255,136,0.08);">
                        <div style="padding: 0.5rem 0.4rem; color: var(--neon-blue); font-family: 'Courier New', monospace; font-weight: bold; font-size: 0.65rem;">${row.aspect}</div>
                        <div style="padding: 0.5rem 0.4rem; font-size: 0.7rem; color: rgba(255,255,255,0.7); border-left: 2px solid rgba(200,117,51,0.3);">${row.csh}</div>
                        <div style="padding: 0.5rem 0.4rem; font-size: 0.7rem; color: rgba(255,255,255,0.7); border-left: 2px solid rgba(192,192,192,0.3);">${row.tqb}</div>
                        <div style="padding: 0.5rem 0.4rem; font-size: 0.7rem; color: var(--neon-green); font-weight: 500; border-left: 2px solid rgba(0,255,136,0.3);">${row.fusion}</div>
                    </div>
                    `).join('')}
                </div>
            </div>
        </div>`;
    }
    
    // ---- FUSION REQUIREMENTS ----
    if (char.fusionRequirements && char.fusionRequirements.length > 0) {
        html += `
        <div class="dossier-section">
            <div class="section-header">
                <span class="section-icon">\uD83D\uDD13</span>
                <h2 class="section-title-small">FUSION REQUIREMENTS</h2>
            </div>
            <div class="section-content">
                <p style="color: var(--neon-pink); font-style: italic; text-align: center; font-size: 0.95rem; margin-bottom: 1rem; padding: 0.6rem; border: 1px solid rgba(255,0,85,0.2); background: rgba(255,0,85,0.05); border-radius: 4px;">"You can't fuse if you're lying to yourself."</p>
                <ul>${char.fusionRequirements.map(r => `<li>${r}</li>`).join('')}</ul>
            </div>
        </div>`;
    }
    
    // ---- RELATIONSHIPS ----
    if (char.relationships && char.relationships.length > 0) {
        html += `
        <div class="dossier-section">
            <div class="section-header">
                <span class="section-icon">\uD83D\uDD17</span>
                <h2 class="section-title-small">KNOWN RELATIONSHIPS</h2>
            </div>
            <div class="relationship-grid">
                ${char.relationships.map(rel => `
                <div class="relationship-item" onclick="openDossier('${rel.agent}')">
                    <div class="relationship-avatar">${rel.agent.toUpperCase()}</div>
                    <div class="relationship-info">
                        <div class="relationship-name">${rel.name}</div>
                        <div class="relationship-type">${rel.type}</div>
                    </div>
                </div>
                `).join('')}
            </div>
        </div>`;
    }
    
    // ---- RELATED CONTENT ----
    if (char.relatedContent) {
        let rc = `<div class="dossier-section"><div class="section-header"><span class="section-icon">\uD83C\uDFA8</span><h2 class="section-title-small">RELATED CONTENT</h2></div>`;
        if (char.relatedContent.drawings && char.relatedContent.drawings.length > 0) {
            rc += `<div class="content-subsection"><h3 class="subsection-title">Recent Drawings</h3><div class="content-grid">
                ${char.relatedContent.drawings.map(d => `<a href="${d.url}" class="content-item" target="_blank"><div class="content-thumbnail"><span class="thumbnail-placeholder">\uD83D\uDDBC\uFE0F</span></div><span class="content-title">${d.title}</span></a>`).join('')}
            </div></div>`;
        }
        if (char.relatedContent.videos && char.relatedContent.videos.length > 0) {
            rc += `<div class="content-subsection"><h3 class="subsection-title">Recent Videos</h3><div class="content-grid">
                ${char.relatedContent.videos.map(v => `<a href="${v.url}" class="content-item" target="_blank"><div class="content-thumbnail"><span class="thumbnail-placeholder">\u25B6\uFE0F</span></div><span class="content-title">${v.title}</span></a>`).join('')}
            </div></div>`;
        }
        rc += `</div>`;
        html += rc;
    }
    
    html += `</div></div>`; // close dossier-body + dossier-full
    content.innerHTML = html;
}

// ============================================================
// HELPERS
// ============================================================

function metaField(label, value) {
    if (!value || value === 'N/A' || value === 'N/A - Organization' || value === 'N/A - System') return '';
    return `<div class="meta-field"><span class="meta-label">${label}</span><span class="meta-value">${String(value).toUpperCase()}</span></div>`;
}

function section(icon, title, innerHtml) {
    return `<div class="dossier-section"><div class="section-header"><span class="section-icon">${icon}</span><h2 class="section-title-small">${title}</h2></div><div class="section-content">${innerHtml}</div></div>`;
}

function rrpField(label, value) {
    return `<div style="margin-bottom: 0.4rem; font-size: 0.8rem; color: rgba(255,255,255,0.7);"><span style="color: var(--neon-blue); font-family: 'Courier New', monospace; font-size: 0.7rem; display: block; margin-bottom: 0.15rem;">${label}:</span>${value}</div>`;
}

function hasAccess(requiredClearance) {
    const levels = { 'guest': 0, 'observer': 1, 'initiate': 2, 'vibraline': 3 };
    return levels[currentClearance] >= levels[requiredClearance];
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; padding: 1rem 1.5rem;
        background: rgba(10, 14, 39, 0.95);
        border: 2px solid ${type === 'error' ? '#FF0055' : '#00D9FF'};
        color: ${type === 'error' ? '#FF0055' : '#00D9FF'};
        font-family: 'Courier New', monospace; font-size: 0.85rem; z-index: 10000;
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
