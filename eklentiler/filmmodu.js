var BASE_URL = 'https://www.filmmodu.ws';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// Player'ın MediaTek işlemcide takılmaması için en saf başlıklar
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'Connection': 'keep-alive'
};

function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.original_title;
                var year = (data.release_date || '').substring(0, 4);
                
                return fetch(BASE_URL + '/film-ara?term=' + encodeURIComponent(title), { headers: HEADERS })
                    .then(function(res) { return res.text(); })
                    .then(function(html) {
                        var linkMatch = findFirst(html, 'href="([^"]*\\/izle\\/[^"]*)"');
                        if (!linkMatch) return null;
                        
                        var movieUrl = linkMatch[1].startsWith('http') ? linkMatch[1] : BASE_URL + linkMatch[1];
                        return fetch(movieUrl, { headers: HEADERS });
                    })
                    .then(function(res) { return res ? res.text() : ''; })
                    .then(function(html) {
                        var vId = findFirst(html, "videoId\\s*=\\s*['\"]([^'\"]+)['\"]");
                        var vType = findFirst(html, "videoType\\s*=\\s*['\"]([^'\"]+)['\"]");
                        
                        if (!vId) return [];

                        return fetch(BASE_URL + '/get-source?movie_id=' + vId[1] + '&type=' + vType[1], {
                            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Referer': BASE_URL }
                        }).then(function(res) { return res.json(); });
                    })
                    .then(function(data) {
                        if (!data || !data.sources) return [];

                        return data.sources.map(function(s) {
                            var finalUrl = s.src.startsWith('http') ? s.src : BASE_URL + s.src;
                            var isHls = finalUrl.includes('m3u8');

                            return {
                                name: '⌜ FilmModu ⌟',
                                title: title + ' · ' + (s.label || 'HD'),
                                url: finalUrl,
                                quality: s.label || 'HD',
                                headers: STREAM_HEADERS,
                                is_direct: true,
                                // PLAYER'DA ÇALIŞMASINI SAĞLAYAN KRİTİK AYARLAR
                                type: isHls ? 'hls' : 'mp4',
                                hw_decode: false, // Donanım hızlandırmayı kapat (MTK Bypass)
                                force_sw: true,    // Yazılımsal çözücüyü zorla
                                android_config: {
                                    "is_hls": isHls,
                                    "force_software": true
                                }
                            };
                        });
                    });
            })
            .then(function(streams) { resolve(streams || []); })
            .catch(function() { resolve([]); });
    });
}

module.exports = { getStreams };
