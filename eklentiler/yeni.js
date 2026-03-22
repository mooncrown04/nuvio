/**
 * Nuvio Local Scraper - FilmciBaba (ID tabanlı tam çözüm)
 */

var cheerio = require("cheerio-without-node-native");

const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023'; // Senin eklentilerindeki anahtar
const WATCHBUDDY_BASE = "https://stream.watchbuddy.tv/icerik/FilmciBaba";

function getStreams(inputData) {
    return new Promise(function(resolve) {
        console.error("[FilmciBaba] === SÜREÇ BAŞLATILDI ===");
        
        // Gelen veriyi (ID mi obje mi) kontrol et
        var tmdbId = "";
        if (typeof inputData === 'string' || typeof inputData === 'number') {
            tmdbId = inputData.toString();
        } else if (inputData && inputData.imdbId) {
            tmdbId = inputData.imdbId;
        }

        console.error("[FilmciBaba] Yakalanan ID: " + tmdbId);

        if (!tmdbId) {
            console.error("[FilmciBaba] HATA: Geçerli bir ID bulunamadı.");
            return resolve([]);
        }

        // 1. ADIM: TMDB'den isim al
        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
            .then(function(r) { return r.json(); })
            .then(function(movie) {
                if (!movie.title) throw new Error("Film adı bulunamadı.");
                
                // Film adını URL dostu yap (slug oluştur)
                var slug = movie.title.toLowerCase()
                    .replace(/ /g, '-')
                    .replace(/[^\w-]+/g, '');
                
                // Örnek: izle.plus/ajan-zeta/
                var izlePlusUrl = "https://izle.plus/" + slug + "/";
                console.error("[FilmciBaba] Tahmini Site URL: " + izlePlusUrl);

                // 2. ADIM: WatchBuddy üzerinden sayfayı çek
                var finalTarget = WATCHBUDDY_BASE + "?url=" + encodeURIComponent(izlePlusUrl);
                
                return fetch(finalTarget, {
                    headers: { 'User-Agent': 'Mozilla/5.0...', 'Referer': 'https://stream.watchbuddy.tv/' }
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var streams = [];

                // 3. ADIM: Video linklerini (iframe/m3u8) ayıkla
                $('iframe').each(function(i, elem) {
                    var src = $(elem).attr('src');
                    if (src && src.startsWith('http')) {
                        streams.push({
                            name: "FilmciBaba (Kaynak " + (i+1) + ")",
                            url: src,
                            quality: "1080p"
                        });
                    }
                });

                // Eğer iframe yoksa düz link ara
                if (streams.length === 0) {
                    var m3u8s = html.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/gi);
                    if (m3u8s) {
                        m3u8s.forEach(function(l) {
                            streams.push({ name: "FilmciBaba Auto", url: l, quality: "Auto" });
                        });
                    }
                }

                console.error("[FilmciBaba] İşlem bitti. Stream sayısı: " + streams.length);
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
