/**
 * Nuvio Local Scraper - SinemaCX (Gelişmiş & Doğrulamalı Versiyon)
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
                // Arama yaparken başlığı saklıyoruz ki aşağıda karşılaştıralım
                return fetch('https://www.sinema.news/?s=' + encodeURIComponent(query), { headers: WORKING_HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) { return { html: html, originalTitle: query }; });
            })
            .then(function(obj) {
                var $ = cheerio.load(obj.html);
                var targetUrl = null;
                
                // --- İyileştirilmiş Arama Mantığı ---
                // Sadece ilk linki almak yerine, başlıkları kontrol et
                $("div.icerik div.frag-k").each(function() {
                    var foundTitle = $(this).find("div.yanac a").text().toLowerCase();
                    var searchTitle = obj.originalTitle.toLowerCase();
                    
                    // Eğer bulunan başlık, aranan başlığı içeriyorsa onu seç
                    if (foundTitle.includes(searchTitle) || searchTitle.includes(foundTitle)) {
                        targetUrl = $(this).find("div.yanac a").attr("href");
                        return false; // Döngüden çık
                    }
                });

                // Eğer eşleşme bulamazsa yine de ilk sonucu dene (veya resolve([]) yapabilirsin)
                if (!targetUrl) targetUrl = $("div.icerik div.frag-k div.yanac a").first().attr("href");
                
                if (!targetUrl) return resolve([]);

                // 2. Film Sayfasına Git
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

                var streams = [];
                var iframeSource = obj.content;
                var currentIframe = obj.link;

                var subMatch = iframeSource.match(/playerjsSubtitle\s*=\s*"\[(.*?)\](https?:\/\/[^"\s]+)"/);
                var subtitleInfo = subMatch ? (subMatch[1] + ": " + subMatch[2]) : "Yok";

                if (currentIframe.includes("player.filmizle.in")) {
                    var videoId = currentIframe.split("/").pop();
                    var apiUrl = "https://player.filmizle.in/player/index.php?data=" + videoId + "&do=getVideo";

                    fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'X-Requested-With': 'XMLHttpRequest',
                            'Referer': currentIframe,
                            'User-Agent': WORKING_HEADERS['User-Agent']
                        }
                    })
                    .then(function(res) { return res.json(); })
                    .then(function(json) {
                        if (json.securedLink) {
                            streams.push({
                                name: "SinemaCX - " + (subMatch ? "Altyazılı" : "Türkçe"),
                                title: "Altyazı: " + subtitleInfo,
                                url: json.securedLink,
                                quality: "1080p",
                                headers: { 'Referer': 'https://player.filmizle.in/' },
                                provider: "sinemacx"
                            });
                        }
                        resolve(streams);
                    })
                    .catch(function() { resolve([]); });
                } else {
                    streams.push({
                        name: "SinemaCX - Embed",
                        title: "Video",
                        url: currentIframe,
                        quality: "720p",
                        headers: WORKING_HEADERS,
                        provider: "sinemacx"
                    });
                    resolve(streams);
                }
            })
            .catch(function(err) {
                console.error('Sistem Hatası:', err);
                resolve([]);
            });
    });
}
