/**
 * Provider: DDizi (v40 - Pure Engine)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var mainUrl = "https://www.ddizi.im";
    var userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. TMDB'den ismi al
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
        
        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var name = data.name || data.original_name || "";
            // 2. DDizi'de ara (POST)
            return fetch(mainUrl + "/arama/", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/x-www-form-urlencoded", 
                    "User-Agent": userAgent, 
                    "Referer": mainUrl 
                },
                body: "arama=" + encodeURIComponent(name)
            });
        }).then(function(res) { return res.text(); }).then(function(searchHtml) {
            if (!searchHtml) return null;

            // 3. Bölüm linkini yakala (Örn: "1-bolum" veya "1. Bolum")
            var episodePattern = new RegExp('href="([^"]*' + episodeNum + '-(?:bolum|Bölüm|bolum-izle)[^"]*)"', 'i');
            var match = searchHtml.match(episodePattern);
            if (!match) return null;

            var episodeUrl = match[1].indexOf('http') === 0 ? match[1] : mainUrl + (match[1][0] === '/' ? '' : '/') + match[1];
            return fetch(episodeUrl, { headers: { "User-Agent": userAgent, "Referer": mainUrl } });
        }).then(function(res) {
            if (res && res.status === 200) return res.text();
            return null;
        }).then(function(html) {
            if (!html) return null;

            // 4. Kotlin kodundaki og:video mantığı: Player URL'sini bul
            var ogVideo = html.match(/property="og:video" content="([^"]+)"/i);
            if (!ogVideo) return null;

            var playerUrl = ogVideo[1];
            return fetch(playerUrl, { headers: { "User-Agent": userAgent, "Referer": mainUrl } });
        }).then(function(res) {
            if (res && res.status === 200) return res.text();
            return null;
        }).then(function(playerHtml) {
            if (!playerHtml) return resolve([]);

            // 5. JWPlayer içindeki 'file:' linkini (m3u8 veya master.txt) çek
            var fileMatch = playerHtml.match(/file:\s*["']([^"']+)["']/i);
            if (fileMatch && fileMatch[1]) {
                var streamUrl = fileMatch[1];
                var isM3u8 = streamUrl.indexOf(".m3u8") !== -1 || streamUrl.indexOf("master.txt") !== -1;

                resolve([{
                    name: "DDizi - " + (isM3u8 ? "HLS" : "MP4"),
                    url: streamUrl,
                    quality: "1080p",
                    headers: {
                        "User-Agent": userAgent,
                        "Referer": mainUrl, // Kotlin kodundaki getHeaders(ogVideo) mantığı
                        "Origin": mainUrl
                    }
                }]);
            } else {
                resolve([]);
            }
        }).catch(function() {
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
