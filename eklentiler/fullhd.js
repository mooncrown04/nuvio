/**
 * FullHDFilmizlesene Nuvio Scraper - v16.7
 * System-Tolerant "Direct Link" Edition
 */

var cheerio = require("cheerio-without-node-native");

const NET_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14; SM-A546B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': 'https://www.fullhdfilmizlesene.live/',
    'Connection': 'keep-alive'
};

const BASE_URL = "https://www.fullhdfilmizlesene.live";

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

        // TMDB isteği (Bellek yormayan sade istek)
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                // Arama işlemini doğrudan başlat
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: NET_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                
                if (!link) throw new Error("Link bulunamadı");
                
                var filmUrl = link.startsWith('http') ? link : BASE_URL + link;
                return fetch(filmUrl, { headers: NET_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var vidMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vidMatch) throw new Error("ID Hatası");

                // RapidVid embed sayfasını çek
                return fetch("https://rapidvid.net/e/" + vidMatch[1], { 
                    headers: { 'User-Agent': NET_HEADERS['User-Agent'], 'Referer': BASE_URL + '/' } 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var decrypted = decodeRapidVid(avMatch[1]);
                    if (decrypted) {
                        var streamUrl = decrypted.startsWith("//") ? "https:" + decrypted : decrypted;
                        
                        resolve([{
                            name: '⌜ FullHD ⌟ | RapidVid',
                            url: streamUrl,
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
            .catch(function() {
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
