// emergency.js
class EmergencyManager {
    constructor() {
        this.queue = [];
        this.history = [];
        this.resolvedIncidents = this.history;
        this.hospitals = [
            { id: "hosp1", lat: 40.2225, lng: 28.8710, name: "Nilüfer Devlet Hastanesi", capacity: 120, specialtyWeight: 1.3, node: null },
            { id: "hosp2", lat: 40.2155, lng: 28.9040, name: "Bursa Şehir Hastanesi", capacity: 200, specialtyWeight: 1.5, node: null },
            { id: "hosp3", lat: 40.2315, lng: 28.8845, name: "Uludağ Üniversitesi Tıp", capacity: 150, specialtyWeight: 1.4, node: null }
        ];
        this.fireStations = [
            { id: "fire1", lat: 40.2208, lng: 28.8735, name: "Nilüfer İtfaiye Merkez", capacity: 8, node: null },
            { id: "fire2", lat: 40.2295, lng: 28.8860, name: "Beşevler İtfaiye", capacity: 5, node: null },
            { id: "fire3", lat: 40.2140, lng: 28.8950, name: "Özlüce İtfaiye", capacity: 4, node: null }
        ];
        this.droneStations = [
            { id: "drone1", lat: 40.2232, lng: 28.8850, name: "Drone Merkezi FSM", capacity: 6, node: null }
        ];
    }

    // Hastane/istasyon node'larını graph'a göre eşle
    initNodes(graph) {
        for (const h of this.hospitals) {
            h.node = graph.getNearestNode(h.lat, h.lng);
        }
        for (const f of this.fireStations) {
            f.node = graph.getNearestNode(f.lat, f.lng);
        }
        for (const d of this.droneStations) {
            d.node = graph.getNearestNode(d.lat, d.lng);
        }
    }

    // Araç tipine göre en yakın üs
    getBaseForVehicle(type) {
        if (type === 'ambulance') return this.hospitals;
        if (type === 'fire') return this.fireStations;
        if (type === 'drone') return this.droneStations;
        return this.hospitals;
    }

    createIncident(lat, lng, type, priorityStr = null, desc = "") {
        const triage = this._determineTriage(type, priorityStr);
        const incident = {
            id: `EM-${Math.floor(Math.random() * 10000)}`,
            lat, lng,
            type, // 'medical' | 'fire' | 'cargo' | 'accident'
            triage, // 'RED' | 'YELLOW' | 'GREEN'
            priority: { RED: 0, YELLOW: 1, GREEN: 2 }[triage],
            createdAt: Date.now(),
            status: 'PENDING',
            desc: desc || `${type} acil durum`,
            assignedTo: null,
            reports: [] // Yapay zeka görev raporları
        };
        
        this.queue.push(incident);
        this.queue.sort((a, b) => a.priority - b.priority);
        
        return incident;
    }

    _determineTriage(type, priorityStr) {
        if (priorityStr) {
            if (priorityStr === 'critical') return 'RED';
            if (priorityStr === 'high') return 'YELLOW';
            if (priorityStr === 'medium' || priorityStr === 'low') return 'GREEN';
        }
        
        if (type === 'fire') return 'RED';
        if (type === 'accident') return 'RED';
        if (type === 'medical') {
            const r = Math.random();
            return r < 0.4 ? 'RED' : r < 0.7 ? 'YELLOW' : 'GREEN';
        }
        return 'GREEN';
    }

    getNextForVehicle(vehicleType) {
        const typeMap = { 
            ambulance: ['medical', 'accident'], 
            fire: ['fire', 'accident'], 
            drone: ['cargo', 'medical']
        };
        const canHandle = typeMap[vehicleType] || [];
        return this.queue.find(i => 
            i.status === 'PENDING' && canHandle.includes(i.type)
        );
    }

    assignIncident(incidentId, vehicleId) {
        const inc = this.queue.find(i => i.id === incidentId);
        if (inc) {
            inc.status = 'ASSIGNED';
            inc.assignedTo = vehicleId;
        }
    }

    completeIncident(incidentId) {
        const idx = this.queue.findIndex(i => i.id === incidentId);
        if (idx !== -1) {
            const [inc] = this.queue.splice(idx, 1);
            inc.status = 'COMPLETED';
            inc.completedAt = Date.now();
            this.history.push(inc);
            return inc;
        }
        return null;
    }
    
    getBestHospital(lat, lng, graph) {
        if(this.hospitals.length === 0) return null;
        let best = null;
        let minDist = Infinity;
        for(const h of this.hospitals) {
            const dist = graph.haversine(lat, lng, h.lat, h.lng);
            if(dist < minDist) {
                minDist = dist;
                best = h;
            }
        }
        return best;
    }
}
