/**
 * FullHDFilmizlesene Nuvio Scraper - v11.0
 * Strateji: API.php'yi atlayıp doğrudan sayfa içindeki player linklerini toplar.
 */

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

function decodeContentX(encodedData) {
    try {
        var reversed = encodedData.split('').reverse().join('');
        var binary = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        var key = "K9L";
        var result = "";
        for (var i = 0; i < binary.length; i++) {
            var charCode = binary.charCodeAt(i);
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            result += String.fromCharCode(charCode - shift);
        }
        return result;
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.error("[FullHD] v11 Başladı (Direct): " + query);
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: { 'User-Agent': userAgent } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film Bulunamadı");

                var filmUrl = link.indexOf('http') === 0 ? link : BASE_URL + link;
                console.error("[FullHD] Film Sayfası: " + filmUrl);
                return fetch(filmUrl, { headers: { 'User-Agent': userAgent } });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                // YENİ STRATEJİ: API.php'yi çağırmıyoruz. 
                // Sayfa içindeki iframe'leri veya data-url'leri tarıyoruz.
                var streams = [];
                var $ = cheerio.load(filmHtml);

                // 1. Alternatif: Sayfa içinde gömülü olan "data-id" veya "source" linkleri
                // FullHDFilmizlesene genellikle player'ı bir iframe içinde çağırır.
                var embedMatch = filmHtml.match(/iframe\s+src=['"]([^'"]+player[^'"]+)['"]/i) || 
                                 filmHtml.match(/['"](https?:\/\/rapidvid\.net\/[^'"]+)['"]/i) ||
                                 filmHtml.match(/['"](https?:\/\/moly\.net\/[^'"]+)['"]/i);

                if (embedMatch) {
                    var embedUrl = embedMatch[1].replace(/&amp;/g, "&").replace(/\\/g, "");
                    console.error("[FullHD] Embed URL Bulundu: " + embedUrl);
                    
                    return fetch(embedUrl, { headers: { 'Referer': BASE_URL + '/', 'User-Agent': userAgent } });
                } else {
                    throw new Error("Sayfa içinde embed linki bulunamadı");
                }
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                // Rapidvid veya Moly içindeki 'av' şifresini çözme
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var decrypted = decodeContentX(avMatch[1]);
                    if (decrypted) {
                        resolve([{
                            name: "FullHD Direct v11",
                            title: "FullHD Premium",
                            url: decrypted.indexOf("//") === 0 ? "https:" + decrypted : decrypted,
                            quality: "1080p",
                            headers: { 'Referer': 'https://rapidvid.net/', 'User-Agent': userAgent },
                            provider: "fullhd_scraper"
                        }]);
                        return;
                    }
                }
                resolve([]);
            })
            .catch(function(err) {
                console.error("[FullHD] HATA: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = global.getStreams || getStreams;
}
