// ============================================================
// ZONES — Loads zone data from zones.json
// ============================================================

let zones = {};

async function loadZoneData() {
    try {
        const response = await fetch('zones.json');
        if (!response.ok) throw new Error('Failed to load zones.json');
        zones = await response.json();
        console.log(`[ZONES] Loaded ${Object.keys(zones).length} zone files.`);
    } catch (err) {
        console.error('[ZONES] Error loading zone data:', err);
    }
}

// ==============================
// TERRAIN ENGINE
// ==============================

let canvas, ctx;
let currentClearance = 'guest';

// Camera — static view (no scroll/pan)
const cameraZoom = 1.0;
const panX = 0;
const panY = 0;

// Hover
let hoveredZone = null;
let mouseCanvasX = 0;
let mouseCanvasY = 0;

// Animation
let pulsePhase = 0;

// ==============================
// INIT
// ==============================

document.addEventListener('DOMContentLoaded', async () => {
    await loadZoneData();
    updateClearanceBadge();
    checkZoneAccess();
    initTerrain();
    animate();
});

function updateClearanceBadge() {
    currentClearance = localStorage.getItem('clearance') || 'guest';
    const badge = document.getElementById('clearance-badge');
    const clearanceDisplay = document.getElementById('clearance-display');

    if (badge) {
        badge.textContent = currentClearance.toUpperCase();
        if (currentClearance === 'vibraline') badge.classList.add('vibraline-tier');
    }
    if (clearanceDisplay) clearanceDisplay.textContent = currentClearance.toUpperCase();
}

function checkZoneAccess() {
    const levels = { guest: 0, observer: 1, initiate: 2, vibraline: 3 };
    Object.values(zones).forEach(zone => {
        zone.accessible = levels[currentClearance] >= levels[zone.clearance];
    });
}

function initTerrain() {
    canvas = document.getElementById('terrain-canvas');
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Hover + Click only (no scroll/drag/pinch)
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', onMouseLeave);
    canvas.addEventListener('click', onCanvasClick);
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// ==============================
// INPUT
// ==============================



function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouseCanvasX = e.clientX - rect.left;
    mouseCanvasY = e.clientY - rect.top;
    checkHover(mouseCanvasX, mouseCanvasY);
}


function onMouseLeave() {
    canvas.style.cursor = '';
    setHoveredZone(null);
}



function onCanvasClick(e) {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    let closestZone = null;
    let closestDist = Infinity;

    Object.values(zones).forEach(zone => {
        if (zone.screenPos) {
            const dx = clickX - zone.screenPos.x;
            const dy = clickY - zone.screenPos.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const hitRadius = 35 * Math.max(cameraZoom, 0.6);

            if (distance < hitRadius && distance < closestDist) {
                closestDist = distance;
                closestZone = zone;
            }
        }
    });

    if (closestZone) {
        if (closestZone.accessible) {
            openZoneDetail(closestZone.id);
        } else {
            showAccessDenied(closestZone.name, closestZone.clearance);
        }
    }
}


// ==============================
// HOVER + INTEL PANEL
// ==============================

function checkHover(mx, my) {
    let closest = null;
    let closestDist = Infinity;

    Object.values(zones).forEach(zone => {
        if (zone.screenPos) {
            const dx = mx - zone.screenPos.x;
            const dy = my - zone.screenPos.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const radius = 40 * Math.max(cameraZoom, 0.6);

            if (dist < radius && dist < closestDist) {
                closestDist = dist;
                closest = zone;
            }
        }
    });

    setHoveredZone(closest);
}

function setHoveredZone(zone) {
    if (zone === hoveredZone) return;
    hoveredZone = zone;

    const panel = document.getElementById('zone-intel-panel');
    if (!panel) return;

    if (zone) {
        canvas.style.cursor = 'pointer';
        updateIntelPanel(zone);
        panel.classList.add('active');
    } else {
        canvas.style.cursor = '';
        panel.classList.remove('active');
    }
}

function updateIntelPanel(zone) {
    const panel = document.getElementById('zone-intel-panel');
    if (!panel || !zone) return;

    const colors = {
        guest: '#00D9FF',
        observer: '#00D9FF',
        initiate: '#00FFFF',
        vibraline: '#00FF88'
    };

    const labels = {
        guest: 'GUEST',
        observer: 'OBSERVER',
        initiate: 'INITIATE',
        vibraline: 'VIBRALINE'
    };

    const color = colors[zone.clearance] || '#00D9FF';

    panel.innerHTML = `
        <div class="intel-accent" style="background: ${color}"></div>
        <div class="intel-inner">
            <div class="intel-header">
                <span class="intel-icon">${zone.icon}</span>
                <span class="intel-designation">ZONE INTEL</span>
            </div>
            <div class="intel-name" style="color: ${color}">${zone.name}</div>
            <div class="intel-type">${zone.type}</div>
            <div class="intel-sep" style="border-color: ${color}"></div>
            <div class="intel-row">
                <span class="intel-label">CLEARANCE:</span>
                <span class="intel-value" style="color: ${color}">${labels[zone.clearance]}</span>
            </div>
            <div class="intel-tagline">"${zone.tagline}"</div>
            ${!zone.accessible
                ? '<div class="intel-status locked">âŠ˜ ACCESS RESTRICTED</div>'
                : '<div class="intel-status open">▸ CLICK TO ACCESS BRIEFING</div>'}
        </div>
    `;
}

// ==============================
// 3D PROJECTION — fixed isometric
// ==============================

function project3D(x, y, z, centerX, centerY) {
    // Rotate 180 degrees around Y axis
    x = -x;
    z = -z;

    const tilt = -0.35;
    const cosT = Math.cos(tilt);
    const sinT = Math.sin(tilt);

    const scale = 1.6 * cameraZoom;
    const perspective = 600;

    const projY = y * cosT - z * sinT;
    const projZ = y * sinT + z * cosT;
    const pFactor = perspective / (perspective + projZ);

    return {
        x: centerX + panX + x * pFactor * scale,
        y: centerY + panY - projY * pFactor * scale
    };
}

// ==============================
// RENDER LOOP
// ==============================

function animate() {
    pulsePhase += 0.02;
    renderTerrain();
    requestAnimationFrame(animate);
}

function renderTerrain() {
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#040710');
    bg.addColorStop(0.4, '#0a0e27');
    bg.addColorStop(1, '#0d1233');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2 + 80;

    drawGrid(cx, cy);

    // Sort by screen Y for painter's algorithm
    const sorted = Object.values(zones).map(zone => {
        const test = project3D(zone.position.x, 0, zone.position.z, cx, cy);
        return { zone, sortY: test.y };
    }).sort((a, b) => a.sortY - b.sortY);

    sorted.forEach(({ zone }) => drawMountain(zone, cx, cy));
    sorted.forEach(({ zone }) => drawZoneMarker(zone));
}

function drawGrid(cx, cy) {
    const gridSize = 50;
    const count = 12;

    ctx.lineWidth = 1;

    for (let i = -count; i <= count; i++) {
        const z = i * gridSize;
        // Fade grid lines based on distance from center
        const fade = 1 - Math.abs(i) / count;
        ctx.strokeStyle = `rgba(0, 217, 255, ${0.04 + fade * 0.04})`;

        const p1 = project3D(-count * gridSize, 0, z, cx, cy);
        const p2 = project3D(count * gridSize, 0, z, cx, cy);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        const x = i * gridSize;
        const p3 = project3D(x, 0, -count * gridSize, cx, cy);
        const p4 = project3D(x, 0, count * gridSize, cx, cy);
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.stroke();
    }
}

function drawMountain(zone, cx, cy) {
    const pos = zone.position;
    const h = pos.height;
    const isHov = hoveredZone && hoveredZone.id === zone.id;

    // Color
    let rgb, fillA;
    if (!zone.accessible) { rgb = '255,0,85'; fillA = 0.03; }
    else if (zone.clearance === 'guest') { rgb = '0,217,255'; fillA = 0.05; }
    else if (zone.clearance === 'observer') { rgb = '0,217,255'; fillA = 0.07; }
    else if (zone.clearance === 'initiate') { rgb = '0,255,255'; fillA = 0.07; }
    else { rgb = '0,255,136'; fillA = 0.07; }

    const pulse = isHov ? Math.sin(pulsePhase * 3) * 0.12 : 0;
    const strokeA = isHov ? 0.85 + pulse : 0.4;
    const fA = isHov ? fillA + 0.08 + pulse * 0.03 : fillA;

    if (isHov) {
        ctx.shadowColor = `rgba(${rgb}, 0.5)`;
        ctx.shadowBlur = 30 + pulse * 20;
    }

    ctx.strokeStyle = `rgba(${rgb}, ${strokeA})`;
    ctx.lineWidth = isHov ? 2.5 : 1.2;

    // Dispatch to unique structure
    switch (zone.id) {
        case 'null-zone':       drawNullZone(zone, cx, cy, rgb, fA, strokeA); break;
        case 'vibraline-hub':   drawVibralineHub(zone, cx, cy, rgb, fA, strokeA); break;
        case 'field-of-feels':  drawFieldOfFeels(zone, cx, cy, rgb, fA, strokeA); break;
        case 'earth-tiff':      drawEarthTiff(zone, cx, cy, rgb, fA, strokeA); break;
        case 'resonance-gauntlet': drawResonanceGauntlet(zone, cx, cy, rgb, fA, strokeA); break;
        case 'the-maw':         drawTheMaw(zone, cx, cy, rgb, fA, strokeA); break;
        case 'homelands':       drawHomelands(zone, cx, cy, rgb, fA, strokeA); break;
        case 'factions':        drawFactions(zone, cx, cy, rgb, fA, strokeA); break;
        default:                drawDefaultPyramid(zone, cx, cy, rgb, fA, strokeA); break;
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
}

// ---- HELPER: draw a filled+stroked polygon from projected points ----
function drawPoly(points, rgb, fA, strokeA, close = true) {
    if (points.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    if (close) ctx.closePath();
    ctx.fillStyle = `rgba(${rgb}, ${fA})`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${rgb}, ${strokeA})`;
    ctx.stroke();
}

// ---- HELPER: set hit/peak positions ----
function setZonePositions(zone, peak, basePoints) {
    let sumX = peak.x, sumY = peak.y;
    basePoints.forEach(p => { sumX += p.x; sumY += p.y; });
    const n = basePoints.length + 1;
    zone.screenPos = { x: sumX / n, y: sumY / n };
    zone.peakPos = { x: peak.x, y: peak.y };
}

// ==============================
// NULL ZONE — jagged crater / inverted pit with broken spikes
// ==============================
function drawNullZone(zone, cx, cy, rgb, fA, strokeA) {
    const pos = zone.position;
    const h = pos.height;
    const base = 40;

    // Outer rim points (raised jagged edge)
    const rimH = h * 0.35;
    const spikes = 8;
    const rimPts = [];
    for (let i = 0; i < spikes; i++) {
        const angle = (i / spikes) * Math.PI * 2;
        const r = base * (0.85 + Math.sin(i * 3.7) * 0.25);
        const spikeH = rimH * (0.6 + Math.sin(i * 2.3) * 0.4);
        rimPts.push(project3D(
            pos.x + Math.cos(angle) * r,
            spikeH,
            pos.z + Math.sin(angle) * r,
            cx, cy
        ));
    }

    // Inner pit (sunken center)
    const pitDepth = h * 0.15;
    const pit = project3D(pos.x, -pitDepth, pos.z, cx, cy);

    // Base ring
    const basePts = [];
    for (let i = 0; i < spikes; i++) {
        const angle = (i / spikes) * Math.PI * 2;
        const r = base;
        basePts.push(project3D(
            pos.x + Math.cos(angle) * r,
            0,
            pos.z + Math.sin(angle) * r,
            cx, cy
        ));
    }

    // Draw crater walls (rim to base triangles)
    for (let i = 0; i < spikes; i++) {
        const next = (i + 1) % spikes;
        drawPoly([basePts[i], basePts[next], rimPts[next], rimPts[i]], rgb, fA, strokeA);
        drawPoly([rimPts[i], rimPts[next], pit], rgb, fA * 1.5, strokeA);
    }

    // Glitch lines from pit
    const glitchA = strokeA * 0.3;
    ctx.strokeStyle = `rgba(${rgb}, ${glitchA})`;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + pulsePhase * 0.5;
        const r = base * 0.3;
        const gp = project3D(
            pos.x + Math.cos(angle) * r,
            -pitDepth * 0.5 + Math.sin(pulsePhase + i) * 5,
            pos.z + Math.sin(angle) * r,
            cx, cy
        );
        ctx.beginPath();
        ctx.moveTo(pit.x, pit.y);
        ctx.lineTo(gp.x, gp.y);
        ctx.stroke();
    }

    setZonePositions(zone, pit, rimPts);
    zone.peakPos = { x: pit.x, y: pit.y };
}

// ==============================
// VIBRALINE HUB — tall central spire with floating ring platforms
// ==============================
function drawVibralineHub(zone, cx, cy, rgb, fA, strokeA) {
    const pos = zone.position;
    const h = pos.height;
    const base = 28;

    const peak = project3D(pos.x, h * 1.2, pos.z, cx, cy);
    const sides = 6;
    const layers = [
        { y: 0, r: base },
        { y: h * 0.3, r: base * 0.7 },
        { y: h * 0.6, r: base * 0.45 },
        { y: h * 0.85, r: base * 0.2 }
    ];

    const layerPts = layers.map(l => {
        const pts = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2 + Math.PI / 6;
            pts.push(project3D(
                pos.x + Math.cos(angle) * l.r,
                l.y,
                pos.z + Math.sin(angle) * l.r,
                cx, cy
            ));
        }
        return pts;
    });

    for (let l = 0; l < layerPts.length - 1; l++) {
        for (let i = 0; i < sides; i++) {
            const next = (i + 1) % sides;
            drawPoly([layerPts[l][i], layerPts[l][next], layerPts[l+1][next], layerPts[l+1][i]], rgb, fA * (1 + l * 0.3), strokeA);
        }
    }

    const topLayer = layerPts[layerPts.length - 1];
    for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        drawPoly([topLayer[i], topLayer[next], peak], rgb, fA * 2, strokeA);
    }

    // Floating rings
    const ringLevels = [h * 0.35, h * 0.65];
    ringLevels.forEach((ry, ri) => {
        const ringR = base * (1.3 + ri * 0.2);
        const ringSegs = 12;
        const rotation = pulsePhase * (0.3 + ri * 0.2);
        ctx.strokeStyle = `rgba(${rgb}, ${strokeA * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= ringSegs; i++) {
            const angle = (i / ringSegs) * Math.PI * 2 + rotation;
            const p = project3D(
                pos.x + Math.cos(angle) * ringR,
                ry,
                pos.z + Math.sin(angle) * ringR,
                cx, cy
            );
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
    });

    setZonePositions(zone, peak, layerPts[0]);
}

// ==============================
// FIELD OF FEELS — organic dome with flowing wave ridges
// ==============================
function drawFieldOfFeels(zone, cx, cy, rgb, fA, strokeA) {
    const pos = zone.position;
    const h = pos.height;
    const base = 42;

    const peak = project3D(pos.x, h, pos.z, cx, cy);

    const rings = 5;
    const segs = 16;
    const ringData = [];

    for (let r = 0; r <= rings; r++) {
        const t = r / rings;
        const ringR = base * (1 - t * t);
        const ringY = h * Math.sin(t * Math.PI * 0.5);
        const pts = [];
        for (let i = 0; i < segs; i++) {
            const angle = (i / segs) * Math.PI * 2;
            const wobble = 1 + Math.sin(angle * 3 + t * 5) * 0.08;
            pts.push(project3D(
                pos.x + Math.cos(angle) * ringR * wobble,
                ringY,
                pos.z + Math.sin(angle) * ringR * wobble,
                cx, cy
            ));
        }
        ringData.push(pts);
    }

    for (let r = 0; r < rings; r++) {
        for (let i = 0; i < segs; i++) {
            const next = (i + 1) % segs;
            const layerFade = fA * (0.8 + r * 0.15);
            drawPoly([ringData[r][i], ringData[r][next], ringData[r+1][next], ringData[r+1][i]], rgb, layerFade, strokeA * 0.7);
        }
    }

    // Flowing wave lines
    ctx.strokeStyle = `rgba(${rgb}, ${strokeA * 0.25})`;
    ctx.lineWidth = 0.8;
    for (let w = 0; w < 3; w++) {
        ctx.beginPath();
        for (let i = 0; i <= 20; i++) {
            const t = i / 20;
            const angle = t * Math.PI * 2 + w * 2.1 + pulsePhase * 0.3;
            const r = base * (0.3 + t * 0.5);
            const wy = h * 0.3 + Math.sin(t * Math.PI) * h * 0.4;
            const p = project3D(
                pos.x + Math.cos(angle) * r,
                wy,
                pos.z + Math.sin(angle) * r,
                cx, cy
            );
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
    }

    setZonePositions(zone, peak, ringData[0]);
}

// ==============================
// EARTH: TIFF — cityscape cluster of rectangular buildings
// ==============================
function drawEarthTiff(zone, cx, cy, rgb, fA, strokeA) {
    const pos = zone.position;
    const h = pos.height;

    const buildings = [
        { dx: 0, dz: 0, w: 14, d: 14, bh: h * 1.0 },
        { dx: -20, dz: -8, w: 10, d: 10, bh: h * 0.7 },
        { dx: 18, dz: -5, w: 12, d: 10, bh: h * 0.85 },
        { dx: -8, dz: 18, w: 10, d: 12, bh: h * 0.55 },
        { dx: 15, dz: 16, w: 8, d: 8, bh: h * 0.45 },
        { dx: -18, dz: 12, w: 9, d: 9, bh: h * 0.6 },
    ];

    let highestPeak = null;
    let highestY = Infinity;
    const allBase = [];

    buildings.sort((a, b) => {
        const pa = project3D(pos.x + a.dx, 0, pos.z + a.dz, cx, cy);
        const pb = project3D(pos.x + b.dx, 0, pos.z + b.dz, cx, cy);
        return pa.y - pb.y;
    });

    buildings.forEach(b => {
        const hw = b.w / 2;
        const hd = b.d / 2;
        const bx = pos.x + b.dx;
        const bz = pos.z + b.dz;

        const top = [
            project3D(bx - hw, b.bh, bz - hd, cx, cy),
            project3D(bx + hw, b.bh, bz - hd, cx, cy),
            project3D(bx + hw, b.bh, bz + hd, cx, cy),
            project3D(bx - hw, b.bh, bz + hd, cx, cy),
        ];
        const bot = [
            project3D(bx - hw, 0, bz - hd, cx, cy),
            project3D(bx + hw, 0, bz - hd, cx, cy),
            project3D(bx + hw, 0, bz + hd, cx, cy),
            project3D(bx - hw, 0, bz + hd, cx, cy),
        ];

        allBase.push(...bot);

        drawPoly(top, rgb, fA * 1.5, strokeA);
        for (let i = 0; i < 4; i++) {
            const next = (i + 1) % 4;
            drawPoly([bot[i], bot[next], top[next], top[i]], rgb, fA * (0.8 + i * 0.15), strokeA * 0.8);
        }

        // Window lines
        ctx.strokeStyle = `rgba(${rgb}, ${strokeA * 0.15})`;
        ctx.lineWidth = 0.5;
        const floors = Math.floor(b.bh / 20);
        for (let f = 1; f <= floors; f++) {
            const fy = b.bh * (f / (floors + 1));
            const fl = project3D(bx - hw, fy, bz - hd, cx, cy);
            const fr = project3D(bx + hw, fy, bz - hd, cx, cy);
            ctx.beginPath();
            ctx.moveTo(fl.x, fl.y);
            ctx.lineTo(fr.x, fr.y);
            ctx.stroke();
        }

        const topCenter = project3D(bx, b.bh, bz, cx, cy);
        if (topCenter.y < highestY) {
            highestY = topCenter.y;
            highestPeak = topCenter;
        }
    });

    if (highestPeak) setZonePositions(zone, highestPeak, allBase.slice(0, 4));
}

// ==============================
// RESONANCE GAUNTLET — angular fortress / arena octagon
// ==============================
function drawResonanceGauntlet(zone, cx, cy, rgb, fA, strokeA) {
    const pos = zone.position;
    const h = pos.height;
    const base = 38;

    const sides = 8;
    const wallH = h * 0.4;
    const pillarH = h * 0.75;
    const innerR = base * 0.5;
    const outerR = base;

    const outerBase = [], outerWall = [], outerPillar = [];
    const innerBase = [], innerWall = [];

    for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 + Math.PI / 8;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        outerBase.push(project3D(pos.x + cos * outerR, 0, pos.z + sin * outerR, cx, cy));
        outerWall.push(project3D(pos.x + cos * outerR, wallH, pos.z + sin * outerR, cx, cy));
        outerPillar.push(project3D(pos.x + cos * outerR, pillarH, pos.z + sin * outerR, cx, cy));
        innerBase.push(project3D(pos.x + cos * innerR, 0, pos.z + sin * innerR, cx, cy));
        innerWall.push(project3D(pos.x + cos * innerR, wallH * 0.6, pos.z + sin * innerR, cx, cy));
    }

    for (let i = 0; i < sides; i++) {
        const next = (i + 1) % sides;
        drawPoly([outerBase[i], outerBase[next], outerWall[next], outerWall[i]], rgb, fA, strokeA);
    }

    drawPoly(outerWall, rgb, fA * 1.2, strokeA);

    for (let i = 0; i < sides; i += 2) {
        const angle = (i / sides) * Math.PI * 2 + Math.PI / 8;
        const px = pos.x + Math.cos(angle) * outerR;
        const pz = pos.z + Math.sin(angle) * outerR;
        const pt = project3D(px, pillarH, pz, cx, cy);
        const pb = project3D(px, wallH, pz, cx, cy);

        ctx.beginPath();
        ctx.moveTo(pb.x, pb.y);
        ctx.lineTo(pt.x, pt.y);
        ctx.strokeStyle = `rgba(${rgb}, ${strokeA})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb}, ${strokeA * 0.8})`;
        ctx.fill();
    }

    drawPoly(innerBase, rgb, fA * 0.5, strokeA * 0.4);

    ctx.strokeStyle = `rgba(${rgb}, ${strokeA * 0.3})`;
    ctx.lineWidth = 0.8;
    const crossSize = innerR * 0.6;
    for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2 + pulsePhase * 0.4;
        const from = project3D(pos.x, 2, pos.z, cx, cy);
        const to = project3D(pos.x + Math.cos(angle) * crossSize, 2, pos.z + Math.sin(angle) * crossSize, cx, cy);
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
    }

    const peakPt = project3D(pos.x, pillarH, pos.z, cx, cy);
    setZonePositions(zone, peakPt, outerBase);
}

// ==============================
// THE MAW — spiral vortex funnel
// ==============================
function drawTheMaw(zone, cx, cy, rgb, fA, strokeA) {
    const pos = zone.position;
    const h = pos.height;
    const base = 36;

    const rings = 6;
    const segs = 20;
    const ringData = [];

    for (let r = 0; r <= rings; r++) {
        const t = r / rings;
        const ringR = base * (1 - t * 0.85);
        const ringY = h * t * 0.8;
        const rotOffset = t * Math.PI * 1.5 + pulsePhase * 0.4;
        const pts = [];
        for (let i = 0; i < segs; i++) {
            const angle = (i / segs) * Math.PI * 2 + rotOffset;
            pts.push(project3D(
                pos.x + Math.cos(angle) * ringR,
                ringY,
                pos.z + Math.sin(angle) * ringR,
                cx, cy
            ));
        }
        ringData.push(pts);
    }

    for (let r = 0; r < rings; r++) {
        const layerFade = fA * (0.6 + r * 0.2);
        for (let i = 0; i < segs; i++) {
            const next = (i + 1) % segs;
            drawPoly([ringData[r][i], ringData[r][next], ringData[r+1][next], ringData[r+1][i]], rgb, layerFade, strokeA * 0.6);
        }
    }

    const spireBase = project3D(pos.x, h * 0.8, pos.z, cx, cy);
    const spirePeak = project3D(pos.x, h * 1.3, pos.z, cx, cy);
    ctx.strokeStyle = `rgba(${rgb}, ${strokeA})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(spireBase.x, spireBase.y);
    ctx.lineTo(spirePeak.x, spirePeak.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(spirePeak.x, spirePeak.y, 4 + Math.sin(pulsePhase * 2) * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb}, ${strokeA * 0.6})`;
    ctx.fill();

    setZonePositions(zone, spirePeak, ringData[0]);
}

// ==============================
// HOMELANDS — layered ziggurat / terraced pyramid
// ==============================
function drawHomelands(zone, cx, cy, rgb, fA, strokeA) {
    const pos = zone.position;
    const h = pos.height;
    const base = 40;

    const tiers = 5;
    const tierData = [];

    for (let t = 0; t <= tiers; t++) {
        const progress = t / tiers;
        const tierR = base * (1 - progress * 0.75);
        const tierY = h * progress;
        const pts = [
            project3D(pos.x - tierR, tierY, pos.z - tierR * 0.7, cx, cy),
            project3D(pos.x + tierR, tierY, pos.z - tierR * 0.7, cx, cy),
            project3D(pos.x + tierR, tierY, pos.z + tierR * 0.7, cx, cy),
            project3D(pos.x - tierR, tierY, pos.z + tierR * 0.7, cx, cy),
        ];
        tierData.push(pts);
    }

    for (let t = 0; t < tiers; t++) {
        const bot = tierData[t];
        const top = tierData[t + 1];
        const tierFade = fA * (0.7 + t * 0.2);

        drawPoly(top, rgb, tierFade * 1.3, strokeA);
        for (let i = 0; i < 4; i++) {
            const next = (i + 1) % 4;
            drawPoly([bot[i], bot[next], top[next], top[i]], rgb, tierFade, strokeA * 0.8);
        }
    }

    const topCenter = project3D(pos.x, h * 1.05, pos.z, cx, cy);
    ctx.beginPath();
    ctx.arc(topCenter.x, topCenter.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb}, ${strokeA * 0.7})`;
    ctx.fill();

    setZonePositions(zone, topCenter, tierData[0]);
}

// ==============================
// FACTIONS — multi-spire crown cluster
// ==============================
function drawFactions(zone, cx, cy, rgb, fA, strokeA) {
    const pos = zone.position;
    const h = pos.height;
    const base = 35;

    const platSides = 6;
    const platPts = [];
    const platH = h * 0.15;
    for (let i = 0; i < platSides; i++) {
        const angle = (i / platSides) * Math.PI * 2;
        platPts.push(project3D(pos.x + Math.cos(angle) * base, 0, pos.z + Math.sin(angle) * base, cx, cy));
    }
    const platTop = [];
    for (let i = 0; i < platSides; i++) {
        const angle = (i / platSides) * Math.PI * 2;
        platTop.push(project3D(pos.x + Math.cos(angle) * base, platH, pos.z + Math.sin(angle) * base, cx, cy));
    }

    for (let i = 0; i < platSides; i++) {
        const next = (i + 1) % platSides;
        drawPoly([platPts[i], platPts[next], platTop[next], platTop[i]], rgb, fA * 0.6, strokeA * 0.5);
    }
    drawPoly(platTop, rgb, fA * 0.8, strokeA * 0.5);

    const spires = [
        { dx: 0, dz: -18, sh: h * 1.1 },
        { dx: -16, dz: -6, sh: h * 0.8 },
        { dx: 16, dz: -6, sh: h * 0.85 },
        { dx: -12, dz: 12, sh: h * 0.65 },
        { dx: 12, dz: 12, sh: h * 0.7 },
        { dx: 0, dz: 5, sh: h * 0.9 },
    ];

    let highestPeak = null;
    let highestY = Infinity;

    spires.forEach((s, si) => {
        const sx = pos.x + s.dx;
        const sz = pos.z + s.dz;
        const sw = 5;

        const angles = [0, Math.PI * 2/3, Math.PI * 4/3];
        const baseRing = angles.map(a => project3D(sx + Math.cos(a) * sw, platH, sz + Math.sin(a) * sw, cx, cy));
        const tip = project3D(sx, s.sh, sz, cx, cy);

        for (let i = 0; i < 3; i++) {
            const next = (i + 1) % 3;
            drawPoly([baseRing[i], baseRing[next], tip], rgb, fA * (1 + si * 0.1), strokeA);
        }

        if (tip.y < highestY) {
            highestY = tip.y;
            highestPeak = tip;
        }
    });

    // Connecting energy lines between spire tips
    ctx.strokeStyle = `rgba(${rgb}, ${strokeA * 0.15})`;
    ctx.lineWidth = 0.6;
    for (let i = 0; i < spires.length; i++) {
        const next = (i + 1) % spires.length;
        const p1 = project3D(pos.x + spires[i].dx, spires[i].sh, pos.z + spires[i].dz, cx, cy);
        const p2 = project3D(pos.x + spires[next].dx, spires[next].sh, pos.z + spires[next].dz, cx, cy);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }

    if (highestPeak) setZonePositions(zone, highestPeak, platPts);
}

// ==============================
// DEFAULT FALLBACK — simple pyramid
// ==============================
function drawDefaultPyramid(zone, cx, cy, rgb, fA, strokeA) {
    const pos = zone.position;
    const h = pos.height;
    const base = 35;

    const peak = project3D(pos.x, h, pos.z, cx, cy);
    const b1 = project3D(pos.x - base, 0, pos.z - base, cx, cy);
    const b2 = project3D(pos.x + base, 0, pos.z - base, cx, cy);
    const b3 = project3D(pos.x + base, 0, pos.z + base, cx, cy);
    const b4 = project3D(pos.x - base, 0, pos.z + base, cx, cy);

    drawPoly([b1, b2, peak], rgb, fA, strokeA);
    drawPoly([b2, b3, peak], rgb, fA * 1.2, strokeA);
    drawPoly([b3, b4, peak], rgb, fA * 0.8, strokeA);
    drawPoly([b4, b1, peak], rgb, fA * 1.1, strokeA);

    setZonePositions(zone, peak, [b1, b2, b3, b4]);
}

function drawZoneMarker(zone) {
    if (!zone.peakPos) return;
    const isHov = hoveredZone && hoveredZone.id === zone.id;
    const px = zone.peakPos.x;
    const py = zone.peakPos.y;

    let dotColor;
    if (!zone.accessible) dotColor = 'rgba(255,0,85,0.7)';
    else if (zone.clearance === 'vibraline') dotColor = 'rgba(0,255,136,0.8)';
    else if (zone.clearance === 'initiate') dotColor = 'rgba(0,255,255,0.8)';
    else dotColor = 'rgba(0,217,255,0.7)';

    // Pulse ring on hover
    if (isHov) {
        const ringR = 14 + Math.sin(pulsePhase * 3) * 5;
        ctx.strokeStyle = dotColor;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py - 4, ringR, 0, Math.PI * 2);
        ctx.stroke();

        // Second outer ring
        const ringR2 = 22 + Math.sin(pulsePhase * 2 + 1) * 4;
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(px, py - 4, ringR2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // Dot
    const dotR = isHov ? 4.5 : 2.5;
    ctx.fillStyle = dotColor;
    ctx.beginPath();
    ctx.arc(px, py - 4, dotR, 0, Math.PI * 2);
    ctx.fill();

    // Label
    const fontSize = isHov ? 11 : 9;
    ctx.font = `${fontSize}px 'Courier New', monospace`;
    ctx.fillStyle = isHov ? dotColor : dotColor.replace(/[\d.]+\)$/, '0.45)');
    ctx.textAlign = 'center';
    const name = zone.name.length > 20 ? zone.name.substring(0, 18) + '…' : zone.name;
    ctx.fillText(name, px, py + 14);
}

// ==============================
// MODALS
// ==============================

function showAccessDenied(zoneName, requiredClearance) {
    const modal = document.getElementById('zone-modal');
    const content = document.getElementById('zone-detail-content');

    content.innerHTML = `
        <div class="zone-detail-header">
            <div class="zone-detail-icon">X</div>
            <h2 class="zone-detail-title">RESTRICTED ACCESS</h2>
            <p class="zone-detail-subtitle">"${zoneName}" requires ${requiredClearance.toUpperCase()} clearance.</p>
        </div>
        <div class="zone-detail-section">
            <div class="section-content">
                <p>Your current clearance level does not permit access to this zone's briefing materials.</p>
                <p>Upgrade your clearance through the Command Log to unlock deeper intelligence.</p>
            </div>
        </div>
    `;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function openZoneDetail(zoneId) {
    const zone = zones[zoneId];
    if (!zone) return;

    const modal = document.getElementById('zone-modal');
    const content = document.getElementById('zone-detail-content');

    let html = `
        <div class="zone-detail-header">
            <div class="zone-detail-icon">${zone.icon}</div>
            <h2 class="zone-detail-title">${zone.name}</h2>
            <p class="zone-detail-subtitle">${zone.tagline}</p>
            ${zone.aliases ? `<p class="zone-aliases">AKA: ${zone.aliases}</p>` : ''}
        </div>
        <div class="zone-detail-section">
            <h3 class="section-title">CORE IDENTITY</h3>
            <div class="section-content">
                ${zone.description.split('\n\n').map(p => `<p>${p}</p>`).join('')}
            </div>
        </div>
    `;

    if (zone.location) {
        html += `
            <div class="zone-detail-section">
                <h3 class="section-title">LOCATION</h3>
                <div class="section-content"><p>${zone.location}</p></div>
            </div>
        `;
    }

    if (zone.functions) {
        html += `
            <div class="zone-detail-section">
                <h3 class="section-title">PRIMARY FUNCTIONS</h3>
                <div class="zone-functions">
                    ${zone.functions.map(f => `<div class="function-item">${f}</div>`).join('')}
                </div>
            </div>
        `;
    }

    if (zone.homelands) {
        html += `
            <div class="zone-detail-section">
                <h3 class="section-title">HOMELANDS</h3>
                <div class="faction-grid">
                    ${zone.homelands.map(h => `
                        <div class="faction-item">
                            <div class="faction-name">${h.element} ${h.name}</div>
                            <div class="faction-essence">${h.essence}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    if (zone.factions) {
        html += `
            <div class="zone-detail-section">
                <h3 class="section-title">FACTIONS</h3>
                <div class="faction-grid">
                    ${zone.factions.map(f => `
                        <div class="faction-item">
                            <div class="faction-name">${f.icon} ${f.name}</div>
                            <div class="faction-essence">${f.essence}</div>
                            <div class="faction-homeland"><strong>Homeland:</strong> ${f.homeland}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    if (zone.primaryLaw) {
        html += `
            <div class="zone-detail-section">
                <h3 class="section-title">PRIMARY LAW</h3>
                <div class="section-content">
                    <p style="color: var(--neon-pink, #FF0055); font-style: italic; text-align: center; font-size: 1.1rem; padding: 1rem; border: 1px solid rgba(255,0,85,0.2); background: rgba(255,0,85,0.05); border-radius: 4px;">"${zone.primaryLaw}"</p>
                </div>
            </div>
        `;
    }

    if (zone.layers && zone.layers.length > 0) {
        html += `
            <div class="zone-detail-section">
                <h3 class="section-title">DEPTH LAYERS</h3>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    ${zone.layers.map((layer, i) => `
                        <div style="background: rgba(255,0,85,${0.02 + i * 0.02}); border: 1px solid rgba(255,0,85,${0.1 + i * 0.08}); padding: 1rem; border-radius: 4px; border-left: 3px solid rgba(255,0,85,${0.3 + i * 0.15});">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <span style="color: var(--neon-pink, #FF0055); font-family: 'Courier New', monospace; font-weight: bold; font-size: 0.9rem;">${layer.name}</span>
                                <span style="color: rgba(255,255,255,0.4); font-family: 'Courier New', monospace; font-size: 0.7rem; text-transform: uppercase;">${layer.depth}</span>
                            </div>
                            <p style="color: rgba(255,255,255,0.75); font-size: 0.85rem; line-height: 1.6; margin-bottom: 0.5rem;">${layer.description}</p>
                            <p style="color: rgba(255,0,85,0.7); font-size: 0.8rem; font-style: italic;">Inhabitants: ${layer.creatures}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    if (zone.tools && zone.tools.length > 0) {
        html += `
            <div class="zone-detail-section">
                <h3 class="section-title">TOOLS & TACTICS</h3>
                <div class="zone-functions">
                    ${zone.tools.map(t => `<div class="function-item"><strong style="color: var(--neon-blue, #00D9FF);">${t.name}:</strong> ${t.description}</div>`).join('')}
                </div>
            </div>
        `;
    }

    if (zone.survivalProtocol) {
        html += `
            <div class="zone-detail-section">
                <h3 class="section-title">SURVIVAL PROTOCOL</h3>
                <div class="section-content">
                    <p style="color: var(--neon-green, #00FF88); font-style: italic; text-align: center; font-size: 1rem; padding: 1rem; border: 1px solid rgba(0,255,136,0.2); background: rgba(0,255,136,0.05); border-radius: 4px;">"${zone.survivalProtocol}"</p>
                </div>
            </div>
        `;
    }

    content.innerHTML = html;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeZoneDetail() {
    document.getElementById('zone-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeZoneDetail();
});
