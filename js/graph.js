// graph.js
class CityGraph {
    constructor() {
        this.nodes = new Map(); // nodeId -> { lat, lng }
        this.adjacencyList = new Map(); // nodeId -> [ {to, baseWeight, trafficMultiplier, blocked} ]
        this.bounds = { minLat: Infinity, maxLat: -Infinity, minLng: Infinity, maxLng: -Infinity };
    }

    loadFromJSON(mapData) {
        if (!mapData || !mapData.nodes || !mapData.edges) {
            console.error("Invalid map data");
            return;
        }

        // Add nodes
        mapData.nodes.forEach(n => {
            this.addNode(n.id, n.lat, n.lng);
            if (n.lat < this.bounds.minLat) this.bounds.minLat = n.lat;
            if (n.lat > this.bounds.maxLat) this.bounds.maxLat = n.lat;
            if (n.lng < this.bounds.minLng) this.bounds.minLng = n.lng;
            if (n.lng > this.bounds.maxLng) this.bounds.maxLng = n.lng;
        });

        // Add edges
        mapData.edges.forEach(e => {
            this.addEdge(e.from, e.to, e.weight || e.length || 100);
        });

        console.log(`Graph loaded with ${this.nodes.size} nodes and ${mapData.edges.length} edges.`);
    }

    addNode(id, lat, lng) {
        this.nodes.set(id, { lat, lng });
        if (!this.adjacencyList.has(id)) {
            this.adjacencyList.set(id, []);
        }
    }

    addEdge(fromId, toId, distance) {
        if (!this.adjacencyList.has(fromId)) this.adjacencyList.set(fromId, []);
        
        // Check if edge already exists to prevent duplicates if data has them
        const edges = this.adjacencyList.get(fromId);
        if (!edges.find(e => e.to === toId)) {
            edges.push({
                to: toId,
                baseWeight: distance,
                trafficMultiplier: 1.0,
                blocked: false,
                incident: false
            });
        }
    }

    getNeighbors(nodeId) {
        return this.adjacencyList.get(nodeId) || [];
    }

    getNearestNode(lat, lng) {
        let minDist = Infinity;
        let nearest = null;
        
        for (const [id, node] of this.nodes) {
            const d = this.haversine(lat, lng, node.lat, node.lng);
            if (d < minDist) {
                minDist = d;
                nearest = id;
            }
        }
        return nearest;
    }

    // Distance in meters
    haversine(lat1, lng1, lat2, lng2) {
        const R = 6371000;
        const p1 = lat1 * Math.PI / 180;
        const p2 = lat2 * Math.PI / 180;
        const dp = (lat2 - lat1) * Math.PI / 180;
        const dl = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(dp / 2) * Math.sin(dp / 2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl / 2) * Math.sin(dl / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}
