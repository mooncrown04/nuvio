// Version: 5.5 (Final Scraper - Header Simulation)
// Note: strictly using console.error for logging.

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const BASE_URL = "https://www.hdfilmcehennemi.nl";
const EMPTY_RESULT = [];

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": BASE_URL + "/",
    "Origin": BASE_URL,
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin"
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] v5.5 BASLATILDI (Final Scraper)");
    
    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl, { headers: HEADERS })
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var query = (tmdbData.title || tmdbData.name || "").replace(/['":]/g, "").trim();
                console.error("[" + PROVIDER_NAME + "] ARAMA YAPILIYOR: " + query);
                
                // Arama sayfasını bot korumasını aşacak şekilde çağırıyoruz
                return fetch(BASE_URL + "/search?q=" + encodeURIComponent(query), { 
                    method: 'GET',
                    headers: HEADERS 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchText) {
                console.error("[" + PROVIDER_NAME + "] ARAMA YANITI BOYUTU: " + searchText.length);
                
                var $ = cheerio.load(searchText);
                var targetUrl = "";

                // Sitenin arama sonuçlarındaki link yapısını bulalım
                // .poster > a veya article içindeki ilk a
                targetUrl = $(".poster > a").first().attr("href") || 
                            $("article a").first().attr("href") ||
                            $("a[href*='" + BASE_URL + "']").filter(function() {
                                return $(this).attr("href").length > BASE_URL.length + 5;
                            }).first().attr("href");

                if (!targetUrl) {
                    console.error("[" + PROVIDER_NAME + "] HTML ICINDE LINK BULUNAMADI. HAM VERI KONTROLÜ...");
                    // Regex ile link avcılığı
                    var linkMatch = searchText.match(/href=["'](https:\/\/www\.hdfilmcehennemi\.nl\/[^"']+?-(\d+)\/)["']/);
                    targetUrl = linkMatch ? linkMatch[1] : "";
                }

                if (!targetUrl) throw new Error("LINK TESPIT EDILEMEDI");
                
                // Dizi ise sezon/bölüm ekle
                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }

                console.error("[" + PROVIDER_NAME + "] HEDEF URL: " + targetUrl);
                return fetch(targetUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                var $page = cheerio.load(pageHtml);
                
                // Video ID (data-video) yakalama
                var videoID = $page("button.alternative-link").attr("data-video") || 
                              $page("[data-video]").attr("data-video");

                if (!videoID) {
                    var idMatch = pageHtml.match(/data-video=["'](\d+)["']/);
                    videoID = idMatch ? idMatch[1] : null;
                }

                if (!videoID) throw new Error("SAYFADA VIDEO ID YOK");
                console.error("[" + PROVIDER_NAME + "] VIDEO ID: " + videoID);

                return fetch(BASE_URL + "/video/" + videoID + "/", { 
                    headers: Object.assign({}, HEADERS, { "Referer": targetUrl }) 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(apiHtml) {
                var iframeMatch = apiHtml.match(/data-src=\\"([^"]+)/);
                var iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
                
                if (!iframeUrl) throw new Error("IFRAME BULUNAMADI");

                resolve([{
                    name: PROVIDER_NAME,
                    title: "HDFC - VIP",
                    url: iframeUrl,
                    quality: "1080p",
                    headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
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
