// simulation.js
console.log('Simulation dosyası yüklendi!');
class Simulation {
    constructor(config = {}) {
        this.config = config;
        this.graph = new CityGraph();
        this.vehicles = [];
        this.emergencyManager = new EmergencyManager();
        this.trafficSimulator = null;
        this.coordinator = null;
        this.renderer = null;
        
        this.running = false;
        this.lastTime = null;
        this.speedMultiplier = 3;
        this.animationFrameId = null;
        
        this.stats = {
            resolved: 0,
            activeVehicles: 0
        };

        // Listen for incidents resolved fully (e.g. patients transported to hospital)
        document.addEventListener('incidentFullyResolved', (e) => {
            this._resolveIncident(e.detail.id);
        });
    }

    reset() {
        this.pause();
        this.stats = { resolved: 0, activeVehicles: 0 };
        this.emergencyManager.queue = [];
        
        this.vehicles.forEach(v => {
            v.status = 'IDLE';
            v.path = [];
            v.pathIndex = 0;
            v.currentIncident = null;
            v.progress = 0;
            if (v.homeBase) {
                const node = v.homeBase.node || v.homeBase;
                const n = typeof node === 'string' ? this.graph.nodes.get(node) : node;
                if (n && n.lat) { v.lat = n.lat; v.lng = n.lng; v.nodeId = typeof node === 'string' ? node : v.nodeId; }
            }
            if(this.renderer) this.renderer.clearRoute(v.id);
        });
        
        if (this.renderer && this.renderer.incidentLayer) this.renderer.incidentLayer.clearLayers();
        
        for (const [nodeId, edges] of this.graph.adjacencyList) {
            edges.forEach(e => e.trafficMultiplier = 1.0);
        }
        
        document.dispatchEvent(new Event('simulationReset'));
    }

    async init() {
        this.renderer = new Renderer('map');
        
        // Load map data
        try {
            let mapData = null;
            if (window.MAP_DATA) {
                mapData = window.MAP_DATA;
            } else {
                const response = await fetch('data/map_data.json');
                mapData = await response.json();
            }
            
            this.graph.loadFromJSON(mapData);
            this.renderer.initBounds(this.graph.bounds);
            
            // Hastane/istasyon node'larını eşle
            this.emergencyManager.initNodes(this.graph);
            
            // Tesisleri haritada göster (hastaneler, itfaiye, drone istasyonları)
            this.renderer.drawFacilities(this.emergencyManager);
            
        } catch (e) {
            console.error("Failed to load map data.", e);
        }

        // Traffic Simulator Initialization
        this.trafficSimulator = new TrafficSimulator(this.graph);

        // Open-Meteo weather integration
        try {
            const meteoRes = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.2220&longitude=28.8790&current_weather=true');
            if (meteoRes.ok) {
                const meteoData = await meteoRes.json();
                if (meteoData && meteoData.current_weather) {
                    const weatherCode = meteoData.current_weather.weathercode;
                    // Yağmur, kar gibi durumlar
                    if (weatherCode > 50) {
                        if(this.trafficSimulator) this.trafficSimulator.setWeather(1.25);
                        document.body.classList.add('weather-rain');
                    } else {
                        if(this.trafficSimulator) this.trafficSimulator.setWeather(1.0);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to load weather from Open-Meteo", e);
        }

        // trafficSimulator önceden başlatıldı
        // Ambulansları hastanelerden başlat
        const hospitals = this.emergencyManager.hospitals;
        for (let i = 0; i < 8; i++) {
            const hosp = hospitals[i % hospitals.length];
            const startNode = hosp.node || this._getRandomNodeId();
            const v = new Vehicle(`AMB-${i+1}`, 'ambulance', startNode, this.graph);
            v.homeBase = hosp; // hangi hastaneden çıktığı
            this.vehicles.push(v);
        }

        // İtfaiyeleri istasyonlardan başlat
        const fireStations = this.emergencyManager.fireStations;
        for (let i = 0; i < 5; i++) {
            const station = fireStations[i % fireStations.length];
            const startNode = station.node || this._getRandomNodeId();
            const v = new Vehicle(`FIR-${i+1}`, 'fire', startNode, this.graph);
            v.homeBase = station;
            this.vehicles.push(v);
        }

        // Droneları drone istasyonundan başlat
        const droneStations = this.emergencyManager.droneStations;
        for (let i = 0; i < 6; i++) {
            const station = droneStations[i % droneStations.length];
            const startNode = station.node || this._getRandomNodeId();
            const v = new Vehicle(`DRN-${i+1}`, 'drone', startNode, this.graph);
            v.homeBase = station;
            this.vehicles.push(v);
        }

        this.coordinator = new AgentCoordinator(this.vehicles);
        this.renderer.drawVehicles(this.vehicles);
    }

    _getRandomNodeId() {
        const nodeIds = Array.from(this.graph.nodes.keys());
        return nodeIds.length > 0 ? nodeIds[Math.floor(Math.random() * nodeIds.length)] : null;
    }

    // Olaya en yakın uygun aracı bul
    _findNearestVehicle(incident, canHandle) {
        let bestVehicle = null;
        let bestDist = Infinity;

        for (const vehicle of this.vehicles) {
            if (vehicle.status !== 'IDLE') continue;
            if (!canHandle.includes(vehicle.type)) continue;

            const pos = vehicle.getPosition();
            const dist = this.graph.haversine(pos.lat, pos.lng, incident.lat, incident.lng);
            
            if (dist < bestDist) {
                bestDist = dist;
                bestVehicle = vehicle;
            }
        }
        return bestVehicle;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.lastTime = performance.now();
        this._loop(performance.now());
        document.dispatchEvent(new Event('simulationStarted'));
    }
    
    pause() {
        this.running = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        document.dispatchEvent(new Event('simulationPaused'));
    }

    _loop(timestamp) {
        if (!this.running) return;

        const dt = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;

        // 1. Traffic Update
        if (Math.random() < 0.02 * this.speedMultiplier) {
            this.trafficSimulator.update();
            // Trafik katmanı açıksa güncelle
            this.renderer.updateTrafficLayer(this.graph, this.trafficSimulator);
            
            // Isı haritası katmanı açıksa güncelle
            if (this.renderer.heatmapLayerVisible) {
                this.renderer.updateHeatmapLayer(this.graph, this.trafficSimulator);
            }
            
            // Risk bölgeleri katmanı açıksa güncelle
            if (this.renderer.zonesVisible) {
                const densities = this.getRegionTrafficDensities();
                this.renderer.updateZonesLayer(densities);
            }
        }

        // 2. Olay atama - her PENDING olay için en yakın aracı bul
        const pendingIncidents = this.emergencyManager.queue.filter(i => i.status === 'PENDING');
        for (const incident of pendingIncidents) {
            // Olay tipine göre GEREKEN araç tiplerinin listesi
            let requiredVehicleTypes = [];
            if (incident.type === 'medical') requiredVehicleTypes = ['ambulance'];
            else if (incident.type === 'fire') requiredVehicleTypes = ['fire', 'ambulance'];
            else if (incident.type === 'accident') requiredVehicleTypes = ['ambulance', 'fire'];
            else if (incident.type === 'cargo') requiredVehicleTypes = ['drone'];
            else if (incident.type === 'natural') requiredVehicleTypes = ['ambulance', 'fire'];
            
            let vehiclesToDispatch = [];
            for (const vType of requiredVehicleTypes) {
                let bestVehicle = null;
                let bestDist = Infinity;
                for (const v of this.vehicles) {
                    if (v.status !== 'IDLE' || v.type !== vType || vehiclesToDispatch.includes(v)) continue;
                    const pos = v.getPosition();
                    const dist = this.graph.haversine(pos.lat, pos.lng, incident.lat, incident.lng);
                    if (dist < bestDist) { bestDist = dist; bestVehicle = v; }
                }
                if (bestVehicle) vehiclesToDispatch.push(bestVehicle);
            }

            if (vehiclesToDispatch.length > 0) {
                // Mark incident as assigned
                this.emergencyManager.assignIncident(incident.id, vehiclesToDispatch[0].id);
                
                for (const vehicle of vehiclesToDispatch) {
                    const goalNode = this.graph.getNearestNode(incident.lat, incident.lng);
                    let result = null;
                    let reportText = "";
                    let distanceKm = 0;
                    let timeMin = 0;
                    
                    if (vehicle.type === 'drone') {
                        result = { path: [vehicle.nodeId, goalNode], computeTime: 0 };
                        const directDist = this.graph.haversine(vehicle.lat, vehicle.lng, incident.lat, incident.lng);
                        distanceKm = (directDist / 1000).toFixed(2);
                        timeMin = Math.max(1, Math.ceil(directDist / (vehicle.speed * 1000 / 60)));
                        reportText = `Drone ${vehicle.id}, vaka #${incident.id} bölgesine ${distanceKm}km mesafeyi kuş uçuşu olarak tahmini ${timeMin} dakikada gidecektir. Trafik kısıtlamaları uygulanmamıştır.`;
                        
                        this._generateGeminiReport(incident, vehicle, distanceKm, timeMin, "Kuş uçuşu - trafik/hava kısıtlaması yok", false).then(text => {
                            incident.reports.push({
                                vehicle: vehicle.id,
                                type: vehicle.type,
                                distance: distanceKm,
                                time: timeMin,
                                text: text,
                                timestamp: Date.now()
                            });
                            document.dispatchEvent(new CustomEvent('incidentUpdated', { detail: { incidentId: incident.id } }));
                        });
                    } else {
                        // 1. Gerçek trafikli A* (traffic + weather multipliers)
                        result = aStar(this.graph, vehicle.nodeId, goalNode, this.trafficSimulator.weatherMultiplier, false);
                        // 2. Trafiksiz geometrik A* (ideal shortest path)
                        const idealResult = aStar(this.graph, vehicle.nodeId, goalNode, 1.0, true);
                        
                        if (result && result.path.length > 0) {
                            let pathDist = 0;
                            for (let i=0; i<result.path.length-1; i++) {
                                const n1 = this.graph.nodes.get(result.path[i]);
                                const n2 = this.graph.nodes.get(result.path[i+1]);
                                pathDist += this.graph.haversine(n1.lat, n1.lng, n2.lat, n2.lng);
                            }
                            const lastNode = this.graph.nodes.get(result.path[result.path.length-1]);
                            pathDist += this.graph.haversine(lastNode.lat, lastNode.lng, incident.lat, incident.lng);
                            
                            distanceKm = (pathDist / 1000).toFixed(2);
                            timeMin = Math.max(1, Math.ceil(result.distance / (vehicle.speed * 1000 / 60)));
                            
                            // Hava koşulları nedeniyle yaşanan zaman kaybı
                            const timeWithoutWeather = Math.max(1, Math.ceil((result.distance / this.trafficSimulator.weatherMultiplier) / (vehicle.speed * 1000 / 60)));
                            const timeLostDueToWeather = timeMin - timeWithoutWeather;
                            
                            let weatherText = "";
                            let detourTaken = false;
                            
                            if (idealResult && idealResult.path.length > 0) {
                                if (idealResult.path.join(',') !== result.path.join(',')) {
                                    detourTaken = true;
                                }
                            }
                            
                            if (timeLostDueToWeather > 0) {
                                const weatherName = this.trafficSimulator.weather === 'rain' ? 'yağmurlu' : (this.trafficSimulator.weather === 'snow' ? 'karlı' : 'olumsuz');
                                weatherText = `${weatherName} hava nedeniyle +${timeLostDueToWeather} dk gecikme.`;
                            }
                            
                            // Gemini API'yi asenkron çağırıyoruz
                            this._generateGeminiReport(incident, vehicle, distanceKm, timeMin, weatherText, detourTaken).then(text => {
                                incident.reports.push({
                                    vehicle: vehicle.id,
                                    type: vehicle.type,
                                    distance: distanceKm,
                                    time: timeMin,
                                    text: text,
                                    timestamp: Date.now()
                                });
                                document.dispatchEvent(new CustomEvent('incidentUpdated', { detail: { incidentId: incident.id } }));
                            });
                        }
                    }

                    if (result && result.path.length > 0) {
                        this._assignVehicleRoute(vehicle, result, incident.lat, incident.lng, incident, 'MOVING_TO_INCIDENT');
                        
                        document.dispatchEvent(new CustomEvent('vehicleDispatched', {
                            detail: { vehicle: vehicle.id, incident: incident.id, time: result.computeTime || 0 }
                        }));
                    }
                }
            }
        }

        // 3. Vehicle Updates
        let activeCount = 0;
        for (const vehicle of this.vehicles) {
            vehicle.tick(dt * this.speedMultiplier, this.trafficSimulator.weatherMultiplier);

            if (['MOVING_TO_INCIDENT', 'TRANSPORTING', 'RETURNING'].includes(vehicle.status)) {
                activeCount++;
            }

            // Tedavi bitti → ambulans hastaneye taşıma, itfaiye/drone üsse dönüş
            if (vehicle.status === 'AWAITING_TRANSPORT' || vehicle.status === 'AWAITING_RETURN') {
                const incident = vehicle.currentIncident;
                if (incident && incident.reports) {
                    let outcomeText = "";
                    if (vehicle.type === 'fire') {
                        const savedPeople = Math.floor(Math.random() * 5) + 1;
                        outcomeText = `İtfaiye müdahalesi tamamlandı. Yangın başarıyla söndürüldü ve binadan ${savedPeople} kişi sağ olarak kurtarıldı.`;
                    } else if (vehicle.type === 'ambulance') {
                        if (vehicle.status === 'AWAITING_TRANSPORT') {
                            if (Math.random() > 0.15) {
                                outcomeText = `Hastaya olay yerinde ilk müdahale yapıldı. Kişinin hayatı kurtarıldı, hastaneye nakli gerçekleştiriliyor.`;
                            } else {
                                outcomeText = `Hastaya olay yerinde acil müdahale edildi ancak kişi yolda vefat etti. Hastaneye intikal ediliyor.`;
                            }
                        } else {
                            outcomeText = `Sağlık ekipleri ayakta müdahale etti. Kişilerin sağlık durumu iyi, hastaneye sevk gerekmedi.`;
                        }
                    } else if (vehicle.type === 'drone') {
                        outcomeText = `Kargo drone'u acil tıbbi malzemeleri ulaştırdı. Kişinin hayatı kurtarıldı.`;
                    }
                    if (outcomeText) {
                        incident.reports.push({
                            vehicle: vehicle.id,
                            type: vehicle.type,
                            distance: 0,
                            time: 0,
                            text: outcomeText,
                            timestamp: Date.now(),
                            isOutcome: true
                        });
                        document.dispatchEvent(new CustomEvent('incidentUpdated', { detail: { incidentId: incident.id } }));
                    }
                }
            }

            if (vehicle.status === 'AWAITING_TRANSPORT') {
                // Ambulans: en yakın hastaneye git
                const hospital = this.emergencyManager.getBestHospital(vehicle.lat, vehicle.lng, this.graph);
                if (hospital && hospital.node) {
                    let result = aStar(this.graph, vehicle.nodeId, hospital.node, this.trafficSimulator.weatherMultiplier);
                    if (result && result.path.length > 0) {
                        this._assignVehicleRoute(vehicle, result, hospital.lat, hospital.lng, vehicle.currentIncident, 'TRANSPORTING');
                    } else {
                        this._resolveIncident(vehicle.currentIncident.id);
                        vehicle.status = 'IDLE';
                    }
                } else {
                    this._resolveIncident(vehicle.currentIncident.id);
                    vehicle.status = 'IDLE';
                }
            } else if (vehicle.status === 'AWAITING_RETURN') {
                // Olay çözüldü (taşıma gerekmiyorsa, tedavi bitince çözülür)
                if (vehicle.currentIncident) {
                    this._resolveIncident(vehicle.currentIncident.id);
                }

                // Üsse dön (ambulans → hastane, itfaiye → istasyon, drone → üs)
                const homeNode = vehicle.homeBase ? vehicle.homeBase.node : vehicle.baseNodeId;
                let result = null;
                
                if (vehicle.type === 'drone') {
                    // Drone direkt uçar
                    result = { path: [vehicle.nodeId, homeNode], computeTime: 0 };
                    const target = vehicle.homeBase || this.graph.nodes.get(homeNode);
                    this._assignVehicleRoute(vehicle, result, target.lat, target.lng, null, 'RETURNING');
                } else {
                    // Yolları kullanarak dön
                    result = aStar(this.graph, vehicle.nodeId, homeNode, this.trafficSimulator.weatherMultiplier);
                    if (result && result.path.length > 0) {
                        const target = vehicle.homeBase || this.graph.nodes.get(homeNode);
                        this._assignVehicleRoute(vehicle, result, target.lat, target.lng, null, 'RETURNING');
                    } else {
                        vehicle.status = 'IDLE';
                    }
                }
            }

            // Rota tamamlandı, temizle
            if (vehicle.status === 'IDLE' && vehicle.path.length > 0) {
                vehicle.path = [];
                this.renderer.clearRoute(vehicle.id);
            }
        }
        
        this.stats.activeVehicles = activeCount;

        // Dynamic Re-routing check (every 5 simulated seconds)
        if (!this.lastReRouteTime) this.lastReRouteTime = 0;
        this.lastReRouteTime += dt * this.speedMultiplier;
        if (this.lastReRouteTime >= 5.0) {
            this.lastReRouteTime = 0;
            this._performDynamicReRouting();
        }

        // 4. Coordinator Conflicts
        this.coordinator.checkConflicts();

        // 5. Render
        this.renderer.drawVehicles(this.vehicles);
        this.renderer.drawEmergencies(this.emergencyManager.queue);
        
        // Random emergencies
        const eventFreq = this.config?.simulation?.eventFreq || 15;
        if (Math.random() < eventFreq * this.speedMultiplier && this.emergencyManager.queue.length < 5) {
            const types = ['medical', 'fire', 'cargo', 'accident'];
            const t = types[Math.floor(Math.random() * types.length)];
            const nodeIds = Array.from(this.graph.nodes.keys());
            const randNode = this.graph.nodes.get(nodeIds[Math.floor(Math.random() * nodeIds.length)]);
            
            if (randNode) {
                this.emergencyManager.createIncident(randNode.lat, randNode.lng, t, null, `Otomatik ${t} ihbarı`);
            }
        }

        this.animationFrameId = requestAnimationFrame(this._loop.bind(this));
    }

    _resolveIncident(incidentId) {
        if (!incidentId) return;
        const inc = this.emergencyManager.completeIncident(incidentId);
        if (inc) {
            this.stats.resolved++;
            document.dispatchEvent(new CustomEvent('incidentResolved', { detail: inc }));
            document.dispatchEvent(new CustomEvent('incidentFullyResolved', { detail: { id: incidentId } }));
            document.dispatchEvent(new CustomEvent('emergencyResolved', { detail: inc }));
        }
    }

    async _assignVehicleRoute(vehicle, result, targetLat, targetLng, incident, newStatus) {
        if (vehicle.type === 'drone') {
            const coords = [
                { lat: vehicle.lat, lng: vehicle.lng },
                { lat: targetLat, lng: targetLng }
            ];
            vehicle.assignRoute(coords, incident, newStatus);
            this.renderer.drawRoute(vehicle.id, this.graph, coords, vehicle.type);
        } else {
            vehicle.status = 'FETCHING_ROUTE'; // Önemli: Asenkron işlem bitene kadar aracı beklemeye al
            
            if (newStatus === 'MOVING_TO_INCIDENT') {
                this.coordinator.applyGreenWave(this.graph, result.path);
            }

            // OSRM için A* düğüm koordinatlarını dizi olarak hazırla
            const pathCoords = [];
            // Başlangıç koordinatı olarak aracın anlık konumunu ekle
            pathCoords.push({ lat: vehicle.lat, lng: vehicle.lng });
            
            // A* rotasındaki ara düğüm koordinatlarını ekle
            for (let i = 0; i < result.path.length; i++) {
                const node = this.graph.nodes.get(result.path[i]);
                if (node) {
                    pathCoords.push({ lat: node.lat, lng: node.lng });
                }
            }
            // Hedef koordinatı ekle
            pathCoords.push({ lat: targetLat, lng: targetLng });

            // OSRM entegrasyonu (A* güzergahındaki düğümleri ara nokta olarak geçirerek gerçek yol eğrilerini al)
            let coords = await this._getDynamicRouteOSRM(pathCoords);
            
            if (!coords || coords.length === 0) {
                // OSRM başarısız olursa fall back olarak A* sonucunu kullan
                coords = result.path.map(id => {
                    const node = this.graph.nodes.get(id);
                    return { lat: node.lat, lng: node.lng };
                });
                coords.push({ lat: targetLat, lng: targetLng });
            }

            vehicle.assignRoute(coords, incident, newStatus);
            this.renderer.drawRoute(vehicle.id, this.graph, coords, vehicle.type);
        }
    }

    getRegionTrafficDensities() {
        const regionCenters = {
            'FSM Bulvarı': { lat: 40.2220, lng: 28.8790 },
            'İhsaniye': { lat: 40.2250, lng: 28.8910 },
            'Beşevler': { lat: 40.2100, lng: 28.8750 },
            'Görükle': { lat: 40.2180, lng: 28.8580 },
            'Özlüce': { lat: 40.2120, lng: 28.8950 }
        };

        const regionSums = {
            'FSM Bulvarı': 0, 'İhsaniye': 0, 'Beşevler': 0, 'Görükle': 0, 'Özlüce': 0
        };
        const regionCounts = {
            'FSM Bulvarı': 0, 'İhsaniye': 0, 'Beşevler': 0, 'Görükle': 0, 'Özlüce': 0
        };

        for (const [nodeId, edges] of this.graph.adjacencyList) {
            const fromNode = this.graph.nodes.get(nodeId);
            if (!fromNode) continue;

            for (const edge of edges) {
                const toNode = this.graph.nodes.get(edge.to);
                if (!toNode) continue;

                // Find closest region
                const midLat = (fromNode.lat + toNode.lat) / 2;
                const midLng = (fromNode.lng + toNode.lng) / 2;

                let minD = Infinity;
                let closestRegion = 'FSM Bulvarı';

                for (const [name, center] of Object.entries(regionCenters)) {
                    const d = this.graph.haversine(midLat, midLng, center.lat, center.lng);
                    if (d < minD) {
                        minD = d;
                        closestRegion = name;
                    }
                }

                regionSums[closestRegion] += edge.trafficMultiplier || 1.0;
                regionCounts[closestRegion]++;
            }
        }

        const densities = {};
        for (const name of Object.keys(regionCenters)) {
            const count = regionCounts[name];
            const avg = count > 0 ? regionSums[name] / count : 1.0;
            // Map average multiplier (1.0 to ~5.0) to density percentage (20% to 100%)
            const percentage = Math.min(100, Math.round(20 + (avg - 1.0) * 20));
            densities[name] = Math.max(10, percentage);
        }

        return densities;
    }

    async _getDynamicRouteOSRM(coordsArray) {
        if (!coordsArray || coordsArray.length < 2) return null;
        
        const waypoints = coordsArray.map(c => `${c.lng},${c.lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
        
        try {
            const res = await fetch(url);
            if (!res.ok) {
                console.error(`OSRM Routing Hatası: ${res.status}`);
                return null;
            }
            const data = await res.json();
            if (data && data.routes && data.routes.length > 0) {
                const coords = data.routes[0].geometry.coordinates; // [[lng, lat]]
                return coords.map(c => ({ lat: c[1], lng: c[0] }));
            }
        } catch(e) {
            console.error("OSRM Route Error", e);
        }
        return null;
    }

    _performDynamicReRouting() {
        for (const vehicle of this.vehicles) {
            if (vehicle.type === 'drone') continue; // Dronelar düz uçar, trafiğe takılmaz
            if (vehicle.status !== 'MOVING_TO_INCIDENT' && vehicle.status !== 'TRANSPORTING') continue;
            
            const incident = vehicle.currentIncident;
            let targetLat, targetLng, targetNode;
            
            if (vehicle.status === 'MOVING_TO_INCIDENT') {
                if (!incident) continue;
                targetLat = incident.lat;
                targetLng = incident.lng;
                targetNode = this.graph.getNearestNode(incident.lat, incident.lng);
            } else { // TRANSPORTING (Ambulans hastaneye gidiyor)
                const hospital = this.emergencyManager.getBestHospital(vehicle.lat, vehicle.lng, this.graph);
                if (!hospital || !hospital.node) continue;
                targetLat = hospital.lat;
                targetLng = hospital.lng;
                targetNode = hospital.node;
            }
            
            // Mevcut koordinatından hedefe yeni A* hesapla
            const currentNearestNode = this.graph.getNearestNode(vehicle.lat, vehicle.lng);
            if (!currentNearestNode || currentNearestNode === targetNode) continue;
            
            // Yeni rotayı hesapla (Trafik ağırlıklı)
            const newResult = aStar(this.graph, currentNearestNode, targetNode, this.trafficSimulator.weatherMultiplier, false);
            if (!newResult || newResult.path.length < 2) continue;
            
            // Eğer yeni bulunan yol daha hızlı/kısa ise rotayı güncelle
            // (Küçük oynamaları engellemek için mesafe farkı en az %15 olmalı veya yol tıkanmış olmalı)
            const currentRemainingDist = this._calculateRemainingPathDistance(vehicle);
            const newRouteDist = newResult.distance; // A* ağırlıklı mesafe (trafik çarpanları dahil)
            
            if (newRouteDist < currentRemainingDist * 0.85) {
                // Rota değişikliğini bildir ve ata
                console.log(`[Re-routing] Araç ${vehicle.id} için daha hızlı bir rota bulundu. Eski ağırlıklı kalan mesafe: ${Math.round(currentRemainingDist)}m, Yeni rota ağırlığı: ${Math.round(newRouteDist)}m.`);
                this._assignVehicleRoute(vehicle, newResult, targetLat, targetLng, incident, vehicle.status);
                
                // Kullanıcıya bildirim gönder
                if (typeof addNotification === 'function') {
                    addNotification('Alternatif Rota', `Araç ${vehicle.id} yoğun trafik nedeniyle alternatif rotaya yönlendirildi.`, 'info');
                }
            }
        }
    }

    _calculateRemainingPathDistance(vehicle) {
        if (!vehicle.path || vehicle.path.length === 0) return Infinity;
        let dist = 0;
        
        // Mevcut pozisyondan bir sonraki yol noktasına olan mesafe
        const nextNode = vehicle.path[vehicle.pathIndex + 1];
        if (nextNode) {
            dist += this.graph.haversine(vehicle.lat, vehicle.lng, nextNode.lat, nextNode.lng);
        }
        
        // Geri kalan yol noktaları arasındaki mesafeler
        for (let i = vehicle.pathIndex + 1; i < vehicle.path.length - 1; i++) {
            const p1 = vehicle.path[i];
            const p2 = vehicle.path[i+1];
            dist += this.graph.haversine(p1.lat, p1.lng, p2.lat, p2.lng);
        }
        return dist;
    }

    async _generateGeminiReport(incident, vehicle, distance, timeMin, weatherText, detourTaken) {
        const apiKey = this.config?.apiKeys?.gemini;
        const vName = vehicle.type === 'ambulance' ? `Ambulans ${vehicle.id}` : (vehicle.type === 'fire' ? `İtfaiye ${vehicle.id}` : `Drone ${vehicle.id}`);
        
        let defaultText = `${vName}, hedefe ${distance}km mesafeyi tahmini ${timeMin} dakikada kat edecektir.`;
        if (detourTaken) defaultText += ` Alternatif rota kullanıldı.`;
        if (weatherText) defaultText += ` ${weatherText}`;
        
        if (!apiKey) return defaultText;

        const prompt = `Sen Bursa Nilüfer bölgesi için bir yapay zeka acil durum sevk asistanısın. Şu an gerçekleşen bir '${incident.type}' acil durumu için çok kısa (maksimum 2 cümle) ve profesyonel bir sevk görev raporu yaz. Araç: ${vName}, Hedefe Mesafe: ${distance}km, Tahmini Varış Süresi: ${timeMin} dakika. Alternatif Rota Kullanımı: ${detourTaken ? 'Evet' : 'Hayır'}. Hava Durumu Etkisi: ${weatherText ? weatherText : 'Yok'}. Gereksiz kelime kullanma, doğrudan raporu ver.`;

        try {
            const modelName = 'gemini-1.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{ parts: [{ text: prompt }] }]
            };
            
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (data.error) {
                console.error("Gemini API Error details:", {
                    url: url.replace(apiKey, "HIDDEN_API_KEY"),
                    modelName: modelName,
                    payload: payload,
                    errorResponse: data.error
                });
                return `(API Hatası: ${data.error.message || 'Yetki/Limit hatası'}) ${defaultText}`;
            }
            
            if (data.candidates && data.candidates.length > 0) {
                return data.candidates[0].content.parts[0].text.trim();
            }
        } catch(e) {
            console.error("Gemini API Error", e);
        }
        return defaultText;
    }

    async _analyzeSystemStateGemini() {
        const apiKey = this.config?.apiKeys?.gemini;
        if (!apiKey) return "Gemini API anahtarı ayarlanmamış. Analiz yapılamıyor.";

        const activeVehicles = this.vehicles.filter(v => ['MOVING_TO_INCIDENT', 'TRANSPORTING', 'RETURNING'].includes(v.status)).length;
        const pendingIncidents = this.emergencyManager.queue.length;
        const weatherCondition = this.trafficSimulator?.weatherMultiplier > 1.0 ? "Yağışlı/Karlı" : "Açık";
        const trafficStatus = "Orta"; // Yoğunluk özetlenebilir ama şimdilik statik tutalım
        
        const prompt = `Sen akıllı şehir simülasyonu için bir analiz yapay zekasısın. Şu anki simülasyon durumu:
- Aktif Olay Sayısı: ${pendingIncidents}
- Hareket Halindeki Araç Sayısı: ${activeVehicles}
- Hava Durumu: ${weatherCondition}
- Çözülmüş Toplam Olay: ${this.stats.resolved}
Bu verilere bakarak, sistemin anlık performansını ve dikkat edilmesi gereken noktaları 2 cümleyi geçmeyecek kısa, net ve profesyonel bir rapor halinde sun.`;

        try {
            const modelName = 'gemini-1.5-flash';
            const url = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${apiKey}`;
            const payload = {
                contents: [{ parts: [{ text: prompt }] }]
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            
            if (data.error) {
                console.error("Gemini System Analysis API Error details:", {
                    url: url.replace(apiKey, "HIDDEN_API_KEY"),
                    modelName: modelName,
                    payload: payload,
                    errorResponse: data.error
                });
                return `API Hatası: ${data.error.message || 'Geçersiz API Anahtarı veya limit aşıldı.'}`;
            }
            
            if (data.candidates && data.candidates.length > 0) {
                return data.candidates[0].content.parts[0].text.trim();
            }
        } catch(e) {
            console.error("Gemini API Error (System Analysis)", e);
            return "Analiz alınırken hata oluştu (Ağ veya CORS sorunu olabilir).";
        }
        return "Bilinmeyen bir hata nedeniyle analiz üretilemedi. Lütfen API Anahtarınızı kontrol edin.";
    }
}

window.Simulation = Simulation;

