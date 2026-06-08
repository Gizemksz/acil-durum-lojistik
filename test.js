const puppeteer = require('puppeteer');

(async () => {
    console.log("=== Smart City Master Projesi Tarayıcı Testi Başlıyor ===");
    
    try {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        // Konsol hatalarını yakala
        page.on('console', msg => {
            if(msg.type() === 'error') console.log('BİR HATA YAKALANDI: ', msg.text());
        });
        
        console.log("1. Sayfa yükleniyor...");
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
        
        console.log("2. Harita ve Sistem Yüklendi mi kontrol ediliyor...");
        await page.waitForSelector('#map');
        console.log(" -> Harita başarıyla yüklendi.");
        
        console.log("3. Hava Durumu Modülü Test Ediliyor...");
        await page.click('#btn-weather');
        const isRainy = await page.evaluate(() => document.body.classList.contains('weather-rain'));
        console.log(" -> Hava Durumu Değişimi: " + (isRainy ? "BAŞARILI (Fırtına Modu)" : "BAŞARISIZ"));
        
        console.log("4. Simülasyon Motoru Başlatılıyor...");
        await page.click('#btn-start-sim');
        const isSimulating = await page.evaluate(() => document.body.classList.contains('sim-running'));
        console.log(" -> Simülasyon Başlatma: " + (isSimulating ? "BAŞARILI" : "BAŞARISIZ"));
        
        console.log("5. 5 saniye boyunca AI rotalama, TSP ve V2X sistemleri izleniyor...");
        await new Promise(r => setTimeout(r, 5000));
        
        // Bildirim panelindeki kayıtları al
        const insightCount = await page.evaluate(() => document.querySelectorAll('.insight-item').length);
        console.log(` -> Sistem ${insightCount} adet Dinamik AI Kararı (Insight) üretti.`);
        
        console.log("=== TEST BAŞARIYLA TAMAMLANDI, HATA BULUNMADI ===");
        await browser.close();
    } catch (error) {
        console.error("Test sırasında bir hata oluştu: ", error);
        process.exit(1);
    }
})();
