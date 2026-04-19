/**
 * Nuvio Local Scraper - SinemaCX (V3 - Stabilize Versiyon)
 * Arama doğrulaması ve Geçersiz İçerik hatası düzeltildi.
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
        
        // 1. TMDB Bilgilerini Al
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (mediaType === 'movie' ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.title || data.name;
                // Arama sorgusunu temizle (Örn: "Ölüler Ordusu: Hırsızlar" -> "Ölüler Ordusu")
                var cleanQuery = query.split(":")[0].split("-")[0].trim();
                
                return fetch('https://www.sinema.news/?s=' + encodeURIComponent(cleanQuery), { headers: WORKING_HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) { return { html: html, originalTitle: query }; });
            })
            .then(function(obj) {
                var $ = cheerio.load(obj.html);
                var targetUrl = null;
                var results = $("div.icerik div.frag-k");

                if (results.length === 0) return resolve([]);

                // Başlık Kontrolü: TMDB ismi ile site başlığını karşılaştır
                results.each(function() {
                    var foundTitle = $(this).find("div.yanac a").text().toLowerCase().trim();
                    var searchTitle = obj.originalTitle.toLowerCase().trim();
                    
                    if (foundTitle.includes(searchTitle) || searchTitle.includes(foundTitle)) {
                        targetUrl = $(this).find("div.yanac a").attr("href");
                        return false; 
                    }
                });

                // Eşleşme yoksa ilk sonucu dene
                if (!targetUrl) targetUrl = results.first().find("div.yanac a").attr("href");
                
                if (!targetUrl) return resolve([]);
                return fetch(targetUrl, { headers: WORKING_HEADERS });
            })
            .then(function(res) { return res ? res.text() : null; })
            .then(function(html) {
                if (!html) return resolve([]);
                
                var $ = cheerio.load(html);
                var iframeRaw = $("iframe").first().attr("data-vsrc") || $("iframe").first().attr("src");

                if (!iframeRaw) return resolve([]);
                var iframeLink = iframeRaw.split("?img=")[0];

                // Iframe içeriğine git (Video linkini ve altyazıyı çekmek için)
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

                var streams = [];
                var iframeSource = obj.content;
                var currentIframe = obj.link;

                // Altyazı Regex
                var subMatch = iframeSource.match(/playerjsSubtitle\s*[:=]\s*["']\[(.*?)\](https?:\/\/[^"'\s]+)["']/);
                var subLabel = subMatch ? subMatch[1] : "";

                if (currentIframe.includes("player.filmizle.in")) {
                    var videoId = currentIframe.split("/").pop();
                    var apiUrl = "https://player.filmizle.in/player/index.php?data=" + videoId + "&do=getVideo";

                    fetch(apiUrl, {
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
                                title: subLabel ? "Altyazı: " + subLabel : "Türkçe Dublaj",
                                url: json.securedLink,
                                quality: "1080p",
                                // Hata almamak için gerekli Header'lar
                                headers: { 
                                    'Referer': 'https://player.filmizle.in/',
                                    'User-Agent': WORKING_HEADERS['User-Agent']
                                },
                                provider: "sinemacx"
                            });
                        }
                        resolve(streams);
                    })
                    .catch(function() { resolve([]); });
                } else {
                    // Alternatif Player
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
                console.error('Hata:', err);
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
