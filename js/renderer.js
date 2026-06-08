// renderer.js
class Renderer {
    constructor(mapId) {
        this.map = L.map(mapId, { zoomControl: false });
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);
        
        // CartoDB Dark Matter tile layer
        this.tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            attribution: '© OpenStreetMap contributors, © CartoDB'
        }).addTo(this.map);

        this.vehicleMarkers = new Map();
        this.emergencyMarkers = new Map();
        this.routeLayers = new Map();
        this.facilityMarkers = []; // hastane, itfaiye markerları
        this.trafficHeatLayer = null;
        this.trafficLayerVisible = false;
        this.trafficPolylines = []; // trafik yoğunluk çizgileri
        this.heatmapLayerVisible = false;
        this.zoneLayers = [];
        this.zonesVisible = false;
        this.routesVisible = true;
        
        this.icons = {
            ambulance: this._createIcon('ambulance', '#00bfff'),
            fire: this._createIcon('fire-extinguisher', '#ff6600'),
            drone: this._createIcon('helicopter', '#a855f7'),
            emergency_RED: this._createEmergencyIcon('#ff2d2d'),
            emergency_YELLOW: this._createEmergencyIcon('#ffd600'),
            emergency_GREEN: this._createEmergencyIcon('#00c851'),
            hospital: this._createFacilityIcon('hospital', '#00e5ff', '🏥'),
            fireStation: this._createFacilityIcon('fire-extinguisher', '#ff4500', '🚒'),
            droneStation: this._createFacilityIcon('helicopter', '#a855f7', '🛩️')
        };
    }

    _createIcon(faClass, color) {
        return L.divIcon({
            className: 'custom-marker',
            html: `<div style="color: ${color}; font-size: 16px; filter: drop-shadow(0 0 5px ${color});"><i class="fas fa-${faClass}"></i></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
    }

    _createEmergencyIcon(color) {
        return L.divIcon({
            className: 'emergency-marker pulse-animation',
            html: `<div style="color: ${color}; font-size: 16px; filter: drop-shadow(0 0 8px ${color});"><i class="fas fa-exclamation-triangle"></i></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });
    }

    _createFacilityIcon(faClass, color, emoji) {
        return L.divIcon({
            className: 'facility-marker',
            html: `<div style="
                background: rgba(0,0,0,0.7);
                border: 2px solid ${color};
                border-radius: 50%;
                width: 32px; height: 32px;
                display: flex; align-items: center; justify-content: center;
                font-size: 16px;
                box-shadow: 0 0 12px ${color};
            ">${emoji}</div>`,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
        });
    }

    initBounds(bounds) {
        if (bounds.minLat !== Infinity) {
            this.map.fitBounds([
                [bounds.minLat, bounds.minLng],
                [bounds.maxLat, bounds.maxLng]
            ]);
        }
    }

    // Hastaneleri, itfaiye ve drone istasyonlarını haritada göster
    drawFacilities(emergencyManager) {
        // Önceki markerları temizle
        this.facilityMarkers.forEach(m => this.map.removeLayer(m));
        this.facilityMarkers = [];

        // Hastaneler
        for (const h of emergencyManager.hospitals) {
            const marker = L.marker([h.lat, h.lng], { icon: this.icons.hospital })
                .bindPopup(`<b>🏥 ${h.name}</b><br>Kapasite: ${h.capacity}<br>Ambulans üssü`)
                .addTo(this.map);
            this.facilityMarkers.push(marker);
        }

        // İtfaiye İstasyonları
        for (const f of emergencyManager.fireStations) {
            const marker = L.marker([f.lat, f.lng], { icon: this.icons.fireStation })
                .bindPopup(`<b>🚒 ${f.name}</b><br>Kapasite: ${f.capacity}<br>İtfaiye üssü`)
                .addTo(this.map);
            this.facilityMarkers.push(marker);
        }

        // Drone İstasyonları
        for (const d of emergencyManager.droneStations) {
            const marker = L.marker([d.lat, d.lng], { icon: this.icons.droneStation })
                .bindPopup(`<b>🛩️ ${d.name}</b><br>Kapasite: ${d.capacity}<br>Drone üssü`)
                .addTo(this.map);
            this.facilityMarkers.push(marker);
        }
    }

    drawVehicles(vehicles) {
        for (const v of vehicles) {
            const pos = v.getPosition();
            const statusText = {
                'IDLE': 'Beklemede',
                'MOVING_TO_INCIDENT': 'Olaya Gidiyor',
                'TREATING': 'Müdahale Ediyor',
                'TRANSPORTING': 'Hastaneye Taşıyor',
                'RETURNING': 'Üsse Dönüyor',
                'AWAITING_TRANSPORT': 'Taşıma Bekliyor',
                'AWAITING_RETURN': 'Dönüş Bekliyor'
            }[v.status] || v.status;

            if (this.vehicleMarkers.has(v.id)) {
                const marker = this.vehicleMarkers.get(v.id);
                marker.setLatLng([pos.lat, pos.lng]);
                marker.setPopupContent(`<b>${v.id}</b><br>${statusText}<br>Hız: ${Math.round(v.currentDynamicSpeed || v.speed)} km/h`);
            } else {
                const marker = L.marker([pos.lat, pos.lng], { icon: this.icons[v.type] })
                    .bindPopup(`<b>${v.id}</b><br>${statusText}`)
                    .addTo(this.map);
                this.vehicleMarkers.set(v.id, marker);
            }
        }
    }

    drawEmergencies(queue) {
        const activeIds = new Set(queue.filter(e => e.status !== 'RESOLVED').map(e => e.id));
        for (const [id, marker] of this.emergencyMarkers) {
            if (!activeIds.has(id)) {
                this.map.removeLayer(marker);
                this.emergencyMarkers.delete(id);
            }
        }

        for (const e of queue) {
            if (e.status !== 'RESOLVED' && !this.emergencyMarkers.has(e.id)) {
                const iconKey = `emergency_${e.triage}`;
                const marker = L.marker([e.lat, e.lng], { icon: this.icons[iconKey] })
                    .bindPopup(`<b>${e.type.toUpperCase()}</b><br>${e.desc}<br>Öncelik: ${e.triage}`)
                    .addTo(this.map);
                this.emergencyMarkers.set(e.id, marker);
            }
        }
    }

    drawRoute(vehicleId, graph, pathIds, type) {
        if (this.routeLayers.has(vehicleId)) {
            this.map.removeLayer(this.routeLayers.get(vehicleId));
        }

        if (!pathIds || pathIds.length === 0) return;
        if (!this.routesVisible) return;

        const latlngs = pathIds.map(coord => {
            if (typeof coord === 'string') {
                const node = graph.nodes.get(coord);
                return node ? [node.lat, node.lng] : null;
            }
            return coord && coord.lat !== undefined ? [coord.lat, coord.lng] : null;
        }).filter(x => x);

        const color = type === 'ambulance' ? '#00bfff' : type === 'fire' ? '#ff6600' : '#a855f7';
        
        const polyline = L.polyline(latlngs, {
            color: color,
            weight: 4,
            opacity: 0.8,
            dashArray: '5, 10',
            className: 'route-glow-line'
        }).addTo(this.map);

        this.routeLayers.set(vehicleId, polyline);
    }
    
    clearRoute(vehicleId) {
        if (this.routeLayers.has(vehicleId)) {
            this.map.removeLayer(this.routeLayers.get(vehicleId));
            this.routeLayers.delete(vehicleId);
        }
    }

    // Trafik yoğunluk katmanı - edge bazlı renklendirme
    toggleTrafficLayer(graph, trafficSimulator) {
        this.trafficLayerVisible = !this.trafficLayerVisible;

        if (!this.trafficLayerVisible) {
            this._clearTrafficLayer();
            return false;
        }

        this._drawTrafficLayer(graph, trafficSimulator);
        return true;
    }

    _drawTrafficLayer(graph, trafficSimulator) {
        this._clearTrafficLayer();

        for (const [nodeId, edges] of graph.adjacencyList) {
            const fromNode = graph.nodes.get(nodeId);
            if (!fromNode) continue;

            for (const edge of edges) {
                const toNode = graph.nodes.get(edge.to);
                if (!toNode) continue;

                const mult = edge.trafficMultiplier || 1.0;
                let color, weight, opacity;

                if (mult >= 3.0) {
                    color = '#ff0000'; weight = 6; opacity = 0.9; // Çok yoğun
                } else if (mult >= 2.0) {
                    color = '#ff6600'; weight = 5; opacity = 0.8; // Yoğun
                } else if (mult >= 1.5) {
                    color = '#ffcc00'; weight = 4; opacity = 0.7; // Orta
                } else {
                    continue; // Yeşil yolları çizmeyelim, haritanın kendi yolları gözüksün
                }

                const line = L.polyline(
                    [[fromNode.lat, fromNode.lng], [toNode.lat, toNode.lng]],
                    { color, weight, opacity, className: 'traffic-line' }
                ).addTo(this.map);

                line.bindPopup(`Trafik Yoğunluğu: ${mult.toFixed(1)}x`);
                this.trafficPolylines.push(line);
            }
        }

    }

    updateTrafficLayer(graph, trafficSimulator) {
        if (this.trafficLayerVisible) {
            this._drawTrafficLayer(graph, trafficSimulator);
        }
    }

    _clearTrafficLayer() {
        this.trafficPolylines.forEach(l => this.map.removeLayer(l));
        this.trafficPolylines = [];
    }

    toggleRoutesLayer(vehicles, graph) {
        this.routesVisible = !this.routesVisible;
        
        for (const layer of this.routeLayers.values()) {
            this.map.removeLayer(layer);
        }
        this.routeLayers.clear();

        if (this.routesVisible) {
            for (const v of vehicles) {
                if (v.path && v.path.length > 0 && v.pathIndex < v.path.length - 1) {
                    const pathLeft = v.path.slice(v.pathIndex);
                    this.drawRoute(v.id, graph, pathLeft, v.type);
                }
            }
        }
        return this.routesVisible;
    }

    toggleHeatmapLayer(graph, trafficSimulator) {
        this.heatmapLayerVisible = !this.heatmapLayerVisible;
        if (!this.heatmapLayerVisible) {
            if (this.trafficHeatLayer) {
                this.map.removeLayer(this.trafficHeatLayer);
                this.trafficHeatLayer = null;
            }
            return false;
        }
        this._drawHeatmapLayer(graph, trafficSimulator);
        return true;
    }

    _drawHeatmapLayer(graph, trafficSimulator) {
        if (this.trafficHeatLayer) {
            this.map.removeLayer(this.trafficHeatLayer);
        }
        
        const points = [];
        for (const [nodeId, edges] of graph.adjacencyList) {
            const fromNode = graph.nodes.get(nodeId);
            if (!fromNode) continue;
            for (const edge of edges) {
                const mult = edge.trafficMultiplier || 1.0;
                if (mult > 1.2) {
                    const toNode = graph.nodes.get(edge.to);
                    if (toNode) {
                        const lat = (fromNode.lat + toNode.lat) / 2;
                        const lng = (fromNode.lng + toNode.lng) / 2;
                        const intensity = Math.min((mult - 1.0) / 4.0, 1.0);
                        points.push([lat, lng, intensity]);
                    }
                }
            }
        }
        
        if (typeof L.heatLayer === 'function' && points.length > 0) {
            this.trafficHeatLayer = L.heatLayer(points, {
                radius: 35,
                blur: 20,
                maxZoom: 18,
                gradient: { 0.2: 'blue', 0.4: 'cyan', 0.6: 'lime', 0.8: 'yellow', 1.0: 'red' }
            }).addTo(this.map);
        }
    }

    updateHeatmapLayer(graph, trafficSimulator) {
        if (this.heatmapLayerVisible) {
            this._drawHeatmapLayer(graph, trafficSimulator);
        }
    }

    toggleZonesLayer(densities) {
        this.zonesVisible = !this.zonesVisible;
        if (!this.zonesVisible) {
            this._clearZonesLayer();
            return false;
        }
        this._drawZonesLayer(densities);
        return true;
    }

    _drawZonesLayer(densities) {
        this._clearZonesLayer();
        
        const regionCenters = {
            'FSM Bulvarı': { lat: 40.2220, lng: 28.8790, radius: 450 },
            'İhsaniye': { lat: 40.2250, lng: 28.8910, radius: 400 },
            'Beşevler': { lat: 40.2100, lng: 28.8750, radius: 500 },
            'Görükle': { lat: 40.2180, lng: 28.8580, radius: 400 },
            'Özlüce': { lat: 40.2120, lng: 28.8950, radius: 450 }
        };

        for (const [name, info] of Object.entries(regionCenters)) {
            const density = densities[name] || 30;
            let color = '#00ff88';
            if (density >= 70) color = '#ff3366';
            else if (density >= 50) color = '#ff8c00';
            else if (density >= 35) color = '#fbbf24';

            const circle = L.circle([info.lat, info.lng], {
                radius: info.radius,
                color: color,
                fillColor: color,
                fillOpacity: 0.15,
                weight: 2,
                dashArray: '5, 5'
            }).addTo(this.map);

            circle.bindPopup(`<b>${name} Bölgesi</b><br>Trafik Yoğunluğu: %${density}`);
            this.zoneLayers.push(circle);
        }
    }

    updateZonesLayer(densities) {
        if (this.zonesVisible) {
            this._drawZonesLayer(densities);
        }
    }

    _clearZonesLayer() {
        this.zoneLayers.forEach(z => this.map.removeLayer(z));
        this.zoneLayers = [];
    }

    // Eski drawHospitals uyumluluk
    drawHospitals(hospitals) {
        // drawFacilities kullanılıyor artık
    }
}
