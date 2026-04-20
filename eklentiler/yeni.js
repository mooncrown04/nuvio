// Version: 6.3 (Deep Content Extraction)
// SUCCESS: We bypassed the 7238 block. Now extracting hidden video IDs.

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const STATIC_URL = "https://www.hdfilmcehennemi.nl/project-hail-mary-3/";
const EMPTY_RESULT = [];

const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8",
    "Referer": "https://www.google.com/"
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] v6.3 CONTENT EXTRACTION START");
    
    return new Promise(function(resolve) {
        fetch(STATIC_URL, { headers: HEADERS })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                console.error("[" + PROVIDER_NAME + "] SAYFA ALINDI: " + pageHtml.length + " bytes");
                
                // 1. Yol: Klasik data-video
                var videoID = (pageHtml.match(/data-video=["'](\d+)["']/) || [])[1];
                
                // 2. Yol: Alternatif link butonları (Regex)
                if (!videoID) {
                    var altMatch = pageHtml.match(/alternative-link.*?data-video=["'](\d+)["']/);
                    videoID = altMatch ? altMatch[1] : null;
                }
                
                // 3. Yol: JSON içinden çekme (En garanti yol budur)
                if (!videoID) {
                    var jsonMatch = pageHtml.match(/videoID\s*:\s*["'](\d+)["']/);
                    videoID = jsonMatch ? jsonMatch[1] : null;
                }

                if (!videoID) {
                    // Sayfa içinde geçen TÜM 5-8 haneli rakamları tarayalım
                    console.error("[" + PROVIDER_NAME + "] KLASIK ID BULUNAMADI, DERIN TARAMA...");
                    var allNumbers = pageHtml.match(/\b\d{5,8}\b/g);
                    console.error("[" + PROVIDER_NAME + "] POTANSIYEL IDLER: " + (allNumbers ? allNumbers.slice(0,5) : "YOK"));
                }

                if (!videoID) throw new Error("ID HALA GIZLI");
                
                console.error("[" + PROVIDER_NAME + "] ID BULDUM -> " + videoID);

                return fetch("https://www.hdfilmcehennemi.nl/video/" + videoID + "/", { 
                    headers: Object.assign({}, HEADERS, { "Referer": STATIC_URL }) 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(apiHtml) {
                // Iframe ayıklama (Kritik: \u0026 gibi kaçış karakterlerini temizliyoruz)
                var iframeMatch = apiHtml.match(/data-src=\\"([^"]+)/);
                var iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
                
                if (!iframeUrl) throw new Error("IFRAME BULUNAMADI");

                resolve([{
                    name: PROVIDER_NAME,
                    title: "HDFC - v6.3 (Hail Mary)",
                    url: iframeUrl,
                    quality: "1080p",
                    headers: { "User-Agent": HEADERS["User-Agent"] }
                }]);
            })
            .catch(function(err) {
                console.error("[" + PROVIDER_NAME + "] HATA -> " + err.message);
                resolve(EMPTY_RESULT);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
