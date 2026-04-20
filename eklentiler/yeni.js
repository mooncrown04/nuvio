// Version: 6.2 (Static Link Stress Test)
// Goal: Determine if the site blocks the device even on known valid URLs.

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const STATIC_URL = "https://www.hdfilmcehennemi.nl/project-hail-mary-3/";
const EMPTY_RESULT = [];

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8",
    "Referer": "https://www.google.com/" // Google'dan geliyormuş gibi yapalım
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] v6.2 STATIC TEST BAŞLADI");
    console.error("[" + PROVIDER_NAME + "] TEST EDİLEN LİNK -> " + STATIC_URL);
    
    return new Promise(function(resolve) {
        // Arama yok, direkt fetch
        fetch(STATIC_URL, { headers: HEADERS })
            .then(function(res) {
                console.error("[" + PROVIDER_NAME + "] HTTP DURUMU -> " + res.status);
                return res.text();
            })
            .then(function(pageHtml) {
                console.error("[" + PROVIDER_NAME + "] SAYFA BOYUTU -> " + pageHtml.length);
                
                // Eğer sayfa 7238 ise burada "ENGEL VAR" diyecek
                if (pageHtml.length === 7238) {
                    console.error("[" + PROVIDER_NAME + "] KRİTİK: BİLİNEN LİNK BİLE 7238 DÖNDÜ! SİTE CİHAZI BLOKLAMIŞ.");
                }

                var $page = cheerio.load(pageHtml);
                var videoID = $page("button.alternative-link").attr("data-video") || 
                              $page("[data-video]").attr("data-video") ||
                              (pageHtml.match(/data-video=["'](\d+)["']/) || [])[1];

                if (!videoID) throw new Error("SAYFADA VIDEO ID BULUNAMADI");
                console.error("[" + PROVIDER_NAME + "] VIDEO ID BULUNDU -> " + videoID);

                // Video API'sine git
                return fetch("https://www.hdfilmcehennemi.nl/video/" + videoID + "/", { 
                    headers: Object.assign({}, HEADERS, { "Referer": STATIC_URL }) 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(apiHtml) {
                console.error("[" + PROVIDER_NAME + "] API YANITI ALINDI");
                
                var iframeMatch = apiHtml.match(/data-src=\\"([^"]+)/);
                var iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
                
                if (!iframeUrl) throw new Error("IFRAME AYIKLANAMADI");

                resolve([{
                    name: PROVIDER_NAME,
                    title: "HDFC - TEST (Hail Mary)",
                    url: iframeUrl,
                    quality: "1080p",
                    headers: { "User-Agent": HEADERS["User-Agent"] }
                }]);
            })
            .catch(function(err) {
                console.error("[" + PROVIDER_NAME + "] TEST HATASI -> " + err.message);
                resolve(EMPTY_RESULT);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
