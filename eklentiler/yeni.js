// Version: 5.1 (Hybrid Search Fix)
// Note: console.log is FORBIDDEN. Use console.error for all logs.

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const BASE_URL = "https://www.hdfilmcehennemi.nl";
const EMPTY_RESULT = [];
const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache"
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] v5.1 HİBRİT ARAMA BAŞLATILDI");
    
    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl, { headers: DEFAULT_HEADERS })
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var query = (tmdbData.title || tmdbData.name || "").replace(/['":]/g, "").trim();
                console.error("[" + PROVIDER_NAME + "] ARANAN KELİME -> " + query);
                
                // Sitenin arama sayfasını direkt HTML olarak istiyoruz (JSON değil)
                return fetch(BASE_URL + "/search?q=" + encodeURIComponent(query), { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { return res.text(); }) // JSON yerine TEXT olarak oku
            .then(function(searchText) {
                console.error("[" + PROVIDER_NAME + "] ARAMA SAYFASI ALINDI (Boyut: " + searchText.length + ")");
                
                // Eğer site JSON dönmediyse HTML içinde link ara
                var targetUrl = "";
                if (searchText.trim().startsWith("{")) {
                    try {
                        var json = JSON.parse(searchText);
                        var $j = cheerio.load(json.results[0] || "");
                        targetUrl = $j("a").first().attr("href");
                    } catch(e) { console.error("JSON Parse Hatası"); }
                } else {
                    var $h = cheerio.load(searchText);
                    // Arama sonuçlarındaki ilk makalenin linkini al
                    targetUrl = $h(".poster > a").first().attr("href") || 
                                $h("article a").first().attr("href") ||
                                $h(".result-item a").first().attr("href");
                }

                if (!targetUrl) throw new Error("Arama sayfasında link bulunamadı.");
                
                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }
                
                console.error("[" + PROVIDER_NAME + "] HEDEF URL -> " + targetUrl);
                return fetch(targetUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                var $page = cheerio.load(pageHtml);
                
                // ID bulma: data-video, data-id, veya script içindeki rakamlar
                var videoID = $page("[data-video]").attr("data-video") || 
                              $page("[data-id]").attr("data-id") ||
                              (pageHtml.match(/data-video=["'](\d+)["']/) || [])[1];

                console.error("[" + PROVIDER_NAME + "] TESPİT EDİLEN ID -> " + videoID);
                if (!videoID) throw new Error("Video ID bulunamadı.");

                return fetch(BASE_URL + "/video/" + videoID + "/", { 
                    headers: Object.assign({}, DEFAULT_HEADERS, { "Referer": BASE_URL + "/" }) 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(apiHtml) {
                var iframeMatch = apiHtml.match(/data-src=\\"([^"]+)/);
                var iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
                
                if (!iframeUrl) throw new Error("Iframe yok.");

                resolve([{
                    name: PROVIDER_NAME,
                    title: "HDFC - Fix",
                    url: iframeUrl,
                    quality: "1080p",
                    headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"] }
                }]);
            })
            .catch(function(err) {
                console.error("[" + PROVIDER_NAME + "] HATA: " + err.message);
                resolve(EMPTY_RESULT);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
