/**
 * FullHDFilmizlesene Nuvio Scraper - v16.6
 * NetMirror.js çalışma mantığı ve header yapısı entegre edildi.
 */

var cheerio = require("cheerio-without-node-native");

// NetMirror ve SineWix'te sorun çıkarmayan en stabil headerlar
const NET_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': 'https://www.fullhdfilmizlesene.live/',
    'Connection': 'keep-alive'
};

const BASE_URL = "https://www.fullhdfilmizlesene.live";

// RapidVid şifre çözücü (v16.2'den beri stabil çalışan kısım)
function decodeRapidVid(data) {
    try {
        var r = data.split("").reverse().join(""),
            b = atob(r.replace(/[^A-Za-z0-9+/=]/g, "")),
            k = "K9L", a = "";
        for (var i = 0; i < b.length; i++) {
            var s = (k.charCodeAt(i % k.length) % 5) + 1;
            a += String.fromCharCode(b.charCodeAt(i) - s);
        }
        return atob(a).replace(/\\/g, "").trim();
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        // 1. ADIM: TMDB'den film ismini al
        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.log('[FullHD] Aranan:', query);
                
                // 2. ADIM: Sitede arama yap (NetMirror stili fetch)
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: NET_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var filmLink = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                
                if (!filmLink) throw new Error("Arama Sonucu Bulunamadı");
                
                var filmUrl = filmLink.startsWith('http') ? filmLink : BASE_URL + filmLink;
                return fetch(filmUrl, { headers: NET_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                // vidid ayıklama
                var vidMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vidMatch) throw new Error("Video ID Ayıklanamadı");

                var playerUrl = "https://rapidvid.net/e/" + vidMatch[1];
                return fetch(playerUrl, { 
                    headers: { 'User-Agent': NET_HEADERS['User-Agent'], 'Referer': BASE_URL + '/' } 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var decrypted = decodeRapidVid(avMatch[1]);
                    if (decrypted) {
                        var finalStreamUrl = decrypted.startsWith("//") ? "https:" + decrypted : decrypted;
                        
                        // NetMirror'ın çalıştığı başarılı çıktı formatı
                        resolve([{
                            name: '⌜ FullHD ⌟ | RapidVid',
                            url: finalStreamUrl,
                            quality: '1080p',
                            headers: {
                                'User-Agent': NET_HEADERS['User-Agent'],
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
                console.error('[FullHD] Scraper Hatası:', err.message);
                resolve([]);
            });
    });
}

// Global Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
