/**
 * Nuvio Local Scraper - SinemaCX (V36 - Fix: $ is not defined)
 */

var cheerio = require("cheerio-without-node-native");

const PROVIDER_NAME = "SinemaCX";
const BASE_URL = "https://www.sinema.la";
const EMPTY_RESULT = [];

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://www.sinema.la/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
        
        var displayTitle = ""; 
        var releaseYear = "";

        fetch(tmdbUrl)
            .then(res => res.json())
            .then(data => {
                var trTitle = (data.title || data.name || "").toLowerCase().trim();
                var orgTitle = (data.original_title || data.original_name || "").toLowerCase().trim();
                displayTitle = (data.title || data.name || PROVIDER_NAME);
                releaseYear = (data.release_date || data.first_air_date || "").split("-")[0];

                console.error(`[${PROVIDER_NAME}] Arama Başlatıldı: ${trTitle} / ${orgTitle}`);

                // Çift aşamalı arama: Önce TR, sonuç zayıfsa ORG isim
                return searchOnSite(trTitle, releaseYear).then(res1 => {
                    if (res1 && res1.score >= 2) return res1;
                    return searchOnSite(orgTitle, releaseYear);
                });
            })
            .then(result => {
                if (!result) {
                    console.error(`[${PROVIDER_NAME}] Sonuç bulunamadı.`);
                    return resolve(EMPTY_RESULT);
                }

                console.error(`[${PROVIDER_NAME}] En İyi Eşleşme: ${result.siteTitle} (Skor: ${result.score})`);

                var targetUrl = result.url;
                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }

                return fetch(targetUrl, { headers: WORKING_HEADERS }).then(res => res.text()).then(html => {
                    var $page = cheerio.load(html);
                    var iframes = [];
                    $page("iframe").each(function() {
                        var s = $page(this).attr("data-vsrc") || $page(this).attr("src") || "";
                        if (s) iframes.push(s);
                    });

                    // Fragman koruması
                    if (iframes.length > 0 && iframes.every(s => s.includes("youtube") || s.includes("fragman"))) {
                        var currentUrl = $page("link[rel='canonical']").attr("href") || "";
                        var altUrl = currentUrl.endsWith("/") ? currentUrl + "2/" : currentUrl + "/2/";
                        return fetch(altUrl, { headers: WORKING_HEADERS }).then(r => r.text());
                    }
                    return html;
                }).then(finalHtml => {
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
                    }).then(r => r.json()).then(json => {
                        if (json && json.securedLink) {
                            var sTitle = result.siteTitle.toLowerCase();
                            var info = sTitle.includes("dublaj") ? "Dublaj" : (sTitle.includes("altyazı") ? "Altyazı" : "HD");
                            
                            resolve([{
                                name: displayTitle + " (" + info + " - SinemaCX)",
                                url: json.securedLink,
                                quality: "1080p",
                                headers: { 'Referer': 'https://player.filmizle.in/' }
                            }]);
                        } else { resolve(EMPTY_RESULT); }
                    });
                });
            })
            .catch(err => {
                console.error(`[${PROVIDER_NAME}] HATA: ${err.message}`);
                resolve(EMPTY_RESULT);
            });
    });
}

function searchOnSite(query, year) {
    var cleanQuery = query.replace(/[:.,\-]/g, ' ').replace(/\s+/g, ' ').trim();
    var searchUrl = `${BASE_URL}/?s=` + encodeURIComponent(cleanQuery);
    
    return fetch(searchUrl, { headers: WORKING_HEADERS })
        .then(res => res.text())
        .then(html => {
            // HATA BURADAYDI: $ işaretini cheerio.load(html) ile tanımladık
            var $ = cheerio.load(html);
            var results = [];
            var queryWords = cleanQuery.toLowerCase().split(' ').filter(w => w.length > 2);

            $("a").each(function() {
                var url = $(this).attr("href") || "";
                var title = $(this).text().toLowerCase().trim();

                // Filtre: Sadece film linklerine odaklan (kategorileri loglardaki gibi eliyoruz)
                if (!url.startsWith(BASE_URL) || url.includes("/izle/") || url.includes("/category/") || title.length < 5) return;

                var score = 0;
                queryWords.forEach(word => { if (title.includes(word)) score++; });
                
                // Yıl eşleşmesi varsa +3 puan
                if (year && title.includes(year)) score += 3;

                if (score > 0) {
                    results.push({ url: url, siteTitle: $(this).text().trim(), score: score });
                }
            });

            if (results.length > 0) {
                results.sort((a, b) => b.score - a.score);
                return results[0];
            }
            return null;
        });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
