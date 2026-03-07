BASE_URL = 'https://www.dizibox.live';

// Daha gerçekçi browser fingerprintrı
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Referer': BASE_URL + '/',
    'Cookie': generateCookies()
};

function generateCookies() {
    var timestamp = Date.now();
    var sessionId = Math.random().toString(36).substring(2, 15);
    return [
        'isTrustedUser=true',
        'LockUser=true',
        'dbxu=' + timestamp,
        'PHPSESSID=' + sessionId,
        'visited=' + timestamp
    ].join('; ');
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'tv') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var name = data.original_name || data.name;
                var slug = name.toLowerCase().trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                var epUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-izle/';
                
                // Önce ana sayfayı ziyaret et (session oluşturmak için)
                return warmUpSession().then(function() {
                    return fetch(epUrl, { 
                        headers: HEADERS,
                        redirect: 'follow'
                    });
                });
            })
            .then(function(res) { 
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text(); 
            })
            .then(function(html) {
                // Cloudflare/Engel kontrolü
                if (html.includes('cf-browser-verification') || 
                    html.includes('Checking your browser') ||
                    html.includes('Just a moment') ||
                    html.length < 280000) {
                    
                    console.error('[DiziBox] Bot koruması aktif. Boyut:', html.length);
                    return resolve([]);
                }

                var streams = [];
                var videoIdMatch = html.match(/video_id["']?\s*[:=]\s*["']?(\d+)["']?/i);

                if (videoIdMatch) {
                    streams.push({
                        name: '⌜ DiziBox ⌟ | King Player',
                        url: BASE_URL + '/player/king.php?wmode=opaque&v=' + videoIdMatch[1],
                        quality: '1080p',
                        headers: { 
                            'Referer': BASE_URL + '/',
                            'User-Agent': HEADERS['User-Agent']
                        }
                    });
                }
                
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata:', err.message || err);
                resolve([]);
            });
    });
}

// Session warmup - ana sayfayı ziyaret ederek cookie/session oluştur
function warmUpSession() {
    return fetch(BASE_URL + '/', {
        headers: HEADERS,
        method: 'GET'
    }).then(function() {
        // Kısa bekleme (rate limiting'i önlemek için)
        return new Promise(function(r) { setTimeout(r, 500); });
    }).catch(function() {
        // Hata olsa bile devam et
        return Promise.resolve();
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
