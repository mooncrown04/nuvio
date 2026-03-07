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

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') {
            return resolve([]);
        }

        console.log('[DiziBox] Başladı:', tmdbId, 'S:', seasonNum, 'E:', episodeNum);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.name || data.original_name || '';
                if (!title) {
                    console.log('[DiziBox] TMDB isim bulunamadı');
                    return resolve([]);
                }
                console.log('[DiziBox] Dizi:', title);

                var slug = title.toLowerCase().trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                var epUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-izle/';
                console.log('[DiziBox] URL:', epUrl);

                // Cloudflare bypass denemeleri
                return tryFetchWithBypass(epUrl, title);
            })
            .then(function(result) {
                resolve(result || []);
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata:', err.message || err);
                resolve([]);
            });
    });
}

function tryFetchWithBypass(epUrl, title) {
    // Yöntem 1: Normal fetch (cookie ile)
    var headersWithCookie = Object.assign({}, HEADERS, {
        'Cookie': 'LockUser=true; isTrustedUser=true; dbxu=' + Date.now()
    });

    return fetch(epUrl, { headers: headersWithCookie })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            console.log('[DiziBox] Normal fetch boyut:', html.length);
            
            // Başarılı mı?
            if (html.length > 300000 && html.indexOf('video_id') !== -1) {
                console.log('[DiziBox] Normal fetch başarılı');
                return parseStreams(html, title);
            }
            
            // Cloudflare engeli var, app.bypass dene (eğer varsa)
            console.log('[DiziBox] Cloudflare engeli, bypass deneniyor...');
            return tryAppBypass(epUrl, title);
        });
}

function tryAppBypass(epUrl, title) {
    // Nuvio'nun app objesinde bypass var mı kontrol et
    if (typeof app === 'undefined') {
        console.log('[DiziBox] app objesi yok');
        return [];
    }

    // Yöntem 2: app.fetchCloudflare (varsayalım)
    if (app.fetchCloudflare) {
        return app.fetchCloudflare(epUrl, {
            headers: HEADERS,
            cookies: {
                'LockUser': 'true',
                'isTrustedUser': 'true',
                'dbxu': Date.now().toString()
            }
        }).then(function(res) {
            return res.text();
        }).then(function(html) {
            console.log('[DiziBox] Bypass fetch boyut:', html.length);
            if (html.length > 300000) {
                return parseStreams(html, title);
            }
            return [];
        });
    }

    // Yöntem 3: app.get (Kotlin'deki gibi)
    if (app.get) {
        return app.get(epUrl, {
            headers: HEADERS,
            cookies: {
                'LockUser': 'true',
                'isTrustedUser': 'true',
                'dbxu': Date.now().toString()
            },
            interceptor: true // Cloudflare interceptor
        }).then(function(res) {
            return res.text();
        }).then(function(html) {
            console.log('[DiziBox] App.get boyut:', html.length);
            if (html.length > 300000) {
                return parseStreams(html, title);
            }
            return [];
        });
    }

    console.log('[DiziBox] Bypass metodu bulunamadı');
    return [];
}

function parseStreams(html, title) {
    var videoIdMatch = html.match(/video_id["']?\s*[:=]\s*["']?(\d+)["']?/i);
    if (!videoIdMatch) {
        console.log('[DiziBox] Video ID bulunamadı');
        return [];
    }

    var videoId = videoIdMatch[1];
    console.log('[DiziBox] Video ID:', videoId);

    var playerUrl = BASE_URL + '/player/king.php?wmode=opaque&v=' + videoId;

    return [{
        name: '⌜ DiziBox ⌟ | King Player',
        title: title + ' · 1080p',
        url: playerUrl,
        quality: '1080p',
        headers: STREAM_HEADERS,
        provider: 'dizibox'
    }];
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
