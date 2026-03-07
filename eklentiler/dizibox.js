/**
 * Provider: DDizi (v44 - Debug Mode & Aggressive Headers)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var mainUrl = "https://www.ddizi.im";
    var userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

    console.log("--- DDizi Debug Start ---");

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
        
        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var name = data.name || data.original_name || "";
            console.log("Searching for: " + name);
            return fetch(mainUrl + "/arama/", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": userAgent, "Referer": mainUrl },
                body: "arama=" + encodeURIComponent(name)
            });
        }).then(function(res) { return res.text(); }).then(function(searchHtml) {
            var regex = new RegExp('href="([^"]*' + episodeNum + '-(?:bolum|Bölüm)[^"]*)"', 'i');
            var match = searchHtml.match(regex);
            if (!match) { console.log("Episode not found in search"); return null; }

            var epUrl = match[1].indexOf('http') === 0 ? match[1] : mainUrl + (match[1][0] === '/' ? '' : '/') + match[1];
            console.log("Episode Page: " + epUrl);
            return fetch(epUrl, { headers: { "User-Agent": userAgent, "Referer": mainUrl } });
        }).then(function(res) { return res.text(); }).then(function(html) {
            if (!html) return null;
            var playerMatch = html.match(/\/player\/oynat\/[a-z0-9]+/i);
            if (!playerMatch) { console.log("Player ID not found"); return null; }

            var playerUrl = mainUrl + playerMatch[0];
            console.log("Fetching Player: " + playerUrl);
            return fetch(playerUrl, { headers: { "User-Agent": userAgent, "Referer": mainUrl } });
        }).then(function(res) {
            var finalPlayerUrl = res.url;
            return res.text().then(function(playerHtml) {
                return { html: playerHtml, url: finalPlayerUrl };
            });
        }).then(function(result) {
            if (!result || !result.html) return resolve([]);

            var fileMatch = result.html.match(/file:\s*["']([^"']+)["']/i);
            if (!fileMatch) { console.log("Video source (file:) not found in player html"); return resolve([]); }

            var videoUrl = fileMatch[1];
            console.log("CRITICAL - Found Video URL: " + videoUrl);
            console.log("Using Referer: " + result.url);

            resolve([{
                name: "DDizi (v44 - Debug)",
                url: videoUrl,
                quality: "1080p",
                headers: {
                    "User-Agent": userAgent,
                    "Referer": result.url,
                    "Origin": mainUrl,
                    "Accept": "*/*",
                    "Range": "bytes=0-", // Bazı sunucular partial content için bunu zorunlu tutar
                    "X-Requested-With": "XMLHttpRequest" // Bot olmadığımızı kanıtlamak için
                }
            }]);
        }).catch(function(err) {
            console.log("Error in DDizi: " + err);
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
