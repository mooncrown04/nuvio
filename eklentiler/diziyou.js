// [DZB-LOG] Test baslatildi
console.log('[DZB-LOG] SADECE FONKSIYON TESTI');

async function search(query) {
    console.log('[DZB-LOG] ARAMA YAPILIYOR: ' + query);
    return [];
}

// Bazı sistemler nesneyi en altta çıplak görmek ister
({
    name: "DiziYou",
    search: search
});
