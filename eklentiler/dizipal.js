/**
 * DiziPal v54 - Multiple Decryption Attempts
 * Farklı key türetme yöntemlerini dene
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

// ========== UTILITIES ==========

function hexToBytes(hex) {
    var bytes = [];
    for (var i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return bytes;
}

function base64ToBytes(base64) {
    var cleaned = base64.replace(/\\\//g, '/').replace(/\\=/g, '=');
    try {
        var binary = atob(cleaned);
        var bytes = [];
        for (var i = 0; i < binary.length; i++) {
            bytes.push(binary.charCodeAt(i));
        }
        return bytes;
    } catch (e) {
        return [];
    }
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

// ========== DECRYPTION ATTEMPTS ==========

function attempt1_Xor(ct, iv, salt, passphrase) {
    // Basit XOR
    var key = salt.slice(0, 32);
    var result = [];
    for (var i = 0; i < ct.length; i++) {
        result.push(ct[i] ^ key[i % key.length] ^ iv[i % iv.length]);
    }
    return bytesToString(result);
}

function attempt2_PassphraseXor(ct, iv, salt, passphrase) {
    // Passphrase'ten key türet
    var passBytes = [];
    for (var i = 0; i < passphrase.length; i++) {
        passBytes.push(passphrase.charCodeAt(i) & 0xff);
    }
    
    var result = [];
    for (var i = 0; i < ct.length; i++) {
        var keyByte = passBytes[i % passBytes.length];
        var saltByte = salt[i % salt.length]; // 256 byte salt'ın tamamı
        result.push(ct[i] ^ keyByte ^ saltByte ^ iv[i % iv.length]);
    }
    return bytesToString(result);
}

function attempt3_SaltedPassphrase(ct, iv, salt, passphrase) {
    // Passphrase + salt mixing
    var passBytes = [];
    for (var i = 0; i < passphrase.length; i++) {
        passBytes.push(passphrase.charCodeAt(i) & 0xff);
    }
    
    // Salt ve passphrase'i karıştır
    var mixed = [];
    for (var i = 0; i < 64; i++) {
        var p = passBytes[i % passBytes.length];
        var s = salt[i % salt.length];
        mixed.push((p + s) & 0xff);
    }
    
    var result = [];
    for (var i = 0; i < ct.length; i++) {
        result.push(ct[i] ^ mixed[i % mixed.length] ^ iv[i % iv.length]);
    }
    return bytesToString(result);
}

function attempt4_Reversed(ct, iv, salt, passphrase) {
    // Tersine çevirme denemesi
    var revCt = ct.slice().reverse();
    var key = salt.slice(0, 32);
    var result = [];
    for (var i = 0; i < revCt.length; i++) {
        result.push(revCt[i] ^ key[i % key.length]);
    }
    return bytesToString(result);
}

function attempt5_CtrMode(ct, iv, salt, passphrase) {
    // CTR-like mode denemesi
    var key = salt.slice(0, 32);
    var result = [];
    for (var i = 0; i < ct.length; i++) {
        var counter = (iv[i % iv.length] + i) & 0xff;
        result.push(ct[i] ^ key[i % key.length] ^ counter);
    }
    return bytesToString(result);
}

function tryAllDecryptions(ciphertext, iv, salt) {
    var ct = base64ToBytes(ciphertext);
    var ivBytes = hexToBytes(iv);
    var saltBytes = hexToBytes(salt);
    
    console.error('[DiziPal] CT: ' + ct.length + ' bytes');
    console.error('[DiziPal] IV: ' + ivBytes.length + ' bytes');
    console.error('[DiziPal] Salt: ' + saltBytes.length + ' bytes');
    
    var attempts = [
        { name: 'Simple XOR', fn: attempt1_Xor },
        { name: 'Passphrase XOR', fn: attempt2_PassphraseXor },
        { name: 'Salted Passphrase', fn: attempt3_SaltedPassphrase },
        { name: 'Reversed CT', fn: attempt4_Reversed },
        { name: 'CTR-like', fn: attempt5_CtrMode }
    ];
    
    for (var i = 0; i < attempts.length; i++) {
        console.error('[DiziPal] Trying ' + attempts[i].name + '...');
        var result = attempts[i].fn(ct, ivBytes, saltBytes, PASSPHRASE);
        console.error('[DiziPal] Result: ' + result.substring(0, 50));
        
        if (result.indexOf('http') >= 0 || result.indexOf('//') >= 0) {
            console.error('[DiziPal] ✓ SUCCESS with ' + attempts[i].name);
            
            // URL temizle
            result = result.replace(/\\\//g, '/');
            if (result.indexOf('://') === 0) result = 'https' + result;
            else if (result.indexOf('//') === 0) result = 'https:' + result;
            else if (result.indexOf('http') !== 0) result = 'https://' + result;
            
            return result;
        }
    }
    
    console.error('[DiziPal] All attempts failed');
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
                var decryptedUrl = tryAllDecryptions(data.ciphertext, data.iv, data.salt);
                
                if (decryptedUrl) {
                    console.error('[DiziPal] Final URL: ' + decryptedUrl.substring(0, 100));
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
                console.error('[DiziPal] Error: ' + e.message);
            }
        }
        
        // Fallback
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
                                    console.error('[DiziPal] SUCCESS');
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
