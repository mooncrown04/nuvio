/**
 * DiziPal v42 - ES5/QuickJS Uyumlu
 * Nuvio/QuickJS için: async/await YOK, Promise tabanlı
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://dizipal1543.com';
var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    'Referer': BASE_URL + '/'
};

// String replace helper
function slugify(str) {
    if (!str) return '';
    var map = {
        'ğ': 'g', 'ü': 'u', 'ş': 's', 'ı': 'i', 'ö': 'o', 'ç': 'c',
        'Ğ': 'G', 'Ü': 'U', 'Ş': 'S', 'İ': 'I', 'Ö': 'O', 'Ç': 'C'
    };
    var res = str.toLowerCase();
    for (var key in map) {
        res = res.split(key).join(map[key]);
    }
    return res.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function generateSlugs(title, originalTitle, isMovie, season, episode) {
    var slugs = [];
    var titles = [title, originalTitle];
    var uniqueTitles = [];
    
    // Unique titles only
    for (var i = 0; i < titles.length; i++) {
        if (titles[i] && uniqueTitles.indexOf(titles[i]) === -1) {
            uniqueTitles.push(titles[i]);
        }
    }
    
    for (var i = 0; i < uniqueTitles.length; i++) {
        var t = uniqueTitles[i];
        var s = slugify(t);
        
        if (isMovie) {
            slugs.push('/film/' + s);
            slugs.push('/movie/' + s);
            slugs.push('/izle/' + s);
        } else {
            // Dizi formatları
            slugs.push('/bolum/' + s + '-' + season + 'x' + episode);
            slugs.push('/bolum/' + s + '-' + season + '-sezon-' + episode + '-bolum');
            slugs.push('/dizi/' + s + '/' + season + '-sezon/' + episode + '-bolum');
            slugs.push('/' + s + '/' + season + 'x' + episode);
        }
    }
    return slugs;
}

function extractFromHtml(html, baseUrl) {
    var streams = [];
    
    // 1. Direkt m3u8/mp4 ara
    var hlsRegex = /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/gi;
    var mp4Regex = /["'](https?:\/\/[^"']+\.mp4[^"']*)["']/gi;
    var match;
    
    while ((match = hlsRegex.exec(html)) !== null) {
        if (match[1] && streams.length < 10) {
            streams.push({
                name: 'DiziPal HLS',
                url: match[1],
                quality: 'Auto',
                provider: 'dizipal'
            });
        }
    }
    
    // 2. Iframe src'leri
    var iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
    while ((match = iframeRegex.exec(html)) !== null) {
        var src = match[1];
        if (src && (src.indexOf('player') !== -1 || src.indexOf('video') !== -1)) {
            // Relative URL fix
            if (src.indexOf('http') !== 0) {
                src = baseUrl + (src.indexOf('/') === 0 ? '' : '/') + src;
            }
            streams.push({
                name: 'DiziPal Player',
                url: src,
                quality: 'Auto',
                referer: baseUrl,
                provider: 'dizipal'
            });
        }
    }
    
    // 3. JSON embedded data
    var jsonMatch = html.match(/var\s+video\s*=\s*({[^;]+});/);
    if (jsonMatch) {
        try {
            var videoData = JSON.parse(jsonMatch[1]);
            if (videoData.url || videoData.file) {
                streams.push({
                    name: 'DiziPal Source',
                    url: videoData.url || videoData.file,
                    quality: videoData.quality || 'Auto',
                    provider: 'dizipal'
                });
            }
        } catch (e) {
            // Parse hatası, yoksay
        }
    }
    
    return streams;
}

function tryFetch(url, headers) {
    return new Promise(function(resolve, reject) {
        fetch(url, { headers: headers, redirect: 'follow' })
            .then(function(res) {
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return res.text();
            })
            .then(function(html) {
                resolve(html);
            })
            .catch(function(err) {
                reject(err);
            });
    });
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + 
            (isMovie ? 'movie' : 'tv') + '/' + tmdbId + 
            '?language=tr-TR&api_key=' + TMDB_KEY;

        console.error('[DiziPal] Basladi: ' + tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var title = tmdbData.title || tmdbData.name;
                var originalTitle = tmdbData.original_title || tmdbData.original_name;
                
                if (!title) throw new Error('Baslik yok');

                var slugs = generateSlugs(title, originalTitle, isMovie, seasonNum, episodeNum);
                console.error('[DiziPal] Slug sayisi: ' + slugs.length);

                var attemptIndex = 0;
                var allStreams = [];

                function tryNextSlug() {
                    if (attemptIndex >= slugs.length) {
                        console.error('[DiziPal] Toplam bulunan: ' + allStreams.length);
                        resolve(allStreams);
                        return;
                    }

                    var path = slugs[attemptIndex];
                    var url = BASE_URL + path;
                    attemptIndex++;

                    console.error('[DiziPal] Deneniyor: ' + url);

                    tryFetch(url, HEADERS)
                        .then(function(html) {
                            // Cloudflare check
                            if (html.indexOf('cf-browser-verification') !== -1 || 
                                html.indexOf('Checking your browser') !== -1) {
                                console.error('[DiziPal] Cloudflare engeli');
                                tryNextSlug(); // Sonrakini dene
                                return;
                            }

                            var found = extractFromHtml(html, BASE_URL);
                            
                            if (found.length > 0) {
                                console.error('[DiziPal] Basarili! Kayit: ' + found.length);
                                allStreams = allStreams.concat(found);
                                resolve(allStreams); // İlk başarılıda dur
                            } else {
                                tryNextSlug(); // Sonrakini dene
                            }
                        })
                        .catch(function(err) {
                            console.error('[DiziPal] Fetch hatasi: ' + err.message);
                            tryNextSlug(); // Sonrakini dene
                        });
                }

                tryNextSlug();
            })
            .catch(function(err) {
                console.error('[DiziPal] Kritik hata: ' + err.message);
                resolve([]);
            });
    });
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
