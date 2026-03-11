/**
 * FullHDFilmizlesene Nuvio Scraper - v12.1
 * Değişiklik: Poster resimlerini engelle, doğrudan player embed yapısına odaklan.
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

        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.error("[FullHD] v12.1 Başladı: " + query);
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
                var vididMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vididMatch) throw new Error("vidid bulunamadı");
                
                var vidid = vididMatch[1];
                console.error("[FullHD] Kesin ID: " + vidid);

                // Poster (.jpg) içermeyen ve video/player odaklı olan linkleri seç
                var targetUrl = "https://rapidvid.net/e/" + vidid;
                
                console.error("[FullHD] Embed Hedefi: " + targetUrl);
                return fetch(targetUrl, { headers: { 'Referer': BASE_URL + '/', 'User-Agent': userAgent } });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                // Rapidvid/Moly içindeki şifreli linki bul
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var decrypted = decodeContentX(avMatch[1]);
                    if (decrypted) {
                        var finalStream = decrypted.indexOf("//") === 0 ? "https:" + decrypted : decrypted;
                        console.error("[FullHD] BAŞARILI! Stream URL Hazır.");
                        
                        resolve([{
                            name: "FullHD Premium v12.1",
                            title: "FullHD (1080p)",
                            url: finalStream,
                            quality: "1080p",
                            headers: { 'Referer': 'https://rapidvid.net/', 'User-Agent': userAgent },
                            provider: "fullhd_scraper"
                        }]);
                        return;
                    }
                }
                throw new Error("Video cozulemedi (av bulunamadi)");
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
