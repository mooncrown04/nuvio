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
        if (mediaType !== 'tv') {
            return resolve([]);
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/tv/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(res) {
                return res.json();
            })
            .then(function(data) {
                var name = data.original_name || data.name;
                var slug = name.toLowerCase().trim()
                    .replace(/[^a-z0-9]+/g, '-')
                    .replace(/^-+|-+$/g, '');

                var epUrl = BASE_URL + '/' + slug + '-' + seasonNum + '-sezon-' + episodeNum + '-bolum-hd-izle/';
                
                // setTimeout YOK - direkt ana sayfa çek
                return fetchHomePage(epUrl);
            })
            .then(function(result) {
                if (result.blocked) {
                    console.error('[DiziBox] Engel algılandı. Boyut:', result.size);
                    return resolve([]);
                }

                var streams = extractStreams(result.html);
                resolve(streams);
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata:', err);
                resolve([]);
            });
    });
}

// Ana sayfa çek, sonra hedef sayfa (setTimeout YOK)
function fetchHomePage(targetUrl) {
    return fetch(BASE_URL + '/', {
        headers: HEADERS,
        method: 'GET'
    }).then(function(homeRes) {
        return homeRes.text();
    }).then(function(homeHtml) {
        console.log('[DiziBox] Ana sayfa OK, boyut:', homeHtml.length);
        
        // Hemen hedef sayfaya geç (bekleme yok)
        return fetch(targetUrl, {
            headers: Object.assign({}, HEADERS, {
                'Referer': BASE_URL + '/',
                'Sec-Fetch-Site': 'same-origin'
            }),
            method: 'GET'
        });
    }).then(function(targetRes) {
        return targetRes.text();
    }).then(function(targetHtml) {
        return {
            blocked: isBlocked(targetHtml),
            html: targetHtml,
            size: targetHtml.length
        };
    });
}

function isBlocked(html) {
    if (html.length < 280000) {
        return true;
    }
    if (html.indexOf('cf-browser-verification') !== -1) {
        return true;
    }
    if (html.indexOf('Checking your browser') !== -1) {
        return true;
    }
    if (html.indexOf('Just a moment') !== -1) {
        return true;
    }
    if (html.indexOf('cf-challenge') !== -1) {
        return true;
    }
    if (html.indexOf('__cf_bm') !== -1) {
        return true;
    }
    return false;
}

function extractStreams(html) {
    var streams = [];
    var match = html.match(/video_id["']?\s*[:=]\s*["']?(\d+)["']?/i);
    
    if (match) {
        var videoId = match[1];
        streams.push({
            name: '⌜ DiziBox ⌟ | King Player',
            url: BASE_URL + '/player/king.php?wmode=opaque&v=' + videoId,
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
