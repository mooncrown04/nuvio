/**
 * Nuvio Local Scraper - SinemaCX (V6 - Hata Loglama & Derin Arama)
 */

var cheerio = require("cheerio-without-node-native");

const WORKING_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': 'https://www.sinema.news/',
    'Origin': 'https://www.sinema.news'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var streams = [];
        
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var originalTitle = (data.title || data.name);
                console.error("DEBUG: TMDB'den gelen isim:", originalTitle);

                // Savaş Makinası -> savas makinası (Aramayı kolaylaştır)
                var searchQuery = originalTitle.toLowerCase().trim();
                
                return fetch('https://www.sinema.news/?s=' + encodeURIComponent(searchQuery), { headers: WORKING_HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) { return { html: html, targetTitle: searchQuery }; });
            })
            .then(function(obj) {
                var $ = cheerio.load(obj.html);
                var targetUrl = null;
                var results = $("div.icerik div.frag-k");

                console.error("DEBUG: Sitede bulunan sonuç sayısı:", results.length);

                results.each(function() {
                    var siteTitle = $(this).find("div.yanac a").text().toLowerCase().trim();
                    console.error("DEBUG: Sitedeki sonuç inceleniyor:", siteTitle);

                    if (siteTitle.includes(obj.targetTitle) || obj.targetTitle.includes(siteTitle)) {
                        targetUrl = $(this).find("div.yanac a").attr("href");
                        console.error("DEBUG: Eşleşme BULUNDU:", targetUrl);
                        return false; 
                    }
                });

                if (!targetUrl) {
                    console.error("DEBUG: Eşleşme bulunamadı, ilk sonuca bakılıyor...");
                    targetUrl = results.first().find("div.yanac a").attr("href");
                }
                
                if (!targetUrl) {
                    console.error("ERROR: Sitede hiçbir link bulunamadı.");
                    return resolve([]);
                }

                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(html) {
                if (!html) return resolve([]);
                var $ = cheerio.load(html);
                
                var iframeRaw = $("iframe").first().attr("data-vsrc") || $("iframe").first().attr("src");
                console.error("DEBUG: Sayfadaki Iframe Linki:", iframeRaw);

                if (!iframeRaw) {
                    console.error("ERROR: Iframe bulunamadı.");
                    return resolve([]);
                }
                var iframeLink = iframeRaw.split("?img=")[0];

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

                var iframeSource = obj.content;
                var currentIframe = obj.link;
                console.error("DEBUG: Iframe içindeki URL:", currentIframe);

                // 1. Kaynak: player.filmizle.in
                if (currentIframe.includes("player.filmizle.in")) {
                    var videoId = currentIframe.split("/").pop();
                    var apiUrl = "https://player.filmizle.in/player/index.php?data=" + videoId + "&do=getVideo";
                    
                    console.error("DEBUG: Video API isteği yapılıyor:", apiUrl);

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
                            console.error("DEBUG: 1080p Link Yakalandı:", json.securedLink);
                            streams.push({
                                name: "SinemaCX - 1080p",
                                url: json.securedLink,
                                quality: "1080p",
                                headers: { 
                                    'Referer': 'https://player.filmizle.in/',
                                    'User-Agent': WORKING_HEADERS['User-Agent']
                                },
                                provider: "sinemacx"
                            });
                        } else {
                            console.error("ERROR: securedLink boş döndü! JSON:", JSON.stringify(json));
                        }

                        // Her durumda Embed'i de ekle
                        streams.push({
                            name: "SinemaCX - Embed",
                            url: currentIframe,
                            quality: "720p",
                            headers: { 'Referer': 'https://www.sinema.news/' },
                            provider: "sinemacx"
                        });
                        resolve(streams);
                    }).catch(function(e) {
                        console.error("ERROR: API İsteği Başarısız:", e);
                        streams.push({ name: "SinemaCX - Embed (Yedek)", url: currentIframe, quality: "720p", headers: { 'Referer': 'https://www.sinema.news/' }, provider: "sinemacx" });
                        resolve(streams);
                    });
                } else {
                    console.error("DEBUG: player.filmizle.in değil, direkt embed ekleniyor.");
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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
