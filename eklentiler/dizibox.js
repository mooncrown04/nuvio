/**
 * Provider: Hybrid (v38 - ExoPlayer Header Fix)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // TMDB üzerinden dizi ismini al ve sitelerde ara
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
        
        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var name = data.name || data.original_name || "";
            // Dizipal arama motoruna git
            return fetch("https://dizipal.bar/?s=" + encodeURIComponent(name), { headers: { "User-Agent": userAgent } });
        }).then(function(res) { return res.text(); }).then(function(html) {
            // Loglarındaki 'paradise-1-sezon-1-bolum-izle' linkini yakalama
            var linkMatch = html.match(new RegExp('href="(https://dizipal\\.bar/bolum/[^"]*' + seasonNum + '-sezon-' + episodeNum + '-bolum[^"]*)"', 'i'));
            if (!linkMatch) return null;
            return fetch(linkMatch[1], { headers: { "User-Agent": userAgent } });
        }).then(function(res) { return res.text(); }).then(function(pageHtml) {
            // Embed URL'sini (x.ag2m4.cfd) yakala
            var embedMatch = pageHtml.match(/iframe[^>]*src="([^"]+)"/i);
            if (!embedMatch) return null;
            var embedUrl = embedMatch[1];
            return fetch(embedUrl, { headers: { "User-Agent": userAgent, "Referer": "https://dizipal.bar/" } });
        }).then(function(res) { return res.text(); }).then(function(embedHtml) {
            // Master.m3u8 linkini ve player başlıklarını ayıkla
            var m3u8Match = embedHtml.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/i);
            if (!m3u8Match) return resolve([]);

            var videoUrl = m3u8Match[1];
            
            // --- KRİTİK NOKTA: ExoPlayer'a 403 Yedirmeme ---
            resolve([{
                name: "Dizipal - HLS",
                url: videoUrl,
                quality: "1080p",
                headers: {
                    "User-Agent": userAgent,
                    "Referer": "https://x.ag2m4.cfd/", // Sunucunun beklediği anahtar
                    "Origin": "https://x.ag2m4.cfd",
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
