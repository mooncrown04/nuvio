/**
 * DiziPal v50 - Ultra Debug Mode
 * Her adımı logla
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

// ========== DETAYLI DEBUG FONKSİYONLARI ==========

function debugHexDecode(hexStr, label) {
    console.error('[DiziPal][DEBUG] ' + label + ' hex length: ' + hexStr.length);
    console.error('[DiziPal][DEBUG] ' + label + ' hex preview: ' + hexStr.substring(0, 50));
    
    var bytes = [];
    var errors = 0;
    
    for (var i = 0; i < hexStr.length; i += 2) {
        var hexByte = hexStr.substr(i, 2);
        var byte = parseInt(hexByte, 16);
        
        if (isNaN(byte)) {
            console.error('[DiziPal][DEBUG] Invalid hex at ' + i + ': "' + hexByte + '"');
            errors++;
            byte = 0;
        }
        
        bytes.push(byte);
        
        // İlk 10 byte'ı detaylı göster
        if (i < 20) {
            console.error('[DiziPal][DEBUG] ' + label + '[' + (i/2) + '] = 0x' + hexByte + ' -> ' + byte);
        }
    }
    
    console.error('[DiziPal][DEBUG] ' + label + ' total bytes: ' + bytes.length);
    console.error('[DiziPal][DEBUG] ' + label + ' decode errors: ' + errors);
    
    return bytes;
}

function debugBase64Decode(b64Str, label) {
    console.error('[DiziPal][DEBUG] ' + label + ' base64 length: ' + b64Str.length);
    console.error('[DiziPal][DEBUG] ' + label + ' base64 preview: ' + b64Str.substring(0, 50));
    
    // Escape karakterlerini temizle
    var cleaned = b64Str.replace(/\\\//g, '/').replace(/\\=/g, '=');
    console.error('[DiziPal][DEBUG] ' + label + ' cleaned: ' + cleaned.substring(0, 50));
    
    try {
        var binary = atob(cleaned);
        var bytes = [];
        for (var i = 0; i < binary.length && i < 20; i++) {
            bytes.push(binary.charCodeAt(i));
            console.error('[DiziPal][DEBUG] ' + label + '[' + i + '] = ' + bytes[i]);
        }
        console.error('[DiziPal][DEBUG] ' + label + ' total bytes: ' + binary.length);
        return bytes;
    } catch (e) {
        console.error('[DiziPal][DEBUG] Base64 decode ERROR: ' + e.message);
        return [];
    }
}

// Hız testi - basit işlem ne kadar sürüyor?
function speedTest() {
    var start = Date.now();
    var sum = 0;
    for (var i = 0; i < 1000000; i++) {
        sum += i;
    }
    var end = Date.now();
    console.error('[DiziPal][DEBUG] 1M iteration time: ' + (end - start) + 'ms');
    return sum;
}

// ========== DECRYPTION ==========

function decryptDizipalData(rawJsonText) {
    console.error('[DiziPal][DEBUG] ========== DECRYPTION START ==========');
    
    try {
        // JSON parse dene
        var data;
        try {
            data = JSON.parse(rawJsonText);
            console.error('[DiziPal][DEBUG] JSON parse SUCCESS');
        } catch (e) {
            console.error('[DiziPal][DEBUG] JSON parse FAILED, using regex');
            var ctMatch = rawJsonText.match(/"ciphertext"\s*:\s*"([^"]+)"/);
            var ivMatch = rawJsonText.match(/"iv"\s*:\s*"([^"]+)"/);
            var saltMatch = rawJsonText.match(/"salt"\s*:\s*"([^"]+)"/);
            
            console.error('[DiziPal][DEBUG] Regex CT match: ' + (ctMatch ? 'YES' : 'NO'));
            console.error('[DiziPal][DEBUG] Regex IV match: ' + (ivMatch ? 'YES' : 'NO'));
            console.error('[DiziPal][DEBUG] Regex Salt match: ' + (saltMatch ? 'YES' : 'NO'));
            
            if (!ctMatch || !ivMatch || !saltMatch) {
                console.error('[DiziPal][DEBUG] Regex FAILED');
                return '';
            }
            
            data = {
                ciphertext: ctMatch[1],
                iv: ivMatch[1],
                salt: saltMatch[1]
            };
        }
        
        // Detaylı decode
        var salt = debugHexDecode(data.salt, 'SALT');
        var iv = debugHexDecode(data.iv, 'IV');
        var ct = debugBase64Decode(data.ciphertext, 'CT');
        
        // Salt analizi
        console.error('[DiziPal][DEBUG] SALT ANALYSIS:');
        console.error('[DiziPal][DEBUG] - Expected (normal): 8-16 bytes');
        console.error('[DiziPal][DEBUG] - Actual: ' + salt.length + ' bytes');
        
        if (salt.length === 256) {
            console.error('[DiziPal][DEBUG] WARNING: Salt is 256 bytes! Using first 16 bytes only');
            salt = salt.slice(0, 16);
        }
        
        // Hız testi
        console.error('[DiziPal][DEBUG] Running speed test...');
        speedTest();
        
        // Basit key türetme (çok hızlı)
        console.error('[DiziPal][DEBUG] Simple key derivation...');
        var keyStart = Date.now();
        
        var key = [];
        var passBytes = [];
        for (var i = 0; i < PASSPHRASE.length; i++) {
            passBytes.push(PASSPHRASE.charCodeAt(i));
        }
        
        // XOR-based key (gerçek PBKDF2 yerine - TEST İÇİN)
        for (var i = 0; i < 32; i++) {
            var k = passBytes[i % passBytes.length];
            k ^= salt[i % salt.length];
            k = (k * 7 + 13) % 256; // Basit mixing
            key.push(k);
        }
        
        var keyEnd = Date.now();
        console.error('[DiziPal][DEBUG] Key derivation time: ' + (keyEnd - keyStart) + 'ms');
        console.error('[DiziPal][DEBUG] Key preview: ' + key.slice(0, 8).join(','));
        
        // Basit "decrypt" (XOR - gerçek AES değil!)
        console.error('[DiziPal][DEBUG] XOR decryption...');
        var decrypted = [];
        for (var i = 0; i < Math.min(ct.length, 100); i++) { // Sadece ilk 100 byte
            decrypted.push(ct[i] ^ key[i % key.length] ^ iv[i % iv.length]);
        }
        
        console.error('[DiziPal][DEBUG] Decrypted bytes (first 20): ' + decrypted.slice(0, 20).join(','));
        
        // String'e çevir
        var result = '';
        for (var i = 0; i < decrypted.length; i++) {
            if (decrypted[i] >= 32 && decrypted[i] < 127) {
                result += String.fromCharCode(decrypted[i]);
            }
        }
        
        console.error('[DiziPal][DEBUG] Printable result: "' + result + '"');
        console.error('[DiziPal][DEBUG] Result length: ' + result.length);
        
        // URL format kontrolü
        if (result.indexOf('http') >= 0 || result.indexOf('//') >= 0) {
            console.error('[DiziPal][DEBUG] URL pattern FOUND in result');
        } else {
            console.error('[DiziPal][DEBUG] URL pattern NOT found');
        }
        
        console.error('[DiziPal][DEBUG] ========== DECRYPTION END ==========');
        
        // URL temizleme
        result = result.replace(/\\\//g, '/');
        if (result.indexOf('://') === 0) result = 'https' + result;
        else if (result.indexOf('//') === 0) result = 'https:' + result;
        else if (result.indexOf('http') !== 0) result = 'https://' + result;
        
        return result.indexOf('http') === 0 ? result : '';
        
    } catch (e) {
        console.error('[DiziPal][DEBUG] CRITICAL ERROR: ' + e.message);
        console.error('[DiziPal][DEBUG] Stack: ' + (e.stack || 'no stack'));
        return '';
    }
}

// ========== STREAM FUNCTIONS ==========

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
        var iframeUrl = '';
        
        var encryptedDiv = $('div[data-rm-k=true]');
        console.error('[DiziPal][DEBUG] Encrypted div found: ' + (encryptedDiv.length > 0 ? 'YES' : 'NO'));
        
        if (encryptedDiv.length > 0) {
            var encryptedText = encryptedDiv.text();
            console.error('[DiziPal][DEBUG] Encrypted text length: ' + encryptedText.length);
            console.error('[DiziPal][DEBUG] Encrypted text preview: ' + encryptedText.substring(0, 100));
            iframeUrl = decryptDizipalData(encryptedText);
        }
        
        if (!iframeUrl) {
            var iframe = $('iframe').first();
            console.error('[DiziPal][DEBUG] Fallback iframe found: ' + (iframe.length > 0 ? 'YES' : 'NO'));
            if (iframe.length > 0) {
                iframeUrl = iframe.attr('src') || '';
            }
        }
        
        console.error('[DiziPal][DEBUG] Final iframe URL: ' + (iframeUrl ? iframeUrl.substring(0, 100) : 'EMPTY'));
        
        if (!iframeUrl) {
            resolve([]);
            return;
        }
        
        if (iframeUrl.indexOf('//') === 0) iframeUrl = 'https:' + iframeUrl;
        
        resolve([{
            name: 'DiziPal',
            url: iframeUrl,
            quality: 'Auto',
            referer: url,
            provider: 'dizipal'
        }]);
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
                console.error('[DiziPal] Slugs: ' + slugs.join(', '));

                var index = 0;
                
                function tryNext() {
                    if (index >= slugs.length) {
                        console.error('[DiziPal] All slugs exhausted');
                        resolve([]);
                        return;
                    }

                    var path = slugs[index];
                    var url = BASE_URL + path;
                    index++;

                    console.error('[DiziPal] Trying: ' + url);

                    fetch(url, { headers: HEADERS })
                        .then(function(res) { return res.text(); })
                        .then(function(html) {
                            console.error('[DiziPal] Response length: ' + html.length);
                            
                            if (html.indexOf('cf-browser-verification') !== -1) {
                                console.error('[DiziPal] Cloudflare detected');
                                tryNext();
                                return;
                            }

                            extractFromPage(html, url).then(function(streams) {
                                if (streams.length > 0 && streams[0].url.indexOf('http') === 0) {
                                    console.error('[DiziPal] SUCCESS: ' + streams[0].url.substring(0, 100));
                                    resolve(streams);
                                } else {
                                    console.error('[DiziPal] Invalid result, trying next');
                                    tryNext();
                                }
                            });
                        })
                        .catch(function(err) {
                            console.error('[DiziPal] Fetch error: ' + err.message);
                            tryNext();
                        });
                }

                tryNext();
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
