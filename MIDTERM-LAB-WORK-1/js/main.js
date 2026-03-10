/**
 * Main Application Logic
 * Handles data loading, graph computation, and UI interactions
 */

// Application state
const state = {
    graph: null,
    graphData: null,
    allPaths: {
        distance: null,
        time: null,
        fuel: null
    },
    activeMetrics: new Set(['distance', 'time', 'fuel']),
    currentFilter: 'none',
    network: null
};

/**
 * Initialize the application
 */
function init() {
    try {
        showLoading();
        hideError();

        // Load graph data from the embedded JS variable
        state.graphData = GRAPH_DATA;
        if (!state.graphData || state.graphData.length === 0) {
            throw new Error('No data found. Check js/data.js');
        }

        // Build graph from data
        buildGraph();

        // Compute all shortest paths for all metrics
        computeAllPaths();

        // Update UI
        updateStats();
        populateNodeFilter();

        // Hide loading, show stats & quick answer
        hideLoading();
        document.getElementById('stats').classList.remove('hidden');
        renderQuickAnswer();

        // Setup event listeners
        setupEventListeners();

    } catch (error) {
        console.error('Initialization error:', error);
        showError(error.message || 'Failed to load graph data.');
        hideLoading();
    }
}

/**
 * Build graph from loaded data
 */
function buildGraph() {
    state.graph = new Graph();

    for (const edge of state.graphData) {
        const from = edge.node_from || edge.from;
        const to = edge.node_to || edge.to;
        state.graph.addEdge(from, to, {
            distance: edge.distance,
            time: edge.time,
            fuel: edge.fuel
        });
    }
}

/**
 * Compute shortest paths for all metrics
 */
function computeAllPaths() {
    state.allPaths.distance = state.graph.computeAllPairsShortestPaths('distance');
    state.allPaths.time = state.graph.computeAllPairsShortestPaths('time');
    state.allPaths.fuel = state.graph.computeAllPairsShortestPaths('fuel');
}

/**
 * Update statistics display
 */
function updateStats() {
    const nodes = state.graph.getNodes();
    const totalPaths = nodes.length * (nodes.length - 1);
    document.getElementById('totalNodes').textContent = nodes.length;
    document.getElementById('totalEdges').textContent = state.graphData.length;
    document.getElementById('pathsComputed').textContent = totalPaths * 3;
}

/* ====================================================================
 *  QUICK ANSWER — Global best for each metric
 * ==================================================================== */

function getNodeFuelTotal(source) {
    var total = 0;
    var paths = state.allPaths['fuel'].get(source);
    if (!paths) return Infinity;
    for (var i = 0; i < paths.length; i++) {
        if (paths[i].reachable && paths[i].cost !== null) {
            total += paths[i].cost;
        } else {
            return Infinity;
        }
    }
    return total;
}

function renderQuickAnswer() {
    var metrics = ['distance', 'time', 'fuel'];
    var labelMap = { distance: 'bestDistance', time: 'bestTime', fuel: 'bestFuel' };
    var routeMap = { distance: 'bestDistanceRoute', time: 'bestTimeRoute', fuel: 'bestFuelRoute' };
    var explMap  = { distance: 'bestDistanceExplanation', time: 'bestTimeExplanation', fuel: 'bestFuelExplanation' };

    for (var m = 0; m < metrics.length; m++) {
        var metric = metrics[m];

        // Step 1: Compute totals for every source node
        var nodeTotals = [];  // { source, total, paths[] }
        state.allPaths[metric].forEach(function (paths, source) {
            var total = 0;
            var allReachable = true;
            for (var i = 0; i < paths.length; i++) {
                if (paths[i].reachable && paths[i].cost !== null) {
                    total += paths[i].cost;
                } else {
                    allReachable = false;
                }
            }
            if (allReachable) {
                nodeTotals.push({ source: source, total: total, paths: paths });
            }
        });

        // Step 2: Find minimum total
        var minTotal = Infinity;
        for (var i = 0; i < nodeTotals.length; i++) {
            if (nodeTotals[i].total < minTotal) minTotal = nodeTotals[i].total;
        }

        // Step 3: Gather all tied nodes
        var tied = [];
        for (var i = 0; i < nodeTotals.length; i++) {
            if (Math.abs(nodeTotals[i].total - minTotal) < 0.001) {
                tied.push(nodeTotals[i]);
            }
        }

        if (tied.length === 0) continue;

        // Step 4: Build explanation
        var explHtml = '<div class="explanation-title">📊 How we got this answer</div>';

        // Show all node totals as ranking
        nodeTotals.sort(function (a, b) { return a.total - b.total; });
        explHtml += '<div style="margin-bottom:6px">Total ' + metric + ' per source node:</div>';
        for (var i = 0; i < nodeTotals.length; i++) {
            var nt = nodeTotals[i];
            var isTied = Math.abs(nt.total - minTotal) < 0.001;
            explHtml += '<div style="padding-left:8px">' +
                (isTied ? '<span class="explanation-tied">★</span> ' : '&nbsp;&nbsp; ') +
                'Node ' + nt.source + ' = ' + nt.total.toFixed(2) +
                (isTied && tied.length > 1 ? ' <span class="explanation-tied">(tied)</span>' : '') +
                '</div>';
        }

        // Step 5: If tie, apply fuel tiebreaker
        var winner;
        if (tied.length > 1) {
            explHtml += '<div style="margin-top:8px"><strong>⚖️ Tiebreaker — Lowest total fuel usage:</strong></div>';
            var bestFuelTotal = Infinity;
            winner = tied[0];
            for (var i = 0; i < tied.length; i++) {
                var fuelTotal = getNodeFuelTotal(tied[i].source);
                explHtml += '<div style="padding-left:8px">Node ' + tied[i].source +
                    ' fuel total = ' + fuelTotal.toFixed(2) + '</div>';
                if (fuelTotal < bestFuelTotal) {
                    bestFuelTotal = fuelTotal;
                    winner = tied[i];
                }
            }
            explHtml += '<div style="margin-top:6px"><span class="explanation-winner">✅ Winner: Node ' +
                winner.source + '</span> (lower fuel usage of ' + bestFuelTotal.toFixed(2) + ')</div>';
        } else {
            winner = tied[0];
            explHtml += '<div style="margin-top:6px"><span class="explanation-winner">✅ Winner: Node ' +
                winner.source + '</span> (no tiebreaker needed)</div>';
        }

        // Step 6: Populate the card
        document.getElementById(labelMap[metric]).textContent = winner.total.toFixed(2);
        document.getElementById(explMap[metric]).innerHTML = explHtml;

        var routeHtml = '<span class="route-label">From Node ' + winner.source + ' to all others:</span>';
        for (var i = 0; i < winner.paths.length; i++) {
            var p = winner.paths[i];
            if (p.reachable) {
                routeHtml += '<span class="route-path">→ Node ' + p.destination +
                    ' (' + p.cost.toFixed(2) + '): ' +
                    p.path.join(' → ') + '</span>';
            }
        }
        document.getElementById(routeMap[metric]).innerHTML = routeHtml;
    }

    document.getElementById('quickAnswer').classList.remove('hidden');
}

/**
 * Populate node filter dropdown
 */
function populateNodeFilter() {
    const select = document.getElementById('nodeFilter');
    const nodes = state.graph.getNodes();

    select.innerHTML = '<option value="none">-- Select a Source Node --</option><option value="all">All Nodes</option>';

    for (const node of nodes) {
        const option = document.createElement('option');
        option.value = node;
        option.textContent = 'Node ' + node;
        select.appendChild(option);
    }
}

/* ====================================================================
 *  RENDER RESULTS
 * ==================================================================== */

function renderResults() {
    const resultsContainer = document.getElementById('results');
    const initialPrompt   = document.getElementById('initialPrompt');
    const vizContainer    = document.getElementById('visualization');

    // Nothing selected yet – show the prompt, hide everything else
    if (state.currentFilter === 'none') {
        resultsContainer.innerHTML = '';
        resultsContainer.classList.add('hidden');
        vizContainer.classList.add('hidden');
        initialPrompt.style.display = '';
        return;
    }

    // A node (or "all") was chosen
    initialPrompt.style.display = 'none';
    resultsContainer.classList.remove('hidden');
    resultsContainer.innerHTML = '';

    const nodes = state.graph.getNodes();
    const nodesToShow = state.currentFilter === 'all'
        ? nodes
        : [parseInt(state.currentFilter)];

    for (const sourceNode of nodesToShow) {
        resultsContainer.appendChild(createNodeCard(sourceNode));
    }

    // Draw or refresh the graph visualisation
    drawNetwork(nodesToShow.length === 1 ? nodesToShow[0] : null);
}

/* ====================================================================
 *  NODE CARD  (one card per source node)
 * ==================================================================== */

function createNodeCard(sourceNode) {
    const card = document.createElement('div');
    card.className = 'node-card';
    card.dataset.node = sourceNode;

    // Header
    const header = document.createElement('div');
    header.className = 'node-header';
    header.innerHTML =
        '<div class="node-icon">📍</div>' +
        '<h2 class="node-title">Source Node ' + sourceNode + '</h2>';
    card.appendChild(header);

    // Metric tabs
    card.appendChild(createMetricTabs(sourceNode));

    // Metric content sections (tables + totals)
    const metrics = ['distance', 'time', 'fuel'];
    for (const metric of metrics) {
        card.appendChild(createMetricContent(sourceNode, metric));
    }

    return card;
}

/* ====================================================================
 *  METRIC TABS
 * ==================================================================== */

function createMetricTabs(sourceNode) {
    const wrap = document.createElement('div');
    wrap.className = 'metric-tabs';

    const defs = [
        { name: 'distance', label: '📏 Distance' },
        { name: 'time',     label: '⏱️ Time'     },
        { name: 'fuel',     label: '⛽ Fuel'     }
    ];

    let firstVisible = true;
    for (const def of defs) {
        const btn = document.createElement('button');
        btn.className = 'metric-tab ' + def.name;
        btn.dataset.metric = def.name;
        btn.dataset.node   = sourceNode;
        btn.textContent    = def.label;

        if (!state.activeMetrics.has(def.name)) {
            btn.style.display = 'none';
        } else if (firstVisible) {
            btn.classList.add('active');
            firstVisible = false;
        }

        btn.addEventListener('click', function () {
            handleTabClick(sourceNode, def.name);
        });
        wrap.appendChild(btn);
    }
    return wrap;
}

/* ====================================================================
 *  METRIC CONTENT  (table + total row)
 * ==================================================================== */

function createMetricContent(sourceNode, metric) {
    const wrap = document.createElement('div');
    wrap.className = 'metric-content ' + metric;
    wrap.dataset.metric = metric;
    wrap.dataset.node   = sourceNode;

    // Show first visible metric by default
    const firstActive = Array.from(state.activeMetrics)[0];
    if (metric === firstActive) {
        wrap.classList.add('active');
    }

    if (!state.activeMetrics.has(metric)) return wrap;

    const paths = state.allPaths[metric].get(sourceNode);

    // -------- Table --------
    const table = document.createElement('table');
    table.className = 'paths-table';
    table.innerHTML =
        '<thead><tr>' +
        '<th>Destination</th>' +
        '<th>Shortest Path</th>' +
        '<th>Total Cost</th>' +
        '</tr></thead>';

    const tbody = document.createElement('tbody');
    let grandTotal = 0;
    let reachableCount = 0;

    for (const p of paths) {
        const tr = document.createElement('tr');

        // Destination
        const td1 = document.createElement('td');
        td1.innerHTML = '<span class="destination-node">Node ' + p.destination + '</span>';
        tr.appendChild(td1);

        // Path
        const td2 = document.createElement('td');
        if (p.reachable) {
            td2.innerHTML = '<span class="path-display">' +
                p.path.map(function (n) { return '<strong>' + n + '</strong>'; })
                       .join('<span class="path-arrow"> → </span>') +
                '</span>';
        } else {
            td2.innerHTML = '<span class="unreachable">No path available</span>';
        }
        tr.appendChild(td2);

        // Cost
        const td3 = document.createElement('td');
        if (p.reachable) {
            td3.innerHTML = '<span class="cost-badge ' + metric + '">' + p.cost.toFixed(2) + '</span>';
            grandTotal += p.cost;
            reachableCount++;
        } else {
            td3.innerHTML = '<span class="unreachable">∞</span>';
        }
        tr.appendChild(td3);

        tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    wrap.appendChild(table);

    // -------- Grand Total Banner --------
    var metricLabel = metric.charAt(0).toUpperCase() + metric.slice(1);
    var metricIcon  = metric === 'distance' ? '📏' : metric === 'time' ? '⏱️' : '⛽';

    const totalDiv = document.createElement('div');
    totalDiv.className = 'metric-summary ' + metric;
    totalDiv.innerHTML =
        '<div class="summary-left">' +
            '<span class="summary-icon">' + metricIcon + '</span>' +
            '<span class="summary-label">Total ' + metricLabel + '</span>' +
        '</div>' +
        '<div class="summary-right">' +
            '<span class="cost-badge ' + metric + '" style="font-size:1.15rem;">' +
                grandTotal.toFixed(2) +
            '</span>' +
            '<span class="summary-note">(' + reachableCount + ' reachable destinations)</span>' +
        '</div>';
    wrap.appendChild(totalDiv);

    return wrap;
}

/* ====================================================================
 *  TAB SWITCHING
 * ==================================================================== */

function handleTabClick(sourceNode, metric) {
    // Tabs
    document.querySelectorAll('.metric-tab[data-node="' + sourceNode + '"]').forEach(function (t) {
        t.classList.toggle('active', t.dataset.metric === metric);
    });
    // Content panels
    document.querySelectorAll('.metric-content[data-node="' + sourceNode + '"]').forEach(function (c) {
        c.classList.toggle('active', c.dataset.metric === metric);
    });
    // Update graph highlighting
    if (state.currentFilter !== 'none' && state.currentFilter !== 'all') {
        highlightPaths(parseInt(sourceNode), metric);
    }
}

/* ====================================================================
 *  VIS.JS GRAPH VISUALISATION
 * ==================================================================== */

function drawNetwork(highlightNode) {
    if (!state.graphData || typeof vis === 'undefined') return;
    document.getElementById('visualization').classList.remove('hidden');

    var nodesArr = [];
    state.graph.getNodes().forEach(function (n) {
        nodesArr.push({
            id: n,
            label: 'Node ' + n,
            color: {
                background: highlightNode === n ? '#EAD7D7' : '#B49FCC',
                border: highlightNode === n ? '#EAD7D7' : '#6D466B',
                highlight: { background: '#FFFFFF', border: '#B49FCC' }
            },
            font: { color: '#412234', size: 14, face: 'Inter, Segoe UI' },
            size: highlightNode === n ? 30 : 22,
            borderWidth: 2
        });
    });

    var edgesArr = [];
    state.graphData.forEach(function (e, i) {
        var from = e.node_from || e.from;
        var to   = e.node_to   || e.to;
        edgesArr.push({
            id: 'edge_' + i,
            from: from,
            to: to,
            label: 'D:' + e.distance + ' | T:' + e.time + ' | F:' + e.fuel,
            font: { align: 'horizontal', color: '#B49FCC', size: 10, strokeWidth: 0 },
            color: { color: 'rgba(180,159,204,0.3)', highlight: '#EAD7D7' },
            arrows: 'to',
            width: 1,
            smooth: { type: 'continuous' }
        });
    });

    var container = document.getElementById('network');
    var data = {
        nodes: new vis.DataSet(nodesArr),
        edges: new vis.DataSet(edgesArr)
    };
    var options = {
        physics: {
            enabled: true,
            barnesHut: {
                gravitationalConstant: -3000,
                centralGravity: 0.3,
                springLength: 180,
                springConstant: 0.04
            },
            stabilization: { iterations: 100 }
        },
        interaction: { hover: true, tooltipDelay: 200 }
    };

    if (state.network) state.network.destroy();
    state.network = new vis.Network(container, data, options);

    if (highlightNode != null) {
        var activeTab = document.querySelector('.metric-tab.active[data-node="' + highlightNode + '"]');
        var metric = activeTab ? activeTab.dataset.metric : 'distance';
        highlightPaths(highlightNode, metric);
    }
}

/**
 * Highlight shortest-path edges on the graph for a given source + metric
 */
function highlightPaths(sourceNode, metric) {
    if (!state.network || !state.allPaths[metric]) return;
    var paths = state.allPaths[metric].get(sourceNode);
    if (!paths) return;

    var activeEdges = {};
    paths.forEach(function (p) {
        if (p.reachable && p.path) {
            for (var i = 0; i < p.path.length - 1; i++) {
                activeEdges[p.path[i] + '-' + p.path[i + 1]] = true;
            }
        }
    });

    var colorMap = { distance: '#B49FCC', time: '#EAD7D7', fuel: '#FFFFFF' };
    var hColor = colorMap[metric] || '#B49FCC';

    var ds = state.network.body.data.edges;
    ds.get().forEach(function (edge) {
        var key = edge.from + '-' + edge.to;
        if (activeEdges[key]) {
            ds.update({ id: edge.id, color: { color: hColor }, width: 4,
                        font: { color: hColor, size: 12 } });
        } else {
            ds.update({ id: edge.id, color: { color: 'rgba(180,159,204,0.3)' }, width: 1,
                        font: { color: '#B49FCC', size: 10 } });
        }
    });
}

/* ====================================================================
 *  EVENT LISTENERS
 * ==================================================================== */

function setupEventListeners() {
    document.getElementById('nodeFilter').addEventListener('change', function (e) {
        state.currentFilter = e.target.value;
        renderResults();
    });

    document.querySelectorAll('.metric-toggle').forEach(function (toggle) {
        toggle.addEventListener('click', function () {
            var metric = toggle.dataset.metric;
            if (state.activeMetrics.has(metric)) {
                state.activeMetrics.delete(metric);
                toggle.classList.remove('active');
            } else {
                state.activeMetrics.add(metric);
                toggle.classList.add('active');
            }
            renderResults();
        });
    });
}

/* ====================================================================
 *  UI HELPERS
 * ==================================================================== */

function showLoading()  { document.getElementById('loading').classList.remove('hidden'); }
function hideLoading()  { document.getElementById('loading').classList.add('hidden'); }
function showError(msg) {
    document.getElementById('errorMessage').textContent = msg;
    document.getElementById('error').classList.remove('hidden');
}
function hideError() { document.getElementById('error').classList.add('hidden'); }

/* ====================================================================
 *  BOOT
 * ==================================================================== */
document.addEventListener('DOMContentLoaded', init);
