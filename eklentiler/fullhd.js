/**
 * FullHDFilmizlesene Nuvio Scraper - v14.5
 * Strateji: Deşifre edilen ajax-data paketinden JSON ve Link ayıklama.
 */

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

function deepDecryptV2(dataId) {
    try {
        var rev = dataId.split('').reverse().join('');
        var raw = atob(rev);
        var decoded = "";
        for (var i = 0; i < raw.length; i++) {
            decoded += String.fromCharCode(raw.charCodeAt(i) - 1);
        }
        return decoded;
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.original_title;
                console.error("[FullHD] v14.5 Ayıklanıyor: " + query);
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
                var dataId = $(".ajax-data").attr("data-id");
                
                if (!dataId) throw new Error("Kalkan aşılamadı (ajax-data yok)");

                var decrypted = deepDecryptV2(dataId);
                console.error("[FullHD] Paket Çözüldü, Link Aranıyor...");

                // GENİŞLETİLMİŞ REGEX: Artık tırnak içindeki her türlü URL'yi yakalar
                var urls = decrypted ? (decrypted.match(/https?:\/\/[^"'\s<>\\ ]+/g) || []) : [];
                
                // Rapidvid, Moly veya doğrudan MP4/M3U8 içerenleri filtrele
                var validLinks = urls.map(function(u) { return u.replace(/\\/g, ""); })
                                     .filter(function(u) { 
                                         return u.includes("rapid") || u.includes("moly") || u.includes("fembed") || u.includes(".m3u8") || u.includes(".mp4"); 
                                     });

                if (validLinks.length > 0) {
                    var target = validLinks[0];
                    console.error("[FullHD] Hedef Bulundu: " + target);
                    
                    // Eğer doğrudan bir video dosyasıysa (m3u8/mp4)
                    if (target.includes(".m3u8") || target.includes(".mp4")) {
                        resolve([{
                            name: "FullHD Direct Stream",
                            url: target,
                            quality: "1080p",
                            headers: { 'Referer': BASE_URL + '/', 'User-Agent': userAgent },
                            provider: "fullhd_scraper"
                        }]);
                        return;
                    }

                    // Değilse (Rapid/Moly ise) player sayfasını çözmeye git
                    return fetch(target, { headers: { 'Referer': BASE_URL + '/', 'User-Agent': userAgent } });
                } else {
                    // Fallback: Vidid üzerinden zorla
                    var vidid = (filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i) || [])[1];
                    if (vidid) return fetch("https://rapidvid.net/e/" + vidid, { headers: { 'Referer': BASE_URL + '/', 'User-Agent': userAgent } });
                    throw new Error("Uygun link ayıklanamadı");
                }
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(embedHtml) {
                if (!embedHtml) return;

                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var encodedData = avMatch[1];
                    var reversed = encodedData.split('').reverse().join('');
                    var binary = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
                    var key = "K9L";
                    var result = "";
                    for (var i = 0; i < binary.length; i++) {
                        var charCode = binary.charCodeAt(i);
                        var shift = (key.charCodeAt(i % key.length) % 5) + 1;
                        result += String.fromCharCode(charCode - shift);
                    }
                    
                    if (result) {
                        console.error("[FullHD] BAŞARILI! Stream URL Çıkarıldı.");
                        resolve([{
                            name: "FullHD Premium v14.5",
                            url: result.startsWith("//") ? "https:" + result : result,
                            quality: "1080p",
                            headers: { 'Referer': 'https://rapidvid.net/', 'User-Agent': userAgent },
                            provider: "fullhd_scraper"
                        }]);
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
