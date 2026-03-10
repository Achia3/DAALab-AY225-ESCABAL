# Multi-Metric Shortest Path Finder 🗺️

An aesthetic web-based application that finds the shortest paths between all pairs of nodes in a directed graph using **Dijkstra's algorithm**, optimized for three metrics: **Distance**, **Time**, and **Fuel**. Includes an interactive **vis.js graph visualization** and a **Quick Answer** panel that identifies the best source node per metric.

![Algorithm](https://img.shields.io/badge/Algorithm-Dijkstra's-blue)
![Complexity](<https://img.shields.io/badge/Complexity-O((V%2BE)logV)-green>)
![Language](https://img.shields.io/badge/Language-JavaScript-yellow)

## 📋 Features

- **Multi-Metric Optimization**: Computes shortest paths for three metrics
  - 📏 Distance (shortest physical path)
  - ⏱️ Time (fastest route)
  - ⛽ Fuel (most fuel-efficient)

- **All-Pairs Shortest Paths**: Calculates optimal paths from every node to every other node

- **Quick Answer Panel**: Automatically determines the best source node (lowest total cost across all destinations) for each metric, with a **fuel-based tiebreaker** when totals are equal

- **Interactive Graph Visualization**: Powered by vis.js — displays nodes and edges, highlights shortest paths when a source node is selected

- **Interactive UI**:
  - Filter results by source node via dropdown
  - Toggle metrics on/off with pill-shaped buttons
  - Color-coded tables and badges for each metric
  - Per-node metric tabs with totals

- **Modern Design**:
  - Clean flat design with a 5-color palette
  - Responsive layout (mobile-friendly)
  - Dark plum theme with lavender and blush accents
  - Smooth transitions, hover lifts, and fade-in animations

## 🚀 Quick Start

1. **Open the Application**:

   ```
   Simply open index.html in your web browser
   ```

2. **View Results**:
   - The application loads graph data embedded in `js/data.js`
   - Computes shortest paths for all node pairs on load
   - Displays the Quick Answer summary and per-node result cards

3. **Interact**:
   - Use the dropdown to filter by a specific source node
   - Click metric toggle buttons to show/hide distance, time, or fuel results
   - View the vis.js graph — shortest paths are highlighted automatically
   - Switch between metrics using the tabs within each node card

## 📁 Project Structure

```
MIDTERM-LAB-WORK-1/
│
├── index.html          # Main HTML file
├── styles.css          # Flat-design styling (5-color palette)
├── README.md           # This file
│
├── data/
│   └── dataset.xlsx    # Original Excel dataset
│
└── js/
    ├── data.js         # Graph data embedded as GRAPH_DATA constant
    ├── graph.js        # MinHeap, Graph class & Dijkstra's algorithm
    └── main.js         # App logic, vis.js visualization & Quick Answer
```

## 📊 Data Format

The graph consists of 6 nodes and 20 directed edges. Each edge has three weights:

| Field     | Description                 | Example |
| --------- | --------------------------- | ------- |
| node_from | Source node identifier      | 1       |
| node_to   | Destination node identifier | 2       |
| distance  | Physical distance           | 10      |
| time      | Travel time                 | 15      |
| fuel      | Fuel consumption            | 1.2     |

Data is embedded directly in `js/data.js` to avoid CORS issues when opening via `file://`.

## 🧮 Algorithm

### Dijkstra's Shortest Path Algorithm

- **Time Complexity**: $O((V + E) \log V)$ with min-heap priority queue
- **Space Complexity**: $O(V)$ for distance array and visited set

The algorithm is executed:

- 3 times per source node (once for each metric)
- For 6 nodes: **18 total Dijkstra executions**

### Implementation Highlights

1. **MinHeap Priority Queue** — efficient $O(\log V)$ insertions and deletions
2. **Adjacency List** — space-efficient graph representation
3. **Path Reconstruction** — tracks previous nodes for full path recovery
4. **Quick Answer with Tiebreaker** — compares total costs; uses fuel as tiebreaker on ties

## 🏆 Quick Answer Logic

For each metric, the app:

1. Computes the total cost from each source node to all reachable destinations
2. Finds the source node with the **lowest total**
3. If two or more nodes tie, the one with the **lowest total fuel usage** wins

## 🎨 Color Palette

| Color     | Hex       | Usage                       |
| --------- | --------- | --------------------------- |
| White     | `#FFFFFF` | Fuel accent, text           |
| Deep Plum | `#412234` | Background, text on buttons |
| Mauve     | `#6D466B` | Header, node icons          |
| Lavender  | `#B49FCC` | Distance accent, borders    |
| Blush     | `#EAD7D7` | Time accent, secondary text |

Flat design — no gradients anywhere.

## 📈 Statistics Displayed

- **Total Nodes**: Number of unique nodes in the graph
- **Total Edges**: Number of directed connections
- **Paths Computed**: Total shortest paths calculated ($N \times (N-1) \times 3$)

## 🌐 Browser Compatibility

- ✅ Google Chrome (recommended)
- ✅ Mozilla Firefox
- ✅ Microsoft Edge
- ✅ Safari

## 📱 Responsive Design

The application adapts to different screen sizes:

- **Desktop**: Full grid layout with side-by-side cards
- **Tablet**: Stacked cards with optimized spacing
- **Mobile**: Single-column layout with touch-friendly pill buttons

## 🎓 Academic Context

**Course**: Design and Analysis of Algorithms (DAA)  
**Assignment**: Midterm Lab Work 1  
**Topic**: Graph Algorithms — Shortest Path Problem  
**Year**: AY 2025

## 💡 Key Insights

- **Different Metrics, Different Paths**: The shortest distance path may not be the fastest or most fuel-efficient
- **Quick Answer at a Glance**: No need to scroll through all results — the best source node is highlighted immediately
- **Tiebreaker Matters**: When two nodes have equal totals, fuel efficiency decides the winner
- **Visualization**: The vis.js network graph makes path analysis intuitive

## 🚦 Status

✅ **Complete and Functional**

All features implemented:

- [x] Excel to JSON data conversion
- [x] Graph data structure with adjacency list
- [x] Dijkstra's algorithm implementation
- [x] All-pairs shortest path computation
- [x] Interactive web interface
- [x] Responsive design
- [x] Multi-metric support
- [x] Path visualization

## 📝 License

Educational use only - DAA Lab Assignment

## 👥 Credits

**Team**: CARTONEROS, ESCABAL, MOSOMOS
**Lab**: DAA Lab AY225  
**Algorithm**: Edsger W. Dijkstra (1956)

---