/**
 * FullHDFilmizlesene Nuvio Scraper - v20.0
 * System Block Bypass Modu
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // Loglardaki iptalleri aşmak için TMDB fetch'ini tamamen sildik.
        // Nuvio'nun tmdbId parametresi yerine başlık gönderdiğini varsayarak arama yapıyoruz.
        
        if (mediaType !== 'movie') return resolve([]);

        // Adım 1: Doğrudan Arama (Sistem engeline takılma ihtimali en düşük yol)
        fetch(BASE_URL + '/arama/' + encodeURIComponent(tmdbId))
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var filmPath = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                
                if (!filmPath) return resolve([]);
                
                var filmUrl = filmPath.startsWith('http') ? filmPath : BASE_URL + filmPath;
                return fetch(filmUrl);
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var vidMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vidMatch) return resolve([]);

                // RapidVid şifreleme katmanı
                return fetch("https://rapidvid.net/e/" + vidMatch[1], { 
                    headers: { 'Referer': BASE_URL + '/' } 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var cipherText = avMatch[1];
                    var reversed = cipherText.split("").reverse().join("");
                    var step1 = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
                    
                    var key = "K9L", step2 = "";
                    for (var i = 0; i < step1.length; i++) {
                        var shift = (key.charCodeAt(i % key.length) % 5) + 1;
                        step2 += String.fromCharCode(step1.charCodeAt(i) - shift);
                    }
                    
                    // Son Katman Base64 Decode
                    var finalLink = "";
                    try {
                        var decoded = atob(step2).replace(/\\/g, "").trim();
                        finalLink = decoded.startsWith("http") ? decoded : step2;
                    } catch(e) {
                        finalLink = step2;
                    }

                    resolve([{
                        name: '⌜ FullHD 20.0 ⌟',
                        url: finalLink,
                        quality: '1080p',
                        headers: { 'Referer': 'https://rapidvid.net/' },
                        provider: 'fullhd_scraper'
                    }]);
                } else {
                    resolve([]);
                }
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
