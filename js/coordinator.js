// coordinator.js
class AgentCoordinator {
    constructor(vehicles) {
        this.vehicles = vehicles; // Array of vehicle objects
    }

    checkConflicts() {
        const conflicts = [];
        
        for (let i = 0; i < this.vehicles.length; i++) {
            for (let j = i + 1; j < this.vehicles.length; j++) {
                const a = this.vehicles[i];
                const b = this.vehicles[j];

                const isMoving = (v) => ['MOVING_TO_INCIDENT', 'TRANSPORTING', 'RETURNING'].includes(v.status);
                if (isMoving(a) && isMoving(b)) {
                    // Drones fly above, no conflict with ground vehicles
                    if(a.type === 'drone' || b.type === 'drone') continue;

                    // Use Haversine distance since vehicles are on continuous real coordinates
                    const distKm = a.graph.haversine(a.lat, a.lng, b.lat, b.lng);
                    if (distKm < 0.03) { // 30 meters
                        conflicts.push({ a: a.id, b: b.id });
                        this._resolveConflict(a, b);
                    }
                }
            }
        }
        return conflicts;
    }

    _resolveConflict(a, b) {
        // Priority: ambulance > fire > drone
        const priority = { ambulance: 0, fire: 1, drone: 2 };
        const loser = priority[a.type] > priority[b.type] ? a : b;
        
        // Slow down the lower priority vehicle temporarily
        loser.speed = loser.baseSpeed * 0.3; 
        
        setTimeout(() => { 
            loser.speed = loser.baseSpeed; 
        }, 2000);
    }
    
    // Green wave: clear traffic on ambulance/fire routes
    applyGreenWave(graph, path) {
        if(!path || path.length === 0) return;
        for(let i=0; i<path.length-1; i++) {
            const edges = graph.adjacencyList.get(path[i]);
            if(edges) {
                const edge = edges.find(e => e.to === path[i+1]);
                if(edge && !edge.incident) {
                    edge.trafficMultiplier = 1.0; // Clear traffic
                }
            }
        }
    }
}
