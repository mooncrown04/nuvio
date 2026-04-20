// Version: 6.0 (Ghost Protocol - Parallel Slug Brute-Force)
// Note: No search engine used. Direct hit strategy.

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const BASE_URL = "https://www.hdfilmcehennemi.nl";
const EMPTY_RESULT = [];

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Referer": BASE_URL + "/"
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] v6.0 GHOST PROTOCOL BAŞLATILDI");
    
    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl, { headers: { "User-Agent": HEADERS["User-Agent"] } })
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var originalName = (tmdbData.original_title || tmdbData.original_name || "").toLowerCase();
                var year = (tmdbData.release_date || tmdbData.first_air_date || "").split("-")[0];
                
                var slug = originalName.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();

                // Sitenin kullandığı tüm olası ID ve formatları listeliyoruz
                var variants = [
                    BASE_URL + "/" + slug + "-1/",
                    BASE_URL + "/" + slug + "-" + year + "-1/",
                    BASE_URL + "/" + slug + "-32/", // Avatar örneği
                    BASE_URL + "/" + slug + "-3/",  // Project Hail Mary örneği
                    BASE_URL + "/" + slug + "-7/",  // 28 Years Later örneği
                    BASE_URL + "/" + slug + "/"     // Yalın hali
                ];

                console.error("[" + PROVIDER_NAME + "] DENENEN VARYASYONLAR: " + variants.length);
                return findFirstValidUrl(variants);
            })
            .then(function(result) {
                if (!result) throw new Error("HIÇBIR VARYASYON TUTMADI");
                
                var $ = cheerio.load(result.html);
                var videoID = $("button.alternative-link").attr("data-video") || 
                              $("[data-video]").attr("data-video") ||
                              (result.html.match(/data-video=["'](\d+)["']/) || [])[1];

                if (!videoID) throw new Error("SAYFA BULUNDU AMA ID YOK");
                console.error("[" + PROVIDER_NAME + "] BASARILI URL: " + result.url + " | ID: " + videoID);

                return fetch(BASE_URL + "/video/" + videoID + "/", { 
                    headers: Object.assign({}, HEADERS, { "Referer": result.url }) 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(apiHtml) {
                var iframeMatch = apiHtml.match(/data-src=\\"([^"]+)/);
                var iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
                
                if (!iframeUrl) throw new Error("IFRAME BULUNAMADI");

                resolve([{
                    name: PROVIDER_NAME,
                    title: "HDFC - Ghost",
                    url: iframeUrl,
                    quality: "1080p",
                    headers: { "User-Agent": HEADERS["User-Agent"] }
                }]);
            })
            .catch(function(err) {
                console.error("[" + PROVIDER_NAME + "] FINAL HATA: " + err.message);
                resolve(EMPTY_RESULT);
            });
    });
}

// URL'leri sırayla değil, hızlıca denemek için yardımcı fonksiyon
async function findFirstValidUrl(urls) {
    for (var url of urls) {
        try {
            let response = await fetch(url, { headers: HEADERS });
            if (response.status === 200) {
                let text = await response.text();
                if (text.length > 8000) { // 7238'den büyükse gerçek sayfadır
                    return { url: url, html: text };
                }
            }
        } catch (e) {}
    }
    return null;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
