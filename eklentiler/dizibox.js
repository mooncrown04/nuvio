/**
 * Provider: DDizi (v34 - Precise Linker)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var mainUrl = "https://www.ddizi.im";
    var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var name = data.name || data.original_name || "";
            if (!name) return resolve([]);

            // Arama sorgusunu gönder
            var searchData = "arama=" + encodeURIComponent(name);
            return fetch(mainUrl + "/arama/", {
                method: "POST",
                headers: { 
                    "Content-Type": "application/x-www-form-urlencoded",
                    "User-Agent": "Mozilla/5.0",
                    "Referer": mainUrl 
                },
                body: searchData
            });
        }).then(function(res) { return res.text(); }).then(function(searchHtml) {
            if (!searchHtml) return null;

            // --- GELİŞMİŞ LİNK YAKALAMA ---
            // Bölüm numarasını farklı formatlarda arıyoruz (Örn: "1.Bölüm", "1-bolum", "1. Bölüm")
            var patterns = [
                new RegExp('href="([^"]*[^/]*' + episodeNum + '[\\.-]bolum[^"]*)"', 'i'),
                new RegExp('href="([^"]*izle/[^"]*' + episodeNum + '[^"]*)"', 'i')
            ];

            var targetUrl = "";
            for (var i = 0; i < patterns.length; i++) {
                var match = searchHtml.match(patterns[i]);
                if (match && match[1] && match[1].indexOf('javascript') === -1) {
                    targetUrl = match[1].trim();
                    break;
                }
            }

            if (targetUrl) {
                if (targetUrl.indexOf('http') !== 0) targetUrl = mainUrl + (targetUrl.indexOf('/') === 0 ? "" : "/") + targetUrl;
                // Bölüm sayfasına git
                return fetch(targetUrl, { headers: { "Referer": mainUrl } });
            }
            return null;
        }).then(function(res) {
            if (res && res.status === 200) return res.text();
            return null;
        }).then(function(html) {
            if (!html) return resolve([]);

            var streams = [];
            // Video Etiketlerini Taramak (iframe ve og:video)
            var videoRegex = /property="og:video" content="([^"]+)"/i;
            var iframeRegex = /<iframe[^>]*src="([^"]+)"/i;

            var videoMatch = html.match(videoRegex);
            var iframeMatch = html.match(iframeRegex);

            if (videoMatch && videoMatch[1]) {
                streams.push({
                    name: "DDizi - Player",
                    url: videoMatch[1].trim(),
                    quality: "1080p"
                });
            }

            if (iframeMatch && iframeMatch[1] && iframeMatch[1].indexOf('youtube') === -1) {
                var iUrl = iframeMatch[1].trim();
                if (iUrl.indexOf('//') === 0) iUrl = 'https:' + iUrl;
                streams.push({ name: "DDizi - Alternatif", url: iUrl, quality: "720p" });
            }

            resolve(streams);
        }).catch(function() {
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
