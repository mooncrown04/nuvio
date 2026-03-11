/**
 * FullHDFilmizlesene Nuvio Scraper - v12.0
 * Strateji: HTML içindeki tüm gizli verileri, data-id'leri ve script bloklarını tarar.
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
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.error("[FullHD] v12 Derin Tarama: " + query);
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(query), { headers: { 'User-Agent': userAgent } });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film Bulunamadı");

                var filmUrl = link.indexOf('http') === 0 ? link : BASE_URL + link;
                return fetch(filmUrl, { headers: { 'User-Agent': userAgent } });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var $ = cheerio.load(filmHtml);
                var potentialLinks = [];

                // 1. Taktik: Sayfa içindeki tüm script'leri tara
                $('script').each(function() {
                    var scriptContent = $(this).html();
                    if (scriptContent) {
                        // Rapidvid, Moly veya Player kelimelerini içeren her türlü URL'yi yakala
                        var matches = scriptContent.match(/https?:\/\/[^"'\s<>\\ ]+(?:rapidvid|moly|player|embed)[^"'\s<>\\ ]+/gi);
                        if (matches) {
                            matches.forEach(function(m) { potentialLinks.push(m.replace(/\\/g, "")); });
                        }
                    }
                });

                // 2. Taktik: Data özniteliklerini tara (data-id, data-url vb.)
                $('[data-id], [data-url], [data-src]').each(function() {
                    var val = $(this).attr('data-url') || $(this).attr('data-src');
                    if (val && val.indexOf('http') > -1) potentialLinks.push(val);
                });

                // 3. Taktik: Vidid üzerinden manuel player tahmini (Eğer hiçbir şey bulunamazsa)
                var vididMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (vididMatch) {
                    console.error("[FullHD] Vidid ile manuel deneme: " + vididMatch[1]);
                    // Sitenin kullandığı yaygın player şablonu
                    potentialLinks.push("https://rapidvid.net/e/" + vididMatch[1]);
                }

                if (potentialLinks.length > 0) {
                    var target = potentialLinks[0];
                    console.error("[FullHD] Bulunan Link: " + target);
                    return fetch(target, { headers: { 'Referer': BASE_URL + '/', 'User-Agent': userAgent } });
                } else {
                    throw new Error("Hiçbir iz bulunamadı");
                }
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var decrypted = decodeContentX(avMatch[1]);
                    if (decrypted) {
                        resolve([{
                            name: "FullHD v12 Final",
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
                console.error("[FullHD] Hata: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = global.getStreams || getStreams;
}
