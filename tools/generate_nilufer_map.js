// Bursa Nilüfer harita verisi oluşturucu
// Nilüfer ilçesi ana yol ağı - gerçek koordinatlar

const mapData = {
  "nodes": [],
  "edges": []
};

// Nilüfer ilçesinin ana kavşak noktaları (gerçek koordinatlar)
const niluferNodes = [
  // FSM Bulvarı boyunca
  { id: "n1", lat: 40.2182, lng: 28.8631, name: "FSM Bulvarı Batı" },
  { id: "n2", lat: 40.2195, lng: 28.8680, name: "FSM - Ertuğrul Cad." },
  { id: "n3", lat: 40.2208, lng: 28.8735, name: "FSM - İhsaniye Kavşak" },
  { id: "n4", lat: 40.2220, lng: 28.8790, name: "FSM Merkez" },
  { id: "n5", lat: 40.2232, lng: 28.8850, name: "FSM - Beşevler" },
  { id: "n6", lat: 40.2245, lng: 28.8910, name: "FSM - Çamlıca" },
  { id: "n7", lat: 40.2258, lng: 28.8965, name: "FSM Doğu" },
  
  // İhsaniye Mahallesi
  { id: "n8", lat: 40.2150, lng: 28.8700, name: "İhsaniye Güney" },
  { id: "n9", lat: 40.2165, lng: 28.8720, name: "İhsaniye Merkez" },
  { id: "n10", lat: 40.2175, lng: 28.8750, name: "İhsaniye Kuzey" },
  
  // Beşevler Bölgesi
  { id: "n11", lat: 40.2280, lng: 28.8820, name: "Beşevler Batı" },
  { id: "n12", lat: 40.2295, lng: 28.8860, name: "Beşevler Merkez" },
  { id: "n13", lat: 40.2310, lng: 28.8900, name: "Beşevler Kuzey" },
  { id: "n14", lat: 40.2265, lng: 28.8880, name: "Beşevler Güney" },
  
  // Görükle Bölgesi  
  { id: "n15", lat: 40.2350, lng: 28.8650, name: "Görükle Giriş" },
  { id: "n16", lat: 40.2380, lng: 28.8700, name: "Görükle Merkez" },
  { id: "n17", lat: 40.2400, lng: 28.8750, name: "Görükle Üniversite" },
  { id: "n18", lat: 40.2370, lng: 28.8600, name: "Görükle Batı" },
  
  // Özlüce Bölgesi
  { id: "n19", lat: 40.2120, lng: 28.8900, name: "Özlüce Batı" },
  { id: "n20", lat: 40.2140, lng: 28.8950, name: "Özlüce Merkez" },
  { id: "n21", lat: 40.2160, lng: 28.9000, name: "Özlüce Doğu" },
  { id: "n22", lat: 40.2100, lng: 28.8950, name: "Özlüce Güney" },
  
  // Nilüfer Merkez / Organize Sanayi
  { id: "n23", lat: 40.2050, lng: 28.8800, name: "Nilüfer Merkez Güney" },
  { id: "n24", lat: 40.2080, lng: 28.8750, name: "Nilüfer Sanayi" },
  { id: "n25", lat: 40.2100, lng: 28.8700, name: "Nilüfer Hastane Yolu" },
  
  // Çamlıca - Balat arası
  { id: "n26", lat: 40.2270, lng: 28.8950, name: "Çamlıca Merkez" },
  { id: "n27", lat: 40.2290, lng: 28.9000, name: "Balat Kavşak" },
  { id: "n28", lat: 40.2310, lng: 28.9050, name: "Balat Kuzey" },
  
  // Üniversite Yolu
  { id: "n29", lat: 40.2320, lng: 28.8780, name: "Üniversite Kavşak" },
  { id: "n30", lat: 40.2340, lng: 28.8720, name: "Kampüs Giriş" },
  
  // Ek bağlantı noktaları
  { id: "n31", lat: 40.2190, lng: 28.8600, name: "Batı Bağlantı" },
  { id: "n32", lat: 40.2250, lng: 28.8700, name: "Kuzey Bağlantı" },
  { id: "n33", lat: 40.2155, lng: 28.8830, name: "Güney Merkez" },
  { id: "n34", lat: 40.2200, lng: 28.8920, name: "Doğu Bağlantı" },
  { id: "n35", lat: 40.2130, lng: 28.8780, name: "İhsaniye Doğu" },
  
  // Daha fazla ara noktalar (gerçekçi yol ağı için)
  { id: "n36", lat: 40.2210, lng: 28.8660, name: "Ara Nokta 1" },
  { id: "n37", lat: 40.2240, lng: 28.8770, name: "Ara Nokta 2" },
  { id: "n38", lat: 40.2185, lng: 28.8810, name: "Ara Nokta 3" },
  { id: "n39", lat: 40.2275, lng: 28.8730, name: "Ara Nokta 4" },
  { id: "n40", lat: 40.2165, lng: 28.8880, name: "Ara Nokta 5" },
  
  // Hastane ve İtfaiye yakın noktaları
  { id: "n41", lat: 40.2225, lng: 28.8715, name: "Nilüfer Devlet H. Yakın" },
  { id: "n42", lat: 40.2155, lng: 28.9040, name: "Şehir H. Yakın" },
  { id: "n43", lat: 40.2315, lng: 28.8845, name: "Uludağ Tıp Yakın" },
  
  // Ekstra mahalle noktaları
  { id: "n44", lat: 40.2060, lng: 28.8850, name: "Ataevler" },
  { id: "n45", lat: 40.2090, lng: 28.8920, name: "Ataevler Kuzey" },
  { id: "n46", lat: 40.2330, lng: 28.8950, name: "Yunuseli" },
  { id: "n47", lat: 40.2360, lng: 28.8850, name: "Demirci" },
  { id: "n48", lat: 40.2200, lng: 28.8550, name: "Ertuğrul Batı" },
  { id: "n49", lat: 40.2130, lng: 28.8650, name: "İhsaniye Batı" },
  { id: "n50", lat: 40.2300, lng: 28.8750, name: "Beşevler Doğu" },
  
  // Minibüs/otobüs güzergah noktaları
  { id: "n51", lat: 40.2175, lng: 28.8580, name: "Durak 1" },
  { id: "n52", lat: 40.2215, lng: 28.8850, name: "Durak 2" },
  { id: "n53", lat: 40.2260, lng: 28.8800, name: "Durak 3" },
  { id: "n54", lat: 40.2340, lng: 28.8900, name: "Durak 4" },
  { id: "n55", lat: 40.2110, lng: 28.8830, name: "Durak 5" },
  
  // Ek bağlantılar
  { id: "n56", lat: 40.2235, lng: 28.8650, name: "Bağlantı A" },
  { id: "n57", lat: 40.2285, lng: 28.8680, name: "Bağlantı B" },
  { id: "n58", lat: 40.2145, lng: 28.8750, name: "Bağlantı C" },
  { id: "n59", lat: 40.2200, lng: 28.9060, name: "Bağlantı D" },
  { id: "n60", lat: 40.2070, lng: 28.8680, name: "Bağlantı E" },
];

// Edges (çift yönlü yollar)
const niluferEdges = [
  // FSM Bulvarı (ana arter)
  ["n1", "n2"], ["n2", "n3"], ["n3", "n4"], ["n4", "n5"], ["n5", "n6"], ["n6", "n7"],
  
  // İhsaniye bağlantıları
  ["n8", "n9"], ["n9", "n10"], ["n10", "n3"], ["n9", "n3"], ["n8", "n49"],
  
  // Beşevler bağlantıları
  ["n5", "n14"], ["n14", "n12"], ["n11", "n12"], ["n12", "n13"], ["n13", "n43"],
  ["n11", "n29"], ["n14", "n6"],
  
  // Görükle bağlantıları
  ["n15", "n16"], ["n16", "n17"], ["n18", "n15"], ["n15", "n32"],
  ["n17", "n47"], ["n30", "n16"],
  
  // Özlüce bağlantıları
  ["n19", "n20"], ["n20", "n21"], ["n22", "n20"], ["n19", "n33"],
  ["n21", "n42"], ["n22", "n44"],
  
  // Merkez bağlantıları
  ["n23", "n24"], ["n24", "n25"], ["n25", "n8"], ["n23", "n44"],
  ["n24", "n49"], ["n25", "n49"],
  
  // Çamlıca - Balat
  ["n6", "n26"], ["n26", "n27"], ["n27", "n28"], ["n28", "n46"],
  ["n26", "n34"],
  
  // Üniversite Yolu
  ["n29", "n30"], ["n30", "n15"], ["n29", "n50"], ["n50", "n12"],
  
  // Çapraz bağlantılar
  ["n1", "n31"], ["n31", "n48"], ["n48", "n36"], ["n36", "n2"],
  ["n32", "n56"], ["n56", "n36"], ["n57", "n32"], ["n57", "n39"],
  ["n39", "n50"], ["n39", "n53"],
  
  // Güney bağlantıları
  ["n33", "n35"], ["n35", "n10"], ["n33", "n40"], ["n40", "n19"],
  ["n55", "n33"], ["n55", "n23"],
  
  // Doğu bağlantıları
  ["n34", "n40"], ["n34", "n52"], ["n52", "n5"], ["n59", "n21"],
  ["n59", "n42"],
  
  // Ara bağlantılar
  ["n37", "n4"], ["n37", "n53"], ["n38", "n4"], ["n38", "n33"],
  ["n41", "n3"], ["n41", "n10"],
  
  // Durak bağlantıları
  ["n51", "n1"], ["n51", "n31"], ["n54", "n46"], ["n54", "n13"],
  
  // Ataevler
  ["n44", "n45"], ["n45", "n19"], ["n45", "n20"],
  
  // Ek bağlantılar
  ["n47", "n54"], ["n60", "n49"], ["n60", "n24"],
  ["n46", "n27"], ["n58", "n9"], ["n58", "n35"],
  
  // Daha fazla bağlantı
  ["n2", "n56"], ["n7", "n27"], ["n11", "n53"], ["n37", "n5"],
  ["n43", "n46"], ["n48", "n51"],
];

// Haversine mesafe hesaplama
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// Nodes oluştur
niluferNodes.forEach(n => {
  mapData.nodes.push({ id: n.id, lat: n.lat, lng: n.lng });
});

// Edges oluştur (çift yönlü)
niluferEdges.forEach(([from, to]) => {
  const fromNode = niluferNodes.find(n => n.id === from);
  const toNode = niluferNodes.find(n => n.id === to);
  if(fromNode && toNode) {
    const dist = haversine(fromNode.lat, fromNode.lng, toNode.lat, toNode.lng);
    // Random speed limit based on road type
    const speed = dist > 800 ? 50 : dist > 400 ? 40 : 30;
    mapData.edges.push({ from, to, weight: Math.round(dist), speed });
    mapData.edges.push({ from: to, to: from, weight: Math.round(dist), speed }); // çift yönlü
  }
});

const fs = require('fs');
const path = require('path');
const outPath = path.join(__dirname, '..', 'data', 'map_data.json');
fs.writeFileSync(outPath, JSON.stringify(mapData, null, 2));
console.log(`✓ Bursa Nilüfer harita verisi oluşturuldu: ${mapData.nodes.length} düğüm, ${mapData.edges.length} kenar`);
console.log(`✓ Dosya: ${outPath}`);
