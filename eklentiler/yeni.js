/**
 * Nuvio Local Scraper - SinemaCX (V10 - Türkçe Karakter & Regex Destekli)
 */

var cheerio = require("cheerio-without-node-native");

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Connection': 'keep-alive'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var streams = [];
        var subtitles = [];
        
        // 1. TMDB Bilgisi (Türkçe dil desteğiyle)
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                // Türkçe karakterleri korumak için ismi normalize ediyoruz
                var originalTitle = (data.title || data.name).toLowerCase().trim();
                console.error("DEBUG: [TMDB] Aranan Başlık:", originalTitle);
                
                // encodeURIComponent ile Türkçe karakterli aramayı güvenli hale getiriyoruz
                return fetch('https://www.sinema.news/?s=' + encodeURIComponent(originalTitle), { headers: WORKING_HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) { return { html: html, targetTitle: originalTitle }; });
            })
            .then(function(obj) {
                var $ = cheerio.load(obj.html);
                var targetUrl = null;
                var results = $("div.icerik div.frag-k");

                // 2. Hassas Eşleşme Kontrolü
                results.each(function() {
                    var siteTitle = $(this).find("div.yanac a").text().toLowerCase().trim();
                    if (siteTitle.includes(obj.targetTitle)) {
                        targetUrl = $(this).find("div.yanac a").attr("href");
                        console.error("DEBUG: [MATCH] Doğru içerik:", siteTitle);
                        return false; 
                    }
                });

                if (!targetUrl) {
                    console.error("ERROR: Eşleşme bulunamadı.");
                    return resolve([]);
                }

                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(html) {
                if (!html) return resolve([]);
                var $ = cheerio.load(html);
                
                // 3. Fragman/Film Sayfası Ayrımı (Kotlin örneğindeki gibi)
                var iframes = [];
                $("iframe").each(function() {
                    var src = $(this).attr("data-vsrc") || $(this).attr("src") || "";
                    if (src) iframes.push(src);
                });

                var isTrailerOnly = iframes.every(function(s) {
                    return s.includes("youtube") || s.includes("fragman") || s.includes("trailer");
                });

                if (isTrailerOnly) {
                    console.error("DEBUG: Sadece fragman var, film sayfasına (/2/) geçiliyor...");
                    var currentUrl = $("link[rel='canonical']").attr("href") || ""; 
                    var altUrl = currentUrl.endsWith("/") ? currentUrl + "2/" : currentUrl + "/2/";
                    return fetch(altUrl, { headers: WORKING_HEADERS }).then(function(r) { return r.text(); });
                }
                return html;
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                var iframeLink = null;

                $("iframe").each(function() {
                    var src = $(this).attr("data-vsrc") || $(this).attr("src") || "";
                    if (src.includes("player.filmizle.in") || src.includes("/video/")) {
                        iframeLink = src.split("?img=")[0];
                        return false;
                    }
                });

                if (!iframeLink) return resolve([]);

                // 4. Iframe İçeriği ve Altyazı Ayıklama (Regex)
                return fetch(iframeLink, { headers: { 'Referer': 'https://www.sinema.news/' } })
                    .then(function(res) { return res.text(); })
                    .then(function(iframeSource) {
                        
                        // Altyazı Regex (Paylaştığın örneğe göre uyumlu)
                        var subRegex = /\[(.*?)\](https?:\/\/[^\s",]+)/g;
                        var match;
                        while ((match = subRegex.exec(iframeSource)) !== null) {
                            subtitles.push({
                                lang: match[1],
                                url: match[2]
                            });
                        }

                        if (iframeLink.includes("player.filmizle.in")) {
                            var videoId = iframeLink.split("/").pop();
                            var apiUrl = "https://player.filmizle.in/player/index.php?data=" + videoId + "&do=getVideo";

                            return fetch(apiUrl, {
                                method: 'POST',
                                headers: {
                                    'X-Requested-With': 'XMLHttpRequest', // Bot koruması için kritik
                                    'Referer': iframeLink,
                                    'User-Agent': WORKING_HEADERS['User-Agent'],
                                    'Content-Type': 'application/x-www-form-urlencoded'
                                }
                            })
                            .then(function(res) { return res.json(); })
                            .then(function(json) {
                                if (json && json.securedLink) {
                                    console.error("DEBUG: [OK] Stream yakalandı.");
                                    streams.push({
                                        name: "SinemaCX - 1080p",
                                        url: json.securedLink,
                                        quality: "1080p",
                                        subtitles: subtitles,
                                        headers: { 
                                            'Referer': 'https://player.filmizle.in/',
                                            'Origin': 'https://player.filmizle.in',
                                            'User-Agent': WORKING_HEADERS['User-Agent']
                                        }
                                    });
                                }
                                resolve(streams);
                            });
                        } else {
                            streams.push({
                                name: "SinemaCX - Embed",
                                url: iframeLink,
                                quality: "720p",
                                subtitles: subtitles,
                                headers: { 'Referer': 'https://www.sinema.news/' }
                            });
                            resolve(streams);
                        }
                    });
            })
            .catch(function(err) {
                console.error("FATAL ERROR:", err);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
