// Version: 4.6 (Protocol Compliant - VideoID Fix)
// Note: console.log is FORBIDDEN. Use console.error for all logs. No async/await.

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const BASE_URL = "https://www.hdfilmcehennemi.nl";
const EMPTY_RESULT = [];
const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-Requested-With": "fetch"
};

function decodeSource(parts) {
    try {
        console.error("[" + PROVIDER_NAME + "] DECODE: Parça sayısı -> " + parts.length);
        let joined = parts.join("").split("").reverse().join("");
        let rot13 = joined.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        let decodedBytes = Buffer.from(rot13, 'base64');
        let unmixed = "";
        for (let i = 0; i < decodedBytes.length; i++) {
            let charCode = decodedBytes[i] & 0xFF;
            let newChar = (charCode - (399756995 % (i + 5)) + 256) % 256;
            unmixed += String.fromCharCode(newChar);
        }
        return unmixed.includes("https") ? "https" + unmixed.split("https")[1] : unmixed;
    } catch (e) {
        console.error("[" + PROVIDER_NAME + "] DECODE HATASI: " + e.message);
        return null;
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] PROTOTOKOL v4.6 BAŞLATILDI");
    
    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl, { headers: DEFAULT_HEADERS })
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                console.error("[" + PROVIDER_NAME + "] TMDB VERİSİ ALINDI -> " + (tmdbData.title || tmdbData.name));
                var query = (tmdbData.title || tmdbData.name).replace(/['":]/g, "").trim();
                return fetch(BASE_URL + "/search?q=" + encodeURIComponent(query), { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { return res.json(); })
            .then(function(searchData) {
                console.error("[" + PROVIDER_NAME + "] ARAMA YANITI -> Sonuç: " + (searchData.results ? searchData.results.length : 0));
                var results = searchData.results || [];
                if (results.length === 0) return resolve(EMPTY_RESULT);

                var $search = cheerio.load(results[0]);
                var targetUrl = $search("a").first().attr("href");
                if (!targetUrl) return resolve(EMPTY_RESULT);

                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }
                console.error("[" + PROVIDER_NAME + "] HEDEF SAYFA -> " + targetUrl);
                return fetch(targetUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                var $page = cheerio.load(pageHtml);
                
                // --- VİDEO ID ÇEKME STRATEJİSİ (v4.6 Güncellemesi) ---
                var videoID = $page("button.alternative-link").first().attr("data-video") || 
                              $page(".player-container").attr("data-video") ||
                              $page("[data-video]").first().attr("data-video");

                // Eğer hala bulunamadıysa script içinden ayıkla
                if (!videoID) {
                    var scriptMatch = pageHtml.match(/data-video=\"(\d+)\"/i);
                    videoID = scriptMatch ? scriptMatch[1] : null;
                }

                console.error("[" + PROVIDER_NAME + "] VİDEO ID DURUMU -> " + (videoID || "BULUNAMADI"));
                if (!videoID) return resolve(EMPTY_RESULT);

                return fetch(BASE_URL + "/video/" + videoID + "/", { 
                    headers: Object.assign({}, DEFAULT_HEADERS, { "Referer": targetUrl || BASE_URL }) 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(apiHtml) {
                console.error("[" + PROVIDER_NAME + "] API HTML UZUNLUK -> " + apiHtml.length);
                var iframeMatch = apiHtml.match(/data-src=\\"([^"]+)/);
                var iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
                
                if (!iframeUrl) {
                    console.error("[" + PROVIDER_NAME + "] IFRAME BULUNAMADI");
                    return resolve(EMPTY_RESULT);
                }

                if (iframeUrl.includes("rapidrame")) {
                    var rapidID = iframeUrl.split("?rapidrame_id=")[1];
                    iframeUrl = BASE_URL + "/rplayer/" + (rapidID || "");
                }

                console.error("[" + PROVIDER_NAME + "] IFRAME URL -> " + iframeUrl);
                return fetch(iframeUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                var fileLinkMatch = playerHtml.match(/file_link=\"(.*?)\"/);
                if (!fileLinkMatch) {
                    console.error("[" + PROVIDER_NAME + "] FILE_LINK YOK");
                    return resolve(EMPTY_RESULT);
                }

                var partsMatch = fileLinkMatch[1].match(/\"(.*?)\"/g);
                var parts = partsMatch ? partsMatch.map(function(p) { return p.replace(/\"/g, ""); }) : [];
                
                var finalLink = decodeSource(parts);
                if (finalLink) {
                    console.error("[" + PROVIDER_NAME + "] BAŞARILI LINK ÜRETİLDİ");
                    resolve([{
                        name: PROVIDER_NAME,
                        title: "HDFC - Full HD",
                        url: finalLink,
                        quality: "1080p",
                        headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
                    }]);
                } else {
                    resolve(EMPTY_RESULT);
                }
            })
            .catch(function(err) {
                console.error("[" + PROVIDER_NAME + "] PROTOKOL HATASI -> " + err.message);
                resolve(EMPTY_RESULT);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
