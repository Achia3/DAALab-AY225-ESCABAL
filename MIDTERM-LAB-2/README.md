# Node Network Visualizer & Shortest Path Analyzer

This project visualizes a network of locations (nodes) and routes (directed edges) from a CSV file, then computes the shortest path between any two nodes based on **Distance**, **Time**, or **Fuel**.

## What the program does

### Part 1 — Node Map
- Reads `dataset.csv` and extracts all unique node names from **From Node** and **To Node**.
- Builds a graph where each CSV row becomes a route `From → To`.
- Supports a **Bidirectional edges** toggle that automatically adds the reverse route `To → From` when enabled.
- Renders an interactive node map:
  - Nodes are labeled with location names.
  - Routes are drawn as arrows.
  - Hovering an edge shows its attributes: **Distance (km)**, **Time (mins)**, **Fuel (Liters)**.

### Part 2 — Shortest Path
- Lets you select:
  - a **Start node**
  - an **End node**
  - a metric to optimize: **distance**, **time**, or **fuel**
- Runs **Dijkstra’s algorithm** on the directed graph using the chosen metric as the edge weight.
- Outputs:
  - the path as `A → B → C …`
  - total distance, time, and fuel for that path
- Highlights the computed path on the node map.

## Dataset format

The app expects a CSV with this header (exact names):

- `From Node`
- `To Node`
- `Distance (km)`
- `Time (mins)`
- `Fuel (Liters)`

Each row represents a **directed** route (one-way). If your routes are meant to be two-way, you can either:
- enable **Bidirectional edges** in the UI (recommended), or
- include both directions in the CSV (e.g., `A,B,...` and `B,A,...`).

## Approach / Implementation

### 1) Parsing and graph construction
- The CSV is parsed into an array of edges:
  - `from` (string)
  - `to` (string)
  - `distance` (number)
  - `time` (number)
  - `fuel` (number)
- The graph is stored as an **adjacency list**:

```text
adj[fromNode] = [edge1, edge2, ...]
```

This representation is efficient for shortest-path algorithms because it quickly gives all outgoing routes for a node.

### 2) Node map visualization
- The map is rendered using the **Vis Network** library.
- Each edge is labeled (by default) with distance, and tooltips show all attributes.
- When a path is computed, edges on that path are updated to a thicker, accent color.

### 3) Shortest path algorithm (Dijkstra)
**Algorithm used:** Dijkstra’s algorithm (non-negative weights)

Why it fits:
- All weights (distance/time/fuel) are non-negative, which is exactly the requirement for Dijkstra.
- It guarantees the optimal shortest path for the chosen metric.

High-level steps:
1. Initialize all distances to infinity, and the start node to 0.
2. Use a min-priority queue (min-heap) to always expand the currently known closest node.
3. Relax outgoing edges: if `dist[u] + w(u,v) < dist[v]`, update `dist[v]` and store the predecessor.
4. Reconstruct the path by walking predecessors from end back to start.

Complexity:
- With a binary heap: **O((V + E) log V)**
  - `V` = number of nodes
  - `E` = number of edges/routes

## Data visualization

A **Chart.js** bar chart compares the totals for three different optimized routes (for the selected start/end):
- The path optimized for **distance**
- The path optimized for **time**
- The path optimized for **fuel**

This makes it easy to see trade-offs (e.g., a faster path may consume more fuel).

## How to run

### Recommended (avoids CSV loading issues)
Serve the folder with a local server:

```bash
python -m http.server 5500
```

Then open:
- `http://localhost:5500/`

### If `dataset.csv` won’t load
Some browsers block `fetch()` when opening HTML directly via `file://`.
- Use the built-in **CSV upload** control in the UI, or
- Run a local server as shown above.

## Challenges encountered

- **CSV loading from `file://` (CORS / browser security):**
  - Browsers often block `fetch('dataset.csv')` when the page is opened directly from disk.
  - Mitigation: run a local server, and provide a file-upload fallback.

- **Dropdown options unreadable on dark themes:**
  - Some browsers render `<option>` menus with a light background by default.
  - Fix: set dark `color-scheme` and style `select option` background/text.

- **Directed vs. undirected interpretation:**
  - The dataset is treated as a **directed graph** (each row is one-way).
  - If roads are intended to be two-way, the dataset must include both directions.

## Files
- `index.html` — UI layout and styling
- `script.js` — CSV parsing, graph building, visualization, Dijkstra, chart
- `dataset.csv` — routes and attributes
