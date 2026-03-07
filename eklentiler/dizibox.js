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

// DiziPal'den kopya: Regex fonksiyonları
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

// DiziPal'den kopya: Sayfa yükleme
function loadPage(url) {
    console.log('[DiziBox] Yükleniyor:', url);
    return fetch(url, { 
        headers: Object.assign({}, HEADERS, {
            'Cookie': 'LockUser=true; isTrustedUser=true; dbxu=' + Date.now()
        })
    }).then(function(res) { return res.text(); });
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
                
                // DiziBox URL formatı (DiziPal'deki /bolum/ yapısı gibi)
                var epUrl = BASE_URL + '/' + slug + '-' + seasonNum + 
                           '-sezon-' + episodeNum + '-bolum-hd-izle/';
                
                console.log('[DiziBox] URL:', epUrl);
                return loadEpisodePage(epUrl, title);
            })
            .then(function(streams) { 
                console.log('[DiziBox] Toplam stream:', streams.length);
                resolve(streams || []); 
            })
            .catch(function(err) {
                console.error('[DiziBox] Hata:', err.message || err);
                resolve([]);
            });
    });
}

function loadEpisodePage(epUrl, title) {
    return loadPage(epUrl)
        .then(function(html) {
            console.log('[DiziBox] HTML boyut:', html.length);
            
            // Cloudflare kontrolü (DiziPal'deki gibi)
            if (html.length < 50000) {
                console.log('[DiziBox] Sayfa boş veya engelli (Cloudflare?)');
                return [];
            }
            
            // 1. Iframe ara (DiziPal'deki gibi)
            var iframeMatch = findFirst(html, '<iframe[^>]+src="([^"]+)"[^>]*class="[^"]*(?:player|video|king)[^"]*"') ||
                             findFirst(html, 'class="[^"]*(?:player|video|king)[^"]*"[^>]*>[\\s\\S]*?<iframe[^>]+src="([^"]+)"') ||
                             findFirst(html, '<div[^>]*id="[^"]*(?:video|player|king)[^"]*"[^>]*>[\\s\\S]*?<iframe[^>]+src="([^"]+)"') ||
                             findFirst(html, '<iframe[^>]+src="([^"]+)"');
            
            var iframeSrc = iframeMatch ? iframeMatch[1] : null;
            console.log('[DiziBox] Iframe src:', iframeSrc);
            
            if (!iframeSrc) {
                // Direkt video ID ara
                var videoIdMatch = findFirst(html, 'video_id["\']?\\s*[:=]\\s*["\']?(\\d+)["\']?');
                if (videoIdMatch) {
                    return buildKingPlayer(videoIdMatch[1], title);
                }
                console.log('[DiziBox] Ne iframe ne video ID bulundu');
                return [];
            }
            
            return extractFromIframe(iframeSrc, title);
        });
}

function extractFromIframe(iframeSrc, title) {
    var iframeUrl = iframeSrc.startsWith('http') ? iframeSrc : 
                   (iframeSrc.startsWith('//') ? 'https:' + iframeSrc : BASE_URL + iframeSrc);
    
    console.log('[DiziBox] Iframe yükleniyor:', iframeUrl);
    
    return fetch(iframeUrl, {
        headers: Object.assign({}, HEADERS, { 'Referer': BASE_URL + '/' })
    }).then(function(res) { return res.text(); })
    .then(function(html) {
        console.log('[DiziBox] Iframe HTML boyut:', html.length);
        
        // m3u8 ara (DiziPal'deki gibi)
        var m3u8Match = findFirst(html, '(https?://[^"\']+\\.m3u8[^"\']*)');
        if (m3u8Match) {
            console.log('[DiziBox] m3u8 bulundu:', m3u8Match[1]);
            return [{
                name: '⌜ DiziBox ⌟ | HD',
                title: title,
                url: m3u8Match[1],
                quality: '1080p',
                headers: STREAM_HEADERS,
                provider: 'dizibox'
            }];
        }
        
        // Video ID ara
        var videoIdMatch = findFirst(html, 'video_id["\']?\\s*[:=]\\s*["\']?(\\d+)["\']?');
        if (videoIdMatch) {
            return buildKingPlayer(videoIdMatch[1], title);
        }
        
        // file: "..." formatı
        var fileMatch = findFirst(html, 'file["\']?\\s*[:=]\\s*["\']?(https?://[^"\']+)["\']?');
        if (fileMatch) {
            return [{
                name: '⌜ DiziBox ⌟ | Video',
                title: title,
                url: fileMatch[1],
                quality: '720p',
                headers: STREAM_HEADERS,
                provider: 'dizibox'
            }];
        }
        
        console.log('[DiziBox] Iframe içinde kaynak bulunamadı');
        return [];
    });
}

function buildKingPlayer(videoId, title) {
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
