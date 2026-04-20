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
        console.error("[" + PROVIDER_NAME + "] Çözücü başlatıldı...");
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
    console.error("[" + PROVIDER_NAME + "] --- BAŞLATILDI ---");

    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl, { headers: DEFAULT_HEADERS })
            .then(function(res) { 
                if (!res) throw new Error("TMDB yanıtı boş");
                return res.json(); 
            })
            .then(function(tmdbData) {
                var query = tmdbData.title || tmdbData.name;
                // Arama sorgusunu basitleştir (Örn: "Ani Saldırı" -> "Ani Saldiri")
                query = query.replace(/['":]/g, "").trim();
                console.error("[" + PROVIDER_NAME + "] Arama: " + query);
                return fetch(BASE_URL + "/search?q=" + encodeURIComponent(query), { headers: DEFAULT_HEADERS });
            })
            .then(function(res) {
                if (!res) throw new Error("Arama yanıtı alınamadı");
                return res.json();
            })
            .then(function(searchData) {
                var results = searchData.results || [];
                if (results.length === 0) {
                    console.error("[" + PROVIDER_NAME + "] HATA: Arama sonucu bulunamadı.");
                    return resolve(EMPTY_RESULT);
                }

                var $search = cheerio.load(results[0]);
                var targetUrl = $search("a").first().attr("href");
                
                if (!targetUrl) {
                    console.error("[" + PROVIDER_NAME + "] HATA: Link ayıklanamadı.");
                    return resolve(EMPTY_RESULT);
                }

                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }
                
                console.error("[" + PROVIDER_NAME + "] Hedef URL: " + targetUrl);
                return fetch(targetUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(res) {
                if (!res) throw new Error("Sayfa içeriği boş");
                return res.text();
            })
            .then(function(pageHtml) {
                var $page = cheerio.load(pageHtml);
                // Video ID bulmak için alternatif yöntemleri de dene
                var videoID = $page("button.alternative-link").first().attr("data-video") || 
                              $page("[data-video]").first().attr("data-video");

                if (!videoID) {
                    console.error("[" + PROVIDER_NAME + "] HATA: videoID bulunamadı (Sayfa yapısı değişmiş olabilir).");
                    return resolve(EMPTY_RESULT);
                }

                console.error("[" + PROVIDER_NAME + "] videoID Yakalandı: " + videoID);
                return fetch(BASE_URL + "/video/" + videoID + "/", { 
                    headers: Object.assign({}, DEFAULT_HEADERS, { "Referer": BASE_URL + "/" }) 
                });
            })
            .then(function(res) {
                if (!res) throw new Error("Video API yanıtı yok");
                return res.text();
            })
            .then(function(apiHtml) {
                var iframeMatch = apiHtml.match(/data-src=\\"([^"]+)/);
                var iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
                
                if (!iframeUrl) {
                    console.error("[" + PROVIDER_NAME + "] HATA: Iframe bulunamadı.");
                    return resolve(EMPTY_RESULT);
                }

                if (iframeUrl.includes("rapidrame")) {
                    iframeUrl = BASE_URL + "/rplayer/" + (iframeUrl.split("?rapidrame_id=")[1] || "");
                }

                console.error("[" + PROVIDER_NAME + "] Iframe URL: " + iframeUrl);
                return fetch(iframeUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(res) {
                if (!res) throw new Error("Player sayfası boş");
                return res.text();
            })
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
                    console.error("[" + PROVIDER_NAME + "] BAŞARILI.");
                    resolve([{
                        name: PROVIDER_NAME,
                        title: "HDFC - VIP",
                        url: finalLink,
                        quality: "1080p",
                        headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
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
