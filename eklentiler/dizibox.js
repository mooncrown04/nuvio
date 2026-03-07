BASE_URL = 'https://www.dizibox.live';

// Cloudflare bypass için gerekli headerlar
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'Referer': BASE_URL + '/'
};

// Dinamik cookie üretimi
function generateCookies() {
    return 'LockUser=true; isTrustedUser=true; dbxu=' + Date.now();
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
                
                // ÖNEMLİ: Önce ana sayfaya git (session oluştur)
                return warmUpAndFetch(epUrl);
            })
            .then(function(html) {
                // Cloudflare kontrolü
                if (isCloudflareBlocked(html)) {
                    console.error('[DiziBox] Cloudflare engeli tespit edildi. Boyut:', html.length);
                    
                    // Alternatif: HTML'de varsa challenge çözümü dene
                    return trySolveChallenge(html, resolve, reject);
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

// Session warmup + fetch
function warmUpAndFetch(targetUrl) {
    return new Promise(function(resolve, reject) {
        // 1. Önce ana sayfaya git
        fetch(BASE_URL + '/', {
            headers: Object.assign({}, HEADERS, {
                'Cookie': generateCookies()
            })
        }).then(function() {
            // 2. Kısa bekleme
            return new Promise(function(r) { setTimeout(r, 1000); });
        }).then(function() {
            // 3. Hedef sayfayı çek
            return fetch(targetUrl, {
                headers: Object.assign({}, HEADERS, {
                    'Cookie': generateCookies(),
                    'Referer': BASE_URL + '/'
                }),
                redirect: 'follow'
            });
        }).then(function(res) {
            return res.text();
        }).then(resolve).catch(reject);
    });
}

// Cloudflare kontrolü
function isCloudflareBlocked(html) {
    return html.length < 280000 || 
           html.includes('cf-browser-verification') ||
           html.includes('Checking your browser') ||
           html.includes('Just a moment') ||
           html.includes('cf-challenge') ||
           html.includes('__cf_bm') ||
           html.includes('cf_clearance');
}

// Stream çıkarma
function extractStreams(html) {
    var streams = [];
    var videoIdMatch = html.match(/video_id["']?\s*[:=]\s*["']?(\d+)["']?/i);
    
    if (videoIdMatch) {
        streams.push({
            name: '⌜ DiziBox ⌟ | King Player',
            url: BASE_URL + '/player/king.php?wmode=opaque&v=' + videoIdMatch[1],
            quality: '1080p',
            headers: {
                'Referer': BASE_URL + '/',
                'User-Agent': HEADERS['User-Agent'],
                'Cookie': generateCookies()
            }
        });
    }
    
    return streams;
}

// Cloudflare challenge çözümü (basit versiyon)
function trySolveChallenge(html, resolve, reject) {
    // Eğer platformun app.solveCloudflare gibi bir metodu varsa kullan
    if (typeof app !== 'undefined' && app.solveCloudflare) {
        console.log('[DiziBox] Cloudflare challenge çözülüyor...');
        app.solveCloudflare(BASE_URL).then(function(result) {
            // Tekrar dene
            return warmUpAndFetch(result.url || BASE_URL);
        }).then(function(newHtml) {
            if (isCloudflareBlocked(newHtml)) {
                resolve([]);
            } else {
                resolve(extractStreams(newHtml));
            }
        }).catch(function() {
            resolve([]);
        });
    } else {
        // Challenge çözümü yoksa boş dön
        resolve([]);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
