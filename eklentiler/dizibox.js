var BASE_URL = 'https://www.dizibox.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': BASE_URL + '/'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'video/*;q=0.9,*/*;q=0.5',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve) {
        if (mediaType !== 'tv') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + 
                      '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.name || '';
                if (!title) return resolve([]);
                
                var slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
                var epUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-izle/';
                
                return fetch(epUrl, {
                    headers: Object.assign({}, HEADERS, {
                        'Cookie': 'LockUser=true; isTrustedUser=true; dbxu=' + Date.now()
                    })
                });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                // Cloudflare kontrolü
                if (html.length < 280000) {
                    console.log('[DiziBox] Engel:', html.length);
                    return resolve([]);
                }
                
                var match = html.match(/video_id["']?\s*[:=]\s*["']?(\d+)["']?/i);
                if (!match) return resolve([]);
                
                var videoId = match[1];
                var playerUrl = BASE_URL + '/player/king.php?wmode=opaque&v=' + videoId;
                
                resolve([{
                    name: '⌜ DiziBox ⌟ | King',
                    title: 'Bölüm ' + episodeNum,
                    url: playerUrl,
                    quality: '1080p',
                    headers: STREAM_HEADERS,
                    provider: 'dizibox'
                }]);
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata:', err);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
