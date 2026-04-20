// Version: 4.8 (Protocol Compliant - Raw Data Inspection)
// Note: console.log is FORBIDDEN. Use console.error for all logs. No async/await.

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const BASE_URL = "https://www.hdfilmcehennemi.nl";
const EMPTY_RESULT = [];
const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-Requested-With": "fetch"
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] PROTOKOL v4.8: HAM VERI ANALIZI BASLADI");
    
    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl, { headers: DEFAULT_HEADERS })
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var query = (tmdbData.title || tmdbData.name || "").replace(/['":]/g, "").trim();
                console.error("[" + PROVIDER_NAME + "] TMDB'DEN GELEN ISIM -> " + query);
                return fetch(BASE_URL + "/search?q=" + encodeURIComponent(query), { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { return res.json(); })
            .then(function(searchData) {
                var results = searchData.results || [];
                if (results.length === 0) throw new Error("Arama sonucu donmedi.");

                var $search = cheerio.load(results[0]);
                var targetUrl = $search("a").first().attr("href");
                
                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }
                console.error("[" + PROVIDER_NAME + "] SITEDEN CEKILEN HEDEF URL -> " + targetUrl);
                return fetch(targetUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { 
                if (!res) throw new Error("Sayfa fetch edilemedi.");
                return res.text(); 
            })
            .then(function(pageHtml) {
                // --- KRITIK VERI INCELEME ALANI ---
                // Sayfanın player kısmını veya data-video geçebilecek yerleri ham olarak logluyoruz
                var rawInspect = pageHtml.match(/<button.*?class="alternative-link".*?>/gi) || 
                                 pageHtml.match(/data-video=["'].*?["']/gi) ||
                                 ["VIDEO_ID_YAPISI_BULUNAMADI"];
                
                console.error("[" + PROVIDER_NAME + "] HAM HTML KESITI (ILK 3 BULGU) -> " + JSON.stringify(rawInspect.slice(0, 3)));
                
                var $page = cheerio.load(pageHtml);
                var videoID = $page("button.alternative-link").attr("data-video") || 
                              $page("[data-video]").attr("data-video");

                // Regex ile de deniyoruz
                if (!videoID) {
                    var m = pageHtml.match(/data-video=["'](\d+)["']/i);
                    videoID = m ? m[1] : null;
                }

                console.error("[" + PROVIDER_NAME + "] ISLENMIS VIDEO ID -> " + (videoID || "YOK"));
                if (!videoID) throw new Error("Site yapisinda videoID artik farkli bir isimde veya yapida.");

                return fetch(BASE_URL + "/video/" + videoID + "/", { 
                    headers: Object.assign({}, DEFAULT_HEADERS, { "Referer": BASE_URL + "/" }) 
                });
            })
            .then(function(res) { 
                return res.text(); 
            })
            .then(function(apiHtml) {
                console.error("[" + PROVIDER_NAME + "] API'DEN DONEN HAM VERI -> " + apiHtml.substring(0, 150));
                var iframeMatch = apiHtml.match(/data-src=\\"([^"]+)/);
                var iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
                
                if (!iframeUrl) throw new Error("Iframe ayiklanamadi.");
                
                resolve([{
                    name: PROVIDER_NAME,
                    title: "HDFC - VIP",
                    url: iframeUrl, // Simdilik rplayer'a girmeden once iframe'i gorelim
                    quality: "720p/1080p",
                    headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"] }
                }]);
            })
            .catch(function(err) {
                console.error("[" + PROVIDER_NAME + "] DURDURULDU: " + err.message);
                resolve(EMPTY_RESULT);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
