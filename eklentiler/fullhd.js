/**
 * FullHDFilmizlesene - v8.3 (Embed Extraction Fix)
 */

console.error("[FullHD] === v8.3 BAŞLADI ===");

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

// Kotlin ContentXExtractor.kt mantığı (Birebir uyarlama)
function decodeContentX(encodedData) {
    try {
        if (!encodedData) return null;
        // 1. String Reverse
        var reversed = encodedData.split('').reverse().join('');
        // 2. Base64 Decode
        var binary = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        
        // 3. Key-based Byte Shift (Key: "K9L")
        var key = "K9L";
        var result = "";
        for (var i = 0; i < binary.length; i++) {
            var charCode = binary.charCodeAt(i);
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            result += String.fromCharCode(charCode - shift);
        }
        
        // 4. Çift katman kontrolü
        if (result && !result.startsWith("http") && result.length > 20) {
            try {
                var secondPass = atob(result);
                if (secondPass.includes("http")) return secondPass;
            } catch(e) {}
        }
        return result;
    } catch (e) {
        console.error("[FullHD] Decode Hatası:", e.message);
        return null;
    }
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
                var finalUrl = link.startsWith("http") ? link : BASE_URL + link;
                return fetch(finalUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
            })
            .then(res => res.text())
            .then(filmHtml => {
                var vidid = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
                if (!vidid) throw new Error("vidid bulunamadı");

                // API İsteği
                var apiUrl = BASE_URL + "/player/api.php?id=" + vidid[1] + "&type=t&get=video";
                return fetch(apiUrl, {
                    headers: { "X-Requested-With": "XMLHttpRequest", "Referer": BASE_URL, "User-Agent": "Mozilla/5.0" }
                });
            })
            .then(res => res.text())
            .then(apiText => {
                // HATA BURADAYDI: Regex'i daha agresif hale getirdik
                // Hem iframe src'yi hem de çıplak linkleri yakalar
                var embedUrlMatch = apiText.match(/src\s*=\s*["']([^"']+)["']/i) || 
                                    apiText.match(/https?:\/\/[^"'\s\\]+/i);
                
                if (!embedUrlMatch) {
                    console.error("[FullHD] API Yanıtı örneği:", apiText.substring(0, 100));
                    throw new Error("Embed bulunamadı");
                }

                var embedUrl = (embedUrlMatch[1] || embedUrlMatch[0]).replace(/\\/g, "");
                if (embedUrl.indexOf("//") === 0) embedUrl = "https:" + embedUrl;
                
                console.error("[FullHD] Bulunan Embed:", embedUrl);
                return fetch(embedUrl, { headers: { "Referer": BASE_URL, "User-Agent": "Mozilla/5.0" } });
            })
            .then(res => res.text())
            .then(embedHtml => {
                // Kotlin tarafındaki av('...') verisini yakalama
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var finalUrl = decodeContentX(avMatch[1]);
                    if (finalUrl) {
                        if (finalUrl.indexOf("//") === 0) finalUrl = "https:" + finalUrl;
                        console.error("[FullHD] Başarılı! Link çözüldü.");
                        
                        return resolve([{
                            name: "FullHD Premium",
                            url: finalUrl,
                            quality: "1080p",
                            headers: { "Referer": "https://rapidvid.net/", "User-Agent": "Mozilla/5.0" },
                            provider: "fullhd"
                        }]);
                    }
                }
                throw new Error("Video deşifre edilemedi");
            })
            .catch(err => {
                console.error("[FullHD] Hata:", err.message);
                resolve([]);
            });
    });
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
