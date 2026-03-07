/**
 * Provider: DDizi (v41 - Referer Bypass)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var mainUrl = "https://www.ddizi.im";
    var userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
        
        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var name = data.name || data.original_name || "";
            return fetch(mainUrl + "/arama/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": userAgent, "Referer": mainUrl },
                body: "arama=" + encodeURIComponent(name)
            });
        }).then(function(res) { return res.text(); }).then(function(searchHtml) {
            // Logundaki gibi "sahtekarlar-21-bolum-izle" tarzı linkleri yakala
            var regex = new RegExp('href="([^"]*' + episodeNum + '-(?:bolum|Bölüm)[^"]*)"', 'i');
            var match = searchHtml.match(regex);
            if (!match) return null;

            var epUrl = match[1].indexOf('http') === 0 ? match[1] : mainUrl + (match[1][0] === '/' ? '' : '/') + match[1];
            return fetch(epUrl, { headers: { "User-Agent": userAgent, "Referer": mainUrl } });
        }).then(function(res) { return res.text(); }).then(function(html) {
            if (!html) return null;

            // Logunda gördüğümüz /player/oynat/ linkini bul
            var playerMatch = html.match(/\/player\/oynat\/[a-z0-9]+/i);
            if (!playerMatch) return null;

            var playerUrl = mainUrl + playerMatch[0];
            return fetch(playerUrl, { headers: { "User-Agent": userAgent, "Referer": mainUrl } });
        }).then(function(res) { return res.text(); }).then(function(playerHtml) {
            if (!playerHtml) return resolve([]);

            // JWPlayer kaynak linkini bul (m3u8 veya mp4)
            var fileMatch = playerHtml.match(/file:\s*["']([^"']+)["']/i);
            if (!fileMatch) return resolve([]);

            var videoUrl = fileMatch[1];
            
            // --- KRİTİK: 403 HATASINI ÖNLEYEN HEADERS ---
            resolve([{
                name: "DDizi - High Quality",
                url: videoUrl,
                quality: "1080p",
                headers: {
                    "User-Agent": userAgent,
                    "Referer": mainUrl + "/", // Ana site referer olmalı
                    "Origin": mainUrl,
                    "Accept": "*/*"
                }
            }]);
        }).catch(function() {
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
