// vehicle.js
class Vehicle {
    constructor(id, type, startNodeId, graph) {
        this.id = id;
        this.type = type; // 'ambulance' | 'fire' | 'drone'
        this.baseNodeId = startNodeId; // Merkeze dönüş için
        this.nodeId = startNodeId;
        this.graph = graph;
        
        const node = this.graph.nodes.get(startNodeId);
        this.lat = node ? node.lat : 0;
        this.lng = node ? node.lng : 0;
        
        this.path = []; 
        this.pathIndex = 0;
        this.status = 'IDLE'; // IDLE | MOVING_TO_INCIDENT | TREATING | TRANSPORTING | RETURNING | AWAITING_TRANSPORT | AWAITING_RETURN
        this.currentIncident = null;
        this.progress = 0;
        this.treatmentTimer = 0;
        
        this.speed = { ambulance: 80, fire: 60, drone: 120 }[type];
        this.baseSpeed = this.speed;

        // Performance optimization: throttle nearest edge computations
        this.trafficCheckTimer = 0.5; // Force immediate check on start
        this.lastTrafficMult = 1.0;
    }

    assignRoute(path, incident, status = 'MOVING_TO_INCIDENT') {
        if(!path || path.length === 0) return;
        this.path = path;
        this.pathIndex = 0;
        this.progress = 0;
        if(incident) this.currentIncident = incident;
        
        if (this.path.length < 2) {
            this.handleArrival();
        } else {
            this.status = status;
        }
    }

    handleArrival() {
        if (this.status === 'MOVING_TO_INCIDENT') {
            this.status = 'TREATING';
            this.treatmentTimer = this.type === 'fire' ? 5 : 3; // İtfaiye 5 sn, diğerleri 3 sn
            if (this.currentIncident && !this.currentIncident.arrivedAt) {
                this.currentIncident.arrivedAt = Date.now();
            }
            // Konumu en yakın graf düğümüyle güncelle
            this.nodeId = this.graph.getNearestNode(this.lat, this.lng);
        } else if (this.status === 'TRANSPORTING' || this.status === 'RETURNING') {
            this.status = 'IDLE';
            if (this.currentIncident) {
                // Sadece merkeze döndüğünde veya hastaneye vardığında incident tamamen kapanır
                document.dispatchEvent(new CustomEvent('incidentFullyResolved', { detail: { id: this.currentIncident.id } }));
                this.currentIncident = null;
            }
            // Üsse veya hastaneye vardığında konumu güncelle
            this.nodeId = this.homeBase ? (this.homeBase.node || this.baseNodeId) : this.graph.getNearestNode(this.lat, this.lng);
        }
    }

    tick(deltaTime, globalWeatherMultiplier) {
        if (this.status === 'TREATING') {
            this.treatmentTimer -= deltaTime;
            if (this.treatmentTimer <= 0) {
                if (this.type === 'ambulance' && this.currentIncident && (this.currentIncident.triage === 'RED' || this.currentIncident.priority === 'critical')) {
                    this.status = 'AWAITING_TRANSPORT';
                } else {
                    this.status = 'AWAITING_RETURN';
                }
            }
            return;
        }

        if (!['MOVING_TO_INCIDENT', 'TRANSPORTING', 'RETURNING'].includes(this.status) || this.path.length < 2) return;

        const currentNode = this.path[this.pathIndex];
        const nextNode = this.path[this.pathIndex + 1];
        if(!nextNode) {
            this.handleArrival();
            return;
        }
        
        const edgeLen = this.graph.haversine(currentNode.lat, currentNode.lng, nextNode.lat, nextNode.lng);
        
        let currentSpeed = this.speed;
        if(globalWeatherMultiplier > 1.0) {
            if(this.type === 'drone') currentSpeed *= 0.5;
            else currentSpeed *= 0.8;
        }
        
        // --- DUAL REALITY BRIDGE ---
        // Aracın gerçek OSRM koordinatını hayali trafik ağına (abstract graph) izdüşümle.
        // Performans Optimizasyonu: Yol ağı aramasını saniyede 2 kez (0.5 sn'de bir) yap.
        this.trafficCheckTimer += deltaTime;
        let localTrafficMult = this.lastTrafficMult;

        if (this.type !== 'drone' && this.trafficCheckTimer >= 0.5) {
            this.trafficCheckTimer = 0;
            let minEdgeDist = Infinity;
            let bestMult = 1.0;
            for (const [nodeId, edges] of this.graph.adjacencyList.entries()) {
                const n1 = this.graph.nodes.get(nodeId);
                if (!n1) continue;
                for (const edge of edges) {
                    const n2 = this.graph.nodes.get(edge.to);
                    if (!n2) continue;
                    // Kenarın (edge) orta noktasına olan mesafeyi ölç
                    const midLat = (n1.lat + n2.lat) / 2;
                    const midLng = (n1.lng + n2.lng) / 2;
                    const d = this.graph.haversine(this.lat, this.lng, midLat, midLng);
                    if (d < minEdgeDist) {
                        minEdgeDist = d;
                        bestMult = edge.trafficMultiplier || 1.0;
                    }
                }
            }
            // Eğer araç hayali ağdan 20 metreden daha uzaksa trafik etkilemesin
            if (minEdgeDist > 20.0) bestMult = 1.0;

            this.lastTrafficMult = bestMult;
            localTrafficMult = bestMult;
        }
        
        // Hızı yerel trafiğe göre böl (örneğin trafik 2.0x ise hız yarıya düşer)
        currentSpeed /= localTrafficMult;
        

        
        // Arayüzde (UI) gösterebilmek için anlık hesaplanan hızı kaydet
        this.currentDynamicSpeed = currentSpeed;
        // ---------------------------
        
        const speedMs = currentSpeed / 3.6;
        
        if (edgeLen === 0) {
            this.progress = 1;
        } else {
            this.progress += (speedMs * deltaTime) / edgeLen;
        }

        this.lat = currentNode.lat + (nextNode.lat - currentNode.lat) * this.progress;
        this.lng = currentNode.lng + (nextNode.lng - currentNode.lng) * this.progress;

        if (this.progress >= 1) {
            this.progress = 0;
            this.pathIndex++;

            if (this.pathIndex >= this.path.length - 1) {
                this.handleArrival();
            } else {
                this.lat = nextNode.lat;
                this.lng = nextNode.lng;
            }
        }
    }

    getPosition() {
        return { lat: this.lat, lng: this.lng };
    }
}
