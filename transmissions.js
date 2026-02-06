// ============================================================
// TRANSMISSIONS — Loads from transmissions.json
// ============================================================

let transmissions = [];

async function loadTransmissions() {
    try {
        const response = await fetch('transmissions.json');
        if (!response.ok) throw new Error('Failed to load transmissions.json');
        transmissions = await response.json();
        console.log(`[TRANSMISSIONS] Loaded ${transmissions.length} transmissions.`);
    } catch (err) {
        console.error('[TRANSMISSIONS] Error:', err);
    }
}

// State
let currentClearance = localStorage.getItem('clearance') || 'guest';
let svg, simulation;
let showConnections = true;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    await loadTransmissions();
    updateClearanceBadge();
    setupControls();
    initializeNetwork();
    
    // Hide loading state after network loads
    setTimeout(() => {
        document.getElementById('loading-state').style.display = 'none';
    }, 1500);
});

function updateClearanceBadge() {
    const badge = document.getElementById('clearance-badge');
    if (badge) {
        badge.textContent = currentClearance.toUpperCase();
        if (currentClearance === 'vibraline') {
            badge.classList.add('vibraline-tier');
        }
    }
}

function setupControls() {
    const searchInput = document.getElementById('search-transmissions');
    const clearanceFilter = document.getElementById('filter-clearance');
    const sortBy = document.getElementById('sort-by');
    const resetBtn = document.getElementById('reset-view');
    const toggleConnections = document.getElementById('toggle-connections');
    
    searchInput.addEventListener('input', handleSearch);
    clearanceFilter.addEventListener('change', handleFilter);
    sortBy.addEventListener('change', handleSort);
    resetBtn.addEventListener('click', resetView);
    toggleConnections.addEventListener('click', toggleConnectionLines);
}

function initializeNetwork() {
    const container = document.getElementById('transmission-network');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Clear existing
    d3.select('#transmission-network').selectAll('*').remove();
    
    // Create SVG
    svg = d3.select('#transmission-network')
        .append('svg')
        .attr('width', width)
        .attr('height', height);
    
    // Add zoom behavior
    const g = svg.append('g');
    
    const zoom = d3.zoom()
        .scaleExtent([0.5, 3])
        .on('zoom', (event) => {
            g.attr('transform', event.transform);
        });
    
    svg.call(zoom);
    
    // Prepare data
    const nodes = transmissions.map(t => ({
        ...t,
        radius: Math.sqrt(t.views) / 5 + 15, // Size based on views
        accessible: hasAccess(t.clearance)
    }));
    
    const links = [];
    transmissions.forEach(t => {
        if (t.connections) {
            t.connections.forEach(targetId => {
                links.push({
                    source: t.id,
                    target: targetId,
                    value: 1
                });
            });
        }
    });
    
    // Create force simulation
    simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(d => d.radius + 10));
    
    // Draw links
    const link = g.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('class', 'network-link')
        .style('display', showConnections ? 'block' : 'none');
    
    // Draw nodes
    const node = g.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .attr('class', d => `network-node ${d.clearance}-node ${!d.accessible ? 'locked' : ''}`)
        .call(drag(simulation))
        .on('click', handleNodeClick)
        .on('mouseenter', handleNodeHover)
        .on('mouseleave', handleNodeLeave);
    
    // Node circles
    node.append('circle')
        .attr('r', d => d.radius)
        .attr('fill', d => getNodeColor(d.clearance, d.accessible));
    
    // Node labels (titles)
    node.append('text')
        .attr('class', 'node-label')
        .attr('dy', d => d.radius + 15)
        .text(d => d.title.length > 30 ? d.title.substring(0, 30) + '...' : d.title);
    
    // Update positions on tick
    simulation.on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y);
        
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });
}

function getNodeColor(clearance, accessible) {
    if (!accessible) return 'rgba(100, 100, 100, 0.3)';
    
    const colors = {
        'guest': 'rgba(0, 217, 255, 0.4)',
        'observer': 'rgba(0, 217, 255, 0.6)',
        'initiate': 'rgba(0, 255, 255, 0.6)',
        'vibraline': 'rgba(0, 255, 136, 0.6)'
    };
    return colors[clearance] || colors.guest;
}

function drag(simulation) {
    function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }
    
    function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }
    
    function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }
    
    return d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended);
}

function handleNodeClick(event, d) {
    event.stopPropagation();
    openArticleModal(d);
}

function handleNodeHover(event, d) {
    // Could add tooltip here
    d3.select(event.currentTarget)
        .select('circle')
        .transition()
        .duration(200)
        .attr('r', d.radius * 1.2);
}

function handleNodeLeave(event, d) {
    d3.select(event.currentTarget)
        .select('circle')
        .transition()
        .duration(200)
        .attr('r', d.radius);
}

function openArticleModal(article) {
    const modal = document.getElementById('article-modal');
    const modalBody = document.getElementById('modal-body');
    
    if (!article.accessible) {
        // Show locked content
        modalBody.innerHTML = `
            <div class="locked-modal-content">
                <div class="locked-icon">🔒</div>
                <h2 class="locked-title">RESTRICTED TRANSMISSION</h2>
                <p class="locked-message">This transmission requires ${article.clearance.toUpperCase()} clearance level or higher.</p>
                <a href="https://yoursubstack.com/subscribe" class="upgrade-button" target="_blank">
                    UPGRADE CLEARANCE
                </a>
            </div>
        `;
    } else {
        // Embed the full article in an iframe
        modalBody.innerHTML = `
            <div class="embedded-article">
                <div class="article-header">
                    <h2 class="modal-article-title">${article.title}</h2>
                    <div class="modal-article-meta">
                        <span>Published: ${article.date}</span> | 
                        <span>${article.views} views</span> | 
                        <span>Clearance: ${article.clearance.toUpperCase()}</span>
                    </div>
                </div>
                <iframe 
                    src="${article.url}" 
                    class="article-iframe"
                    frameborder="0"
                    scrolling="yes"
                    loading="lazy"
                ></iframe>
                <div class="article-footer">
                    <a href="${article.url}" class="open-external" target="_blank">
                        ↗ OPEN IN NEW TAB
                    </a>
                </div>
            </div>
        `;
    }
    
    modal.style.display = 'flex';
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

function closeArticleModal() {
    document.getElementById('article-modal').style.display = 'none';
    // Re-enable body scroll
    document.body.style.overflow = 'auto';
}

function hasAccess(requiredClearance) {
    const levels = {
        'guest': 0,
        'observer': 1,
        'initiate': 2,
        'vibraline': 3
    };
    return levels[currentClearance] >= levels[requiredClearance];
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    
    d3.selectAll('.network-node')
        .style('opacity', function(d) {
            if (!searchTerm) return 1;
            const matches = d.title.toLowerCase().includes(searchTerm) ||
                          d.tags.some(tag => tag.toLowerCase().includes(searchTerm));
            return matches ? 1 : 0.2;
        });
}

function handleFilter(e) {
    const filterLevel = e.target.value;
    
    d3.selectAll('.network-node')
        .style('opacity', function(d) {
            if (filterLevel === 'all') return 1;
            return d.clearance === filterLevel ? 1 : 0.2;
        });
}

function handleSort(e) {
    const sortBy = e.target.value;
    // This would re-arrange nodes based on sort criteria
    // For now, just log it
    console.log('Sorting by:', sortBy);
}

function resetView() {
    // Reset zoom
    d3.select('#transmission-network svg')
        .transition()
        .duration(750)
        .call(d3.zoom().transform, d3.zoomIdentity);
    
    // Reset opacity
    d3.selectAll('.network-node').style('opacity', 1);
    
    // Clear search
    document.getElementById('search-transmissions').value = '';
    document.getElementById('filter-clearance').value = 'all';
}

function toggleConnectionLines() {
    showConnections = !showConnections;
    const btn = document.getElementById('toggle-connections');
    
    d3.selectAll('.network-link')
        .style('display', showConnections ? 'block' : 'none');
    
    if (showConnections) {
        btn.classList.add('active');
        btn.textContent = 'SHOW CONNECTIONS';
    } else {
        btn.classList.remove('active');
        btn.textContent = 'HIDE CONNECTIONS';
    }
}

// Close modal when clicking outside
document.getElementById('article-modal')?.addEventListener('click', function(e) {
    if (e.target === this) {
        closeArticleModal();
    }
});

// Resize handler
window.addEventListener('resize', () => {
    initializeNetwork();
});
