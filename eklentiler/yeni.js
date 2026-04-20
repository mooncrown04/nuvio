// Version: 5.9 (Deep Scraper & Header Mirroring)
// Note: Using console.error for all internal logs.

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "HDFilmCehennemi";
const BASE_URL = "https://www.hdfilmcehennemi.nl";
const EMPTY_RESULT = [];

// Tarayıcıyı birebir taklit eden header seti
const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": BASE_URL + "/",
    "Sec-Ch-Ua": '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1"
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error("[" + PROVIDER_NAME + "] v5.9 DEEP SCRAPER BASLATILDI");
    
    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=en-US';

        fetch(tmdbUrl, { headers: { "User-Agent": HEADERS["User-Agent"] } })
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var query = (tmdbData.original_title || tmdbData.original_name || tmdbData.title || "").trim();
                console.error("[" + PROVIDER_NAME + "] ORIJINAL ISIM ILE ARANIYOR -> " + query);
                
                return fetch(BASE_URL + "/search?q=" + encodeURIComponent(query), { 
                    method: 'GET',
                    headers: HEADERS 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(searchText) {
                console.error("[" + PROVIDER_NAME + "] ARAMA YANITI BOYUTU -> " + searchText.length);
                
                var $ = cheerio.load(searchText);
                var targetUrl = "";

                // 1. Yol: Standart poster linkleri
                $(".poster > a").each(function(i, el) {
                    var href = $(el).attr("href");
                    if (href && href.startsWith("http")) { targetUrl = href; return false; }
                });

                // 2. Yol: Eğer hala 7238 dönüyorsa veya link yoksa, sayfa içindeki tüm gizli URL'leri tara
                if (!targetUrl) {
                    var allLinks = searchText.match(/https:\/\/www\.hdfilmcehennemi\.nl\/[a-z0-9-]+-\d+\//gi) || [];
                    if (allLinks.length > 0) {
                        targetUrl = allLinks[0]; // İlk yakaladığımız ID'li linki alıyoruz
                    }
                }

                if (!targetUrl) throw new Error("LINK TESPIT EDILEMEDI (7238 ENGELI)");

                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }

                console.error("[" + PROVIDER_NAME + "] HEDEF BULUNDU -> " + targetUrl);
                return fetch(targetUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(pageHtml) {
                // Video ID'yi sayfadan cımbızla çek
                var videoID = (pageHtml.match(/data-video=["'](\d+)["']/) || [])[1];
                if (!videoID) throw new Error("SAYFADA VIDEO ID BULUNAMADI");

                console.error("[" + PROVIDER_NAME + "] VIDEO ID -> " + videoID);
                return fetch(BASE_URL + "/video/" + videoID + "/", { 
                    headers: Object.assign({}, HEADERS, { "Referer": targetUrl }) 
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(apiHtml) {
                var iframeMatch = apiHtml.match(/data-src=\\"([^"]+)/);
                var iframeUrl = iframeMatch ? iframeMatch[1].replace(/\\/g, "") : "";
                
                if (!iframeUrl) throw new Error("IFRAME LINKI YOK");

                resolve([{
                    name: PROVIDER_NAME,
                    title: "HDFC - v5.9",
                    url: iframeUrl,
                    quality: "1080p",
                    headers: { "User-Agent": HEADERS["User-Agent"], "Referer": BASE_URL + "/" }
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
