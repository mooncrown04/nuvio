/**
 * FullHDFilmizlesene Nuvio Scraper - v16.4
 * "Bypass & Lite" Sürümü - Bellek ve Erişim Hataları İçin Optimize Edildi.
 */

var cheerio = require("cheerio-without-node-native");

// SineWix ve Dizipal'de sorun çıkarmayan "Android Mobil" header seti
const BYPASS_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Upgrade-Insecure-Requests': '1'
};

const BASE_URL = "https://www.fullhdfilmizlesene.live";

function decodeRapidVid(e) {
    try {
        var r = e.split("").reverse().join(""),
            b = atob(r.replace(/[^A-Za-z0-9+/=]/g, "")),
            k = "K9L", a = "";
        for (var i = 0; i < b.length; i++) {
            var s = (k.charCodeAt(i % k.length) % 5) + 1;
            a += String.fromCharCode(b.charCodeAt(i) - s);
        }
        return atob(a).replace(/\\/g, "").trim();
    } catch (t) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        // Bellek hatasını önlemek için TMDB isteğini yalın tutuyoruz
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.log('[FullHD] Sorgu:', query);
                
                // Arama işlemini doğrudan gerçekleştiriyoruz
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: BYPASS_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                // En garantili link yakalama metodu
                var firstMatch = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                
                if (!firstMatch) throw new Error("Arama Sonucu Boş");
                
                var filmUrl = firstMatch.startsWith('http') ? firstMatch : BASE_URL + firstMatch;
                return fetch(filmUrl, { headers: BYPASS_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                // vidid yakalama (Sistem bellek hatası vermemesi için regex ile)
                var idMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!idMatch) throw new Error("Video ID Bulunamadı");

                var playerUrl = "https://rapidvid.net/e/" + idMatch[1];
                return fetch(playerUrl, { headers: { 'User-Agent': BYPASS_HEADERS['User-Agent'], 'Referer': BASE_URL + '/' } });
            })
            .then(function(res) { return res.text(); })
            .then(function(embed) {
                var avMatch = embed.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var stream = decodeRapidVid(avMatch[1]);
                    if (stream) {
                        var finalLink = stream.startsWith("//") ? "https:" + stream : stream;
                        
                        // SineWix/Dizipal ile aynı başarılı format
                        resolve([{
                            name: '⌜ FullHD ⌟ | RapidVid',
                            url: finalLink,
                            quality: '1080p',
                            headers: {
                                'User-Agent': BYPASS_HEADERS['User-Agent'],
                                'Referer': 'https://rapidvid.net/',
                                'Origin': 'https://rapidvid.net'
                            },
                            provider: 'fullhd_scraper'
                        }]);
                        return;
                    }
                }
                resolve([]);
            })
            .catch(function(err) {
                console.error('[FullHD] Bypass Hatası:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
