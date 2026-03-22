/**
 * Nuvio Local Scraper - FilmciBaba (Universal Parser)
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

        var foundUrl = "";

        // 1. ADIM: Objeyi stringe çevirip içinde URL var mı bak (Hızlı Kontrol)
        try {
            var rawString = JSON.stringify(searchResult);
            console.error("[FilmciBaba] Ham Veri Kontrolü: " + rawString);
            
            // 2. ADIM: Obje içindeki tüm stringleri tara
            function findUrlDeep(obj) {
                for (var key in obj) {
                    var val = obj[key];
                    if (typeof val === 'string' && val.indexOf('http') === 0 && val.indexOf('native code') === -1) {
                        return val;
                    } else if (typeof val === 'object' && val !== null) {
                        var deep = findUrlDeep(val);
                        if (deep) return deep;
                    }
                }
                return "";
            }
            
            foundUrl = findUrlDeep(searchResult);
        } catch (e) {
            console.error("[FilmciBaba] Obje okuma hatası: " + e.message);
        }

        // 3. ADIM: Eğer hala bulunamadıysa (Nuvio bazen doğrudan string gönderir)
        if (!foundUrl && typeof searchResult === 'string' && searchResult.indexOf('http') === 0) {
            foundUrl = searchResult;
        }

        if (!foundUrl) {
            console.error("[FilmciBaba] KRİTİK HATA: URL bulunamadı. Gelen veri yapısı logda yukarıdadır.");
            return resolve([]);
        }

        console.error("[FilmciBaba] URL Yakalandı: " + foundUrl);
        var finalTarget = WATCHBUDDY_BASE + "?url=" + encodeURIComponent(foundUrl);

        fetch(finalTarget, { headers: HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var streams = [];

                // Iframe ve Video elementlerini ayıkla
                $('iframe, video, source').each(function(i, elem) {
                    var src = $(elem).attr('src') || $(elem).attr('href');
                    if (src && src.startsWith('http')) {
                        streams.push({
                            name: "FilmciBaba - Kaynak " + (i + 1),
                            url: src,
                            quality: "1080p",
                            headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': finalTarget }
                        });
                    }
                });

                // Regex ile m3u8 kontrolü
                if (streams.length === 0) {
                    var matches = html.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/gi);
                    if (matches) {
                        matches.forEach(function(m) {
                            streams.push({ name: "FilmciBaba Auto", url: m, quality: "Auto", headers: HEADERS });
                        });
                    }
                }

                console.error("[FilmciBaba] Tamamlandı. Bulunan: " + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error("[FilmciBaba] Bağlantı Hatası: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
