/**
 * Nuvio Local Scraper - SinemaCX (V24 - Gelişmiş Arama & Detaylı İsim)
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
        var extraInfo = "1080p"; 

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var trTitle = (data.title || data.name || "").toLowerCase().trim();
                var orgTitle = (data.original_title || data.original_name || "").toLowerCase().trim();
                
                displayTitle = (data.title || data.name || PROVIDER_NAME);

                console.error(`[${PROVIDER_NAME}] Sorgu: ${trTitle}`);

                // 1. Türkçe isimle ara
                return searchOnSite(trTitle).then(function(res1) {
                    if (res1) return res1;
                    // 2. Bulunamazsa İngilizce isimle ara
                    if (trTitle !== orgTitle) {
                        console.error(`[${PROVIDER_NAME}] TR sonuç yok, ORG deneniyor: ${orgTitle}`);
                        return searchOnSite(orgTitle);
                    }
                    return null;
                });
            })
            .then(function(searchResult) {
                if (!searchResult || !searchResult.url) {
                    console.error(`[${PROVIDER_NAME}] HATA: Hiçbir sonuç eşleşmedi.`);
                    return resolve(EMPTY_RESULT);
                }

                // Dil tespiti (Sitedeki başlıktan çekiyoruz)
                var sTitle = searchResult.siteTitle.toLowerCase();
                if (sTitle.includes("dublaj")) extraInfo = "Türkçe Dublaj";
                else if (sTitle.includes("altyazı") || sTitle.includes("altyazi")) extraInfo = "Türkçe Altyazılı";

                var targetUrl = searchResult.url;
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
                    // name alanına Film Adı (Detay - Site) formatında veri koyuyoruz
                    resolve([{
                        name: displayTitle + " (" + extraInfo + " - " + PROVIDER_NAME + ")",
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
    // ARAMA TEMİZLİĞİ: Savaş Makinası: İntikam -> savas makinasi intikam
    var cleanQuery = query.replace(/[^\w\sıişğüç]/gi, ' ').replace(/\s+/g, ' ').trim();
    var searchUrl = `${BASE_URL}/?s=` + encodeURIComponent(cleanQuery);
    
    return fetch(searchUrl, { headers: WORKING_HEADERS })
        .then(res => res.text())
        .then(html => {
            var $search = cheerio.load(html);
            var match = null;

            // En kapsamlı seçiciler
            $search("div.icerik div.frag-k, div.video-content, article").each(function() {
                var anchor = $search(this).find("div.yanac a, h2 a, a").first();
                var siteTitle = anchor.text();
                var cleanSiteTitle = siteTitle.toLowerCase().replace(/[^\w\sıişğüç]/gi, ' ').replace(/\s+/g, ' ').trim();
                
                // ESNEK KONTROL: Kelimeleri parçalayıp eşleştiriyoruz (War Machine için kesin çözüm)
                var qWords = cleanQuery.split(' ');
                var matchCount = 0;
                qWords.forEach(w => { if (w.length > 2 && cleanSiteTitle.includes(w)) matchCount++; });

                if (cleanSiteTitle.includes(cleanQuery) || cleanQuery.includes(cleanSiteTitle) || matchCount >= 2) {
                    match = { url: anchor.attr("href"), siteTitle: siteTitle };
                    return false;
                }
            });
            return match;
        });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
