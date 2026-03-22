/**
 * Nuvio Local Scraper - İzle.plus (Direct Access)
 * Aracı site (watchbuddy) olmadan doğrudan erişim sağlar.
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://izle.plus";
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

function getStreams(inputData) {
    return new Promise(function(resolve) {
        console.error("[İzlePlus] === DOĞRUDAN ERİŞİM BAŞLATILDI ===");
        
        // 1. TMDB ID Yakala
        var tmdbId = (typeof inputData === 'object' ? (inputData.imdbId || inputData.tmdbId) : inputData).toString();

        // 2. TMDB'den Film İsmi Al (Arama için)
        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
            .then(function(r) { return r.json(); })
            .then(function(movie) {
                if (!movie.title) throw new Error("Film adı TMDB'den çekilemedi.");
                
                // URL Dostu İsim (Slug) - İzle.plus bu formatı kullanır
                var slug = movie.title.toLowerCase()
                    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                    .replace(/ /g, '-').replace(/[^\w-]+/g, '');
                
                var targetUrl = BASE_URL + "/" + slug + "/";
                console.error("[İzlePlus] Hedef Sayfa: " + targetUrl);

                return fetch(targetUrl, { headers: HEADERS });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error("Siteye erişilemedi: " + res.status);
                return res.text(); 
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                var streams = [];

                // 3. Kaynak Ayıklama (Iframe ve Video Alanları)
                $('iframe, [data-src], source').each(function(i, elem) {
                    var src = $(elem).attr('src') || $(elem).attr('data-src');
                    
                    if (src && src.startsWith('http')) {
                        // Reklamları ve harici servisleri engelle
                        if (src.indexOf('google') === -1 && src.indexOf('analytics') === -1) {
                            streams.push({
                                name: "İzlePlus (Kaynak " + (streams.length + 1) + ")",
                                url: src,
                                quality: "1080p",
                                headers: { 'Referer': BASE_URL + '/' }
                            });
                        }
                    }
                });

                // 4. Alternatif: Sayfa içindeki gizli m3u8 linklerini tara (Regex)
                var m3u8Matches = html.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/gi);
                if (m3u8Matches) {
                    m3u8Matches.forEach(function(link) {
                        streams.push({
                            name: "İzlePlus (Direct M3U8)",
                            url: link,
                            quality: "Auto",
                            headers: { 'Referer': BASE_URL + '/' }
                        });
                    });
                }

                // 5. Kaynakları Tekilleştir
                var unique = streams.filter(function(v, i, a) {
                    return a.findIndex(function(t) { return t.url === v.url; }) === i;
                });

                console.error("[İzlePlus] İşlem Tamam. Bulunan: " + unique.length);
                resolve(unique);
            })
            .catch(function(err) {
                console.error("[İzlePlus] SİSTEM HATASI: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
