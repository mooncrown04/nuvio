/**
 * DiziPal v52 - Minimal Debug Version
 * Şifre çözme YOK - sadece yapı analizi
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

function slugify(str) {
    if (!str) return '';
    return str.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}

function generateSlugs(title, originalTitle, isMovie, season, episode) {
    var slugs = [];
    var titles = [];
    if (title) titles.push(title);
    if (originalTitle && originalTitle !== title) titles.push(originalTitle);
    
    var unique = [];
    for (var i = 0; i < titles.length; i++) {
        if (unique.indexOf(titles[i]) === -1) unique.push(titles[i]);
    }
    
    for (var i = 0; i < unique.length; i++) {
        var s = slugify(unique[i]);
        if (isMovie) {
            slugs.push('/film/' + s);
        } else {
            slugs.push('/bolum/' + s + '-' + season + 'x' + episode);
        }
    }
    return slugs;
}

function extractFromPage(html, url) {
    return new Promise(function(resolve, reject) {
        var $ = cheerio.load(html);
        
        // 1. Şifreli veriyi bul (ama çözme!)
        var encryptedDiv = $('div[data-rm-k=true]');
        if (encryptedDiv.length > 0) {
            var encryptedText = encryptedDiv.text();
            console.error('[DiziPal] ENCRYPTED DATA FOUND: ' + encryptedText.length + ' chars');
            console.error('[DiziPal] First 200 chars: ' + encryptedText.substring(0, 200));
            
            // JSON parse et, içeriği logla (çözme!)
            try {
                var data = JSON.parse(encryptedText);
                console.error('[DiziPal] Ciphertext: ' + data.ciphertext.substring(0, 50));
                console.error('[DiziPal] IV: ' + data.iv.substring(0, 50));
                console.error('[DiziPal] Salt: ' + data.salt.substring(0, 50) + ' (length: ' + data.salt.length + ')');
            } catch (e) {
                console.error('[DiziPal] JSON parse failed: ' + e.message);
            }
        }
        
        // 2. Direkt iframe ara (eski yöntem)
        var iframe = $('iframe').first();
        if (iframe.length > 0) {
            var src = iframe.attr('src') || '';
            console.error('[DiziPal] IFRAME FOUND: ' + src);
            
            if (src.indexOf('//') === 0) src = 'https:' + src;
            
            resolve([{
                name: 'DiziPal',
                url: src,
                quality: 'Auto',
                referer: url,
                provider: 'dizipal'
            }]);
            return;
        }
        
        // 3. Hiçbir şey bulunamadı
        console.error('[DiziPal] No video source found');
        resolve([]);
    });
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
                
                if (!title) throw new Error('No title');
                console.error('[DiziPal] Title: ' + title);

                var slugs = generateSlugs(title, originalTitle, isMovie, seasonNum, episodeNum);
                console.error('[DiziPal] Slug: ' + slugs[0]);

                function trySlug(index) {
                    if (index >= slugs.length) {
                        console.error('[DiziPal] All slugs failed');
                        resolve([]);
                        return;
                    }

                    var url = BASE_URL + slugs[index];
                    console.error('[DiziPal] Trying: ' + url);

                    fetch(url, { headers: HEADERS })
                        .then(function(res) { return res.text(); })
                        .then(function(html) {
                            if (html.indexOf('cf-browser-verification') !== -1) {
                                console.error('[DiziPal] Cloudflare block');
                                trySlug(index + 1);
                                return;
                            }

                            extractFromPage(html, url).then(function(streams) {
                                if (streams.length > 0) {
                                    console.error('[DiziPal] SUCCESS');
                                    resolve(streams);
                                } else {
                                    trySlug(index + 1);
                                }
                            });
                        })
                        .catch(function(err) {
                            console.error('[DiziPal] Fetch error: ' + err.message);
                            trySlug(index + 1);
                        });
                }

                trySlug(0);
            })
            .catch(function(err) {
                console.error('[DiziPal] Critical: ' + err.message);
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
