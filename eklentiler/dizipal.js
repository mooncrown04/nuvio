/**
 * DiziPal v44 - URL Format Optimized
 * Calisan ornek: /bolum/a-knight-in-the-making-1x1
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

// Calisan URL'den: "A Knight of the Seven Kingdoms" -> "a-knight-in-the-making"
// Bu farkli bir slug - muhtemelen DiziPal'in kendi cevirisi/versiyonu
var TITLE_ALIASES = {
    // Bilinen farkli slug'lar (manuel eklenebilir)
    "a knight of the seven kingdoms": "a-knight-in-the-making",
    "the rookie": "the-rookie", // varsayilan
    // TMDB basligi -> DiziPal slug mapping
};

function slugify(str) {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Ozel karakterleri temizle (Türkçe karakterleri koru)
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function generateSlugs(title, originalTitle, isMovie, season, episode) {
    var slugs = [];
    var titles = [];
    
    if (title) titles.push(title);
    if (originalTitle && originalTitle !== title) titles.push(originalTitle);
    
    // Bilinen alias'lari ekle
    for (var i = 0; i < titles.length; i++) {
        var key = titles[i].toLowerCase();
        if (TITLE_ALIASES[key]) {
            titles.push(TITLE_ALIASES[key].replace(/-/g, ' '));
        }
    }
    
    // Essiz yap
    var unique = [];
    for (var i = 0; i < titles.length; i++) {
        if (unique.indexOf(titles[i]) === -1) unique.push(titles[i]);
    }
    titles = unique;
    
    for (var i = 0; i < titles.length; i++) {
        var t = titles[i];
        var s = slugify(t);
        
        if (isMovie) {
            slugs.push('/film/' + s);
            slugs.push('/izle/' + s);
        } else {
            // Calisan format: /bolum/a-knight-in-the-making-1x1
            slugs.push('/bolum/' + s + '-' + season + 'x' + episode);
            // Alternatifler
            slugs.push('/bolum/' + s + '-' + season + '-sezon-' + episode + '-bolum');
            slugs.push('/dizi/' + s + '/' + season + '-sezon/' + episode + '-bolum');
        }
    }
    
    return slugs;
}

function extractStreams(html, baseUrl) {
    var streams = [];
    
    // 1. Iframe'ler (oynatıcılar)
    var iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
    var match;
    while ((match = iframeRegex.exec(html)) !== null) {
        var src = match[1];
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
    
    // 2. Video tag'leri
    var videoRegex = /<video[^>]+src=["']([^"']+)["']/gi;
    while ((match = videoRegex.exec(html)) !== null) {
        streams.push({
            name: 'DiziPal Direct',
            url: match[1],
            quality: 'Auto',
            provider: 'dizipal'
        });
    }
    
    // 3. m3u8/mp4 linkleri (script icinde)
    var hlsRegex = /["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/gi;
    while ((match = hlsRegex.exec(html)) !== null) {
        // Duplicate kontrolu
        var exists = false;
        for (var j = 0; j < streams.length; j++) {
            if (streams[j].url === match[1]) exists = true;
        }
        if (!exists) {
            streams.push({
                name: 'DiziPal HLS',
                url: match[1],
                quality: 'Auto',
                provider: 'dizipal'
            });
        }
    }
    
    // 4. JSON video verisi
    var jsonMatch = html.match(/var\s+video\s*=\s*({[^;]+});/);
    if (jsonMatch) {
        try {
            var data = JSON.parse(jsonMatch[1]);
            if (data.url || data.file) {
                streams.push({
                    name: 'DiziPal Source',
                    url: data.url || data.file,
                    quality: data.quality || 'Auto',
                    provider: 'dizipal'
                });
            }
        } catch (e) {}
    }
    
    return streams;
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + 
            (isMovie ? 'movie' : 'tv') + '/' + tmdbId + 
            '?language=tr-TR&api_key=' + TMDB_KEY;

        console.error('[DiziPal] TMDB: ' + tmdbId);

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var title = tmdbData.title || tmdbData.name;
                var originalTitle = tmdbData.original_title || tmdbData.original_name;
                
                if (!title) throw new Error('Baslik bulunamadi');

                console.error('[DiziPal] Baslik: ' + title + ' | Orijinal: ' + originalTitle);

                var slugs = generateSlugs(title, originalTitle, isMovie, seasonNum, episodeNum);
                console.error('[DiziPal] Slug sayisi: ' + slugs.length);

                var index = 0;
                
                function tryNext() {
                    if (index >= slugs.length) {
                        console.error('[DiziPal] Bulunamadi: 0 kaynak');
                        resolve([]);
                        return;
                    }

                    var path = slugs[index];
                    var url = BASE_URL + path;
                    index++;

                    console.error('[DiziPal] Deneniyor: ' + url);

                    fetch(url, { headers: HEADERS })
                        .then(function(res) {
                            if (!res.ok) {
                                console.error('[DiziPal] HTTP ' + res.status);
                                throw new Error('HTTP ' + res.status);
                            }
                            return res.text();
                        })
                        .then(function(html) {
                            // Cloudflare kontrolu
                            if (html.indexOf('cf-browser-verification') !== -1 || 
                                html.indexOf('Checking your browser') !== -1) {
                                console.error('[DiziPal] Cloudflare engeli!');
                                resolve([]); // Cloudflare varsa devam etme
                                return;
                            }

                            var streams = extractStreams(html, BASE_URL);
                            
                            if (streams.length > 0) {
                                console.error('[DiziPal] Basarili: ' + streams.length + ' kaynak');
                                resolve(streams);
                            } else {
                                // Sayfada baska link varsa bul
                                var altMatch = html.match(/href=["'](\/bolum\/[^"']+-(?:\d+x\d+))["']/);
                                if (altMatch && slugs.indexOf(altMatch[1]) === -1) {
                                    console.error('[DiziPal] Alternatif bulundu: ' + altMatch[1]);
                                    slugs.push(altMatch[1]);
                                }
                                tryNext();
                            }
                        })
                        .catch(function(err) {
                            console.error('[DiziPal] Hata: ' + err.message);
                            tryNext();
                        });
                }

                tryNext();
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
