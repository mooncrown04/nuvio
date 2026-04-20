// Version: 4.9 (Protocol Compliant - Script Injection Scan)
// Note: console.log is FORBIDDEN. Use console.error for all logs. No async/await.

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const BASE_URL = "https://www.hdfilmcehennemi.nl";
const EMPTY_RESULT = [];
const DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "X-Requested-With": "fetch",
    "Referer": BASE_URL + "/"
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] PROTOKOL v4.9: SCRIPT SCAN BASLADI");
    
    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl, { headers: DEFAULT_HEADERS })
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var query = (tmdbData.title || tmdbData.name || "").replace(/['":]/g, "").trim();
                return fetch(BASE_URL + "/search?q=" + encodeURIComponent(query), { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { return res.json(); })
            .then(function(searchData) {
                var results = searchData.results || [];
                if (results.length === 0) throw new Error("Arama sonucu yok.");
                
                var $search = cheerio.load(results[0]);
                var targetUrl = $search("a").first().attr("href");
                if (!isMovie) targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                
                console.error("[" + PROVIDER_NAME + "] SAYFA CEKILIYOR -> " + targetUrl);
                return fetch(targetUrl, { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                // --- SCRIPT VE PLAYER ANALIZI ---
                // Site data-video yerine artik ID'yi bir JSON objesinde sakliyor olabilir.
                var idFinder = pageHtml.match(/id\s*:\s*(\d{5,})/gi) || 
                               pageHtml.match(/post\s*:\s*(\d{5,})/gi) || 
                               pageHtml.match(/["'](\d{6,})["']/g); // 6 haneli sayilar genellikle video ID'sidir.

                console.error("[" + PROVIDER_NAME + "] SAYFA ICI POTANSIYEL ID'LER -> " + JSON.stringify(idFinder ? idFinder.slice(0, 5) : "YOK"));

                var $page = cheerio.load(pageHtml);
                
                // Yeni ihtimal: 'data-id' veya 'data-post' kullanimi
                var videoID = $page("[data-id]").attr("data-id") || 
                              $page("[data-post]").attr("data-post") ||
                              $page("input#post_id").val();

                // Hicbiri yoksa manuel regex denemesi
                if (!videoID && idFinder) {
                    // Bulunan ilk 6+ haneli sayiyi dene
                    var firstMatch = idFinder[0].match(/\d+/);
                    videoID = firstMatch ? firstMatch[0] : null;
                }

                console.error("[" + PROVIDER_NAME + "] TESPIT EDILEN ID -> " + videoID);
                if (!videoID) throw new Error("ID TESPIT EDILEMEDI.");

                // Sitenin video endpoint'i degismis olabilir mi? /video/ yerine /ajax/ deneyelim
                return fetch(BASE_URL + "/video/" + videoID + "/", { headers: DEFAULT_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(apiHtml) {
                console.error("[" + PROVIDER_NAME + "] API YANITI (ILK 100) -> " + apiHtml.substring(0, 100).replace(/\n/g, ""));
                
                var iframeMatch = apiHtml.match(/data-src=\\"([^"]+)/);
                var iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";

                if (!iframeUrl) throw new Error("Iframe linki ayiklanamadi.");

                resolve([{
                    name: PROVIDER_NAME,
                    title: "HDFC - v4.9",
                    url: iframeUrl,
                    quality: "1080p",
                    headers: { "User-Agent": DEFAULT_HEADERS["User-Agent"] }
                }]);
            })
            .catch(function(err) {
                console.error("[" + PROVIDER_NAME + "] KRITIK HATA: " + err.message);
                resolve(EMPTY_RESULT);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
