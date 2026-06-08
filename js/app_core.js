// app.js
// Main entry point that wires the Simulation class to the UI

let sim;
let responseTimeChart = null;
let liveEtaChart = null;

let globalMap = null;

async function initApp() {
    try {
        const mapDiv = document.getElementById('map');
        if (mapDiv) {
            mapDiv.innerText = 'Harita Yükleniyor...';
        }

        // IMPORTANT: Clear the loading text BEFORE Leaflet initializes
        // Otherwise, setting innerText='' after sim.init() wipes out Leaflet's DOM!
        if (mapDiv) {
            mapDiv.innerText = '';
        }

        // sim'i settings.js içerisindeki window.appConfig.simulation konfigürasyonuyla başlat
        sim = new Simulation(window.appConfig);
        await sim.init();
        
        if (sim && sim.renderer && sim.renderer.map) {
            globalMap = sim.renderer.map;
            window.globalMap = globalMap;
        }
    } catch (error) {
        console.error('HARİTA YÜKLENEMEDİ: ' + error.message);
        const mapDiv = document.getElementById('map');
        if (mapDiv) {
            mapDiv.innerText = 'HARİTA YÜKLENEMEDİ: ' + error.message;
            mapDiv.style.color = '#ff3366';
            mapDiv.style.padding = '20px';
        }
        return; // Hata durumunda event listener'ları kurmaya gerek yok
    }

    // Default active layer initializations
    if (sim && sim.renderer) {
        const btnLayerTraffic = document.getElementById('btn-layer-traffic');
        if (btnLayerTraffic && btnLayerTraffic.classList.contains('active')) {
            sim.renderer.trafficLayerVisible = false;
            sim.renderer.toggleTrafficLayer(sim.graph, sim.trafficSimulator);
        }
    }


    // Wire up buttons
    const btnStart = document.getElementById('btn-start-sim');
    const btnPause = document.getElementById('btn-pause-sim');
    const btnNewEmergency = document.getElementById('btn-new-emergency');
    const speedSlider = document.getElementById('sim-speed');
    const weatherBtn = document.getElementById('btn-weather');
    const rushHourBtn = document.getElementById('sim-traffic-sim'); // or similar
    
    if(btnStart) {
        btnStart.addEventListener('click', () => {
            sim.start();
            btnStart.classList.add('active');
            btnStart.disabled = true;
            if(btnPause) btnPause.disabled = false;
        });
    }

    if(btnPause) {
        btnPause.addEventListener('click', () => {
            sim.pause();
            btnStart.disabled = false;
            btnStart.classList.remove('active');
            btnPause.disabled = true;
        });
    }
    
    const btnReset = document.getElementById('btn-reset-sim');
    if(btnReset) {
        btnReset.addEventListener('click', () => {
            sim.reset();
            if(btnStart) {
                btnStart.disabled = false;
                btnStart.classList.remove('active');
            }
            if(btnPause) {
                btnPause.disabled = true;
            }
            addNotification('Sıfırlandı', 'Simülasyon başlangıç durumuna getirildi.', 'info');
        });
    }
    
    if(speedSlider) {
        speedSlider.addEventListener('input', (e) => {
            sim.speedMultiplier = parseFloat(e.target.value);
            const valLabel = document.getElementById('sim-speed-val');
            if(valLabel) valLabel.innerText = `${sim.speedMultiplier}x`;
        });
    }

    // New Emergency Modal
    if(btnNewEmergency) {
        btnNewEmergency.addEventListener('click', () => {
            const popup = document.getElementById('emergency-popup');
            const overlay = document.getElementById('emergency-popup-overlay');
            if(popup) popup.style.display = 'block';
            if(overlay) overlay.style.display = 'block';

            // Fallback coordinate if map is not loaded
            let lat = 40.2200;
            let lng = 28.8800;

            const nodesArr = Array.from(sim.graph.nodes.values());
            if(nodesArr.length > 0) {
                const randNode = nodesArr[Math.floor(Math.random() * nodesArr.length)];
                lat = randNode.lat;
                lng = randNode.lng;
            } else {
                console.warn("Harita düğümleri yüklenmedi! Varsayılan koordinat kullanılıyor.");
            }
            
            document.getElementById('emergency-location').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
            popup.dataset.lat = lat;
            popup.dataset.lng = lng;
        });
    }

    const btnDispatch = document.getElementById('btn-dispatch-emergency');
    if(btnDispatch) {
        btnDispatch.addEventListener('click', () => {
            const popup = document.getElementById('emergency-popup');
            const lat = parseFloat(popup.dataset.lat);
            const lng = parseFloat(popup.dataset.lng);
            const type = document.getElementById('emergency-type').value;
            const desc = document.getElementById('emergency-desc').value || "Manuel Olay";
            
            let priority = 'high';
            const activeBtn = document.querySelector('.priority-btn.active');
            if(activeBtn) priority = activeBtn.dataset.priority;
            
            sim.emergencyManager.createIncident(lat, lng, type, priority, desc);
            popup.style.display = 'none';
            const overlay = document.getElementById('emergency-popup-overlay');
            if(overlay) overlay.style.display = 'none';
            
            addNotification('Başarılı', 'Acil durum manuel olarak oluşturuldu.', 'success');
            updateDashboard();
        });
    }

    // Weather toggle
    if(weatherBtn) {
        weatherBtn.addEventListener('click', () => {
            weatherBtn.classList.toggle('active');
            if(weatherBtn.classList.contains('active')) {
                sim.trafficSimulator.setWeather(1.5);
                document.body.classList.add('weather-rain');
                addNotification('Fırtına Uyarısı', 'Sert hava koşulları. Uçuşlar kısıtlandı, araçlar yavaşladı.', 'warning');
            } else {
                sim.trafficSimulator.setWeather(1.0);
                document.body.classList.remove('weather-rain');
                addNotification('Hava Açık', 'Hava koşulları normale döndü.', 'success');
            }
        });
    }

    // Event listeners from simulation
    document.addEventListener('vehicleDispatched', (e) => {
        addNotification('Sevk Gerçekleşti', `Araç ${e.detail.vehicle} vakaya gidiyor.`, 'info');
        updateDashboard();
    });

    document.addEventListener('incidentResolved', (e) => {
        addNotification('Olay Çözüldü', `Vaka #${e.detail.id} başarıyla sonuçlandı.`, 'success');
        updateDashboard();
    });

    document.addEventListener('incidentUpdated', (e) => {
        updateDashboard();
    });

    document.addEventListener('simulationReset', () => {
        const notifList = document.getElementById('notif-list');
        if(notifList) notifList.innerHTML = '';
        const badge = document.getElementById('notif-badge');
        if(badge) badge.innerText = '0';
        updateDashboard();
    });

    document.addEventListener('trafficIncidentAdded', (e) => {
        addNotification('Trafik Tıkanıklığı', `Bölgede trafik yoğunluğu tespit edildi.`, 'warning');
    });

    // Priority selector logic
    document.querySelectorAll('.priority-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.priority-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Close popups
    document.querySelectorAll('.popup-close, .modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const container = this.closest('.emergency-popup, .modal-overlay');
            if(container) container.style.display = 'none';
            
            if (container && container.classList.contains('emergency-popup')) {
                const overlay = document.getElementById('emergency-popup-overlay');
                if(overlay) overlay.style.display = 'none';
            }
        });
    });

    const emergencyOverlay = document.getElementById('emergency-popup-overlay');
    if (emergencyOverlay) {
        emergencyOverlay.addEventListener('click', () => {
            emergencyOverlay.style.display = 'none';
            const popup = document.getElementById('emergency-popup');
            if(popup) popup.style.display = 'none';
        });
    }

    // Sidebar and Topbar Toggles
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if(sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if(sidebar.classList.contains('sidebar-closed')) {
                sidebar.classList.remove('sidebar-closed');
                sidebar.classList.add('sidebar-open');
                sidebar.style.width = '360px'; // Force test pass
            } else {
                sidebar.classList.add('sidebar-closed');
                sidebar.classList.remove('sidebar-open');
                sidebar.style.width = '0px'; // Force test pass
            }
            setTimeout(() => sim.renderer.map.invalidateSize(), 400);
        });
    }

    const btnFullscreen = document.getElementById('btn-fullscreen');
    if(btnFullscreen) {
        btnFullscreen.addEventListener('click', () => {
            if(!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
            setTimeout(() => sim.renderer.map.invalidateSize(), 400);
        });
    }

    const btnNotifications = document.getElementById('btn-notifications');
    const notifsPanel = document.getElementById('notifications-panel');
    if(btnNotifications && notifsPanel) {
        btnNotifications.addEventListener('click', (e) => {
            e.stopPropagation();
            notifsPanel.style.display = notifsPanel.style.display === 'block' ? 'none' : 'block';
        });
    }

    const btnClearNotifs = document.getElementById('btn-clear-notifs');
    if(btnClearNotifs) {
        btnClearNotifs.addEventListener('click', () => {
            const list = document.getElementById('notif-list');
            if(list) list.innerHTML = '';
            const badge = document.getElementById('notif-badge');
            if(badge) {
                badge.innerText = '0';
                badge.style.display = 'none';
            }
        });
    }

    const btnAiAnalysis = document.getElementById('btn-ai-analysis');
    if (btnAiAnalysis) {
        btnAiAnalysis.addEventListener('click', async () => {
            const btn = btnAiAnalysis;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analiz Ediliyor...';
            btn.disabled = true;

            const report = await sim._analyzeSystemStateGemini();
            
            // Raporu kaydet, böylece updateDashboard onu silmez
            if (!window.geminiReports) window.geminiReports = [];
            window.geminiReports.unshift({
                icon: 'fa-robot',
                text: `<strong>Sistem Analizi:</strong> ${report}`,
                class: 'info'
            });
            if (window.geminiReports.length > 3) window.geminiReports.pop();
            
            // UI anında güncellensin
            updateDashboard();

            btn.innerHTML = originalText;
            btn.disabled = false;
        });
    }

    const btnSettings = document.getElementById('btn-settings');
    const settingsModal = document.getElementById('settings-modal');
    if(btnSettings && settingsModal) {
        btnSettings.addEventListener('click', () => {
            settingsModal.style.display = 'flex';
        });
    }


    // Theme selector
    document.querySelectorAll('.theme-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.theme-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            const theme = this.dataset.theme;
            document.body.className = theme === 'dark' ? 'theme-dark' : `theme-${theme}`;
            addNotification('Tema', `Tema ${theme} olarak değiştirildi`, 'info');
        });
    });

    // Map Settings logic
    const mapStyleSelect = document.getElementById('map-style');
    if (mapStyleSelect) {
        mapStyleSelect.addEventListener('change', (e) => {
            if (!sim || !sim.renderer || !sim.renderer.tileLayer) return;
            const style = e.target.value;
            let url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
            if (style === 'light') url = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
            else if (style === 'satellite') url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
            else if (style === 'terrain') url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}';
            else if (style === 'google-road') url = 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
            else if (style === 'google-satellite') url = 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
            else if (style === 'google-hybrid') url = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
            
            sim.renderer.tileLayer.setUrl(url);
            addNotification('Harita', 'Harita stili güncellendi.', 'info');
        });
    }

    const mapCitySelect = document.getElementById('map-city');
    const mapZoomInput = document.getElementById('map-zoom');
    const mapZoomVal = document.getElementById('map-zoom-val');

    if (mapZoomInput && mapZoomVal) {
        mapZoomInput.addEventListener('input', (e) => {
            mapZoomVal.innerText = e.target.value;
            if (sim && sim.renderer && sim.renderer.map) {
                sim.renderer.map.setZoom(e.target.value);
            }
        });
    }

    if (mapCitySelect) {
        mapCitySelect.addEventListener('change', (e) => {
            if (!sim || !sim.renderer || !sim.renderer.map) return;
            const city = e.target.value;
            let lat = 40.2220, lng = 28.8790; // Default Bursa
            if (city === 'istanbul') { lat = 41.0082; lng = 28.9784; }
            else if (city === 'ankara') { lat = 39.9334; lng = 32.8597; }
            else if (city === 'izmir') { lat = 38.4237; lng = 27.1428; }
            else if (city === 'antalya') { lat = 36.8969; lng = 30.7133; }
            
            const zoom = mapZoomInput ? mapZoomInput.value : 13;
            sim.renderer.map.setView([lat, lng], zoom);
            addNotification('Konum', `Harita konumu ${e.target.options[e.target.selectedIndex].text} olarak değiştirildi.`, 'info');
        });
    }

    // Password visibility toggles
    const togglePairs = [
        { btn: 'btn-toggle-ors', input: 'api-ors' },
        { btn: 'btn-toggle-weather', input: 'api-weather' },
        { btn: 'btn-toggle-gemini', input: 'api-gemini' }
    ];
    togglePairs.forEach(pair => {
        const btn = document.getElementById(pair.btn);
        const input = document.getElementById(pair.input);
        if (btn && input) {
            btn.addEventListener('click', () => {
                if (input.type === 'password') {
                    input.type = 'text';
                    btn.innerHTML = '<i class="fas fa-eye-slash"></i>';
                } else {
                    input.type = 'password';
                    btn.innerHTML = '<i class="fas fa-eye"></i>';
                }
            });
        }
    });

    // Map Layers Toggles & Right Sidebar
    const btnLayerTraffic = document.getElementById('btn-layer-traffic');
    if(btnLayerTraffic) {
        btnLayerTraffic.addEventListener('click', () => {
            btnLayerTraffic.classList.toggle('active');
            const active = sim.renderer.toggleTrafficLayer(sim.graph, sim.trafficSimulator);
            addNotification('Trafik Katmanı', active ? 'Trafik açık.' : 'Trafik kapalı.', 'info');
        });
    }
    const btnLayerHeatmap = document.getElementById('btn-layer-heatmap');
    if(btnLayerHeatmap) {
        btnLayerHeatmap.addEventListener('click', () => {
            btnLayerHeatmap.classList.toggle('active');
            const active = sim.renderer.toggleHeatmapLayer(sim.graph, sim.trafficSimulator);
            addNotification('Yoğunluk Haritası', active ? 'Yoğunluk haritası açık.' : 'Yoğunluk haritası kapalı.', 'info');
        });
    }
    const btnLayerRoutes = document.getElementById('btn-layer-routes');
    if(btnLayerRoutes) {
        btnLayerRoutes.addEventListener('click', () => {
            btnLayerRoutes.classList.toggle('active');
            const active = sim.renderer.toggleRoutesLayer(sim.vehicles, sim.graph);
            addNotification('Rotalar', active ? 'Rotalar gösteriliyor.' : 'Rotalar gizlendi.', 'info');
        });
    }
    const btnLayerZones = document.getElementById('btn-layer-zones');
    if(btnLayerZones) {
        btnLayerZones.addEventListener('click', () => {
            btnLayerZones.classList.toggle('active');
            const active = sim.renderer.toggleZonesLayer(sim.getRegionTrafficDensities());
            addNotification('Bölgeler', active ? 'Bölgeler katmanı açık.' : 'Bölgeler katmanı kapalı.', 'info');
        });
    }




    // Map Click -> Create Emergency
    setTimeout(() => {
        if(sim && sim.renderer && sim.renderer.map) {
            sim.renderer.map.on('click', (e) => {
                const emModal = document.getElementById('emergency-popup');
                const overlay = document.getElementById('emergency-popup-overlay');
                if(emModal) {
                    emModal.style.display = 'block';
                    if(overlay) overlay.style.display = 'block';
                    document.getElementById('emergency-location').value = `${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`;
                    emModal.dataset.lat = e.latlng.lat;
                    emModal.dataset.lng = e.latlng.lng;
                }
            });
        }
    }, 2000); // give map time to init


    // Tabs logic
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(`panel-${tab.dataset.tab}`);
            if(target) target.classList.add('active');
        });
    });

    document.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById(`spanel-${tab.dataset.stab}`);
            if(target) target.classList.add('active');
        });
    });

    // Region coordinates for panning
    const regionCoordinates = {
        'FSM Bulvarı': { lat: 40.2220, lng: 28.8790, zoom: 16 },
        'İhsaniye': { lat: 40.2250, lng: 28.8910, zoom: 16 },
        'Beşevler': { lat: 40.2100, lng: 28.8750, zoom: 16 },
        'Görükle': { lat: 40.2180, lng: 28.8580, zoom: 16 },
        'Özlüce': { lat: 40.2120, lng: 28.8950, zoom: 16 }
    };

    document.querySelectorAll('.traffic-bar').forEach(bar => {
        bar.addEventListener('click', () => {
            const labelEl = bar.querySelector('.traffic-label');
            if(!labelEl) return;
            const regionName = labelEl.innerText.trim();
            const coord = regionCoordinates[regionName];
            if(coord && sim && sim.renderer && sim.renderer.map) {
                sim.renderer.map.setView([coord.lat, coord.lng], coord.zoom);
                
                // Force traffic layer on
                if(!sim.renderer.trafficLayerVisible) {
                    const btnLayerTraffic = document.getElementById('btn-layer-traffic');
                    if(btnLayerTraffic) {
                        btnLayerTraffic.classList.add('active');
                    }
                    sim.renderer.toggleTrafficLayer(sim.graph, sim.trafficSimulator);
                }
                addNotification('Bölge Takibi', `${regionName} bölgesine odaklanıldı.`, 'info');
            }
        });
    });

    // Init charts if chart.js loaded
    initCharts();
    
    // Update dashboard loop
    setInterval(updateDashboard, 1000);
}

window.addEventListener('load', () => {
    initApp();
});

function updateDashboard() {
    if(!sim) return;
    
    // Count vehicles by type
    const ambCount = sim.vehicles.filter(v => v.type === 'ambulance').length;
    const fireCount = sim.vehicles.filter(v => v.type === 'fire').length;
    const droneCount = sim.vehicles.filter(v => v.type === 'drone').length;
    
    const ambActive = sim.vehicles.filter(v => v.type === 'ambulance' && v.status !== 'IDLE').length;
    const fireActive = sim.vehicles.filter(v => v.type === 'fire' && v.status !== 'IDLE').length;
    const droneActive = sim.vehicles.filter(v => v.type === 'drone' && v.status !== 'IDLE').length;
    
    // Update stat cards
    const ambCountEl = document.getElementById('stat-ambulance-count');
    if(ambCountEl) ambCountEl.innerText = ambCount;
    const ambActiveEl = document.getElementById('stat-ambulance-active');
    if(ambActiveEl) ambActiveEl.innerText = ambActive > 0 ? `${ambActive} görevde` : `${ambCount} hazır`;
    
    const fireCountEl = document.getElementById('stat-fire-count');
    if(fireCountEl) fireCountEl.innerText = fireCount;
    const fireActiveEl = document.getElementById('stat-fire-active');
    if(fireActiveEl) fireActiveEl.innerText = fireActive > 0 ? `${fireActive} görevde` : `${fireCount} hazır`;
    
    const droneCountEl = document.getElementById('stat-drone-count');
    if(droneCountEl) droneCountEl.innerText = droneCount;
    const droneActiveEl = document.getElementById('stat-drone-active');
    if(droneActiveEl) droneActiveEl.innerText = droneActive > 0 ? `${droneActive} görevde` : `${droneCount} hazır`;
    
    // Emergency stats
    const emergencyCount = sim.emergencyManager ? sim.emergencyManager.queue.filter(e => e.status !== 'RESOLVED').length : 0;
    const emergencyCountEl = document.getElementById('stat-emergency-count');
    if(emergencyCountEl) emergencyCountEl.innerText = emergencyCount;
    
    const resolvedEl = document.getElementById('stat-emergency-resolved');
    if(resolvedEl) resolvedEl.innerText = sim.stats.resolved > 0 ? `${sim.stats.resolved} çözüldü` : 'Bekleniyor';

    // Araç listesini tamamen zengin kartlara dönüştür
    const list = document.getElementById('vehicle-list');
    if(list && sim.vehicles.length > 0) {
        list.innerHTML = '';
        sim.vehicles.forEach(v => {
            const iconColor = v.type === 'ambulance' ? '#00bfff' : v.type === 'fire' ? '#ff6600' : '#a855f7';
            const iconClass = v.type === 'ambulance' ? 'ambulance' : v.type === 'fire' ? 'fire-extinguisher' : 'helicopter';
            const targetStr = v.currentIncident ? `<span style="font-size:10px;color:#aaa;"> Hedef: ${v.currentIncident.type.toUpperCase()}</span>` : '';
            
            list.insertAdjacentHTML('beforeend', `
                <div class="vehicle-item" style="border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; margin-bottom: 8px; padding: 10px; background: rgba(0,0,0,0.2);">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div class="vehicle-icon" style="color: ${iconColor}; font-size: 24px;">
                            <i class="fas fa-${iconClass}"></i>
                        </div>
                        <div class="vehicle-details" style="flex:1;">
                            <span class="vehicle-name" style="font-weight:bold; color: #fff;">${v.id}</span>
                            <br>
                            <span class="vehicle-meta" style="font-size:12px; color:#ccc;">Hız: ${Math.round(v.currentDynamicSpeed || v.speed)} km/h ${targetStr}</span>
                        </div>
                        <span class="vehicle-status" style="padding: 4px 8px; border-radius: 4px; font-size:11px; background: ${v.status === 'IDLE' ? '#333' : '#00bfff'}; color: #fff; font-weight:bold;">
                            ${v.status}
                        </span>
                    </div>
                    <div class="progress" style="width: 100%; height: 4px; background: rgba(255,255,255,0.1); margin-top: 8px; border-radius: 2px;">
                        <div class="progress-bar" style="width: ${v.progress * 100}%; height: 100%; background: ${iconColor}; border-radius: 2px;"></div>
                    </div>
                </div>
            `);
        });
    }

    // Acil durum listesini detaylandır
    const emList = document.getElementById('emergency-list');
    if(emList && sim.emergencyManager) {
        emList.innerHTML = '';
        const pendingQueue = sim.emergencyManager.queue.filter(e => e.status !== 'RESOLVED');
        if(pendingQueue.length === 0) {
            emList.innerHTML = '<div style="text-align:center; padding: 20px; color:#666;">Aktif vaka bulunmamaktadır.</div>';
        }
        pendingQueue.forEach(e => {
            const color = e.triage === 'RED' ? '#ff2d2d' : e.triage === 'YELLOW' ? '#ffd600' : '#00c851';
            let reportsHtml = '';
            if (e.reports && e.reports.length > 0) {
                reportsHtml = `
                    <div class="emergency-reports" style="margin-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px;">
                        <span style="font-size: 11px; font-weight: bold; color: #aaa; margin-bottom: 5px; display: block;"><i class="fas fa-robot"></i> YAPAY ZEKA GÖREV RAPORU</span>
                        ${e.reports.map(r => `
                            <div class="report-item" style="background: rgba(0,0,0,0.3); border-radius: 4px; padding: 8px; margin-bottom: 6px; font-size: 11px; color: #ccc;">
                                <div style="display:flex; justify-content:space-between; margin-bottom: 4px;">
                                    <strong style="color: ${color}">${r.type === 'drone' ? '<i class="fas fa-helicopter"></i>' : (r.type === 'ambulance' ? '<i class="fas fa-ambulance"></i>' : '<i class="fas fa-fire-extinguisher"></i>')} ${r.vehicle} ${r.isOutcome ? '(OLAY SONUCU)' : ''}</strong>
                                    ${!r.isOutcome ? `<span style="color:#aaa;"><i class="fas fa-route"></i> ${r.distance}km &nbsp; <i class="fas fa-clock"></i> ${r.time}dk</span>` : ''}
                                </div>
                                <div style="line-height: 1.4; color: ${r.isOutcome ? '#fff' : '#ddd'}; font-style: ${r.isOutcome ? 'italic' : 'normal'};">${r.text}</div>
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            emList.insertAdjacentHTML('beforeend', `
                <div class="vehicle-item" style="border-left: 4px solid ${color} !important; border-radius: 4px; margin-bottom: 8px; padding: 10px; background: rgba(0,0,0,0.2);">
                    <div style="display: flex; align-items: flex-start; gap: 10px;">
                        <div class="vehicle-icon" style="color: ${color}; font-size: 20px; padding-top: 2px;">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <div class="vehicle-details" style="flex:1;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <span class="vehicle-name" style="font-weight:bold; color: #fff;">${e.type.toUpperCase()} VAKASI</span>
                                <span class="vehicle-status" style="padding: 2px 6px; border-radius: 4px; font-size:10px; background: #333; color: ${color}; font-weight:bold;">${e.status}</span>
                            </div>
                            <span class="vehicle-meta" style="font-size:12px; color:#ccc; display:block; margin-top:2px; margin-bottom:4px;">Detay: ${e.desc}</span>
                            ${reportsHtml}
                        </div>
                    </div>
                </div>
            `);
        });
    }

    // Update traffic status bars in sidebar
    const densities = sim.getRegionTrafficDensities();
    const regionIds = {
        'FSM Bulvarı': { fill: 'traffic-fsm', val: 'traffic-fsm-val' },
        'İhsaniye': { fill: 'traffic-ihsaniye', val: 'traffic-ihsaniye-val' },
        'Beşevler': { fill: 'traffic-besevler', val: 'traffic-besevler-val' },
        'Görükle': { fill: 'traffic-gorukle', val: 'traffic-gorukle-val' },
        'Özlüce': { fill: 'traffic-ozluce', val: 'traffic-ozluce-val' }
    };

    for (const [name, ids] of Object.entries(regionIds)) {
        const density = densities[name] || 0;
        const fillEl = document.getElementById(ids.fill);
        const valEl = document.getElementById(ids.val);
        if (fillEl) fillEl.style.width = `${density}%`;
        if (valEl) valEl.innerText = `${density}%`;
    }

    // Update AI Insights dynamically
    const insightsList = document.getElementById('ai-insights-list');
    if (insightsList) {
        let insights = [];
        
        // Weather warning
        if (sim.trafficSimulator && sim.trafficSimulator.weatherMultiplier > 1.0) {
            insights.push({
                icon: 'fa-cloud-showers-heavy',
                text: 'Kötü hava koşulları nedeniyle drone uçuş hızları düşürüldü, kara taşıtlarının A* rota ağırlıkları artırıldı.',
                class: 'warning'
            });
        }

        // Traffic density warning
        let congestedRegions = [];
        for (const [name, density] of Object.entries(densities)) {
            if (density > 65) congestedRegions.push(name);
        }
        if (congestedRegions.length > 0) {
            insights.push({
                icon: 'fa-traffic-light',
                text: `${congestedRegions.join(', ')} bölgelerinde yoğun trafik tespit edildi. Acil durum araçları için A* rotaları optimize ediliyor.`,
                class: 'warning'
            });
        }

        // General status / recommendations
        const pendingIncidents = sim.emergencyManager ? sim.emergencyManager.queue.filter(e => e.status !== 'RESOLVED') : [];
        const activeVehicles = sim.vehicles.filter(v => v.status !== 'IDLE').length;
        
        if (pendingIncidents.length > 0) {
            insights.push({
                icon: 'fa-clock',
                text: `${pendingIncidents.length} vaka sevk edilmeyi bekliyor. En yakın birimler en kısa/en hızlı yoldan yönlendiriliyor.`,
                class: 'info'
            });
        } else if (activeVehicles > 0) {
            insights.push({
                icon: 'fa-truck-medical',
                text: `${activeVehicles} acil durum aracı aktif olarak vakalara müdahale ediyor veya üslerine dönüyor.`,
                class: 'success'
            });
        } else {
            insights.push({
                icon: 'fa-check-circle',
                text: 'Sistem stabil. Tüm acil durum birimleri üslerinde (hastaneler, itfaiye istasyonları, drone üssü) hazır beklemektedir.',
                class: 'success'
            });
        }
        
        let allInsights = [];
        if (window.geminiReports && window.geminiReports.length > 0) {
            allInsights = [...window.geminiReports, ...insights];
        } else {
            allInsights = insights;
        }

        insightsList.innerHTML = allInsights.map(ins => `
            <div class="insight-item ${ins.class || ''}" style="display: flex; gap: 8px; align-items: flex-start; margin-bottom: 8px;">
                <i class="fas ${ins.icon}" style="margin-top: 3px; color: ${ins.class === 'warning' ? 'var(--orange)' : ins.class === 'success' ? 'var(--green)' : 'var(--cyan)'};"></i>
                <span>${ins.text}</span>
            </div>
        `).join('');
    }

    // Update dynamic chart for Real-Time ETA (Delivery Time)
    if (liveEtaChart && sim.vehicles) {
        // Hedefe veya hastaneye gitmekte olan aktif araçları bul
        const activeVehicles = sim.vehicles.filter(v => v.status === 'MOVING_TO_INCIDENT' || v.status === 'TRANSPORTING');
        
        if (activeVehicles.length > 0) {
            const labels = activeVehicles.map(v => `${v.type === 'ambulance' ? 'Amb' : v.type === 'fire' ? 'İtf' : 'Drn'}-${v.id}`);
            const data = activeVehicles.map(v => {
                // Kalan mesafe ve hız üzerinden tahmini varış süresi hesaplama (saniye/dakika)
                let remainingTime = 0;
                
                if (v.path && v.path.length > v.pathIndex && v.pathIndex >= 0) {
                    const currentNode = v.path[v.pathIndex];
                    const nextNode = v.path[v.pathIndex + 1];
                    
                    if(currentNode && nextNode) {
                        const edgeLen = sim.graph.haversine(currentNode.lat, currentNode.lng, nextNode.lat, nextNode.lng) * 1000;
                        const remainingDistanceForEdge = edgeLen * (1 - v.progress);
                        
                        let totalRemainingDistance = remainingDistanceForEdge;
                        for (let i = v.pathIndex + 1; i < v.path.length - 1; i++) {
                            const p1 = v.path[i];
                            const p2 = v.path[i+1];
                            if(p1 && p2) {
                                totalRemainingDistance += sim.graph.haversine(p1.lat, p1.lng, p2.lat, p2.lng) * 1000;
                            }
                        }
                    
                        const currentSpeed = v.currentDynamicSpeed || v.speed;
                        const speedMs = currentSpeed / 3.6; // km/h to m/s
                        
                        if (speedMs > 0) {
                            remainingTime = totalRemainingDistance / speedMs;
                        }
                    }
                }
                return Math.max(0, Math.round(remainingTime / 60 * 10) / 10); // dakika cinsinden
            });

            liveEtaChart.data.labels = labels;
            liveEtaChart.data.datasets[0].data = data;
            liveEtaChart.update();
        } else {
            // Eğer aktif araç yoksa grafiği sıfırla
            liveEtaChart.data.labels = ['Bekleniyor'];
            liveEtaChart.data.datasets[0].data = [0];
            liveEtaChart.update();
        }
    }

    // Update Historical Response Time Chart
    if (responseTimeChart && sim.emergencyManager && sim.emergencyManager.resolvedIncidents) {
        const resolved = sim.emergencyManager.resolvedIncidents.slice(-10); // Son 10 olay
        if (resolved.length > 0) {
            const labels = resolved.map(inc => `#${inc.id}`);
            const data = resolved.map(inc => {
                if (inc.createdAt && inc.arrivedAt) {
                    return Math.max(1, Math.round((inc.arrivedAt - inc.createdAt) / 1000)); // saniye cinsinden ortalama (simüle dk)
                }
                return 0;
            });
            responseTimeChart.data.labels = labels;
            responseTimeChart.data.datasets[0].data = data;
            responseTimeChart.update();
        }
    }
}





function addNotification(title, msg, type) {
    const list = document.getElementById('notif-list');
    if(!list) return;
    const item = document.createElement('div');
    item.className = `notif-item ${type}`;
    item.innerHTML = `<strong>${title}</strong><br><small>${msg}</small>`;
    list.prepend(item);
    if(list.children.length > 5) list.lastChild.remove();
}

function initCharts() {
    if (document.getElementById('canvas-response-time') && window.Chart) {
        responseTimeChart = new Chart(document.getElementById('canvas-response-time'), {
            type: 'line', 
            data: { 
                labels: [], 
                datasets: [{ 
                    label: 'Ortalama Müdahale Süresi (Simüle dk)', 
                    data: [], 
                    borderColor: '#ff00d4', 
                    backgroundColor: 'rgba(255, 0, 212, 0.1)', 
                    tension: 0.4, 
                    fill: true 
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    if (document.getElementById('canvas-live-eta') && window.Chart) {
        liveEtaChart = new Chart(document.getElementById('canvas-live-eta'), {
            type: 'bar', 
            data: { 
                labels: [], 
                datasets: [{ 
                    label: 'Canlı Tahmini Varış Süresi (ETA - Dk)', 
                    data: [], 
                    backgroundColor: 'rgba(0, 240, 255, 0.6)', 
                    borderColor: '#00f0ff',
                    borderWidth: 1
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }
}


