/**
 * FullHDFilmizlesene Nuvio Scraper - v17.0
 * SSL/Certificate Trust Sorunu İçin Optimize Edildi
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        // Sadece film desteği
        if (mediaType !== 'movie') return resolve([]);

        // Adım 1: TMDB'den isim al
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                // Adım 2: Sitede Ara
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query));
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var filmPath = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                
                if (!filmPath) return resolve([]);
                
                var filmUrl = filmPath.startsWith('http') ? filmPath : BASE_URL + filmPath;
                // Adım 3: Film Sayfası
                return fetch(filmUrl);
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var vidMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vidMatch) return resolve([]);

                // Adım 4: Player Sayfası (RapidVid)
                return fetch("https://rapidvid.net/e/" + vidMatch[1], { 
                    headers: { 'Referer': BASE_URL + '/' } 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    // AES Çözücü
                    var cipherText = avMatch[1];
                    var reversed = cipherText.split("").reverse().join("");
                    var decoded = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
                    var key = "K9L", result = "";
                    for (var i = 0; i < decoded.length; i++) {
                        var shift = (key.charCodeAt(i % key.length) % 5) + 1;
                        result += String.fromCharCode(decoded.charCodeAt(i) - shift);
                    }
                    var finalLink = atob(result).replace(/\\/g, "").trim();
                    var streamUrl = finalLink.startsWith("//") ? "https:" + finalLink : finalLink;

                    resolve([{
                        name: '⌜ FullHD ⌟',
                        url: streamUrl,
                        quality: '1080p',
                        headers: { 'Referer': 'https://rapidvid.net/' },
                        provider: 'fullhd_scraper'
                    }]);
                } else {
                    resolve([]);
                }
            })
            .catch(function() {
                resolve([]); // Sertifika hatası gelirse sessizce çık
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
