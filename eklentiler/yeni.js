/**
 * Nuvio Local Scraper - SinemaCX (V5 - Kesin Eşleşme)
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
        
        // 1. TMDB Verisini Al
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var originalTitle = (data.title || data.name).toLowerCase().trim();
                
                // Arama sorgusunu yap
                return fetch('https://www.sinema.news/?s=' + encodeURIComponent(originalTitle), { headers: WORKING_HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) { return { html: html, targetTitle: originalTitle }; });
            })
            .then(function(obj) {
                var $ = cheerio.load(obj.html);
                var targetUrl = null;
                var results = $("div.icerik div.frag-k");

                // --- KRİTİK NOKTA: TAM EŞLEŞME KONTROLÜ ---
                results.each(function() {
                    var siteTitle = $(this).find("div.yanac a").text().toLowerCase().trim();
                    var searchTitle = obj.targetTitle;

                    // Eğer site başlığı TMDB başlığını TAM olarak içeriyorsa veya eşitse
                    // Örn: TMDB "Ölüler Ordusu" -> Site "Ölüler Ordusu izle" (Eşleşir)
                    // Örn: TMDB "Ölüler Ordusu" -> Site "Resident Evil: Ölümden Sonra" (Eşleşmez)
                    if (siteTitle.includes(searchTitle)) {
                        targetUrl = $(this).find("div.yanac a").attr("href");
                        return false; // Doğruyu bulduk, döngüyü kır.
                    }
                });

                if (!targetUrl) return resolve([]); // Eşleşme yoksa yanlış filme gitme, boş dön.

                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(html) {
                if (!html) return resolve([]);
                var $ = cheerio.load(html);
                var iframeRaw = $("iframe").first().attr("data-vsrc") || $("iframe").first().attr("src");

                if (!iframeRaw) return resolve([]);
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
                var subMatch = iframeSource.match(/playerjsSubtitle\s*[:=]\s*["']\[(.*?)\](https?:\/\/[^"'\s]+)["']/);

                // 1080p Kaynağı Çekme
                if (currentIframe.includes("player.filmizle.in")) {
                    var videoId = currentIframe.split("/").pop();
                    var apiUrl = "https://player.filmizle.in/player/index.php?data=" + videoId + "&do=getVideo";

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
                        }
                        // Embed her zaman ekle (Yedek)
                        streams.push({
                            name: "SinemaCX - Embed",
                            url: currentIframe,
                            quality: "720p",
                            headers: { 'Referer': 'https://www.sinema.news/' },
                            provider: "sinemacx"
                        });
                        resolve(streams);
                    }).catch(function() {
                        streams.push({ name: "SinemaCX - Embed", url: currentIframe, quality: "720p", headers: { 'Referer': 'https://www.sinema.news/' }, provider: "sinemacx" });
                        resolve(streams);
                    });
                } else {
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
            .catch(function() {
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
