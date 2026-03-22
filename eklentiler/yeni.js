/**
 * Nuvio Local Scraper - İzle.plus (Final Production Version)
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://izle.plus";
const TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

const STANDARD_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        console.error("[İzlePlus] === SÜREÇ BAŞLATILDI ===");
        
        // Giriş verisi kontrolü (Nuvio bazen tek obje, bazen ayrı parametre gönderir)
        var id = (typeof tmdbId === 'object' ? (tmdbId.imdbId || tmdbId.tmdbId) : tmdbId).toString();
        var type = (mediaType || 'movie') === 'tv' ? 'tv' : 'movie';

        // 1. TMDB'den Bilgi Al
        fetch('https://api.themoviedb.org/3/' + type + '/' + id + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
            .then(function(r) { return r.json(); })
            .then(function(data) {
                var title = data.title || data.name;
                if (!title) throw new Error("Başlık bulunamadı.");

                // URL Slug Oluştur (Türkçe karakter fix)
                var slug = title.toLowerCase()
                    .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
                    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
                    .replace(/ /g, '-').replace(/[^\w-]+/g, '');
                
                var targetUrl = BASE_URL + "/" + slug + "/";
                console.error("[İzlePlus] Hedef Sayfa: " + targetUrl);

                return fetch(targetUrl, { headers: STANDARD_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var streamLinks = [];

                // 2. Sayfadaki Kaynakları Ayıkla
                // İzle.plus iframe'leri genellikle 'video-embed' veya 'player' sınıflarında olur
                $('iframe, .video-embed iframe, [data-src]').each(function(i, elem) {
                    var src = $(elem).attr('src') || $(elem).attr('data-src');
                    
                    if (src && src.includes('http')) {
                        if (!src.includes('google') && !src.includes('analytics')) {
                            streamLinks.push({
                                name: "İzlePlus - Kaynak " + (streamLinks.length + 1),
                                url: src,
                                quality: "1080p",
                                headers: { 'Referer': BASE_URL + '/' }
                            });
                        }
                    }
                });

                // 3. Regex ile M3U8 Tara (Eğer iframe yakalanamazsa)
                var m3u8Regex = /https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/gi;
                var matches = html.match(m3u8Regex);
                if (matches) {
                    matches.forEach(function(m) {
                        streamLinks.push({
                            name: "İzlePlus - Otomatik",
                            url: m,
                            quality: "Auto",
                            isM3u8: true,
                            headers: { 'Referer': BASE_URL + '/' }
                        });
                    });
                }

                // 4. Sonuçları Tekilleştir
                var finalResults = streamLinks.filter(function(v, i, a) {
                    return a.findIndex(function(t) { return t.url === v.url; }) === i;
                });

                console.error("[İzlePlus] Bitti. Bulunan: " + finalResults.length);
                resolve(finalResults);
            })
            .catch(function(err) {
                console.error("[İzlePlus] HATA: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
