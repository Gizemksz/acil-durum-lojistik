// settings.js
// Merkezi Ayar ve Depolama Yönetimi

window.appConfig = {
    apiKeys: {
        ors: '',
        weather: '',
        gemini: ''
    },
    simulation: {
        ambCount: 8,
        fireCount: 5,
        droneCount: 6,
        eventFreq: 15,
        autoDispatch: true,
        trafficSim: true
    }
};

const SettingsManager = {
    isStorageAvailable: function(type = 'localStorage') {
        let storage;
        try {
            storage = window[type];
            const x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        } catch (e) {
            return e instanceof DOMException && (
                // Firefox
                e.code === 22 ||
                // Diğer tarayıcılar
                e.code === 1014 ||
                // İsim bazlı kontroller (bazı tarayıcılarda kod dönmeyebilir)
                e.name === 'QuotaExceededError' ||
                e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
                e.name === 'SecurityError') &&
                // Sadece storage dolduğunda da exception fırlatılabilir, onu ayırmak için
                (storage && storage.length !== 0);
        }
    },

    loadSettings: function() {
        if (this.isStorageAvailable()) {
            try {
                const strKeys = localStorage.getItem('smartcity_api_keys');
                if (strKeys && strKeys !== 'undefined') {
                    window.appConfig.apiKeys = { ...window.appConfig.apiKeys, ...JSON.parse(strKeys) };
                }

                const strSim = localStorage.getItem('smartcity_sim_settings');
                if (strSim && strSim !== 'undefined') {
                    window.appConfig.simulation = { ...window.appConfig.simulation, ...JSON.parse(strSim) };
                }
            } catch (e) {
                console.error('LocalStorage okuma hatası:', e);
            }
        } else {
            console.warn('LocalStorage kullanılamıyor, varsayılan bellek (in-memory) ayarları ile devam ediliyor.');
        }

        // Değerleri form alanlarına geri basma
        this.populateFormFields();
        // UI statü göstergelerini güncelle
        this.updateApiStatusUI(window.appConfig.apiKeys);
    },

    saveApiSettings: function(keys) {
        window.appConfig.apiKeys = keys;
        if (this.isStorageAvailable()) {
            try {
                localStorage.setItem('smartcity_api_keys', JSON.stringify(keys));
                console.log('API Anahtarları localStorage\'a başarıyla kaydedildi.', keys);
                return true; // başarı
            } catch (e) {
                console.error('LocalStorage kayıt hatası:', e);
                return false; // hata
            }
        } else {
            console.warn('Gizlilik ayarları veya dosya sistemi (file://) nedeniyle yerel kayıt yapılamadı. Ancak bu oturum için API ayarları bellekte aktiftir.');
            return false;
        }
    },

    saveSimSettings: function(settings) {
        window.appConfig.simulation = settings;
        if (this.isStorageAvailable()) {
            try {
                localStorage.setItem('smartcity_sim_settings', JSON.stringify(settings));
                console.log('Simülasyon ayarları localStorage\'a başarıyla kaydedildi.', settings);
                return true;
            } catch (e) {
                console.error('LocalStorage kayıt hatası:', e);
                return false;
            }
        } else {
            console.warn('Gizlilik ayarları nedeniyle yerel kayıt yapılamadı. Ancak bu oturum için simülasyon ayarları bellekte aktiftir.');
            return false;
        }
    },

    populateFormFields: function() {
        const { apiKeys, simulation } = window.appConfig;

        // API
        if (document.getElementById('api-ors')) document.getElementById('api-ors').value = 'Aktif (Ücretsiz / Genel Sunucu)';
        if (document.getElementById('api-weather')) document.getElementById('api-weather').value = apiKeys.weather || '';
        if (document.getElementById('api-gemini')) document.getElementById('api-gemini').value = apiKeys.gemini || '';

        // Sim
        if (document.getElementById('sim-ambulance-count')) document.getElementById('sim-ambulance-count').value = simulation.ambCount;
        if (document.getElementById('sim-fire-count')) document.getElementById('sim-fire-count').value = simulation.fireCount;
        if (document.getElementById('sim-drone-count')) document.getElementById('sim-drone-count').value = simulation.droneCount;
        if (document.getElementById('sim-event-freq')) document.getElementById('sim-event-freq').value = simulation.eventFreq;
        if (document.getElementById('sim-auto-dispatch')) document.getElementById('sim-auto-dispatch').checked = simulation.autoDispatch;
        if (document.getElementById('sim-traffic-sim')) document.getElementById('sim-traffic-sim').checked = simulation.trafficSim;
    },

    updateApiStatusUI: function(keys) {
        if (!keys) keys = {};
        const orsStatus = document.getElementById('api-ors-status');
        if (orsStatus) {
            orsStatus.innerHTML = '<i class="fas fa-circle" style="color:var(--green)"></i> <span style="color:var(--green)">Aktif (Anahtarsız)</span>';
        }
        const weatherStatus = document.getElementById('api-weather-status');
        if (weatherStatus) {
            weatherStatus.innerHTML = keys.weather 
                ? '<i class="fas fa-circle" style="color:var(--green)"></i> <span style="color:var(--green)">Aktif</span>' 
                : '<i class="fas fa-circle"></i> <span>Yapılandırılmadı</span>';
        }
        const geminiStatus = document.getElementById('api-gemini-status');
        if (geminiStatus) {
            geminiStatus.innerHTML = keys.gemini 
                ? '<i class="fas fa-circle" style="color:var(--green)"></i> <span style="color:var(--green)">Aktif</span>' 
                : '<i class="fas fa-circle"></i> <span>Yapılandırılmadı</span>';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // 1. Sayfa yüklendiğinde ayarları localStorage'dan çekip formlara bas
    SettingsManager.loadSettings();

    // 2. Event Listener Optimizasyonu (API Kaydet Butonu)
    const btnSaveApi = document.getElementById('btn-save-api');
    if (btnSaveApi) {
        btnSaveApi.addEventListener('click', () => {
            const newKeys = {
                ors: document.getElementById('api-ors').value,
                weather: document.getElementById('api-weather').value,
                gemini: document.getElementById('api-gemini').value
            };
            
            // Debug Modu
            console.log('API Kayıt Butonu Tetiklendi: ', {
                apiKey_ORS_Length: newKeys.ors.length,
                apiKey_Weather_Length: newKeys.weather.length,
                apiKey_Gemini_Length: newKeys.gemini.length,
                provider: 'API_ALL'
            });

            const success = SettingsManager.saveApiSettings(newKeys);
            SettingsManager.updateApiStatusUI(newKeys);

            if (success) {
                if(typeof addNotification === 'function') addNotification('Başarılı', 'API Anahtarları başarıyla kaydedildi.', 'success');
            } else {
                if(typeof addNotification === 'function') addNotification('Belleğe Kaydedildi', 'Gizlilik/Tarayıcı ayarları nedeniyle yerel diske yazılamadı ancak bu oturum için aktif edildi.', 'warning');
            }

            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) settingsModal.style.display = 'none';
        });
    }

    // 3. Event Listener Optimizasyonu (Simülasyon Kaydet Butonu)
    const btnSaveSim = document.getElementById('btn-save-sim');
    if (btnSaveSim) {
        btnSaveSim.addEventListener('click', () => {
            const simSettings = {
                eventFreq: parseFloat(document.getElementById('sim-event-freq').value) || 15,
                autoDispatch: document.getElementById('sim-auto-dispatch').checked,
                trafficSim: document.getElementById('sim-traffic-sim').checked,
                ambCount: parseInt(document.getElementById('sim-ambulance-count').value) || 8,
                fireCount: parseInt(document.getElementById('sim-fire-count').value) || 5,
                droneCount: parseInt(document.getElementById('sim-drone-count').value) || 6
            };

            // Debug Modu
            console.log('Simülasyon Kayıt Butonu Tetiklendi: ', simSettings);

            const success = SettingsManager.saveSimSettings(simSettings);

            if (success) {
                if(typeof addNotification === 'function') addNotification('Başarılı', 'Simülasyon ayarları kaydedildi ve sisteme işlendi.', 'success');
            } else {
                if(typeof addNotification === 'function') addNotification('Belleğe Kaydedildi', 'Gizlilik/Tarayıcı ayarları nedeniyle yerel diske yazılamadı ancak oturum için aktif.', 'warning');
            }

            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) settingsModal.style.display = 'none';
        });
    }
});
