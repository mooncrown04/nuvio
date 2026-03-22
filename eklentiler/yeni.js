/**
 * Nuvio Local Scraper - FilmciBaba (İzle.plus Gelişmiş Parser)
 */

var cheerio = require("cheerio-without-node-native");

const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
const WATCHBUDDY_BASE = "https://stream.watchbuddy.tv/icerik/FilmciBaba";

function getStreams(inputData) {
    return new Promise(function(resolve) {
        console.error("[FilmciBaba] === SÜREÇ BAŞLATILDI ===");
        
        var tmdbId = (typeof inputData === 'object' ? (inputData.imdbId || inputData.tmdbId) : inputData).toString();
        console.error("[FilmciBaba] TMDB ID: " + tmdbId);

        // 1. TMDB'den Film Bilgisi Çek
        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
            .then(function(r) { return r.json(); })
            .then(function(movie) {
                if (!movie.title) throw new Error("Film ismi bulunamadı.");
                
                // URL dostu isim (slug) oluşturma - Türkçe karakter desteğiyle
                var slug = movie.title.toLowerCase()
                    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                    .replace(/ /g, '-').replace(/[^\w-]+/g, '');
                
                var izlePlusUrl = "https://izle.plus/" + slug + "/";
                console.error("[FilmciBaba] Hedef Site: " + izlePlusUrl);

                var finalTarget = WATCHBUDDY_BASE + "?url=" + encodeURIComponent(izlePlusUrl);
                
                return fetch(finalTarget, {
                    headers: { 
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                        'Referer': 'https://stream.watchbuddy.tv/' 
                    }
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var streams = [];

                // 2. Gelişmiş Ayıklama: Sitedeki tüm potansiyel video alanlarını tara
                // İzle.plus özel: player-tab, iframe, data-id içeren divler
                $('iframe, [data-src], [data-id], source').each(function(i, elem) {
                    var src = $(elem).attr('src') || $(elem).attr('data-src') || $(elem).attr('data-video');
                    
                    if (src && src.indexOf('http') !== -1) {
                        // Kendini tekrar eden linkleri veya reklamları filtrele
                        if (src.indexOf('google') === -1 && src.indexOf('analytics') === -1) {
                            streams.push({
                                name: "FilmciBaba (Kaynak " + (streams.length + 1) + ")",
                                url: src,
                                quality: "1080p",
                                headers: { 'Referer': 'https://izle.plus/' }
                            });
                        }
                    }
                });

                // 3. Regex ile Sayfa İçindeki Gizli m3u8 veya mp4 Linklerini Tara
                var regex = /(https?:\/\/[^\s'"]+\.(?:m3u8|mp4|mkv)[^\s'"]*)/gi;
                var matches = html.match(regex);
                if (matches) {
                    matches.forEach(function(link) {
                        if (link.indexOf('stream') !== -1 || link.indexOf('m3u8') !== -1) {
                            streams.push({
                                name: "FilmciBaba (Auto Link)",
                                url: link,
                                quality: "Auto"
                            });
                        }
                    });
                }

                // Tekrar eden linkleri temizle
                var uniqueStreams = streams.filter(function(v, i, a) {
                    return a.findIndex(function(t) { return t.url === v.url; }) === i;
                });

                console.error("[FilmciBaba] İşlem Bitti. Bulunan: " + uniqueStreams.length);
                resolve(uniqueStreams);
            })
            .catch(function(err) {
                console.error("[FilmciBaba] HATA: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
