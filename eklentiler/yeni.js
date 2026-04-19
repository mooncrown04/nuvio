/**
 * Nuvio Local Scraper - SinemaCX (V15 - $ Hatası Düzeltildi)
 */

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "SinemaCX";
const BASE_URL = "https://www.sinema.news";
const EMPTY_RESULT = [];

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'X-Requested-With': 'XMLHttpRequest'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[${PROVIDER_NAME}] Fetch Modu Başlatıldı -> ID: ${tmdbId}`);

    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var trTitle = (data.title || data.name).toLowerCase().trim();
                var orgTitle = (data.original_title || data.original_name).toLowerCase().trim();
                
                console.error(`[${PROVIDER_NAME}] TR: ${trTitle} | ORG: ${orgTitle}`);

                return searchOnSite(trTitle).then(function(url) {
                    if (url) return url;
                    if (trTitle !== orgTitle) {
                        console.error(`[${PROVIDER_NAME}] TR bulunamadı, ORG deneniyor...`);
                        return searchOnSite(orgTitle);
                    }
                    return null;
                });
            })
            .then(function(targetUrl) {
                if (!targetUrl) {
                    console.error(`[${PROVIDER_NAME}] HATA: Hiçbir isimle sonuç bulunamadı.`);
                    return resolve(EMPTY_RESULT);
                }

                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }

                console.error(`[${PROVIDER_NAME}] Sayfa URL: ${targetUrl}`);
                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(html) {
                if (!html) return resolve(EMPTY_RESULT);
                
                // BURADA $ TANIMLANDI
                var $ = cheerio.load(html);
                var iframes = [];

                $("iframe").each(function() { 
                    iframes.push($(this).attr("data-vsrc") || $(this).attr("src") || ""); 
                });

                var isTrailer = iframes.length > 0 && iframes.every(s => s.includes("youtube") || s.includes("fragman") || s.includes("trailer"));
                
                if (isTrailer) {
                    console.error(`[${PROVIDER_NAME}] Fragman atlanıyor, /2/ deneniyor.`);
                    var currentUrl = $("link[rel='canonical']").attr("href") || "";
                    var altUrl = currentUrl.endsWith("/") ? currentUrl + "2/" : currentUrl + "/2/";
                    return fetch(altUrl, { headers: WORKING_HEADERS }).then(r => r.text());
                }
                return html;
            })
            .then(function(finalHtml) {
                if (!finalHtml) return resolve(EMPTY_RESULT);
                
                // BURADA $ TEKRAR TANIMLANDI (Farklı bir HTML gelmiş olabilir)
                var $final = cheerio.load(finalHtml);
                var iframeUrl = "";

                $final("iframe").each(function() {
                    var src = $(this).attr("data-vsrc") || $(this).attr("src") || "";
                    if (src.includes("player.filmizle.in")) {
                        iframeUrl = src.split("?img=")[0];
                        return false;
                    }
                });

                if (!iframeUrl) {
                    console.error(`[${PROVIDER_NAME}] HATA: player.filmizle.in bulunamadı.`);
                    return resolve(EMPTY_RESULT);
                }

                var videoId = iframeUrl.split("/").pop();
                return fetch("https://player.filmizle.in/player/index.php?data=" + videoId + "&do=getVideo", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Referer': iframeUrl
                    },
                    body: "data=" + videoId + "&do=getVideo"
                }).then(r => r.json());
            })
            .then(function(json) {
                if (json && json.securedLink) {
                    resolve([{
                        name: PROVIDER_NAME,
                        url: json.securedLink,
                        quality: "1080p",
                        headers: { 'Referer': 'https://player.filmizle.in/' }
                    }]);
                } else {
                    resolve(EMPTY_RESULT);
                }
            })
            .catch(function(err) {
                console.error(`[${PROVIDER_NAME}] KRİTİK HATA: ${err.message}`);
                resolve(EMPTY_RESULT);
            });
    });
}

function searchOnSite(query) {
    return fetch(`${BASE_URL}/?s=` + encodeURIComponent(query), { headers: WORKING_HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var $search = cheerio.load(html);
            var foundUrl = null;
            
            // Seçiciyi hem SinemaCX hem SinemaLA yapısına göre kontrol ediyoruz
            $search("div.icerik div.frag-k, div.video-content").each(function() {
                var siteTitle = $search(this).find("div.yanac a, h2 a").text().toLowerCase().trim();
                if (siteTitle.includes(query.toLowerCase().trim())) {
                    foundUrl = $search(this).find("div.yanac a, h2 a").attr("href");
                    return false;
                }
            });
            return foundUrl;
        });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
