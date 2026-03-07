/**
 * Provider: DDizi (v36 - Kotlin Logic Port)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var mainUrl = "https://www.ddizi.im";
    var userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. Dizi ismini al
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
        
        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var name = data.name || data.original_name || "";
            // 2. Arama yap (POST)
            return fetch(mainUrl + "/arama/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": userAgent, "Referer": mainUrl },
                body: "arama=" + encodeURIComponent(name)
            });
        }).then(function(res) { return res.text(); }).then(function(searchHtml) {
            // 3. Bölüm linkini bul (Kotlin parseTitle mantığıyla)
            var linkMatch = searchHtml.match(new RegExp('href="([^"]*' + episodeNum + '-(?:bolum|Bölüm)[^"]*)"', 'i'));
            if (!linkMatch) return null;

            var episodeUrl = linkMatch[1].indexOf('http') === 0 ? linkMatch[1] : mainUrl + (linkMatch[1][0] === '/' ? '' : '/') + linkMatch[1];
            return fetch(episodeUrl, { headers: { "User-Agent": userAgent, "Referer": mainUrl } });
        }).then(function(res) {
            if (res && res.status === 200) return res.text();
            return null;
        }).then(function(html) {
            if (!html) return null;

            // 4. og:video üzerinden Player URL'sini al (Kotlin loadLinks mantığı)
            var ogVideoMatch = html.match(/property="og:video" content="([^"]+)"/i);
            if (!ogVideoMatch) return null;

            var playerUrl = ogVideoMatch[1];
            return fetch(playerUrl, { headers: { "User-Agent": userAgent, "Referer": mainUrl } });
        }).then(function(res) {
            if (res && res.status === 200) return res.text();
            return null;
        }).then(function(playerHtml) {
            if (!playerHtml) return resolve([]);

            var streams = [];
            
            // 5. JWPlayer kaynaklarını ayıkla (sources: [{ file: "..." }])
            var fileMatch = playerHtml.match(/file:\s*["']([^"']+)["']/i);
            if (fileMatch && fileMatch[1]) {
                var streamUrl = fileMatch[1];
                
                // master.txt gelirse m3u8 olarak işaretle
                var isM3u8 = streamUrl.indexOf(".m3u8") !== -1 || streamUrl.indexOf("master.txt") !== -1;

                streams.push({
                    name: "DDizi - " + (isM3u8 ? "HLS" : "Direct"),
                    url: streamUrl,
                    quality: "1080p",
                    headers: {
                        "User-Agent": userAgent,
                        "Referer": mainUrl,
                        "Origin": mainUrl
                    }
                });
            }

            resolve(streams);
        }).catch(function(e) {
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
