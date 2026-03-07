var BASE_URL = 'https://www.dizibox.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Accept-Encoding': 'identity',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site',
    'DNT': '1'
};

// Regex yardımcıları (DiziPal'deki gibi)
function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

function findAll(html, pattern) {
    var results = [];
    var regex = new RegExp(pattern, 'gi');
    var match;
    while ((match = regex.exec(html)) !== null) {
        results.push(match);
    }
    return results;
}

// Cookie ile istek (DiziPal'deki gibi)
function fetchWithCookie(url, customHeaders) {
    var headers = Object.assign({}, HEADERS, customHeaders || {}, {
        'Cookie': 'LockUser=true; isTrustedUser=true; dbxu=' + Date.now()
    });
    
    return fetch(url, { headers: headers });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') {
            console.log('[DiziBox] Sadece TV desteklenir');
            return resolve([]);
        }

        console.log('[DiziBox] Başladı:', tmdbId, 'S:', seasonNum, 'E:', episodeNum);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + 
                      '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.name || data.original_name || '';
                if (!title) {
                    console.log('[DiziBox] TMDB isim bulunamadı');
                    return resolve([]);
                }
                console.log('[DiziBox] Dizi:', title);

                // Slug oluştur (DiziPal'deki gibi)
                var slug = title.toLowerCase().trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                // Direkt bölüm URL'si (DiziYou'daki gibi)
                var epUrl = BASE_URL + '/' + slug + '-' + seasonNum + 
                           '-sezon-' + episodeNum + '-bolum-hd-izle/';
                console.log('[DiziBox] URL:', epUrl);

                return loadEpisodePage(epUrl, title);
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata:', err.message || err);
                resolve([]);
            });
    });
}

function loadEpisodePage(epUrl, title) {
    console.log('[DiziBox] Sayfa yükleniyor:', epUrl);

    return fetchWithCookie(epUrl)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            console.log('[DiziBox] Sayfa boyutu:', html.length);

            // Cloudflare kontrolü (SineWix'teki gibi)
            if (html.length < 280000) {
                console.log('[DiziBox] Cloudflare engeli veya boş sayfa');
                return [];
            }

            // Video ID çıkar (DiziPal'deki regex mantığı)
            var videoIdMatch = findFirst(html, 'video_id["\']?\\s*[:=]\\s*["\']?(\\d+)["\']?');
            if (!videoIdMatch) {
                console.log('[DiziBox] Video ID bulunamadı');
                return [];
            }

            var videoId = videoIdMatch[1];
            console.log('[DiziBox] Video ID:', videoId);

            // Stream oluştur
            var streams = [];
            
            // King Player (ana kaynak)
            var playerUrl = BASE_URL + '/player/king.php?wmode=opaque&v=' + videoId;
            streams.push({
                name: '⌜ DiziBox ⌟ | King Player',
                title: title + ' · 1080p',
                url: playerUrl,
                quality: '1080p',
                headers: STREAM_HEADERS,
                provider: 'dizibox'
            });

            // Alternatif embed varsa ekle
            var embedMatch = findFirst(html, 'embed_src["\']?\\s*[:=]\\s*["\']?([^"\'>]+)["\']?');
            if (embedMatch && embedMatch[1].includes('dizibox')) {
                streams.push({
                    name: '⌜ DiziBox ⌟ | Alternatif',
                    title: title + ' · 720p',
                    url: embedMatch[1],
                    quality: '720p',
                    headers: STREAM_HEADERS,
                    provider: 'dizibox'
                });
            }

            return streams;
        });
}

// Export (SineWix/DiziPal/DiziYou ile aynı)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
