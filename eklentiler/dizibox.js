/**
 * Provider: DDizi (v30 - URL & Search Fix)
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var mainUrl = "https://www.ddizi.im";
    var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        fetch(tmdbUrl).then(function(res) { return res.json(); }).then(function(data) {
            var name = data.name || data.original_name || "";
            // Sadece ilk kelimeyi al (Arama başarısını artırmak için)
            var shortName = name.split(' ')[0]; 

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

            // Bölüm linkini bulma (Hem sezonlu hem sezonsuz kontrol)
            var patterns = [
                new RegExp('href="([^"]*' + seasonNum + '-sezon-' + episodeNum + '-bolum[^"]*)"', 'i'),
                new RegExp('href="([^"]*' + episodeNum + '-bolum-izle[^"]*)"', 'i')
            ];

            var match = null;
            for (var i = 0; i < patterns.length; i++) {
                match = searchHtml.match(patterns[i]);
                if (match) break;
            }

            if (match && match[1]) {
                var targetUrl = match[1].trim(); // Boşlukları temizle (Malformed URL Fix)
                if (targetUrl.indexOf('http') !== 0) targetUrl = mainUrl + targetUrl;
                return fetch(targetUrl, { headers: { "Referer": mainUrl } });
            }
            return null;
        }).then(function(res) {
            if (res && res.status === 200) return res.text();
            return null;
        }).then(function(html) {
            if (!html) return resolve([]);

            var streams = [];
            var ogMatch = html.match(/property="og:video" content="([^"]+)"/i);
            var iframeMatch = html.match(/iframe[^>]*src="([^"]+)"/i);

            // Linkleri eklerken mutlaka trim() ve protokol kontrolü yapıyoruz
            if (ogMatch && ogMatch[1]) {
                var streamUrl = ogMatch[1].trim();
                streams.push({ name: "DDizi - Ana", url: streamUrl, quality: "1080p" });
            }

            if (iframeMatch && iframeMatch[1] && iframeMatch[1].indexOf('youtube') === -1) {
                var iUrl = iframeMatch[1].trim();
                if (iUrl.indexOf('//') === 0) iUrl = 'https:' + iUrl;
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
