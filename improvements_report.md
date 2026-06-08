# SmartCity AI — İleri Düzey İyileştirmeler ve Yeni Özellikler Yol Haritası

Hataların giderilmesinin ardından, platformun kararlılığı ve temel simülasyon mekanizmaları sorunsuz çalışmaktadır. Projeyi endüstriyel standartlarda bir **Dijital İkiz (Digital Twin)** ve **Akıllı Şehir Yönetim Platformuna** dönüştürmek için uygulanabilecek ileri düzey algoritmik, görsel ve mimari geliştirmeler aşağıda kategorize edilerek açıklanmıştır:

---

## 1. Algoritmik ve İşlevsel Geliştirmeler

### 🔄 A. Dinamik Yeniden Rotalama (Dynamic Re-routing)
* **Mevcut Durum:** Araçlar sevk edildikleri anda bir rota alır ve yol boyunca bu rotayı takip eder. Rota üzerindeyken yeni bir kaza veya tıkanıklık oluşursa bunu algılamaz ve tıkanıklığın içine girerler.
* **İyileştirme:** Aktif görevdeki araçların (örneğin her 5 saniyede bir) hedeflerine olan rotalarını mevcut trafik grafiğine göre dinamik olarak yeniden hesaplaması sağlanmalıdır. Eğer daha hızlı alternatif bir güzergah oluşursa araç seyir halindeyken rotasını güncellemelidir.

### 🚥 B. Gerçekçi "Yeşil Dalga" (Green Wave) Korunumu
* **Mevcut Durum:** Ambulans veya itfaiye yola çıktığında rotasındaki trafik çarpanları `1.0` (akıcı) yapılır. Ancak trafik simülatörü (`traffic.js` / `_applyTraffic`) her adımda tüm yolları genel yoğunluk çarpanına sıfırladığı için bu yeşil dalga etkisi hemen bir sonraki saniyede kaybolur.
* **İyileştirme:** 
  * Yeşil dalga etkisi sadece sevk anında değil, aracın anlık koordinatının **100 metre önündeki** kavşakları kapsayacak şekilde dinamik hale getirilebilir. 
  * Araç geçtikten sonra arkasındaki yolların trafiği eski haline döndürülür.
  * Arayüzde yeşil dalga uygulanan yollar yeşil renkte parlayarak (neon glow) görselleştirilebilir.

### 🛣️ C. OSRM (Gerçek Yol) ve A* (Simüle Trafik) Çelişkisinin Giderilmesi
* **Mevcut Durum:** Uygulama, A* ile sanal graf üzerinde en hızlı rotayı bulur. Ancak araç sevk edilirken OSRM API'si çağrılarak gerçek yol çizgileri çekilir. OSRM, simülasyondaki hayali trafik kazalarından habersiz olduğu için aracı doğrudan kazanın olduğu caddeden geçirebilir. A* rotası ise sadece internet koptuğunda fallback (yedek) olarak çalışır.
* **İyileştirme (Parçalı OSRM Rotalama):** Araç A* ile sanal düğümler üzerinden (örneğin `n1 -> n3 -> n10`) yönlendirilmeli, ancak bu düğümler arasındaki yolların gerçek sokak geometrisi OSRM üzerinden tek tek sorgulanıp birleştirilmelidir. Böylece araç hem gerçek yolları takip eder hem de simülasyondaki dinamik trafik engellerinden kaçınır.

---

## 2. Görsel ve Kullanıcı Deneyimi (UI/UX) İyileştirmeleri

### 🌧️ A. Hava Durumu Efektleri (Canvas Particle System)
* **Mevcut Durum:** Fırtına modu açıldığında sadece araçların hızı düşmekte ve arayüz biraz kararmaktadır.
* **İyileştirme:** Harita katmanının üzerine yerleştirilecek şeffaf bir HTML5 Canvas yardımıyla, yağmurlu havada ekranda süzülen yağmur damlaları veya karlı havada kar taneleri animasyonu eklenebilir. Bu, dijital ikiz hissiyatını görsel olarak zirveye taşıyacaktır.

### 🛸 B. Dronlar İçin Uçuş Koridorları ve No-Fly Zone (Hava Sahası Kısıtlamaları)
* **Mevcut Durum:** Kargo dronları engelleri tamamen yok sayarak binaların üzerinden doğrudan düz çizgi halinde uçar.
* **İyileştirme:** 
  * Harita üzerinde kırmızı şeffaf dairelerle **"Uçuşa Yasak Bölgeler" (No-Fly Zones)** (hastane heliport kısıtlamaları, askeri alanlar, yüksek gerilim hatları) tanımlanabilir.
  * Dronlar bu bölgelerin etrafından dolaşmak için A* algoritmasını hava sahası grafında koordine ederek kullanır.

### 📊 C. Karbon Salınımı ve Lojistik Analitiği Kartları
* **Mevcut Durum:** Analitik sekmesinde sadece ETA ve müdahale süreleri grafiği yer almaktadır.
* **İyileştirme:** 
  * Dronların teslimat yapmasıyla engellenen **"Kurtarılan CO2 Emisyonu"** canlı olarak hesaplanıp gösterilebilir.
  * Hastanelerin anlık doluluk oranları (Capacity) ve itfaiye istasyonlarının aktif/hazır araç oranları ilerlemeli bar grafikler ile analitik sekmesine eklenebilir.

---

## 3. Altyapı ve Veri Kaydı Geliştirmeleri

### 💾 A. indexedDB ile Çevrimdışı İstatistik Kaydı
* **Mevcut Durum:** Tarayıcı yenilendiğinde çözülen tüm acil durum vakaları, müdahale süreleri ve grafik verileri sıfırlanmaktadır.
* **İyileştirme:** Tarayıcının yerleşik `indexedDB` veri tabanı kullanılarak, tamamlanan tüm vakaların detayları (vaka türü, müdahale süresi, hangi aracın gittiği, Gemini raporu) kalıcı olarak saklanabilir. Kullanıcı sayfayı yenilese dahi geçmiş analitik verileri kaybolmaz.

### 📤 B. Rapor Dışa Aktarma (PDF/CSV Export)
* **İyileştirme:** Tamamlanan acil durum operasyonlarının raporları, analitik sekmesine eklenecek bir buton ile Excel (CSV) veya PDF formatında indirilebilir hale getirilebilir. Bu sayede simülasyon çıktısı resmi bir raporlama aracına dönüşür.

### 🔗 C. Hafif Bir Node.js Express Backend ve Gerçek Zamanlı Trafik API Entegrasyonu
* **İyileştirme:** 
  * Projeye basit bir Express.js sunucusu eklenerek simülasyon durumları sunucu tarafında yönetilebilir.
  * TomTom veya Google Maps API entegrasyonu ile Bursa Nilüfer bölgesinin **gerçek anlık trafik yoğunluk verisi** çekilerek simülasyon haritasına yansıtılabilir.
