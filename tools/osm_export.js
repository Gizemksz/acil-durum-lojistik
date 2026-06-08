const fs = require('fs');

async function fetchOSMData() {
    // Kadıköy area bounding box: south, west, north, east
    const bbox = '40.985,29.020,40.995,29.035';
    const overpassQuery = `
        [out:json];
        (
            way["highway"](${bbox});
        );
        (._;>;);
        out body;
    `;

    console.log('Fetching map data from Overpass API...');
    try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: overpassQuery,
            headers: { 
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'SmartCitySimApp/1.0',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log(`Received ${data.elements.length} elements.`);

        const nodesData = [];
        const edgesData = [];
        const nodeMap = new Map();

        // First pass: map all nodes
        data.elements.forEach(el => {
            if (el.type === 'node') {
                nodeMap.set(el.id, { lat: el.lat, lng: el.lon });
                nodesData.push({
                    id: String(el.id),
                    lat: el.lat,
                    lng: el.lon
                });
            }
        });

        // Second pass: map ways to edges
        data.elements.forEach(el => {
            if (el.type === 'way' && el.nodes) {
                const isOneway = el.tags && (el.tags.oneway === 'yes' || el.tags.oneway === '1');
                const highwayType = el.tags && el.tags.highway ? el.tags.highway : 'unknown';
                
                // Exclude footways and pedestrian paths if we only want roads for vehicles
                if (['footway', 'pedestrian', 'path', 'steps', 'corridor', 'elevator'].includes(highwayType)) {
                    return;
                }

                // Default speed based on highway type (km/h)
                let speed = 50;
                if (el.tags && el.tags.maxspeed) {
                    const parsed = parseInt(el.tags.maxspeed);
                    if (!isNaN(parsed)) speed = parsed;
                } else {
                    if (highwayType === 'motorway') speed = 120;
                    else if (highwayType === 'trunk') speed = 90;
                    else if (highwayType === 'primary') speed = 70;
                    else if (highwayType === 'residential') speed = 30;
                }

                for (let i = 0; i < el.nodes.length - 1; i++) {
                    const from = el.nodes[i];
                    const to = el.nodes[i + 1];
                    const nodeA = nodeMap.get(from);
                    const nodeB = nodeMap.get(to);

                    if (nodeA && nodeB) {
                        // Calculate length (haversine) in meters
                        const length = calculateDistance(nodeA.lat, nodeA.lng, nodeB.lat, nodeB.lng);
                        
                        edgesData.push({
                            from: String(from),
                            to: String(to),
                            length: length,
                            speed: speed,
                            highway: highwayType
                        });

                        if (!isOneway) {
                            edgesData.push({
                                from: String(to),
                                to: String(from),
                                length: length,
                                speed: speed,
                                highway: highwayType
                            });
                        }
                    }
                }
            }
        });

        const outputData = {
            nodes: nodesData,
            edges: edgesData,
            bounds: {
                minLat: 40.985, maxLat: 40.995,
                minLng: 29.020, maxLng: 29.035
            }
        };

        fs.writeFileSync('./data/map_data.json', JSON.stringify(outputData, null, 2));
        console.log(`Saved ${nodesData.length} nodes and ${edgesData.length} edges to map_data.json`);

    } catch (error) {
        console.error('Error fetching data:', error);
    }
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metres
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

fetchOSMData();
