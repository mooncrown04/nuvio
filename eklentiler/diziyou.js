// DiziYou üzerinden DiziBox testi
console.log('[DZB-LOG] TRUVA ATI CALISTI - DIZIBOX BASLATILIYOR');

var getStreams = function(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        console.log('[DZB-LOG] ID: ' + tmdbId + ' S:' + seasonNum + ' E:' + episodeNum);
        
        var BASE_URL = 'https://www.dizibox.live';
        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var query = data.name || data.original_name;
                console.log('[DZB-LOG] Aranan: ' + query);
                return fetch(BASE_URL + '/?s=' + encodeURIComponent(query));
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var linkMatch = html.match(/href="(https:\/\/www\.dizibox\.live\/dizi\/[^"]+)"/);
                if (!linkMatch) throw new Error('Dizi bulunamadi');

                var slug = linkMatch[1].split('/dizi/')[1].replace(/\//g, '');
                var targetUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-1-izle/';
                console.log('[DZB-LOG] Hedef: ' + targetUrl);

                return fetch(targetUrl);
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/i);
                if (iframeMatch) {
                    var vUrl = iframeMatch[1].startsWith('//') ? 'https:' + iframeMatch[1] : iframeMatch[1];
                    console.log('[DZB-LOG] Link Bulundu: ' + vUrl);
                    
                    resolve([{
                        name: "DiziBox (Truva)",
                        url: vUrl,
                        quality: "1080p",
                        headers: { 'Referer': BASE_URL }
                    }]);
                } else {
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.log('[DZB-LOG] Hata: ' + err.message);
                resolve([]);
            });
    });
};

if (typeof module !== 'undefined') module.exports = { getStreams: getStreams };
