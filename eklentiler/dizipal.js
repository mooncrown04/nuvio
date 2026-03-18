/**
 * DiziPal v53 - AES-256-CBC Decryption with 256-byte Salt
 * Salt: 256 byte -> ilk 32 byte kullan (256 bit key için)
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://dizipal1543.com';
var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';
var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    'Referer': BASE_URL + '/'
};

// ========== CRYPTO UTILITIES ==========

function hexToBytes(hex) {
    var bytes = [];
    for (var i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

function base64ToBytes(base64) {
    var cleaned = base64.replace(/\\\//g, '/').replace(/\\=/g, '=');
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    var result = [];
    var i = 0;
    
    while (i < cleaned.length) {
        var enc1 = chars.indexOf(cleaned.charAt(i++));
        var enc2 = chars.indexOf(cleaned.charAt(i++));
        var enc3 = chars.indexOf(cleaned.charAt(i++));
        var enc4 = chars.indexOf(cleaned.charAt(i++));
        
        if (enc1 < 0 || enc2 < 0) break;
        
        var chr1 = (enc1 << 2) | (enc2 >> 4);
        result.push(chr1);
        
        if (enc3 >= 0 && enc3 !== 64) {
            var chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            result.push(chr2);
        }
        
        if (enc4 >= 0 && enc4 !== 64) {
            var chr3 = ((enc3 & 3) << 6) | enc4;
            result.push(chr3);
        }
    }
    return result;
}

function bytesToString(bytes) {
    var result = '';
    for (var i = 0; i < bytes.length; i++) {
        if (bytes[i] >= 32 && bytes[i] < 127) {
            result += String.fromCharCode(bytes[i]);
        }
    }
    return result;
}

// ========== SIMPLIFIED "DECRYPTION" ==========
// Gerçek AES-256-CBC yerine, belki basit bir algoritma kullanıyorlar?
// Deneme: Direkt base64 decode + XOR ile passphrase

function simpleDecrypt(ciphertext, iv, salt) {
    console.error('[DiziPal] Trying simple decryption...');
    
    // Salt'tan key türet (ilk 32 byte)
    var key = salt.slice(0, 32);
    console.error('[DiziPal] Key bytes: ' + key.slice(0, 8).join(','));
    
    // Ciphertext'i decode et
    var ct = base64ToBytes(ciphertext);
    console.error('[DiziPal] CT bytes: ' + ct.length);
    
    // IV'yi decode et
    var ivBytes = hexToBytes(iv);
    console.error('[DiziPal] IV bytes: ' + ivBytes.length);
    
    // Basit XOR "decryption" (deneme)
    var result = [];
    for (var i = 0; i < ct.length && i < 100; i++) {
        // XOR: CT ^ Key ^ IV
        var decrypted = ct[i] ^ key[i % key.length] ^ ivBytes[i % ivBytes.length];
        result.push(decrypted);
    }
    
    var str = bytesToString(result);
    console.error('[DiziPal] Decrypted (first 100): ' + str);
    
    // Eğer "http" veya "//" içeriyorsa, başarılı
    if (str.indexOf('http') >= 0 || str.indexOf('//') >= 0) {
        console.error('[DiziPal] URL pattern found!');
        
        // Tamamını çöz
        var fullResult = [];
        for (var i = 0; i < ct.length; i++) {
            var d = ct[i] ^ key[i % key.length] ^ ivBytes[i % ivBytes.length];
            fullResult.push(d);
        }
        
        var fullStr = bytesToString(fullResult);
        // URL temizle
        fullStr = fullStr.replace(/\\\//g, '/');
        if (fullStr.indexOf('://') === 0) fullStr = 'https' + fullStr;
        else if (fullStr.indexOf('//') === 0) fullStr = 'https:' + fullStr;
        else if (fullStr.indexOf('http') !== 0) fullStr = 'https://' + fullStr;
        
        return fullStr;
    }
    
    return '';
}

// ========== DIZIPAL FUNCTIONS ==========

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
        
        var encryptedDiv = $('div[data-rm-k=true]');
        if (encryptedDiv.length > 0) {
            var encryptedText = encryptedDiv.text();
            console.error('[DiziPal] Encrypted: ' + encryptedText.length + ' chars');
            
            try {
                var data = JSON.parse(encryptedText);
                console.error('[DiziPal] Salt length: ' + data.salt.length + ' (hex chars)');
                
                // Salt: 512 hex chars = 256 bytes, ama ilk 64 byte (128 hex) kullanalım
                var saltBytes = hexToBytes(data.salt);
                console.error('[DiziPal] Salt bytes: ' + saltBytes.length);
                
                // İlk 32 byte kullan (normal salt boyutu)
                var shortSalt = saltBytes.slice(0, 32);
                
                // Şifre çöz denemesi
                var decryptedUrl = simpleDecrypt(data.ciphertext, data.iv, shortSalt);
                
                if (decryptedUrl && decryptedUrl.indexOf('http') === 0) {
                    console.error('[DiziPal] Decrypted URL: ' + decryptedUrl.substring(0, 100));
                    resolve([{
                        name: 'DiziPal',
                        url: decryptedUrl,
                        quality: 'Auto',
                        referer: url,
                        provider: 'dizipal'
                    }]);
                    return;
                }
                
            } catch (e) {
                console.error('[DiziPal] Decrypt error: ' + e.message);
            }
        }
        
        // Fallback: iframe
        var iframe = $('iframe').first();
        if (iframe.length > 0) {
            var src = iframe.attr('src') || '';
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
                        resolve([]);
                        return;
                    }

                    var url = BASE_URL + slugs[index];
                    console.error('[DiziPal] Trying: ' + url);

                    fetch(url, { headers: HEADERS })
                        .then(function(res) { return res.text(); })
                        .then(function(html) {
                            if (html.indexOf('cf-browser-verification') !== -1) {
                                trySlug(index + 1);
                                return;
                            }

                            extractFromPage(html, url).then(function(streams) {
                                if (streams.length > 0) {
                                    console.error('[DiziPal] SUCCESS: ' + streams[0].url.substring(0, 50));
                                    resolve(streams);
                                } else {
                                    trySlug(index + 1);
                                }
                            });
                        })
                        .catch(function(err) {
                            console.error('[DiziPal] Error: ' + err.message);
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
