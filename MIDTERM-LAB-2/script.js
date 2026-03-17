/* global vis, Chart */

const DEFAULT_CSV_PATH = "dataset.csv";

/** @typedef {{from:string,to:string,distance:number,time:number,fuel:number}} Edge */

let appState = {
	baseEdges: /** @type {Edge[]} */ ([]),
	nodes: [],
	edges: /** @type {Edge[]} */ ([]),
	edgeById: new Map(),
	useBidirectionalEdges: true,
	vis: {
		network: null,
		nodesDS: null,
		edgesDS: null,
	},
	chart: null,
};

function $(id) {
	return document.getElementById(id);
}

function setStatus(message, kind = "") {
	const el = $("status");
	el.textContent = message;
	el.className = "status" + (kind ? ` ${kind}` : "");
}

function getCssVar(name) {
	return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function normalizeHeader(h) {
	return h.trim().toLowerCase();
}

function parseCsv(text) {
	const lines = text
		.replace(/\r\n/g, "\n")
		.replace(/\r/g, "\n")
		.split("\n")
		.map((l) => l.trim())
		.filter((l) => l.length > 0);

	if (lines.length < 2) {
		throw new Error("CSV has no data rows.");
	}

	// Simple CSV parsing: supports quoted fields minimally.
	const parseLine = (line) => {
		const out = [];
		let cur = "";
		let inQuotes = false;
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (ch === '"') {
				if (inQuotes && line[i + 1] === '"') {
					cur += '"';
					i++;
				} else {
					inQuotes = !inQuotes;
				}
				continue;
			}
			if (ch === "," && !inQuotes) {
				out.push(cur.trim());
				cur = "";
				continue;
			}
			cur += ch;
		}
		out.push(cur.trim());
		return out;
	};

	const headers = parseLine(lines[0]).map(normalizeHeader);
	const idx = (name) => headers.indexOf(normalizeHeader(name));

	const fromIdx = idx("From Node");
	const toIdx = idx("To Node");
	const distIdx = idx("Distance (km)");
	const timeIdx = idx("Time (mins)");
	const fuelIdx = idx("Fuel (Liters)");

	if ([fromIdx, toIdx, distIdx, timeIdx, fuelIdx].some((i) => i < 0)) {
		throw new Error(
			"CSV headers must include: From Node, To Node, Distance (km), Time (mins), Fuel (Liters)"
		);
	}

	/** @type {Edge[]} */
	const edges = [];
	for (let r = 1; r < lines.length; r++) {
		const cols = parseLine(lines[r]);
		const from = (cols[fromIdx] ?? "").trim();
		const to = (cols[toIdx] ?? "").trim();
		const distance = Number.parseFloat(cols[distIdx]);
		const time = Number.parseFloat(cols[timeIdx]);
		const fuel = Number.parseFloat(cols[fuelIdx]);

		if (!from || !to) continue;
		if (![distance, time, fuel].every((v) => Number.isFinite(v) && v >= 0)) continue;

		edges.push({ from, to, distance, time, fuel });
	}

	if (edges.length === 0) {
		throw new Error("No valid rows parsed from CSV.");
	}

	return edges;
}

function buildGraph(edges) {
	const nodeSet = new Set();
	for (const e of edges) {
		nodeSet.add(e.from);
		nodeSet.add(e.to);
	}
	const nodes = Array.from(nodeSet).sort((a, b) => a.localeCompare(b));

	/** @type {Map<string, Edge[]>} */
	const adj = new Map();
	for (const n of nodes) adj.set(n, []);
	for (const e of edges) {
		if (!adj.has(e.from)) adj.set(e.from, []);
		adj.get(e.from).push(e);
	}

	return { nodes, edges, adj };
}

class MinHeap {
	constructor() {
		this.a = [];
	}
	size() {
		return this.a.length;
	}
	push(item) {
		this.a.push(item);
		this.#up(this.a.length - 1);
	}
	pop() {
		if (this.a.length === 0) return null;
		const top = this.a[0];
		const last = this.a.pop();
		if (this.a.length > 0) {
			this.a[0] = last;
			this.#down(0);
		}
		return top;
	}
	#up(i) {
		while (i > 0) {
			const p = (i - 1) >> 1;
			if (this.a[p].key <= this.a[i].key) break;
			[this.a[p], this.a[i]] = [this.a[i], this.a[p]];
			i = p;
		}
	}
	#down(i) {
		const n = this.a.length;
		while (true) {
			const l = i * 2 + 1;
			const r = l + 1;
			let m = i;
			if (l < n && this.a[l].key < this.a[m].key) m = l;
			if (r < n && this.a[r].key < this.a[m].key) m = r;
			if (m === i) break;
			[this.a[m], this.a[i]] = [this.a[i], this.a[m]];
			i = m;
		}
	}
}

function dijkstra(adj, start, end, weightKey) {
	/** @type {Map<string, number>} */
	const dist = new Map();
	/** @type {Map<string, {prev:string, edge:Edge} | null>} */
	const prev = new Map();

	for (const node of adj.keys()) {
		dist.set(node, Number.POSITIVE_INFINITY);
		prev.set(node, null);
	}
	dist.set(start, 0);

	const heap = new MinHeap();
	heap.push({ key: 0, node: start });

	while (heap.size() > 0) {
		const cur = heap.pop();
		if (!cur) break;
		const { key: d, node } = cur;
		if (d !== dist.get(node)) continue;
		if (node === end) break;

		const edges = adj.get(node) ?? [];
		for (const e of edges) {
			const w = e[weightKey];
			const nd = d + w;
			if (nd < dist.get(e.to)) {
				dist.set(e.to, nd);
				prev.set(e.to, { prev: node, edge: e });
				heap.push({ key: nd, node: e.to });
			}
		}
	}

	if (!Number.isFinite(dist.get(end))) {
		return { found: false, pathNodes: [], pathEdges: [], totals: null };
	}

	const pathNodes = [];
	const pathEdges = [];
	let cur = end;
	while (cur !== start) {
		const p = prev.get(cur);
		if (!p) break;
		pathNodes.push(cur);
		pathEdges.push(p.edge);
		cur = p.prev;
	}
	pathNodes.push(start);
	pathNodes.reverse();
	pathEdges.reverse();

	const totals = pathEdges.reduce(
		(acc, e) => {
			acc.distance += e.distance;
			acc.time += e.time;
			acc.fuel += e.fuel;
			return acc;
		},
		{ distance: 0, time: 0, fuel: 0 }
	);

	return { found: true, pathNodes, pathEdges, totals };
}

function edgeId(e) {
	// Use a stable id per directed edge.
	return `${e.from}→${e.to}`;
}

function dedupeDirectedEdges(edges) {
	/** @type {Map<string, Edge>} */
	const byKey = new Map();
	for (const e of edges) {
		const key = edgeId(e);
		if (!byKey.has(key)) byKey.set(key, e);
	}
	return Array.from(byKey.values());
}

function makeBidirectionalEdges(baseEdges) {
	const deduped = dedupeDirectedEdges(baseEdges);
	/** @type {Map<string, Edge>} */
	const byKey = new Map();
	for (const e of deduped) {
		byKey.set(edgeId(e), e);
	}
	for (const e of deduped) {
		const rev = { from: e.to, to: e.from, distance: e.distance, time: e.time, fuel: e.fuel };
		const key = edgeId(rev);
		if (!byKey.has(key)) byKey.set(key, rev);
	}
	return Array.from(byKey.values());
}

function syncBidirectionalButton() {
	const btn = $("bidirectionalBtn");
	if (!btn) return;
	btn.textContent = `Bidirectional edges: ${appState.useBidirectionalEdges ? "On" : "Off"}`;
	btn.classList.toggle("secondary", !appState.useBidirectionalEdges);
}

function renderNetwork(nodes, edges) {
	const accent = getCssVar("--accent") || "#7c9cff";
	const muted = getCssVar("--muted") || "rgba(255,255,255,0.72)";
	const text = getCssVar("--text") || "rgba(255,255,255,0.92)";

	// Cleanly replace any previous network instance.
	if (appState.vis.network && typeof appState.vis.network.destroy === "function") {
		appState.vis.network.destroy();
	}
	appState.edgeById = new Map();

	const nodesDS = new vis.DataSet(
		nodes.map((id) => ({
			id,
			label: id,
			font: { color: text, face: "system-ui", size: 14 },
			color: {
				background: "rgba(255,255,255,0.10)",
				border: "rgba(255,255,255,0.24)",
				highlight: { background: accent, border: "rgba(255,255,255,0.55)" },
			},
		}))
	);

	// Store original styling so reset is easy.
	const baseEdgeColor = "rgba(255,255,255,0.28)";
	const edgesDS = new vis.DataSet(
		edges.map((e) => {
			const id = edgeId(e);
			appState.edgeById.set(id, e);
			const title =
				`<b>${e.from} → ${e.to}</b><br/>` +
				`Distance: ${e.distance} km<br/>` +
				`Time: ${e.time} mins<br/>` +
				`Fuel: ${e.fuel} Liters`;
			return {
				id,
				from: e.from,
				to: e.to,
				arrows: { to: { enabled: true, scaleFactor: 0.7 } },
				label: `${e.distance} km`,
				font: { color: muted, size: 11, face: "system-ui", strokeWidth: 0 },
				title,
				color: { color: baseEdgeColor },
				width: 1,
				smooth: { type: "dynamic" },
			};
		})
	);

	const container = $("network");
	const data = { nodes: nodesDS, edges: edgesDS };
	const options = {
		interaction: {
			hover: true,
			tooltipDelay: 80,
		},
		physics: {
			enabled: true,
			stabilization: { iterations: 110 },
			barnesHut: {
				gravitationalConstant: -4500,
				centralGravity: 0.15,
				springLength: 135,
				springConstant: 0.05,
				damping: 0.32,
				avoidOverlap: 0.35,
			},
		},
		edges: {
			selectionWidth: 2,
			hoverWidth: 1.5,
		},
	};

	const network = new vis.Network(container, data, options);
	appState.vis = { network, nodesDS, edgesDS };
}

function resetHighlight() {
	const accent = getCssVar("--accent") || "#7c9cff";
	const baseEdgeColor = "rgba(255,255,255,0.28)";

	if (appState.vis.edgesDS) {
		const updates = appState.vis.edgesDS.get().map((e) => ({
			id: e.id,
			width: 1,
			color: { color: baseEdgeColor },
			dashes: false,
		}));
		appState.vis.edgesDS.update(updates);
	}

	if (appState.vis.nodesDS) {
		const updates = appState.vis.nodesDS.get().map((n) => ({
			id: n.id,
			borderWidth: 1,
			color: {
				...(n.color ?? {}),
				highlight: { background: accent, border: "rgba(255,255,255,0.55)" },
			},
		}));
		appState.vis.nodesDS.update(updates);
	}
}

function highlightPath(pathNodes, pathEdges) {
	resetHighlight();
	const accent = getCssVar("--accent") || "#7c9cff";

	if (appState.vis.edgesDS) {
		const updates = pathEdges.map((e) => ({
			id: edgeId(e),
			width: 4,
			color: { color: accent },
		}));
		appState.vis.edgesDS.update(updates);
	}

	if (appState.vis.nodesDS) {
		const updates = pathNodes.map((id) => ({ id, borderWidth: 3 }));
		appState.vis.nodesDS.update(updates);
	}
}

function formatTotals(t) {
	const d = t.distance.toFixed(2).replace(/\.00$/, "");
	const time = t.time.toFixed(2).replace(/\.00$/, "");
	const fuel = t.fuel.toFixed(2).replace(/\.00$/, "");
	return `Total Distance: ${d} km\nTotal Time: ${time} mins\nTotal Fuel: ${fuel} Liters`;
}

function setSummary(nodesCount, edgesCount) {
	$("summaryPill").textContent = `${nodesCount} nodes • ${edgesCount} routes`;
}

function populateNodeSelects(nodes) {
	const start = $("startNode");
	const end = $("endNode");
	start.innerHTML = "";
	end.innerHTML = "";

	for (const n of nodes) {
		const o1 = document.createElement("option");
		o1.value = n;
		o1.textContent = n;
		start.appendChild(o1);

		const o2 = document.createElement("option");
		o2.value = n;
		o2.textContent = n;
		end.appendChild(o2);
	}

	// Choose a reasonable default.
	start.value = nodes[0];
	end.value = nodes[nodes.length - 1];
}

function enableControls(enabled) {
	for (const id of [
		"startNode",
		"endNode",
		"metric",
		"computeBtn",
		"resetBtn",
		"bidirectionalBtn",
	]) {
		$(id).disabled = !enabled;
	}
}

function updateResultsText(metric, start, end, result) {
	const box = $("resultText");
	if (!result.found) {
		box.textContent = `No path found from ${start} to ${end} (${appState.useBidirectionalEdges ? "bidirectional" : "directed"} routes).`;
		return;
	}

	const metricLabel =
		metric === "distance" ? "Distance" : metric === "time" ? "Time" : "Fuel";
	const path = result.pathNodes.join(" → ");
	box.textContent =
		`Shortest Path from ${start} to ${end} (optimize: ${metricLabel})\n` +
		`Path: ${path}\n` +
		formatTotals(result.totals);
}

function buildOrUpdateChart(start, end, graphAdj) {
	const metrics = [
		{ key: "distance", label: "Optimize Distance", colorVar: "--accent" },
		{ key: "time", label: "Optimize Time", colorVar: "--ok" },
		{ key: "fuel", label: "Optimize Fuel", colorVar: "--danger" },
	];

	const rows = metrics.map((m) => {
		const res = dijkstra(graphAdj, start, end, m.key);
		return {
			metric: m,
			found: res.found,
			totals: res.totals ?? { distance: NaN, time: NaN, fuel: NaN },
		};
	});

	const labels = rows.map((r) => r.metric.label);

	// Visualize the *total values* for each optimized route.
	const data = {
		labels,
		datasets: [
			{
				label: "Total Distance (km)",
				data: rows.map((r) => (r.found ? r.totals.distance : null)),
				backgroundColor: "rgba(124,156,255,0.35)",
				borderColor: "rgba(124,156,255,0.85)",
				borderWidth: 1,
			},
			{
				label: "Total Time (mins)",
				data: rows.map((r) => (r.found ? r.totals.time : null)),
				backgroundColor: "rgba(45,212,191,0.30)",
				borderColor: "rgba(45,212,191,0.85)",
				borderWidth: 1,
			},
			{
				label: "Total Fuel (L)",
				data: rows.map((r) => (r.found ? r.totals.fuel : null)),
				backgroundColor: "rgba(255,107,107,0.25)",
				borderColor: "rgba(255,107,107,0.85)",
				borderWidth: 1,
			},
		],
	};

	const ctx = $("compareChart");
	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { labels: { color: getCssVar("--muted") || "rgba(255,255,255,0.72)" } },
			tooltip: {
				callbacks: {
					afterBody: (items) => {
						const idx = items?.[0]?.dataIndex;
						if (idx == null) return "";
						if (!rows[idx].found) return "No path";
						return "";
					},
				},
			},
		},
		scales: {
			x: {
				ticks: { color: getCssVar("--muted") },
				grid: { color: "rgba(255,255,255,0.08)" },
			},
			y: {
				ticks: { color: getCssVar("--muted") },
				grid: { color: "rgba(255,255,255,0.08)" },
			},
		},
	};

	if (appState.chart) {
		appState.chart.data = data;
		appState.chart.options = options;
		appState.chart.update();
		return;
	}

	appState.chart = new Chart(ctx, {
		type: "bar",
		data,
		options,
	});
}

async function loadCsvDefaultOrThrow() {
	const resp = await fetch(DEFAULT_CSV_PATH, { cache: "no-store" });
	if (!resp.ok) {
		throw new Error(`Failed to fetch ${DEFAULT_CSV_PATH} (HTTP ${resp.status}).`);
	}
	return await resp.text();
}

function readFileAsText(file) {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onerror = () => reject(new Error("Failed to read file."));
		reader.onload = () => resolve(String(reader.result ?? ""));
		reader.readAsText(file);
	});
}

async function initializeFromEdges(baseEdges) {
	appState.baseEdges = dedupeDirectedEdges(baseEdges);
	const edgesForGraph = appState.useBidirectionalEdges
		? makeBidirectionalEdges(appState.baseEdges)
		: appState.baseEdges;

	const { nodes, adj } = buildGraph(edgesForGraph);
	appState.nodes = nodes;
	appState.edges = edgesForGraph;

	syncBidirectionalButton();
	setSummary(nodes.length, edgesForGraph.length);
	populateNodeSelects(nodes);
	renderNetwork(nodes, edgesForGraph);
	enableControls(true);

	// Seed initial results and chart.
	const start = $("startNode").value;
	const end = $("endNode").value;
	const metric = $("metric").value;
	const res = dijkstra(adj, start, end, metric);
	updateResultsText(metric, start, end, res);
	if (res.found) highlightPath(res.pathNodes, res.pathEdges);
	buildOrUpdateChart(start, end, adj);

	// Hook up handlers.
	$("computeBtn").onclick = () => {
		const s = $("startNode").value;
		const t = $("endNode").value;
		const m = $("metric").value;
		const out = dijkstra(adj, s, t, m);
		updateResultsText(m, s, t, out);
		if (out.found) {
			highlightPath(out.pathNodes, out.pathEdges);
			setStatus("Path computed and highlighted.", "ok");
		} else {
			resetHighlight();
			setStatus(
				`No ${appState.useBidirectionalEdges ? "bidirectional" : "directed"} path for the selected nodes.`,
				"error"
			);
		}
		buildOrUpdateChart(s, t, adj);
	};

	$("resetBtn").onclick = () => {
		resetHighlight();
		setStatus("Highlight reset.");
	};

	// Update chart when nodes change (without recomputing highlight automatically).
	const onSelectionChange = () => {
		const s = $("startNode").value;
		const t = $("endNode").value;
		buildOrUpdateChart(s, t, adj);
	};
	$("startNode").onchange = onSelectionChange;
	$("endNode").onchange = onSelectionChange;

	$("bidirectionalBtn").onclick = () => {
		appState.useBidirectionalEdges = !appState.useBidirectionalEdges;
		const s = $("startNode").value;
		const t = $("endNode").value;
		const m = $("metric").value;
		initializeFromEdges(appState.baseEdges)
			.then(() => {
				// Restore selections after node dropdown repopulation.
				if (appState.nodes.includes(s)) $("startNode").value = s;
				if (appState.nodes.includes(t)) $("endNode").value = t;
				$("metric").value = m;
				$("computeBtn").click();
			})
			.catch((err) => {
				console.warn(err);
				setStatus(String(err?.message ?? err), "error");
			});
	};

	setStatus(
		`Dataset loaded (${appState.useBidirectionalEdges ? "bidirectional" : "directed"} edges).`,
		"ok"
	);
}

async function main() {
	enableControls(false);
	setStatus("Loading dataset…");
	syncBidirectionalButton();

	// Load default CSV (dataset.csv) first.
	try {
		const csvText = await loadCsvDefaultOrThrow();
		const edges = parseCsv(csvText);
		await initializeFromEdges(edges);
	} catch (err) {
		// Don’t fail the page — allow file upload fallback.
		console.warn(err);
		$("summaryPill").textContent = "Dataset not loaded";
		$("resultText").textContent =
			"Could not load dataset.csv automatically. Use a local server (recommended) or upload the CSV file.";
		setStatus(String(err?.message ?? err), "error");
	}

	// Always allow user to upload CSV.
	$("csvFile").addEventListener("change", async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setStatus("Reading uploaded CSV…");
		try {
			const text = await readFileAsText(file);
			const edges = parseCsv(text);
			if (appState.chart) {
				appState.chart.destroy();
				appState.chart = null;
			}
			appState.edgeById = new Map();
			await initializeFromEdges(edges);
		} catch (err) {
			console.warn(err);
			setStatus(String(err?.message ?? err), "error");
		}
	});
}

window.addEventListener("DOMContentLoaded", main);

