/**
 * FullHDFilmizlesene - v8.2 (Based on ContentXExtractor.kt)
 */

console.error("[FullHD] === v8.2 BAŞLADI ===");

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

// Kotlin'deki ContentXExtractor mantığına göre uyarlanan deşifre
function decodeContentX(encodedData) {
    try {
        // Kotlin kodundaki reverse ve base64 işlemi
        var reversed = encodedData.split('').reverse().join('');
        var binary = atob(reversed.replace(/[^A-Za-z0-9+/=]/g, ""));
        
        // Kotlin tarafında kullanılan anahtar: "K9L" 
        // Oradaki döngü: (byte - ((key.charCodeAt(i % 3) % 5) + 1))
        var key = "K9L";
        var result = "";
        for (var i = 0; i < binary.length; i++) {
            var charCode = binary.charCodeAt(i);
            var shift = (key.charCodeAt(i % key.length) % 5) + 1;
            result += String.fromCharCode(charCode - shift);
        }
        
        // Eğer sonuç hala base64 ise (Kotlin'de bazen çift katman olabiliyor)
        if (result && !result.startsWith("http")) {
            try {
                var secondBinary = atob(result);
                if (secondBinary.includes("http")) return secondBinary;
            } catch(e) {}
        }
        
        return result;
    } catch (e) {
        console.error("[FullHD] Deşifre Hatası:", e.message);
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
                return fetch(BASE_URL + "/arama/" + encodeURIComponent(query), { 
                    headers: { "User-Agent": "Mozilla/5.0", "Referer": BASE_URL } 
                });
            })
            .then(res => res.text())
            .then(html => {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film bulunamadı");
                return fetch(link.startsWith("http") ? link : BASE_URL + link);
            })
            .then(res => res.text())
            .then(filmHtml => {
                var vidid = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
                if (!vidid) throw new Error("vidid bulunamadı");

                // API isteği (Kotlin tarafındaki get_video çağrısı)
                return fetch(BASE_URL + "/player/api.php?id=" + vidid[1] + "&type=t&get=video", {
                    headers: { "X-Requested-With": "XMLHttpRequest", "Referer": BASE_URL }
                });
            })
            .then(res => res.text())
            .then(apiText => {
                // Ham metin içinden iframe src veya av() parametresini çekme
                var embedUrlMatch = apiText.match(/src=["']([^"']+)["']/i);
                var embedUrl = embedUrlMatch ? embedUrlMatch[1].replace(/\\/g, "") : null;
                
                if (!embedUrl) throw new Error("Embed bulunamadı");
                if (embedUrl.indexOf("//") === 0) embedUrl = "https:" + embedUrl;

                return fetch(embedUrl, { headers: { "Referer": BASE_URL } });
            })
            .then(res => res.text())
            .then(embedHtml => {
                // Kotlin'deki extractor'ın asıl vurduğu yer: av('...')
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var finalUrl = decodeContentX(avMatch[1]);
                    if (finalUrl) {
                        return resolve([{
                            name: "FullHD (Kotlin Style)",
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
