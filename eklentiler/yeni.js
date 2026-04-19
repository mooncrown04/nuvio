/**
 * Nuvio Local Scraper - SinemaCX (V28 - Siteye Özel Kararlı Sürüm)
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
    // Logları hata değil bilgi (info) gibi basıyoruz ki karışmasın
    console.error(`[${PROVIDER_NAME}] Başlatıldı: ${tmdbId}`);

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

                // Siteye özel arama: Önce TR isim
                return searchOnSite(trTitle).then(function(res1) {
                    if (res1) return res1;
                    if (trTitle !== orgTitle) {
                        return searchOnSite(orgTitle);
                    }
                    return null;
                });
            })
            .then(function(result) {
                if (!result || !result.url) {
                    console.error(`[${PROVIDER_NAME}] Sonuç bulunamadı.`);
                    return resolve(EMPTY_RESULT);
                }

                // Sitedeki başlığa göre Dublaj/Altyazı tespiti
                var sTitle = result.siteTitle.toLowerCase();
                var detail = "1080p";
                if (sTitle.includes("dublaj")) detail = "Türkçe Dublaj";
                else if (sTitle.includes("altyazı") || sTitle.includes("altyazi")) detail = "Türkçe Altyazılı";

                var targetUrl = result.url;
                if (!isMovie) {
                    targetUrl = targetUrl.replace(/\/$/, "") + "-sezon-" + seasonNum + "-bolum-" + episodeNum;
                }

                console.error(`[${PROVIDER_NAME}] Eşleşme: ${result.siteTitle}`);

                return fetch(targetUrl, { headers: WORKING_HEADERS })
                    .then(res => res.text())
                    .then(html => {
                        var $page = cheerio.load(html);
                        var iframes = [];
                        $page("iframe").each(function() {
                            var s = $page(this).attr("data-vsrc") || $page(this).attr("src") || "";
                            if (s) iframes.push(s);
                        });

                        // Fragman sayfası kontrolü (V17 mantığı)
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
                                    name: displayTitle + " (" + detail + " - " + PROVIDER_NAME + ")",
                                    url: json.securedLink,
                                    quality: "1080p",
                                    headers: { 'Referer': 'https://player.filmizle.in/' }
                                }]);
                            } else { resolve(EMPTY_RESULT); }
                        });
                    });
            })
            .catch(err => {
                console.error(`[${PROVIDER_NAME}] Hata: ${err.message}`);
                resolve(EMPTY_RESULT);
            });
    });
}

function searchOnSite(query) {
    // Sitenin arama motoruna en uygun format: Noktalamasız temiz metin
    var cleanQuery = query.replace(/[:.,\-]/g, ' ').replace(/\s+/g, ' ').trim();
    var searchUrl = `${BASE_URL}/?s=` + encodeURIComponent(cleanQuery);
    
    return fetch(searchUrl, { headers: WORKING_HEADERS })
        .then(res => res.text())
        .then(html => {
            var $search = cheerio.load(html);
            var match = null;

            // Sitenin kendi kutucuk yapılarına (article, frag-k) odaklan
            $search("div.icerik div.frag-k, div.video-content, article, div.content").each(function() {
                var anchor = $search(this).find("a").first();
                var url = anchor.attr("href") || "";
                var title = anchor.text().toLowerCase().trim();

                // Feed linklerini ve boş başlıkları ele
                if (url && !url.includes("/feed/") && title.length > 1) {
                    var cleanSiteTitle = title.replace(/[:.,\-]/g, ' ').replace(/\s+/g, ' ').trim();
                    
                    // V17 tarzı esnek ama güvenli eşleşme
                    if (cleanSiteTitle.includes(cleanQuery) || cleanQuery.includes(cleanSiteTitle)) {
                        match = { url: url, siteTitle: anchor.text().trim() };
                        return false; 
                    }
                }
            });
            return match;
        });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
