/**
 * FullHDFilmizlesene Nuvio Scraper - v16.8
 * AES Decryptor Mantığı & Dizipal/SineWix Hybrid Yapısı
 */

var cheerio = require("cheerio-without-node-native");

// SineWix'in Android 14 stabilite ayarları entegre edildi
const STABLE_HEADERS = {
    'User-Agent': 'EasyPlex (Android 14; SM-A546B; Samsung Galaxy A54 5G; tr)',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
};

const BASE_URL = "https://www.fullhdfilmizlesene.live";

// AES/RapidVid Çözücü (Geliştirilmiş Versiyon)
function decryptStream(cipherText) {
    try {
        // aesdecryptor mantığı: Terse çevir ve Base64 çöz
        var reversed = cipherText.split("").reverse().join("");
        var decoded = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        var key = "K9L", result = "";
        for (var i = 0; i < decoded.length; i++) {
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            result += String.fromCharCode(decoded.charCodeAt(i) - shift);
        }
        return atob(result).replace(/\\/g, "").trim();
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        // TMDB Verisi (SineWix stili)
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                // Arama sayfası
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: STABLE_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                // Dizipal benzeri link yakalama
                var filmPath = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                
                if (!filmPath) throw new Error("Film Bulunamadı");
                
                var filmUrl = filmPath.startsWith('http') ? filmPath : BASE_URL + filmPath;
                return fetch(filmUrl, { headers: STABLE_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                // Diziyou'daki itemId mantığına benzer vidid yakalama
                var vidMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vidMatch) throw new Error("Video ID Yok");

                var playerUrl = "https://rapidvid.net/e/" + vidMatch[1];
                return fetch(playerUrl, { 
                    headers: { 'User-Agent': STABLE_HEADERS['User-Agent'], 'Referer': BASE_URL + '/' } 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                // AES şifreli video datasını yakala
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var finalLink = decryptStream(avMatch[1]);
                    if (finalLink) {
                        var streamUrl = finalLink.startsWith("//") ? "https:" + finalLink : finalLink;
                        
                        // Sonuç formatı (SineWix/Dizipal Standartı)
                        resolve([{
                            name: '⌜ FullHD ⌟ | RapidVid (AES)',
                            url: streamUrl,
                            quality: '1080p',
                            headers: {
                                'User-Agent': STABLE_HEADERS['User-Agent'],
                                'Referer': 'https://rapidvid.net/'
                            },
                            provider: 'fullhd_scraper'
                        }]);
                        return;
                    }
                }
                resolve([]);
            })
            .catch(function(err) {
                console.error('[FullHD] AES Scraper Hatası:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
