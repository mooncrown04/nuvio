/**
 * Nuvio Local Scraper - SinemaCX (V30 - Veri Odaklı Analiz)
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
    console.error(`[${PROVIDER_NAME}] Analiz Başladı -> ID: ${tmdbId}`);

    return new Promise(function(resolve) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';
        
        var displayTitle = ""; 

        fetch(tmdbUrl)
            .then(res => res.json())
            .then(data => {
                var trTitle = (data.title || data.name || "").toLowerCase().trim();
                var orgTitle = (data.original_title || data.original_name || "").toLowerCase().trim();
                displayTitle = (data.title || data.name || PROVIDER_NAME);

                // Veri Odaklı Arama: Önce TR, bulamazsa ORG
                return searchOnSite(trTitle).then(res1 => {
                    if (res1) return res1;
                    if (trTitle !== orgTitle) return searchOnSite(orgTitle);
                    return null;
                });
            })
            .then(result => {
                if (!result || !result.url) {
                    console.error(`[${PROVIDER_NAME}] HATA: Veri eşleşmesi başarısız.`);
                    return resolve(EMPTY_RESULT);
                }

                var sTitle = result.siteTitle.toLowerCase();
                var detail = sTitle.includes("dublaj") ? "Türkçe Dublaj" : (sTitle.includes("altyazı") || sTitle.includes("altyazi") ? "Türkçe Altyazılı" : "1080p");

                console.error(`[${PROVIDER_NAME}] Hedef Veri: ${result.siteTitle}`);

                var targetUrl = result.url;
                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }

                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(res => res ? res.text() : null)
            .then(html => {
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
            .then(finalHtml => {
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
                        resolve([{
                            name: displayTitle + " (" + (detail || "1080p") + " - " + PROVIDER_NAME + ")",
                            url: json.securedLink,
                            quality: "1080p",
                            headers: { 'Referer': 'https://player.filmizle.in/' }
                        }]);
                    } else { resolve(EMPTY_RESULT); }
                });
            })
            .catch(err => {
                console.error(`[${PROVIDER_NAME}] SİSTEM HATASI: ${err.message}`);
                resolve(EMPTY_RESULT);
            });
    });
}

function searchOnSite(query) {
    // 1. Arama Terimini Parçala (Veri Odaklı Arama için)
    var cleanQuery = query.replace(/[:.,\-]/g, ' ').replace(/\s+/g, ' ').toLowerCase().trim();
    var queryWords = cleanQuery.split(' ').filter(w => w.length > 2); // Kısa kelimeleri (ve, ile) eliyoruz
    
    var searchUrl = `${BASE_URL}/?s=` + encodeURIComponent(cleanQuery);
    
    return fetch(searchUrl, { headers: WORKING_HEADERS })
        .then(res => res.text())
        .then(html => {
            var $search = cheerio.load(html);
            var results = [];

            // 2. Gelen verinin tamamındaki linkleri topla
            $search("a").each(function() {
                var url = $search(this).attr("href") || "";
                var rawTitle = $search(this).text().toLowerCase().trim();

                // Çöp filtreleme (Arama sonucunda çıkabilecek alakasız yerler)
                if (!url || url.includes("/feed/") || url.includes("/category/") || rawTitle.length < 3) return;

                // 3. SKORLAMA SİSTEMİ: TMDB'den gelen kelimelerin kaçı bu linkin metninde geçiyor?
                var score = 0;
                queryWords.forEach(word => {
                    if (rawTitle.includes(word)) score++;
                });

                if (score > 0) {
                    results.push({ url: url, siteTitle: $search(this).text().trim(), score: score });
                }
            });

            // 4. En yüksek skorlu (en çok kelime eşleşen) sonucu döndür
            if (results.length > 0) {
                results.sort((a, b) => b.score - a.score);
                console.error(`[${PROVIDER_NAME}] En İyi Eşleşme Skoru: ${results[0].score} / ${queryWords.length}`);
                return results[0];
            }
            return null;
        });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
