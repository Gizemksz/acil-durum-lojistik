// traffic.js
class TrafficSimulator {
    constructor(graph) {
        this.graph = graph;
        this.tick = 0;
        this.incidents = [];
        this.rushHourFactor = 1.0;
        this.weatherMultiplier = 1.0;
        this.model = null;
        this.loadModel();
    }

    async loadModel() {
        try {
            if (window.tf) {
                this.model = await tf.loadLayersModel('data/tfjs_model/model.json');
                console.log("TF.js trafik tahmin modeli başarıyla yüklendi.");
            }
        } catch (e) {
            console.warn("TF.js tahmin modeli (data/tfjs_model/model.json) henüz mevcut değil. Varsayılan süreler kullanılacak.");
        }
    }

    update() {
        this.tick++;
        this._decayIncidents();
        
        // 5% chance of a random incident if not too many already
        if (Math.random() < 0.05 && this.incidents.length < 10) {
            this._createRandomIncident();
        }
        
        this._applyTraffic();
    }

    _createRandomIncident() {
        if(this.graph.nodes.size === 0) return;
        
        // Pick a random node, then a random edge from it
        const nodeIds = Array.from(this.graph.nodes.keys());
        const randomNode = nodeIds[Math.floor(Math.random() * nodeIds.length)];
        const edges = this.graph.adjacencyList.get(randomNode);
        
        if (edges && edges.length > 0) {
            const edge = edges[Math.floor(Math.random() * edges.length)];
            if(edge.incident) return; // already has an incident

            const severity = 1.5 + Math.random() * 3.5; // 1.5x - 5.0x slower
            let duration = 50 + Math.floor(Math.random() * 100); // in ticks

            // TensorFlow.js modeli yüklüyse tıkanıklık süresini dinamik tahmin et
            if (this.model && window.tf) {
                try {
                    // Örnek Input: [weatherMultiplier, severity, hour]
                    const hour = new Date().getHours();
                    const inputTensor = tf.tensor2d([[this.weatherMultiplier, severity, hour]]);
                    const prediction = this.model.predict(inputTensor);
                    const predictedDuration = prediction.dataSync()[0];
                    
                    duration = Math.max(20, Math.floor(predictedDuration)); // en az 20 tick
                    
                    inputTensor.dispose();
                    prediction.dispose();
                } catch (e) {
                    console.warn("TF.js Tahmin hatası, varsayılan süre kullanılıyor:", e);
                }
            }

            this.incidents.push({ edge, severity, remaining: duration, from: randomNode, to: edge.to });
            edge.trafficMultiplier = severity;
            edge.incident = true;
            
            // Dispatch event for UI
            document.dispatchEvent(new CustomEvent('trafficIncidentAdded', {
                detail: { from: randomNode, to: edge.to, severity, duration }
            }));
        }
    }

    _decayIncidents() {
        this.incidents = this.incidents.filter(inc => {
            inc.remaining--;
            if (inc.remaining <= 0) {
                inc.edge.trafficMultiplier = this.rushHourFactor;
                inc.edge.incident = false;
                return false;
            }
            return true;
        });
    }

    _applyTraffic() {
        // Apply rush hour baseline to all edges
        for (const edges of this.graph.adjacencyList.values()) {
            for (const edge of edges) {
                if (!edge.incident) {
                    edge.trafficMultiplier = this.rushHourFactor;
                }
            }
        }
    }

    setRushHour(active) {
        this.rushHourFactor = active ? 1.8 : 1.0;
        this._applyTraffic();
    }
    
    setWeather(multiplier) {
        this.weatherMultiplier = multiplier;
    }
}
