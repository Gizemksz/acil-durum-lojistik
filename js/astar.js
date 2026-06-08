// astar.js
function aStar(graph, startId, goalId, globalWeatherMultiplier = 1.0, ignoreTraffic = false) {
    if (!graph.nodes.has(startId) || !graph.nodes.has(goalId)) return null;

    const openSet = new MinHeap();
    const gScore = new Map(); // nodeId -> lowest cost
    const cameFrom = new Map(); // nodeId -> previous nodeId

    gScore.set(startId, 0);
    const startNode = graph.nodes.get(startId);
    const goalNode = graph.nodes.get(goalId);
    const h0 = graph.haversine(startNode.lat, startNode.lng, goalNode.lat, goalNode.lng);

    openSet.push({ id: startId, f: h0, g: 0 });

    let exploredNodes = 0;

    while (!openSet.isEmpty()) {
        const currentItem = openSet.pop();
        const current = currentItem.id;
        const currentG = currentItem.g;
        
        exploredNodes++;

        if (current === goalId) {
            return {
                path: reconstructPath(cameFrom, current),
                distance: currentG,
                exploredNodes
            };
        }

        // If we found a shorter path previously, skip
        if (currentG > (gScore.get(current) || Infinity)) continue;

        for (const edge of graph.getNeighbors(current)) {
            if (edge.blocked && !ignoreTraffic) continue;

            // Dynamic weight: base distance * traffic * weather
            const traffic = ignoreTraffic ? 1.0 : (edge.trafficMultiplier || 1.0);
            const edgeCost = edge.baseWeight * traffic * globalWeatherMultiplier;
            const tentativeG = currentG + edgeCost;

            if (tentativeG < (gScore.get(edge.to) ?? Infinity)) {
                gScore.set(edge.to, tentativeG);
                cameFrom.set(edge.to, current);

                const neighbor = graph.nodes.get(edge.to);
                const h = graph.haversine(neighbor.lat, neighbor.lng, goalNode.lat, goalNode.lng);
                
                openSet.push({ id: edge.to, f: tentativeG + h, g: tentativeG });
            }
        }
    }
    
    return null; // Route not found
}

function reconstructPath(cameFrom, current) {
    const path = [current];
    while (cameFrom.has(current)) {
        current = cameFrom.get(current);
        path.unshift(current);
    }
    return path;
}
