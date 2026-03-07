var BASE_URL = 'https://dizilla.com';  // DiziBox yerine

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': BASE_URL + '/'
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        fetch('https://api.themoviedb.org/3/tv/' + tmdbId + 
              '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR')
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.name || '';
                var slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                
                // Dizilla URL formatı (değişebilir)
                var epUrl = BASE_URL + '/dizi/' + slug + '/' + seasonNum + '-sezon/' + episodeNum + '-bolum/';
                
                return fetch(epUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // iframe veya video ID ara
                var iframeMatch = html.match(/iframe[^>]+src="([^"]+)"/i);
                var videoMatch = html.match(/video[^>]+src="([^"]+\.m3u8[^"]*)"/i);
                
                if (videoMatch) {
                    resolve([{
                        name: '⌜ DiziKaynak ⌟ | HD',
                        url: videoMatch[1],
                        headers: { 'Referer': BASE_URL + '/' }
                    }]);
                } else if (iframeMatch) {
                    resolve([{
                        name: '⌜ DiziKaynak ⌟ | Player',
                        url: iframeMatch[1],
                        headers: { 'Referer': BASE_URL + '/' }
                    }]);
                } else {
                    resolve([]);
                }
            })
            .catch(function() { resolve([]); });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
