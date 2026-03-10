/**
 * FullHDFilmizlesene - v8.8 (The Shield Breaker)
 */

console.error("[FullHD] === v8.8 BAŞLADI - HEDEF: SECURITY_ERROR BYPASS ===");

var cheerio = require("cheerio-without-node-native");
var BASE_URL = "https://www.fullhdfilmizlesene.live";

// Kotlin'den gelen orijinal deşifre mantığı
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
        var headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "tr-TR,tr;q=0.9",
            "Cache-Control": "max-age=0",
            "Sec-Fetch-Site": "same-origin",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Dest": "document"
        };

        fetch(tmdbUrl)
            .then(res => res.json())
            .then(data => {
                var query = data ? (data.title || data.original_title) : "";
                console.error("[FullHD] Film Aranıyor: " + query);
                return fetch(BASE_URL + "/arama/" + encodeURIComponent(query), { headers: headers });
            })
            .then(res => res.text())
            .then(html => {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film linki bulunamadı");
                
                var finalUrl = link.startsWith("http") ? link : BASE_URL + link;
                console.error("[FullHD] Sayfaya Gidiliyor: " + finalUrl);
                return fetch(finalUrl, { headers: headers });
            })
            .then(res => {
                // Çerezleri al ve header'a ekle
                var cookies = res.headers.get('set-cookie');
                if (cookies) headers["Cookie"] = cookies.split(';')[0];
                return res.text();
            })
            .then(filmHtml => {
                // vidid yakalama (daha garantili yöntem)
                var vididMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vididMatch) throw new Error("vidid bulunamadı");
                var vidid = vididMatch[1];

                console.error("[FullHD] VIDID Alındı: " + vidid);

                // API İsteği - İşte burası 'security_error' alınan yer
                var apiUrl = BASE_URL + "/player/api.php";
                var body = "id=" + vidid + "&type=t&get=video";

                return fetch(apiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "X-Requested-With": "XMLHttpRequest",
                        "Referer": BASE_URL + "/",
                        "Origin": BASE_URL,
                        "Cookie": headers["Cookie"] || "",
                        "User-Agent": headers["User-Agent"],
                        "Accept": "*/*"
                    },
                    body: body
                });
            })
            .then(res => res.text())
            .then(apiText => {
                console.error("[FullHD] API Yanıtı: " + apiText.substring(0, 50));
                
                if (apiText.includes("security_error")) throw new Error("Güvenlik Duvarı Aşılamadı");

                var urls = apiText.match(/https?:\/\/[^"'\s<>\\ ]+/g) || [];
                var embedUrl = urls.find(u => u.includes("rapid") || u.includes("moly") || u.includes("player")) || urls[0];
                
                if (!embedUrl) throw new Error("Embed linki yok");
                embedUrl = embedUrl.replace(/\\/g, "");

                return fetch(embedUrl, { headers: { "Referer": BASE_URL + "/" } });
            })
            .then(res => res.text())
            .then(embedHtml => {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var finalUrl = decodeContentX(avMatch[1]);
                    if (finalUrl) {
                        return resolve([{
                            name: "FullHD (v8.8 Fix)",
                            url: finalUrl.startsWith("//") ? "https:" + finalUrl : finalUrl,
                            quality: "1080p",
                            headers: { "Referer": "https://rapidvid.net/", "User-Agent": headers["User-Agent"] },
                            provider: "fullhd"
                        }]);
                    }
                }
                throw new Error("Çözümleme Başarısız");
            })
            .catch(err => {
                console.error("[FullHD] Hata: " + err.message);
                resolve([]);
            });
    });
}
// ... (export kısımları) ...
