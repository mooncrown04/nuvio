/**
 * FullHDFilmizlesene - v8.5 (Aggressive Extraction)
 */

console.error("[FullHD] === v8.5 BAŞLADI ===");

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
    return new Promise(function (resolve) {
        if (mediaType === "tv") return resolve([]);

        var tmdbUrl = "https://api.themoviedb.org/3/movie/" + tmdbId + "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";

        fetch(tmdbUrl)
            .then(res => res.json())
            .then(data => {
                var query = data ? (data.title || data.original_title) : "";
                console.error("[FullHD] Arama Yapılıyor: " + query);
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

                var apiUrl = BASE_URL + "/player/api.php";
                var params = "id=" + vidid[1] + "&type=t&get=video";

                return fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "X-Requested-With": "XMLHttpRequest",
                        "Referer": BASE_URL,
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                    },
                    body: params
                });
            })
            .then(res => res.text())
            .then(apiText => {
                // Link Ayıklama Mantığını Değiştirdik
                // apiText içindeki tüm tırnak içindeki linkleri bul
                var urls = apiText.match(/https?:\/\/[^"'\s<>\\ ]+/g) || [];
                var embedUrl = null;

                for (var i = 0; i < urls.length; i++) {
                    var u = urls[i].replace(/\\/g, "");
                    // Sitenin kullandığı yaygın player/iframe adreslerini filtrele
                    if (u.includes("rapid") || u.includes("moly") || u.includes("player") || u.includes("embed")) {
                        embedUrl = u;
                        break;
                    }
                }

                if (!embedUrl && urls.length > 0) embedUrl = urls[0];
                if (!embedUrl) {
                    console.error("[FullHD] API Yanıtı Link İçermiyor: " + apiText.substring(0, 100));
                    throw new Error("Link Bulunamadı");
                }

                console.error("[FullHD] Embed Yakalandı: " + embedUrl);
                return fetch(embedUrl, { headers: { "Referer": BASE_URL } });
            })
            .then(res => res.text())
            .then(embedHtml => {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var finalUrl = decodeContentX(avMatch[1]);
                    if (finalUrl) {
                        if (finalUrl.indexOf("//") === 0) finalUrl = "https:" + finalUrl;
                        return resolve([{
                            name: "FullHD v8.5",
                            url: finalUrl,
                            quality: "1080p",
                            headers: { "Referer": "https://rapidvid.net/", "User-Agent": "Mozilla/5.0" },
                            provider: "fullhd"
                        }]);
                    }
                }
                // Link çözülemezse bile iframe'i ver ki uygulama player'da açmayı denesin
                resolve([{ name: "FullHD (Embed)", url: embedUrl, quality: "Auto", provider: "fullhd" }]);
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
