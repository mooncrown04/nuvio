/**
 * Nuvio Local Scraper - İzle.plus & HotStream Decoder (V8)
 */

var cheerio = require("cheerio-without-node-native");

const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
const DIRECT_BASE = "https://izle.plus";

function getStreams(inputData) {
    return new Promise(function(resolve) {
        console.error("[İzlePlus] === HOTSTREAM DECODER BAŞLATILDI ===");
        
        var id = (typeof inputData === 'object' ? (inputData.imdbId || inputData.tmdbId) : inputData).toString();

        fetch('https://api.themoviedb.org/3/movie/' + id + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
            .then(r => r.json())
            .then(movie => {
                var slug = movie.title.toLowerCase()
                    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                    .replace(/ /g, '-').replace(/[^\w-]+/g, '');
                
                return fetch(DIRECT_BASE + "/" + slug + "/", { headers: { 'User-Agent': 'Mozilla/5.0' } });
            })
            .then(res => res.text())
            .then(function(html) {
                var $ = cheerio.load(html);
                var pagesToScan = [];

                $('iframe, [data-src]').each((i, el) => {
                    var src = $(el).attr('src') || $(el).attr('data-src');
                    if (src && src.includes('http') && !src.includes('google')) pagesToScan.push(src);
                });

                return Promise.all(pagesToScan.map(url => {
                    return fetch(url, { headers: { 'Referer': DIRECT_BASE + '/' } })
                        .then(r => r.text())
                        .then(pageContent => {
                            // 1. STRATEJİ: Doğrudan m3u8 ara
                            var directMatch = pageContent.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/gi);
                            if (directMatch) return { url: directMatch[0], ref: url };

                            // 2. STRATEJİ: HotStream/Hekş şifreli paket ara (Senin JSON örneğindeki yapı)
                            // "url":"..." veya "file":"..." içindeki uzun Base64 dizilerini yakala
                            var secretMatch = pageContent.match(/["'](?:url|file)["']\s*:\s*["']([A-Za-z0-9+\/=]{100,})["']/i);
                            if (secretMatch) {
                                console.error("[İzlePlus] Şifreli Paket Yakalandı!");
                                // HotStream genelde bu paketi doğrudan player'a gönderir
                                // Biz bu linki embed URL'si ile paketleyip gönderiyoruz
                                return { url: url, isComplex: true, ref: DIRECT_BASE + '/' };
                            }
                            return null;
                        }).catch(() => null);
                }));
            })
            .then(results => {
                var finalResults = [];
                results.forEach(res => {
                    if (res) {
                        finalResults.push({
                            name: "İzlePlus (HotStream)",
                            url: res.url,
                            quality: "1080p",
                            isM3u8: res.url.includes('m3u8'),
                            headers: { 
                                'Referer': res.ref,
                                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                            }
                        });
                    }
                });

                console.error("[İzlePlus] Sonuç: " + finalResults.length);
                resolve(finalResults);
            })
            .catch(err => {
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
