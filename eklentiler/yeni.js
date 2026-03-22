/**
 * Nuvio Local Scraper - FilmciBaba (Garantili URL Yakalama)
 */

var cheerio = require("cheerio-without-node-native");

const WATCHBUDDY_BASE = "https://stream.watchbuddy.tv/icerik/FilmciBaba";
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://stream.watchbuddy.tv/'
};

function getStreams(searchResult) {
    return new Promise(function(resolve) {
        console.error("[FilmciBaba] === SÜREÇ BAŞLATILDI ===");

        if (!searchResult) {
            console.error("[FilmciBaba] HATA: searchResult gelmedi.");
            return resolve([]);
        }

        var finalUrl = "";
        
        // --- URL AYIKLAMA MANTIĞI (KRİTİK KISIM) ---
        try {
            // Objenin tüm anahtarlarını (key) gez
            Object.keys(searchResult).forEach(function(key) {
                var value = searchResult[key];
                
                // Eğer değer bir metinse ve http ile başlıyorsa
                if (typeof value === 'string' && value.indexOf('http') === 0) {
                    // JavaScript 'native code' veya 'function' çakışması değilse al
                    if (value.indexOf('native code') === -1 && value.indexOf('function') === -1) {
                        finalUrl = value;
                    }
                }
            });
        } catch (e) {
            console.error("[FilmciBaba] Tarama Hatası: " + e.message);
        }

        // Eğer hala bulunamadıysa ve .url alanı metinse onu dene
        if (!finalUrl && typeof searchResult.url === 'string') finalUrl = searchResult.url;

        console.error("[FilmciBaba] Ayıklanan URL Durumu: " + (finalUrl ? "BAŞARILI" : "BAŞARISIZ"));

        if (!finalUrl) {
            console.error("[FilmciBaba] KRİTİK HATA: Hiçbir URL parametresi yakalanamadı!");
            // Hata ayıklama için objenin anahtarlarını logla (Sadece geliştirme için)
            console.error("[FilmciBaba] Obje Anahtarları: " + Object.keys(searchResult).join(', '));
            return resolve([]);
        }

        // WatchBuddy Linkini İnşa Et
        var requestUrl = WATCHBUDDY_BASE + "?url=" + encodeURIComponent(finalUrl);
        console.error("[FilmciBaba] Hedef: " + requestUrl);

        fetch(requestUrl, { headers: HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var streams = [];

                // Sayfadaki iframe'leri ve m3u8'leri tara
                $('iframe').each(function(i, elem) {
                    var src = $(elem).attr('src');
                    if (src && src.startsWith('http')) {
                        streams.push({
                            name: "FilmciBaba - Kaynak " + (i + 1),
                            url: src,
                            quality: "1080p",
                            headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': requestUrl }
                        });
                    }
                });

                if (streams.length === 0) {
                    var m3u8s = html.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/gi);
                    if (m3u8s) {
                        m3u8s.forEach(function(l) {
                            streams.push({ name: "FilmciBaba Auto", url: l, quality: "Auto", headers: HEADERS });
                        });
                    }
                }

                console.error("[FilmciBaba] SÜREÇ BİTTİ. Stream: " + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error("[FilmciBaba] Bağlantı Hatası: " + err.message);
                resolve([]);
            });
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
