/**
 * Nuvio Local Scraper - İzle.plus (Deep Decoder Version)
 * Bu sürüm yakalanan sayfa linklerinin içine girip gerçek m3u8'i ayıklar.
 */

var cheerio = require("cheerio-without-node-native");

const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
const DIRECT_BASE = "https://izle.plus";

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': DIRECT_BASE + '/'
};

function getStreams(inputData) {
    return new Promise(function(resolve) {
        console.error("[Eklenti] === DERİN ÇÖZÜCÜ BAŞLATILDI ===");
        
        var id = (typeof inputData === 'object' ? (inputData.imdbId || inputData.tmdbId) : inputData).toString();

        fetch('https://api.themoviedb.org/3/movie/' + id + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
            .then(r => r.json())
            .then(movie => {
                var slug = movie.title.toLowerCase()
                    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                    .replace(/ /g, '-').replace(/[^\w-]+/g, '');
                
                var targetUrl = DIRECT_BASE + "/" + slug + "/";
                return fetch(targetUrl, { headers: HEADERS });
            })
            .then(res => res.text())
            .then(function(html) {
                var $ = cheerio.load(html);
                var candidates = [];

                // 1. Sayfadaki iframe ve player linklerini topla
                $('iframe, [data-src]').each((i, el) => {
                    var src = $(el).attr('src') || $(el).attr('data-src');
                    if (src && src.includes('http') && !src.includes('google')) {
                        candidates.push(src);
                    }
                });

                // 2. Her adayın içine girip GERÇEK m3u8 dosyasını ara
                var deepScans = candidates.map(url => {
                    return fetch(url, { headers: { 'Referer': DIRECT_BASE + '/' } })
                        .then(r => r.text())
                        .then(page => {
                            // Sayfa içinde .m3u8 veya .mp4 ara (Regex)
                            var videoMatch = page.match(/https?:\/\/[^\s'"]+\.(?:m3u8|mp4)[^\s'"]*/gi);
                            if (videoMatch) {
                                return {
                                    name: "İzlePlus (Deep Scan)",
                                    url: videoMatch[0],
                                    quality: "1080p",
                                    isM3u8: videoMatch[0].includes('m3u8'),
                                    headers: { 'Referer': url, 'Origin': 'https://izle.plus' }
                                };
                            }
                            return null;
                        }).catch(() => null);
                });

                return Promise.all(deepScans);
            })
            .then(results => {
                var finalStreams = results.filter(s => s !== null);
                console.error("[Eklenti] Bitti. Oynatılabilir Kaynak: " + finalStreams.length);
                resolve(finalStreams);
            })
            .catch(err => {
                console.error("[Eklenti] Hata: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
