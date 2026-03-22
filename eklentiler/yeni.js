/**
 * Nuvio Local Scraper - FilmciBaba (WatchBuddy)
 * Esnek Parametre Desteği ve Gelişmiş Loglama
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
            console.error("[FilmciBaba] KRİTİK HATA: searchResult objesi tamamen boş!");
            return resolve([]);
        }

        // 1. Esnek Parametre Yakalama (Nuvio'nun farklı versiyonları için)
        var imdb = searchResult.imdbId || searchResult.imdb_id || searchResult.imdb;
        var title = searchResult.title || searchResult.name || "Bilinmeyen İçerik";
        var sourceUrl = searchResult.url || searchResult.sourceUrl || searchResult.link;

        console.error("[FilmciBaba] Gelen Veri -> Başlık: " + title + " | IMDb: " + (imdb || "Yok") + " | URL: " + (sourceUrl ? "Dolu" : "Boş"));

        // 2. URL Kontrolü ve Oluşturma
        if (!sourceUrl) {
            console.error("[FilmciBaba] HATA: Nuvio'dan URL gelmedi! İşlem devam edemiyor.");
            return resolve([]);
        }

        // WatchBuddy URL formatını hazırla
        var finalTarget = WATCHBUDDY_BASE + "?url=" + encodeURIComponent(sourceUrl);
        console.error("[FilmciBaba] Hedef URL: " + finalTarget);

        fetch(finalTarget, { headers: HEADERS })
            .then(function(res) {
                if (!res.ok) throw new Error("Bağlantı Reddedildi: " + res.status);
                return res.text();
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                var streams = [];

                // HTML içindeki iframe'leri tara (4.js yapısı)
                $('iframe').each(function(i, elem) {
                    var src = $(elem).attr('src');
                    if (src && src.startsWith('http')) {
                        console.error("[FilmciBaba] Stream Kaynağı Yakalandı: " + src.substring(0, 50));
                        streams.push({
                            name: "FilmciBaba (Server " + (i + 1) + ")",
                            title: title,
                            url: src,
                            quality: "1080p",
                            headers: { 
                                'User-Agent': HEADERS['User-Agent'],
                                'Referer': finalTarget 
                            }
                        });
                    }
                });

                // Alternatif: Script içindeki gizli m3u8 linklerini tara
                if (streams.length === 0) {
                    console.error("[FilmciBaba] Element bulunamadı, script taranıyor...");
                    var m3u8Links = html.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/gi);
                    if (m3u8Links) {
                        m3u8Links.forEach(function(link, index) {
                            streams.push({
                                name: "FilmciBaba Auto-" + (index + 1),
                                url: link,
                                quality: "Auto",
                                headers: HEADERS
                            });
                        });
                    }
                }

                console.error("[FilmciBaba] Süreç Bitti. Toplam Stream: " + streams.length);
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
