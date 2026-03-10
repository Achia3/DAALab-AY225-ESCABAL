/**
 * Graph Data Structure and Dijkstra's Shortest Path Algorithm
 * 
 * Time Complexity: O((V + E) log V) with min-heap priority queue
 * Space Complexity: O(V) for distance array and visited set
 */

class MinHeap {
    constructor() {
        this.heap = [];
    }

    push(node, priority) {
        this.heap.push({ node, priority });
        this.bubbleUp(this.heap.length - 1);
    }

    pop() {
        if (this.heap.length === 0) return null;
        if (this.heap.length === 1) return this.heap.pop();
        
        const min = this.heap[0];
        this.heap[0] = this.heap.pop();
        this.bubbleDown(0);
        return min;
    }

    bubbleUp(idx) {
        while (idx > 0) {
            const parentIdx = Math.floor((idx - 1) / 2);
            if (this.heap[idx].priority >= this.heap[parentIdx].priority) break;
            
            [this.heap[idx], this.heap[parentIdx]] = [this.heap[parentIdx], this.heap[idx]];
            idx = parentIdx;
        }
    }

    bubbleDown(idx) {
        while (true) {
            let smallest = idx;
            const leftChild = 2 * idx + 1;
            const rightChild = 2 * idx + 2;

            if (leftChild < this.heap.length && 
                this.heap[leftChild].priority < this.heap[smallest].priority) {
                smallest = leftChild;
            }

            if (rightChild < this.heap.length && 
                this.heap[rightChild].priority < this.heap[smallest].priority) {
                smallest = rightChild;
            }

            if (smallest === idx) break;

            [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
            idx = smallest;
        }
    }

    isEmpty() {
        return this.heap.length === 0;
    }
}

class Graph {
    constructor() {
        this.adjacencyList = new Map();
        this.nodes = new Set();
    }

    /**
     * Add an edge to the graph
     * @param {number} from - Source node
     * @param {number} to - Destination node
     * @param {object} weights - Object containing distance, time, fuel
     */
    addEdge(from, to, weights) {
        this.nodes.add(from);
        this.nodes.add(to);

        if (!this.adjacencyList.has(from)) {
            this.adjacencyList.set(from, []);
        }

        this.adjacencyList.get(from).push({
            node: to,
            distance: weights.distance,
            time: weights.time,
            fuel: weights.fuel
        });
    }

    /**
     * Get all nodes in the graph
     * @returns {Array} Array of node identifiers
     */
    getNodes() {
        return Array.from(this.nodes).sort((a, b) => a - b);
    }

    /**
     * Dijkstra's shortest path algorithm
     * @param {number} source - Starting node
     * @param {string} metric - Weight metric to use ('distance', 'time', or 'fuel')
     * @returns {object} Object containing distances and previous nodes for path reconstruction
     */
    dijkstra(source, metric) {
        const distances = new Map();
        const previous = new Map();
        const visited = new Set();
        const pq = new MinHeap();

        // Initialize distances
        for (const node of this.nodes) {
            distances.set(node, Infinity);
            previous.set(node, null);
        }
        distances.set(source, 0);
        pq.push(source, 0);

        while (!pq.isEmpty()) {
            const { node: current } = pq.pop();

            if (visited.has(current)) continue;
            visited.add(current);

            // Check neighbors
            const neighbors = this.adjacencyList.get(current) || [];
            for (const neighbor of neighbors) {
                if (visited.has(neighbor.node)) continue;

                const weight = neighbor[metric];
                const newDistance = distances.get(current) + weight;

                if (newDistance < distances.get(neighbor.node)) {
                    distances.set(neighbor.node, newDistance);
                    previous.set(neighbor.node, current);
                    pq.push(neighbor.node, newDistance);
                }
            }
        }

        return { distances, previous };
    }

    /**
     * Reconstruct the shortest path from source to target
     * @param {Map} previous - Previous nodes map from Dijkstra
     * @param {number} source - Starting node
     * @param {number} target - Destination node
     * @returns {Array|null} Path as array of nodes, or null if no path exists
     */
    reconstructPath(previous, source, target) {
        const path = [];
        let current = target;

        while (current !== null) {
            path.unshift(current);
            current = previous.get(current);
        }

        // Check if path is valid (reaches source)
        if (path[0] !== source) {
            return null;
        }

        return path;
    }

    /**
     * Find shortest paths from source to all other nodes
     * @param {number} source - Starting node
     * @param {string} metric - Weight metric to use ('distance', 'time', or 'fuel')
     * @returns {Array} Array of path objects with destination, path, and cost
     */
    findAllShortestPaths(source, metric) {
        const { distances, previous } = this.dijkstra(source, metric);
        const results = [];

        for (const target of this.nodes) {
            if (target === source) continue;

            const path = this.reconstructPath(previous, source, target);
            const cost = distances.get(target);

            results.push({
                destination: target,
                path: path,
                cost: cost === Infinity ? null : cost,
                reachable: path !== null && cost !== Infinity
            });
        }

        // Sort by destination node
        results.sort((a, b) => a.destination - b.destination);

        return results;
    }

    /**
     * Compute shortest paths from all nodes to all other nodes for a given metric
     * @param {string} metric - Weight metric to use ('distance', 'time', or 'fuel')
     * @returns {Map} Map of source node -> array of path results
     */
    computeAllPairsShortestPaths(metric) {
        const allPaths = new Map();

        for (const source of this.nodes) {
            const paths = this.findAllShortestPaths(source, metric);
            allPaths.set(source, paths);
        }

        return allPaths;
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Graph };
}
