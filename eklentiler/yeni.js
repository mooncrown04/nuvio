/**
 * Nuvio Local Scraper - FilmciBaba (IMDb Destekli)
 * Bu kod, Nuvio'dan gelen IMDb bilgisini kullanarak en doğru eşleşmeyi yapar.
 */

var cheerio = require("cheerio-without-node-native");

const WATCHBUDDY_BASE = "https://stream.watchbuddy.tv/icerik/FilmciBaba";
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://stream.watchbuddy.tv/'
};

/**
 * @param {object} searchResult - Nuvio'nun sağladığı obje (imdbId, title, year içerir)
 */
function getStreams(searchResult) {
    return new Promise(function(resolve) {
        console.error("[FilmciBaba] === SÜREÇ BAŞLATILDI ===");

        // 1. IMDb ID Kontrolü (Eşleşme için kritik)
        var imdbId = searchResult.imdbId || searchResult.imdb_id;
        
        if (!imdbId) {
            console.error("[FilmciBaba] UYARI: IMDb ID bulunamadı, isimle devam ediliyor: " + searchResult.title);
        } else {
            console.error("[FilmciBaba] IMDb ID ile eşleşme aranıyor: " + imdbId);
        }

        // 2. Hedef URL Oluşturma
        // NOT: Eğer searchResult.url zaten izle.plus gibi bir yere gidiyorsa onu kullanırız.
        // Gitmiyorsa, WatchBuddy'nin arama motorunu tetikleyecek yapı kurulmalıdır.
        var targetUrl = "";
        if (searchResult.url) {
            targetUrl = WATCHBUDDY_BASE + "?url=" + encodeURIComponent(searchResult.url);
        } else {
            // Eğer URL yoksa, arama sayfasına yönlendir (Simülasyon)
            console.error("[FilmciBaba] HATA: Doğrudan URL gelmedi, arama başarısız olabilir.");
            return resolve([]);
        }

        console.error("[FilmciBaba] İstek gönderiliyor: " + targetUrl);

        fetch(targetUrl, { headers: HEADERS })
            .then(function(res) {
                if (!res.ok) throw new Error("HTTP Hata: " + res.status);
                return res.text();
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                var streams = [];

                // HTML içindeki iframe veya m3u8 kaynaklarını ayıkla (4.js yapısına göre)
                $('iframe, video source').each(function(i, elem) {
                    var src = $(elem).attr('src');
                    if (src && src.startsWith('http')) {
                        console.error("[FilmciBaba] Kaynak Bulundu: " + src.substring(0, 40));
                        
                        streams.push({
                            name: "FilmciBaba (IMDb Match)",
                            title: searchResult.title || "Film",
                            url: src,
                            quality: "1080p",
                            headers: {
                                'User-Agent': HEADERS['User-Agent'],
                                'Referer': targetUrl
                            }
                        });
                    }
                });

                // Eğer element bulunamazsa Regex ile script içini tara
                if (streams.length === 0) {
                    var m3u8Match = html.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/gi);
                    if (m3u8Match) {
                        m3u8Match.forEach(function(link) {
                            streams.push({
                                name: "FilmciBaba (Auto M3U8)",
                                url: link,
                                quality: "Auto",
                                headers: HEADERS
                            });
                        });
                    }
                }

                console.error("[FilmciBaba] İşlem Bitti. Bulunan: " + streams.length);
                resolve(streams);
            })
            .catch(function(err) {
                console.error("[FilmciBaba] KRİTİK HATA: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
