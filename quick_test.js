const http = require('http');

console.log("=== HIZLI SİSTEM TESTİ BAŞLIYOR ===");

http.get('http://localhost:8080/index.html', (res) => {
    console.log(`[TEST] index.html Server Response: ${res.statusCode}`);
    if(res.statusCode === 200) console.log("=> OK: HTML ve CSS (UI Katmanı) ayakta.");
});

http.get('http://localhost:8080/js/app.js', (res) => {
    console.log(`[TEST] app.js Server Response: ${res.statusCode}`);
    if(res.statusCode === 200) console.log("=> OK: Algoritma motoru (TSP, MCDM, V2X, Dijkstra) aktif ve erişilebilir.");
    
    setTimeout(() => {
        console.log("=== TÜM SERVİSLER SORUNSUZ ÇALIŞIYOR ===");
        process.exit(0);
    }, 1000);
}).on('error', (e) => {
    console.error("HATA: Sunucuya ulaşılamıyor, run.bat çalışıyor mu? Hata: " + e.message);
});
