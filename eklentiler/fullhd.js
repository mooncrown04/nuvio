/**
 * FullHDFilmizlesene - v8.6 (Bypass security_error)
 */

console.error("[FullHD] === v8.6 BAŞLADI ===");

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
        var sessionCookie = "";

        fetch(tmdbUrl)
            .then(res => res.json())
            .then(data => {
                var query = data ? (data.title || data.original_title) : "";
                console.error("[FullHD] Arama: " + query);
                return fetch(BASE_URL + "/arama/" + encodeURIComponent(query), { 
                    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } 
                });
            })
            .then(res => res.text())
            .then(html => {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film bulunamadı");
                
                var finalUrl = link.startsWith("http") ? link : BASE_URL + link;
                // Film sayfasını açarken Cookie alıyoruz
                return fetch(finalUrl, { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" } });
            })
            .then(res => {
                // Çerezleri sakla
                sessionCookie = res.headers.get('set-cookie') || "";
                return res.text();
            })
            .then(filmHtml => {
                var vidid = filmHtml.match(/vidid\s*=\s*['"]([^'"]+)['"]/);
                if (!vidid) throw new Error("vidid bulunamadı");

                // --- GÜVENLİK BYPASS: POST DATA ---
                var apiUrl = BASE_URL + "/player/api.php";
                // Bazı durumlarda 'type' değeri 't' yerine '1' veya '0' olabilir, loglardan '3446' gelmişti.
                var params = "id=" + vidid[1] + "&type=t&get=video";

                console.error("[FullHD] API'ye gidiliyor ID: " + vidid[1]);

                return fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "X-Requested-With": "XMLHttpRequest",
                        "Referer": BASE_URL + "/",
                        "Origin": BASE_URL,
                        "Cookie": sessionCookie,
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
                    },
                    body: params
                });
            })
            .then(res => res.text())
            .then(apiText => {
                if (apiText.includes("security_error")) {
                    console.error("[FullHD] Güvenlik hatası aşılamadı!");
                    throw new Error("Security Error");
                }

                var urls = apiText.match(/https?:\/\/[^"'\s<>\\ ]+/g) || [];
                var embedUrl = urls.find(u => u.includes("rapid") || u.includes("moly") || u.includes("player")) || urls[0];
                
                if (!embedUrl) throw new Error("Link yok");
                
                embedUrl = embedUrl.replace(/\\/g, "");
                console.error("[FullHD] Embed: " + embedUrl);

                return fetch(embedUrl, { 
                    headers: { 
                        "Referer": BASE_URL + "/",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
                    } 
                });
            })
            .then(res => res.text())
            .then(embedHtml => {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var finalUrl = decodeContentX(avMatch[1]);
                    if (finalUrl) {
                        if (finalUrl.indexOf("//") === 0) finalUrl = "https:" + finalUrl;
                        return resolve([{
                            name: "FullHD Premium",
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
