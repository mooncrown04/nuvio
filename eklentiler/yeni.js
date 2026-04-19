/**
 * Nuvio Local Scraper - SinemaCX (V8 - Kesin Eşleşme & Debug Loglu)
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
        
        // 1. TMDB Verisini Al
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var originalTitle = (data.title || data.name).toLowerCase().trim();
                console.error("DEBUG: [TMDB] Aranan isim:", originalTitle);
                
                // Sitenin arama sayfasına git
                return fetch('https://www.sinema.news/?s=' + encodeURIComponent(originalTitle), { headers: WORKING_HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) { return { html: html, targetTitle: originalTitle }; });
            })
            .then(function(obj) {
                var $ = cheerio.load(obj.html);
                var targetUrl = null;
                var results = $("div.icerik div.frag-k");

                console.error("DEBUG: [ARAMA] Sitede bulunan toplam sonuç:", results.length);

                // --- NO Nokta Atışı Eşleşme Kontrolü ---
                results.each(function() {
                    var siteTitle = $(this).find("div.yanac a").text().toLowerCase().trim();
                    console.error("DEBUG: [KONTROL] İncelenen sonuç:", siteTitle);

                    if (siteTitle.includes(obj.targetTitle)) {
                        targetUrl = $(this).find("div.yanac a").attr("href");
                        console.error("DEBUG: [OK] Eşleşme BULUNDU:", siteTitle);
                        return false; 
                    }
                });

                // ÖNEMLİ: Eğer eşleşme yoksa ilk sonuca GİTME (Yanlış filmi önlemek için)
                if (!targetUrl) {
                    console.error("ERROR: [HATA] İsim eşleşmediği için işlem iptal edildi.");
                    return resolve([]); 
                }

                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(html) {
                if (!html) return resolve([]);
                var $ = cheerio.load(html);
                
                // Iframe Ayıkla
                var iframeLink = null;
                $("iframe").each(function() {
                    var src = $(this).attr("data-vsrc") || $(this).attr("src") || "";
                    if (src.includes("player.filmizle.in") || src.includes("/video/")) {
                        iframeLink = src.split("?img=")[0];
                        return false;
                    }
                });

                console.error("DEBUG: [IFRAME] Yakalanan URL:", iframeLink);

                if (!iframeLink) {
                    console.error("ERROR: [HATA] Video iframe'i bulunamadı.");
                    return resolve([]);
                }

                // Iframe içeriğine git
                return fetch(iframeLink, { 
                    headers: { 'Referer': 'https://www.sinema.news/' } 
                }).then(function(res) { 
                    return res.text().then(function(content) { 
                        return { content: content, link: iframeLink }; 
                    });
                });
            })
            .then(function(obj) {
                if (!obj) return resolve([]);

                var currentIframe = obj.link;

                // Eğer kaynak player.filmizle.in ise getVideo API'sini kullan
                if (currentIframe.includes("player.filmizle.in")) {
                    var videoId = currentIframe.split("/").pop();
                    var apiUrl = "https://player.filmizle.in/player/index.php?data=" + videoId + "&do=getVideo";
                    
                    console.error("DEBUG: [API] İstek yapılıyor:", apiUrl);

                    return fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'Referer': currentIframe,
                            'User-Agent': WORKING_HEADERS['User-Agent'],
                            'Content-Type': 'application/x-www-form-urlencoded'
                        }
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(json) {
                        if (json && json.securedLink) {
                            console.error("DEBUG: [URL] M3U8 Link Yakalandı:", json.securedLink);
                            streams.push({
                                name: "SinemaCX - 1080p",
                                url: json.securedLink,
                                quality: "1080p",
                                headers: { 
                                    'Referer': 'https://player.filmizle.in/',
                                    'Origin': 'https://player.filmizle.in',
                                    'User-Agent': WORKING_HEADERS['User-Agent']
                                },
                                provider: "sinemacx"
                            });
                        } else {
                            console.error("ERROR: [API] securedLink boş döndü.");
                        }
                        
                        // Embed her zaman yedek olarak çıksın
                        streams.push({
                            name: "SinemaCX - Embed (Yedek)",
                            url: currentIframe,
                            quality: "720p",
                            headers: { 'Referer': 'https://www.sinema.news/' },
                            provider: "sinemacx"
                        });
                        resolve(streams);
                    }).catch(function(e) {
                        console.error("ERROR: [API] Hata oluştu:", e);
                        resolve([]);
                    });
                } else {
                    console.error("DEBUG: [EMBED] Direkt embed ekleniyor.");
                    streams.push({
                        name: "SinemaCX - Embed",
                        url: currentIframe,
                        quality: "720p",
                        headers: { 'Referer': 'https://www.sinema.news/' },
                        provider: "sinemacx"
                    });
                    resolve(streams);
                }
            })
            .catch(function(err) {
                console.error("FATAL ERROR:", err);
                resolve([]);
            });
    });
}

// Module Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
