/**
 * Nuvio Local Scraper - İzle.plus (Final Fix: ExoPlayer Compatibility)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://izle.plus";
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function getStreams(inputData) {
    return new Promise(function(resolve) {
        console.error("[İzlePlus] === BAŞLATILDI ===");
        
        var tmdbId = (typeof inputData === 'object' ? (inputData.imdbId || inputData.tmdbId) : inputData).toString();

        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
            .then(function(r) { return r.json(); })
            .then(function(movie) {
                var slug = movie.title.toLowerCase()
                    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                    .replace(/ /g, '-').replace(/[^\w-]+/g, '');
                
                var targetUrl = BASE_URL + "/" + slug + "/";
                return fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0...' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var initialLinks = [];

                // 1. Aşama: Sayfadaki iframe veya player linklerini topla
                $('iframe, [data-src]').each(function(i, elem) {
                    var src = $(elem).attr('src') || $(elem).attr('data-src');
                    if (src && src.startsWith('http') && src.indexOf('google') === -1) {
                        initialLinks.push(src);
                    }
                });

                // 2. Aşama: Bu linklerin içine girip asıl video dosyasını ara
                var promises = initialLinks.map(function(link) {
                    return fetch(link, { headers: { 'Referer': BASE_URL + '/' } })
                        .then(function(r) { return r.text(); })
                        .then(function(pageContent) {
                            // Sayfa içinde .m3u8 veya .mp4 ara
                            var m3u8Match = pageContent.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/gi);
                            if (m3u8Match) {
                                return {
                                    name: "İzlePlus (HLS)",
                                    url: m3u8Match[0],
                                    quality: "1080p",
                                    isM3u8: true, // ExoPlayer için kritik
                                    headers: { 'Referer': link, 'Origin': 'https://izle.plus' }
                                };
                            }
                            return null;
                        }).catch(function() { return null; });
                });

                return Promise.all(promises);
            })
            .then(function(results) {
                var finalStreams = results.filter(function(s) { return s !== null; });
                
                // Eğer derin tarama sonuç vermediyse, ilk bulunan linkleri güvenli modda ekle
                if (finalStreams.length === 0) {
                     console.error("[İzlePlus] Derin tarama boş, standart link deneniyor.");
                }

                console.error("[İzlePlus] Bitti. Oynatılabilir Stream: " + finalStreams.length);
                resolve(finalStreams);
            })
            .catch(function(err) {
                console.error("[İzlePlus] Hata: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
