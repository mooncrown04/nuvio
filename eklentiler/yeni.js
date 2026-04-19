/**
 * Nuvio Local Scraper - SinemaCX (V17 - Arama Mantığı Esnetildi)
 */

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "SinemaCX";
const BASE_URL = "https://www.sinema.news"; // Site yönlendirse bile arama buradan başlar
const EMPTY_RESULT = [];

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[${PROVIDER_NAME}] Başlatıldı -> ID: ${tmdbId}`);

    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var trTitle = (data.title || data.name || "").toLowerCase().trim();
                var orgTitle = (data.original_title || data.original_name || "").toLowerCase().trim();
                
                console.error(`[${PROVIDER_NAME}] Sorgu: ${trTitle}`);

                // Önce TR isimle ara, olmazsa ORG isimle
                return searchOnSite(trTitle).then(function(url) {
                    if (url) return url;
                    if (trTitle !== orgTitle) {
                        console.error(`[${PROVIDER_NAME}] TR sonuç vermedi, ORG deneniyor: ${orgTitle}`);
                        return searchOnSite(orgTitle);
                    }
                    return null;
                });
            })
            .then(function(targetUrl) {
                if (!targetUrl) {
                    console.error(`[${PROVIDER_NAME}] HATA: Hiçbir sonuç eşleşmedi.`);
                    return resolve(EMPTY_RESULT);
                }

                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }

                console.error(`[${PROVIDER_NAME}] Hedef URL: ${targetUrl}`);
                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(html) {
                if (!html) return resolve(EMPTY_RESULT);
                var $page = cheerio.load(html);
                
                // Fragman/Film tespiti
                var iframes = [];
                $page("iframe").each(function() { 
                    var s = $page(this).attr("data-vsrc") || $page(this).attr("src") || "";
                    if (s) iframes.push(s);
                });

                if (iframes.every(s => s.includes("youtube") || s.includes("fragman"))) {
                    console.error(`[${PROVIDER_NAME}] Fragman sayfası, 2. sayfaya geçiliyor.`);
                    var currentUrl = $page("link[rel='canonical']").attr("href") || "";
                    var altUrl = currentUrl.endsWith("/") ? currentUrl + "2/" : currentUrl + "/2/";
                    return fetch(altUrl, { headers: WORKING_HEADERS }).then(r => r.text());
                }
                return html;
            })
            .then(function(finalHtml) {
                if (!finalHtml) return resolve(EMPTY_RESULT);
                var $final = cheerio.load(finalHtml);
                var iframeUrl = "";

                $final("iframe").each(function() {
                    var src = $final(this).attr("data-vsrc") || $final(this).attr("src") || "";
                    if (src.includes("player.filmizle.in")) {
                        iframeUrl = src.split("?img=")[0];
                        return false;
                    }
                });

                if (!iframeUrl) return resolve(EMPTY_RESULT);

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
                } else { resolve(EMPTY_RESULT); }
            })
            .catch(function(err) {
                console.error(`[${PROVIDER_NAME}] HATA: ${err.message}`);
                resolve(EMPTY_RESULT);
            });
    });
}

function searchOnSite(query) {
    // Arama URL'sini temizleyelim
    var searchUrl = `${BASE_URL}/?s=` + encodeURIComponent(query);
    
    return fetch(searchUrl, { headers: WORKING_HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var $search = cheerio.load(html);
            var foundUrl = null;

            // Sinema.la / Sinema.news için en geniş seçiciyi kullanıyoruz
            // İlk olarak .frag-k içindeki yanac a'ya bak, yoksa herhangi bir h2 a'ya bak
            var links = $search("div.icerik div.frag-k div.yanac a, div.video-content h2 a, article h2 a");
            
            if (links.length > 0) {
                // Sadece ilk sonucu al (Şablonuna geri döndük ama filtreyi yumuşattık)
                var firstLink = links.first();
                var title = firstLink.text().toLowerCase().trim();
                
                // Eğer site başlığı aranan kelimenin en az %50'sini içeriyorsa kabul et
                if (title.includes(query) || query.includes(title)) {
                    foundUrl = firstLink.attr("href");
                }
            }
            return foundUrl;
        });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
