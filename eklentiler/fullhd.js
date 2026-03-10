/**
 * FullHDFilmizlesene - v9.0 (Standard JS Compatibility)
 */

console.error("[FullHD] === v9.0 BAŞLADI - AGRESSIVE BYPASS ===");

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
        var userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
        var sessionCookie = "";
        var currentFilmUrl = "";

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data ? (data.title || data.original_title) : "";
                console.error("[FullHD] Aranıyor: " + query);
                return fetch(BASE_URL + "/arama/" + encodeURIComponent(query), { 
                    headers: { "User-Agent": userAgent } 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var link = $(".film-listesi a").first().attr("href") || $("a[href*='/film/']").first().attr("href");
                if (!link) throw new Error("Film Bulunamadı");

                currentFilmUrl = link.startsWith("http") ? link : BASE_URL + link;
                console.error("[FullHD] Sayfa: " + currentFilmUrl);

                return fetch(currentFilmUrl, { headers: { "User-Agent": userAgent } });
            })
            .then(function(res) {
                sessionCookie = res.headers.get('set-cookie') || "";
                return res.text();
            })
            .then(function(filmHtml) {
                var vididMatch = filmHtml.match(/vidid\s*[:=]\s*['"]?(\d+)['"]?/i);
                if (!vididMatch) throw new Error("vidid bulunamadı");
                
                var vidid = vididMatch[1];
                console.error("[FullHD] API'ye gidiliyor ID: " + vidid);

                return fetch(BASE_URL + "/player/api.php", {
                    method: "POST",
                    headers: {
                        "Accept": "*/*",
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        "X-Requested-With": "XMLHttpRequest",
                        "Referer": currentFilmUrl, // Tam film URL'si
                        "Origin": BASE_URL,
                        "Cookie": sessionCookie,
                        "User-Agent": userAgent,
                        "Sec-Fetch-Dest": "empty",
                        "Sec-Fetch-Mode": "cors",
                        "Sec-Fetch-Site": "same-origin"
                    },
                    body: "id=" + vidid + "&type=t&get=video"
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(apiText) {
                console.error("[FullHD] API Yanıtı: " + apiText.substring(0, 40));
                if (apiText.includes("security_error")) throw new Error("Security Error Hala Devam Ediyor");

                var urls = apiText.match(/https?:\/\/[^"'\s<>\\ ]+/g) || [];
                var embedUrl = urls.find(function(u) { return u.indexOf("rapid") > -1 || u.indexOf("moly") > -1 || u.indexOf("player") > -1; }) || urls[0];
                
                if (!embedUrl) throw new Error("Embed yok");
                embedUrl = embedUrl.replace(/\\/g, "");

                return fetch(embedUrl, { headers: { "Referer": BASE_URL + "/" } });
            })
            .then(function(res) { return res.text(); })
            .then(function(embedHtml) {
                var avMatch = embedHtml.match(/av\(['"]([^'"]+)['"]\)/);
                if (avMatch) {
                    var finalUrl = decodeContentX(avMatch[1]);
                    if (finalUrl) {
                        resolve([{
                            name: "FullHD Premium v9.0",
                            url: finalUrl.indexOf("//") === 0 ? "https:" + finalUrl : finalUrl,
                            quality: "1080p",
                            headers: { "Referer": "https://rapidvid.net/", "User-Agent": userAgent },
                            provider: "fullhd"
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

// Export Fix for Legacy Environments
if (typeof module !== "undefined") { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== "undefined") { globalThis.getStreams = getStreams; }
