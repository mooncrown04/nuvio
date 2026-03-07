/**
 * Provider: DDizi (v29 - Search & Extract)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var mainUrl = "https://www.ddizi.im";
    var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        // 1. ADIM: TMDB'den dizi adını al
        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var name = data.name || data.original_name || "";
            if (!name) return resolve([]);

            // 2. ADIM: DDizi'de gerçek bir arama yap (POST)
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
            // 3. ADIM: Arama sonuçlarından doğru sezon/bölüm linkini yakala
            // Örn: arafta-68-bolum-izle
            var searchPattern = new RegExp('href="([^"]*' + seasonNum + '-sezon-' + episodeNum + '-bolum[^"]*)"', 'i');
            var match = searchHtml.match(searchPattern);
            
            // Eğer sezon/bölüm spesifik link yoksa, genel bölüm linkini ara
            if (!match) {
                var altPattern = new RegExp('href="([^"]*' + episodeNum + '-bolum-izle[^"]*)"', 'i');
                match = searchHtml.match(altPattern);
            }

            if (match && match[1]) {
                var targetUrl = match[1].indexOf('http') === 0 ? match[1] : mainUrl + match[1];
                return fetch(targetUrl, { headers: { "Referer": mainUrl } });
            }
            return null;
        }).then(function(res) {
            if (res && res.status === 200) return res.text();
            return null;
        }).then(function(html) {
            if (!html) return resolve([]);

            var streams = [];
            // 4. ADIM: Video Kaynaklarını Ayıkla
            var ogMatch = html.match(/property="og:video" content="([^"]+)"/i);
            var iframeMatch = html.match(/iframe[^>]*src="([^"]+)"/i);

            if (ogMatch && ogMatch[1]) {
                streams.push({ name: "DDizi - Ana", url: ogMatch[1], quality: "1080p" });
            }
            if (iframeMatch && iframeMatch[1] && iframeMatch[1].indexOf('youtube') === -1) {
                var iUrl = iframeMatch[1].indexOf('//') === 0 ? 'https:' + iframeMatch[1] : iframeMatch[1];
                streams.push({ name: "DDizi - Kaynak 2", url: iUrl, quality: "720p" });
            }

            resolve(streams);
        }).catch(function() {
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
globalThis.getStreams = getStreams;
