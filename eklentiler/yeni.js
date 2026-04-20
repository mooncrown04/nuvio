var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const BASE_URL = "https://www.hdfilmcehennemi.nl";
const EMPTY_RESULT = [];
const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:137.0) Gecko/20100101 Firefox/137.0",
    "X-Requested-With": "fetch",
    "Accept": "application/json, text/plain, */*"
};

/**
 * Kotlin'deki dcHello/unmix mantığının JS uyarlaması
 */
function decodeSource(parts) {
    try {
        console.error("[" + PROVIDER_NAME + "] Çözücü: " + parts.length + " parça işleniyor...");
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
        console.error("[" + PROVIDER_NAME + "] Çözücü Hatası: " + e.message);
        return null;
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] --- BAŞLATILDI (FETCH MODE) ---");

    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        // 1. TMDB BİLGİSİ ÇEK
        fetch(tmdbUrl, { headers: DEFAULT_HEADERS })
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var query = tmdbData.title || tmdbData.name;
                console.error("[" + PROVIDER_NAME + "] Aranan Başlık: " + query);
                return fetch(BASE_URL + "/search?q=" + encodeURIComponent(query), { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { return res.json(); })
            .then(function(searchData) {
                console.error("[" + PROVIDER_NAME + "] Arama sonucu alındı.");
                var firstResultHtml = (searchData.results && searchData.results.length > 0) ? searchData.results[0] : null;
                if (!firstResultHtml) {
                    console.error("[" + PROVIDER_NAME + "] HATA: Site sonucu boş.");
                    return resolve(EMPTY_RESULT);
                }

                var $search = cheerio.load(firstResultHtml);
                var targetUrl = $search("a").first().attr("href");
                if (!targetUrl) return resolve(EMPTY_RESULT);

                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }
                console.error("[" + PROVIDER_NAME + "] Sayfa URL: " + targetUrl);
                return fetch(targetUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                var $page = cheerio.load(pageHtml);
                var videoID = $page("button.alternative-link").first().attr("data-video");
                if (!videoID) {
                    console.error("[" + PROVIDER_NAME + "] HATA: videoID bulunamadı.");
                    return resolve(EMPTY_RESULT);
                }
                console.error("[" + PROVIDER_NAME + "] videoID: " + videoID);
                return fetch(BASE_URL + "/video/" + videoID + "/", { 
                    headers: Object.assign({}, DEFAULT_HEADERS, { "Referer": BASE_URL + "/" }) 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(apiHtml) {
                var iframeMatch = apiHtml.match(/data-src=\\"([^"]+)/);
                var iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
                
                if (iframeUrl.includes("rapidrame")) {
                    iframeUrl = BASE_URL + "/rplayer/" + iframeUrl.split("?rapidrame_id=")[1];
                }
                console.error("[" + PROVIDER_NAME + "] Iframe: " + iframeUrl);
                return fetch(iframeUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(playerHtml) {
                var fileLinkMatch = playerHtml.match(/file_link=\"(.*?)\"/);
                if (!fileLinkMatch) {
                    console.error("[" + PROVIDER_NAME + "] HATA: file_link bulunamadı.");
                    return resolve(EMPTY_RESULT);
                }

                var partsMatch = fileLinkMatch[1].match(/\"(.*?)\"/g);
                var parts = partsMatch ? partsMatch.map(function(p) { return p.replace(/\"/g, ""); }) : [];
                
                var finalLink = decodeSource(parts);
                if (finalLink) {
                    console.error("[" + PROVIDER_NAME + "] BAŞARILI: Link çözüldü.");
                    resolve([{
                        name: PROVIDER_NAME,
                        title: "HDFC - Full HD",
                        url: finalLink,
                        quality: "1080p",
                        headers: { 
                            "User-Agent": DEFAULT_HEADERS["User-Agent"], 
                            "Referer": BASE_URL + "/" 
                        }
                    }]);
                } else {
                    resolve(EMPTY_RESULT);
                }
            })
            .catch(function(err) {
                console.error("[" + PROVIDER_NAME + "] KRİTİK HATA: " + err.message);
                resolve(EMPTY_RESULT);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
