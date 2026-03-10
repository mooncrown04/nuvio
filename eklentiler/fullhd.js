/**
 * FullHDFilmizlesene - v8.4 (POST Method & Security Bypass)
 */

console.error("[FullHD] === v8.4 BAŞLADI ===");

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

// Kotlin ContentXExtractor mantığı (Aynı kaldı)
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
    return new Promise(function (resolve) {
        if (mediaType === "tv") return resolve([]);

        var tmdbUrl = "https://api.themoviedb.org/3/movie/" + tmdbId + "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";

        fetch(tmdbUrl)
            .then(res => res.json())
            .then(data => {
                var query = data ? (data.title || data.original_title) : "";
                console.error("[FullHD] Arama:", query);
                return fetch(BASE_URL + "/arama/" + encodeURIComponent(query), { 
                    headers: { "User-Agent": "Mozilla/5.0", "Referer": BASE_URL } 
                });
            })
            .then(res => res.text())
            .then(html => {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film bulunamadı");
                return fetch(link.startsWith("http") ? link : BASE_URL + link, { headers: { "User-Agent": "Mozilla/5.0" } });
            })
            .then(res => res.text())
            .then(filmHtml => {
                var vidid = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
                if (!vidid) throw new Error("vidid bulunamadı");

                // --- KRİTİK GÜNCELLEME: POST İSTEĞİ VE DOĞRU HEADERLAR ---
                var apiUrl = BASE_URL + "/player/api.php";
                var params = "id=" + vidid[1] + "&type=t&get=video";

                console.error("[FullHD] API'ye POST atılıyor: " + vidid[1]);

                return fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "X-Requested-With": "XMLHttpRequest",
                        "Referer": BASE_URL,
                        "Origin": BASE_URL,
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    },
                    body: params
                });
            })
            .then(res => res.text())
            .then(apiText => {
                // Eğer hala HTML dönüyorsa logla
                if (apiText.includes("<html>")) {
                    console.error("[FullHD] EYVAH! Hala HTML dönüyor. Örnek: " + apiText.substring(0, 50));
                }

                var embedUrlMatch = apiText.match(/src\s*=\s*["']([^"']+)["']/i) || 
                                    apiText.match(/https?:\/\/[^"'\s\\]+/i);
                
                if (!embedUrlMatch) throw new Error("Embed linki ayıklanamadı");

                var embedUrl = (embedUrlMatch[1] || embedUrlMatch[0]).replace(/\\/g, "");
                if (embedUrl.indexOf("//") === 0) embedUrl = "https:" + embedUrl;
                
                console.error("[FullHD] Embed Yakalandı: " + embedUrl);

                return fetch(embedUrl, { headers: { "Referer": BASE_URL, "User-Agent": "Mozilla/5.0" } });
            })
            .then(res => res.text())
            .then(embedHtml => {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var finalUrl = decodeContentX(avMatch[1]);
                    if (finalUrl) {
                        if (finalUrl.indexOf("//") === 0) finalUrl = "https:" + finalUrl;
                        return resolve([{
                            name: "FullHD (v8.4 Fix)",
                            url: finalUrl,
                            quality: "1080p",
                            headers: { "Referer": "https://rapidvid.net/", "User-Agent": "Mozilla/5.0" },
                            provider: "fullhd"
                        }]);
                    }
                }
                resolve([]);
            })
            .catch(err => {
                console.error("[FullHD] Hata: " + err.message);
                resolve([]);
            });
    });
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
