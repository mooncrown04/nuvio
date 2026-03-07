/**
 * Provider: Hybrid (v39 - HLS Global Header Fix)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36";

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';
        
        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var name = data.name || data.original_name || "";
            // Dizipal Arama
            return fetch("https://dizipal.bar/?s=" + encodeURIComponent(name), { headers: { "User-Agent": userAgent } });
        }).then(function(res) { return res.text(); }).then(function(html) {
            // Bölüm Sayfası Bulma
            var linkMatch = html.match(new RegExp('href="(https://dizipal\\.bar/bolum/[^"]*' + seasonNum + '-sezon-' + episodeNum + '-bolum[^"]*)"', 'i'));
            if (!linkMatch) return null;
            return fetch(linkMatch[1], { headers: { "User-Agent": userAgent } });
        }).then(function(res) { return res.text(); }).then(function(pageHtml) {
            // Embed/Iframe Sayfası
            var embedMatch = pageHtml.match(/iframe[^>]*src="([^"]+)"/i);
            if (!embedMatch) return null;
            var embedUrl = embedMatch[1];
            if (embedUrl.indexOf('//') === 0) embedUrl = 'https:' + embedUrl;
            
            return fetch(embedUrl, { headers: { "User-Agent": userAgent, "Referer": "https://dizipal.bar/" } });
        }).then(function(res) { return res.text(); }).then(function(embedHtml) {
            // HLS (.m3u8) Linkini Çekme
            var m3u8Match = embedHtml.match(/file:\s*["']([^"']+\.m3u8[^"']*)["']/i);
            if (!m3u8Match) return resolve([]);

            var videoUrl = m3u8Match[1];
            
            // Loglarında gördüğümüz referer: x.ag2m4.cfd
            var domainMatch = videoUrl.match(/https?:\/\/([^\/]+)/);
            var domain = domainMatch ? domainMatch[0] : "";

            // --- EKSTRA GÜVENLİK: Alt Segmentler İçin Header Enjeksiyonu ---
            resolve([{
                name: "Dizipal - HLS (High)",
                url: videoUrl,
                quality: "1080p",
                isM3u8: true,
                headers: {
                    "User-Agent": userAgent,
                    "Referer": "https://x.ag2m4.cfd/",
                    "Origin": "https://x.ag2m4.cfd",
                    "Accept": "*/*",
                    "Connection": "keep-alive"
                }
            }]);
        }).catch(function() {
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
