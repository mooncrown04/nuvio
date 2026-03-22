/**
 * Nuvio Local Scraper - HotStream Modülü
 * Kritik Hata İzleme (console.error) Entegre Edildi
 */

var cheerio = require("cheerio-without-node-native");

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Connection': 'keep-alive'
};

function getStreams(searchResult) {
    return new Promise(function(resolve) {
        // Logların sistemde "Error" seviyesinde parlaması için console.error kullanıyoruz
        console.error("[HotStream] === SÜREÇ BAŞLATILDI ===");

        // 1. Kilit Nokta: Parametre Kontrolü
        if (!searchResult) {
            console.error("[HotStream] KRİTİK HATA: searchResult parametresi boş! Nuvio veri gönderemedi.");
            return resolve([]);
        }

        console.error("[HotStream] Aranan Başlık: " + (searchResult.title || "Bilinmiyor"));

        var streams = [];

        try {
            // Önemli: Gerçek senaryoda burası bir fetch isteği içerecektir.
            // Veri simülasyonu (rawData)
            var rawData = {
                "name": "HotStream",
                "url": "https://hotstream.club/list/N0VjWTBvb0ppbEo3bUdzeERNL09sNCtqWUVvWS85eDlZb2VEb2s4aWdJZjhPM1cyQkExb0tQYlI3ZXUxNjgxb0hSUWpOa3JLODhYQ245NDV0OC8wejdKcitZZE10S3JhelNhditPZVpEK2U2dnRiM3MrUVF4c0p6SjVuSTlPeGNibTRIemRTRE9vbjlXcjBMOTJaeDJQZC8zcHVGRUloWTc5YXNGV1hxU0lNPQ==",
                "referer": "https://hotstream.club/embed/wNXSyyQMhUeLa5Z"
            };

            // 2. Kilit Nokta: URL Doğrulama
            if (!rawData.url || !rawData.url.startsWith('http')) {
                console.error("[HotStream] HATA: Geçersiz kaynak URL'si! rawData.url alınamadı.");
            } else {
                console.error("[HotStream] Başarılı: URL Yakalandı (İlk 50 karakter): " + rawData.url.substring(0, 50));
            }

            // Stream nesnesini oluşturma
            var streamObj = {
                name: "HotStream (Kekik)",
                title: (searchResult.title || "Film İçeriği") + " [1080p]",
                url: rawData.url,
                quality: "1080p",
                headers: {
                    'User-Agent': WORKING_HEADERS['User-Agent'],
                    'Referer': rawData.referer || 'https://hotstream.club/',
                    'Origin': 'https://hotstream.club'
                },
                provider: "HotStream_Scraper"
            };

            streams.push(streamObj);
            console.error("[HotStream] BİLGİ: Liste başarıyla oluşturuldu. Sayı: " + streams.length);

        } catch (err) {
            // 3. Kilit Nokta: Kodun içinde patlama olursa (Yazım hatası vs)
            console.error("[HotStream] SİSTEMSEL ÇÖKME (Catch): " + err.message);
        }

        console.error("[HotStream] === SÜREÇ TAMAMLANDI ===");
        resolve(streams);
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
