/**
 * Nuvio Local Scraper - SinemaCX (V22 - Stabil Çift Dilli Arama)
 */

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "SinemaCX";
const BASE_URL = "https://www.sinema.news";
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
        
        var displayTitle = ""; 

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var trTitle = (data.title || data.name || "").toLowerCase().trim();
                var orgTitle = (data.original_title || data.original_name || "").toLowerCase().trim();
                displayTitle = (data.title || data.name || PROVIDER_NAME);

                console.error(`[${PROVIDER_NAME}] Sorgu: ${trTitle}`);

                // Önce Türkçe ara, bulamazsan İngilizce ara
                return searchOnSite(trTitle).then(function(url) {
                    if (url) return url;
                    if (trTitle !== orgTitle) {
                        console.error(`[${PROVIDER_NAME}] TR bulunamadı, ORG deneniyor: ${orgTitle}`);
                        return searchOnSite(orgTitle);
                    }
                    return null;
                });
            })
            .then(function(targetUrl) {
                if (!targetUrl) {
                    console.error(`[${PROVIDER_NAME}] HATA: Sonuç bulunamadı.`);
                    return resolve(EMPTY_RESULT);
                }

                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }

                console.error(`[${PROVIDER_NAME}] Hedef: ${targetUrl}`);
                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(html) {
                if (!html) return resolve(EMPTY_RESULT);
                var $page = cheerio.load(html);
                
                var iframes = [];
                $page("iframe").each(function() { 
                    var s = $page(this).attr("data-vsrc") || $page(this).attr("src") || "";
                    if (s) iframes.push(s);
                });

                if (iframes.length > 0 && iframes.every(s => s.includes("youtube") || s.includes("fragman"))) {
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
                        name: displayTitle + " - " + PROVIDER_NAME,
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
    // Arama terimini ve noktalamaları temizle
    var cleanQuery = query.replace(/[:.,\-]/g, ' ').replace(/\s+/g, ' ').trim();
    var searchUrl = `${BASE_URL}/?s=` + encodeURIComponent(cleanQuery);
    
    return fetch(searchUrl, { headers: WORKING_HEADERS })
        .then(res => res.text())
        .then(html => {
            var $search = cheerio.load(html);
            var foundUrl = null;

            $search("div.icerik div.frag-k, div.video-content, article").each(function() {
                var anchor = $search(this).find("div.yanac a, h2 a, a").first();
                var siteTitle = anchor.text().toLowerCase().trim();
                var cleanSiteTitle = siteTitle.replace(/[:.,\-]/g, ' ').replace(/\s+/g, ' ').trim();
                
                if (cleanSiteTitle.includes(cleanQuery) || cleanQuery.includes(cleanSiteTitle)) {
                    foundUrl = anchor.attr("href");
                    if (foundUrl) return false;
                }
            });
            return foundUrl;
        });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
