/**
 * Nuvio Local Scraper - HotStream Modülü
 * Debug Modu Aktif
 */

var cheerio = require("cheerio-without-node-native");

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Connection': 'keep-alive'
};

function getStreams(searchResult) {
    return new Promise(function(resolve) {
        console.log("--- HotStream Scraper Başlatıldı ---");
        
        // 1. Kilit Nokta: searchResult parametresi boş mu geliyor?
        if (!searchResult) {
            console.error("HATA: getStreams fonksiyonuna searchResult parametresi gönderilmedi!");
            return resolve([]);
        }

        var streams = [];

        try {
            // Veri simülasyonu
            var rawData = {
                "name": "HotStream",
                "url": "https://hotstream.club/list/N0VjWTBvb0ppbEo3bUdzeERNL09sNCtqWUVvWS85eDlZb2VEb2s4aWdJZjhPM1cyQkExb0tQYlI3ZXUxNjgxb0hSUWpOa3JLODhYQ245NDV0OC8wejdKcitZZE10S3JhelNhditPZVpEK2U2dnRiM3MrUVF4c0p6SjVuSTlPeGNibTRIemRTRE9vbjlXcjBMOTJaeDJQZC8zcHVGRUloWTc5YXNGV1hxU0lNPQ==",
                "referer": "https://hotstream.club/embed/wNXSyyQMhUeLa5Z"
            };

            // 2. Kilit Nokta: URL kontrolü
            if (!rawData.url || !rawData.url.startsWith('http')) {
                console.error("HATA: Geçersiz veya eksik rawData.url tespit edildi!", rawData.url);
            } else {
                console.log("INFO: URL başarıyla alındı:", rawData.url.substring(0, 30) + "...");
            }

            streams.push({
                name: "HotStream (Kekik)",
                title: searchResult.title || "Film İçeriği",
                url: rawData.url,
                quality: "1080p",
                headers: {
                    'User-Agent': WORKING_HEADERS['User-Agent'],
                    'Referer': rawData.referer,
                    'Origin': 'https://hotstream.club'
                },
                provider: "HotStream_Scraper"
            });

            console.log(`BİLGİ: ${streams.length} adet stream başarıyla eklendi.`);

        } catch (err) {
            // 3. Kilit Nokta: Kodun çalışma anında oluşabilecek genel hatalar
            console.error("HATA: getStreams içinde beklenmedik bir hata oluştu!", err.message);
        }

        // Bitiş Logu
        console.log("--- HotStream Scraper İşlemi Tamamlandı ---");
        resolve(streams);
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
