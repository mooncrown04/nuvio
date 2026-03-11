/**
 * FullHDFilmizlesene Nuvio Scraper - v19.0
 * Çift Katmanlı Base64 Çözücü & Sertifika Yama
 */

var cheerio = require("cheerio-without-node-native");

const BASE_URL = "https://www.fullhdfilmizlesene.live";

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        // Adım 1: TMDB üzerinden isim al (Sertifika hatası riskine karşı catch eklendi)
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query));
            })
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

                return fetch("https://rapidvid.net/e/" + vidMatch[1], { 
                    headers: { 'Referer': BASE_URL + '/' } 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var cipherText = avMatch[1];
                    
                    // 1. Ters Çevirme ve İlk Base64 Decode
                    var reversed = cipherText.split("").reverse().join("");
                    var step1 = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
                    
                    // 2. K9L Key Kaydırma Algoritması
                    var key = "K9L", step2 = "";
                    for (var i = 0; i < step1.length; i++) {
                        var shift = (key.charCodeAt(i % key.length) % 5) + 1;
                        step2 += String.fromCharCode(step1.charCodeAt(i) - shift);
                    }
                    
                    // 3. ÇİFT KATMAN FIX: Loglardaki yarım kalan linki tam çözen kısım
                    var finalLink = "";
                    try {
                        // Eğer sonuç hala Base64 ise bir kez daha decode et
                        finalLink = atob(step2).replace(/\\/g, "").trim();
                        // Eğer decode sonrası link değilse ham hali kullan
                        if (!finalLink.startsWith("http") && !finalLink.startsWith("//")) {
                            finalLink = step2.replace(/\\/g, "").trim();
                        }
                    } catch(e) {
                        finalLink = step2.replace(/\\/g, "").trim();
                    }

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
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
