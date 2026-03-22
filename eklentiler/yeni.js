/**
 * Nuvio Local Scraper - FilmciBaba (Fix: Native Code & Link Conflict)
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
            console.error("[FilmciBaba] KRİTİK HATA: Veri gelmedi.");
            return resolve([]);
        }

        // 1. Kilit Düzeltme: searchResult.link çakışmasını engelle
        var validUrl = "";
        
        // Obje içindeki tüm özellikleri tara ve gerçek bir URL bul
        for (var key in searchResult) {
            var value = searchResult[key];
            // Eğer değer bir metinse, http ile başlıyorsa ve "native code" içermiyorsa bu bizim URL'mizdir
            if (typeof value === 'string' && value.startsWith('http') && value.indexOf('native code') === -1) {
                validUrl = value;
                break; 
            }
        }

        // Eğer yukarıdaki döngü bulamadıysa searchResult.url'ye bak (link değil!)
        if (!validUrl && typeof searchResult.url === 'string') validUrl = searchResult.url;

        var title = searchResult.title || "Film";
        console.error("[FilmciBaba] Ayıklanan URL: " + (validUrl ? "BAŞARILI" : "HATA (Bulunamadı)"));

        if (!validUrl) {
            console.error("[FilmciBaba] HATA: Geçerli bir video sayfası URL'si yakalanamadı.");
            return resolve([]);
        }

        var finalTarget = WATCHBUDDY_BASE + "?url=" + encodeURIComponent(validUrl);
        console.error("[FilmciBaba] İstek: " + finalTarget);

        fetch(finalTarget, { headers: HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var streams = [];

                // Paylaştığın 4.js dökümündeki iframe yapısını bul
                $('iframe').each(function(i, elem) {
                    var src = $(elem).attr('src');
                    if (src && src.startsWith('http')) {
                        streams.push({
                            name: "FilmciBaba - Kaynak " + (i + 1),
                            url: src,
                            quality: "1080p",
                            headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': finalTarget }
                        });
                    }
                });

                // Eğer iframe yoksa m3u8 regex tara
                if (streams.length === 0) {
                    var m3u8s = html.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/gi);
                    if (m3u8s) {
                        m3u8s.forEach(function(l) {
                            streams.push({ name: "FilmciBaba Auto", url: l, quality: "Auto", headers: HEADERS });
                        });
                    }
                }

                console.error("[FilmciBaba] BİTTİ. Stream Sayısı: " + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error("[FilmciBaba] FETCH HATASI: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
