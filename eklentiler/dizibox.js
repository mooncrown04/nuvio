BASE_URL = 'https://www.dizibox.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Referer': BASE_URL + '/',
    'Cookie': 'LockUser=true; isTrustedUser=true; dbxu=' + Date.now()
};

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
                
                // Önce ana sayfa, sonra hedef sayfa (setTimeout YOK)
                return fetchWithWarmup(epUrl);
            })
            .then(function(html) {
                if (isBlocked(html)) {
                    console.error('[DiziBox] Engel algılandı. Boyut:', html.length);
                    return resolve([]);
                }

                var streams = extractStreams(html);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata:', err);
                resolve([]);
            });
    });
}

// setTimeout kullanmadan sıralı fetch
function fetchWithWarmup(targetUrl) {
    // 1. Ana sayfayı çek
    return fetch(BASE_URL + '/', { headers: HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(homeHtml) {
            console.log('[DiziBox] Ana sayfa çekildi, boyut:', homeHtml.length);
            
            // 2. Hemen hedef sayfaya git (delay yok, QuickJS desteklemiyor)
            return fetch(targetUrl, { 
                headers: Object.assign({}, HEADERS, {
                    'Referer': BASE_URL + '/',
                    'Sec-Fetch-Site': 'same-origin'
                })
            });
        })
        .then(function(res) { return res.text(); });
}

function isBlocked(html) {
    return html.length < 280000 ||
           html.indexOf('cf-browser-verification') !== -1 ||
           html.indexOf('Checking your browser') !== -1 ||
           html.indexOf('Just a moment') !== -1 ||
           html.indexOf('cf-challenge') !== -1 ||
           html.indexOf('__cf_bm') !== -1;
}

function extractStreams(html) {
    var streams = [];
    var match = html.match(/video_id["']?\s*[:=]\s*["']?(\d+)["']?/i);
    
    if (match) {
        streams.push({
            name: '⌜ DiziBox ⌟ | King Player',
            url: BASE_URL + '/player/king.php?wmode=opaque&v=' + match[1],
            quality: '1080p',
            headers: {
                'Referer': BASE_URL + '/',
                'User-Agent': HEADERS['User-Agent']
            }
        });
    }
    
    return streams;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
