/**
 * DiziPal v58 - Salt Decode Variations
 * Salt'ı farklı şekillerde yorumla
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

function stringToBytes(str) {
    var bytes = [];
    for (var i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i) & 0xff);
    }
    return bytes;
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

// ========== SALT VARIATIONS ==========

function getSaltVariation1_DirectHex(saltHex) {
    // Direkt hex decode
    return hexToBytes(saltHex);
}

function getSaltVariation2_UpperThenHex(saltHex) {
    // Önce uppercase yap, sonra hex decode
    return hexToBytes(saltHex.toUpperCase());
}

function getSaltVariation3_LowerThenHex(saltHex) {
    // Önce lowercase yap, sonra hex decode  
    return hexToBytes(saltHex.toLowerCase());
}

function getSaltVariation4_ReverseHex(saltHex) {
    // Hex string'i tersine çevir, sonra decode
    return hexToBytes(saltHex.split('').reverse().join(''));
}

function getSaltVariation5_SwapPairs(saltHex) {
    // Her 2 karakteri swap et (ABCD -> BADC)
    var swapped = '';
    for (var i = 0; i < saltHex.length; i += 4) {
        if (i + 3 < saltHex.length) {
            swapped += saltHex[i+2] + saltHex[i+3] + saltHex[i] + saltHex[i+1];
        }
    }
    return hexToBytes(swapped);
}

function getSaltVariation6_TakeEvery2nd(saltHex) {
    // Her 2. karakteri al (1,3,5,7...)
    var every2nd = '';
    for (var i = 0; i < saltHex.length; i += 2) {
        every2nd += saltHex[i];
    }
    return hexToBytes(every2nd);
}

function getSaltVariation7_Base64(saltHex) {
    // Salt'i base64 olarak dene
    try {
        return base64ToBytes(saltHex);
    } catch (e) {
        return [];
    }
}

function getSaltVariation8_XorWithPass(saltHex, pass) {
    // Salt hex'ini passphrase ile XOR'la, sonra decode
    var xored = '';
    for (var i = 0; i < saltHex.length && i < pass.length; i++) {
        var c = saltHex.charCodeAt(i) ^ pass.charCodeAt(i);
        xored += String.fromCharCode(c);
    }
    // Sonra hex olarak dene
    return hexToBytes(xored);
}

// ========== KEY DERIVATION VARIATIONS ==========

function deriveKey1_Simple(salt, pass) {
    // İlk 32 byte salt
    var key = salt.slice(0, 32);
    // Passphrase ile XOR'la
    var passBytes = stringToBytes(pass);
    for (var i = 0; i < key.length; i++) {
        key[i] ^= passBytes[i % passBytes.length];
    }
    return key;
}

function deriveKey2_FullSalt(salt, pass) {
    // Tüm salt'ı kullan, 32 byte'a indir
    var mixed = [];
    var passBytes = stringToBytes(pass);
    for (var i = 0; i < salt.length; i++) {
        mixed.push((salt[i] + passBytes[i % passBytes.length]) & 0xff);
    }
    // İlk 32 byte al
    return mixed.slice(0, 32);
}

function deriveKey3_HashLike(salt, pass) {
    // Basit hash-like mixing
    var passBytes = stringToBytes(pass);
    var key = [];
    for (var i = 0; i < 32; i++) {
        var sum = 0;
        for (var j = 0; j < salt.length; j += 32) {
            if (i + j < salt.length) {
                sum += salt[i + j];
            }
        }
        key.push((sum + passBytes[i % passBytes.length]) & 0xff);
    }
    return key;
}

// ========== DECRYPTION ==========

function simpleDecrypt(ct, iv, key) {
    var res = [];
    for (var i = 0; i < ct.length; i++) {
        res.push(ct[i] ^ key[i % key.length] ^ iv[i % iv.length]);
    }
    return bytesToString(res);
}

function tryAllVariations(ciphertext, ivHex, saltHex) {
    var ct = base64ToBytes(ciphertext);
    var iv = hexToBytes(ivHex);
    var pass = PASSPHRASE;
    
    var saltVars = [
        { name: 'V1-DirectHex', fn: getSaltVariation1_DirectHex },
        { name: 'V2-UpperHex', fn: getSaltVariation2_UpperThenHex },
        { name: 'V3-LowerHex', fn: getSaltVariation3_LowerThenHex },
        { name: 'V4-ReverseHex', fn: getSaltVariation4_ReverseHex },
        { name: 'V5-SwapPairs', fn: getSaltVariation5_SwapPairs },
        { name: 'V6-Every2nd', fn: getSaltVariation6_TakeEvery2nd },
        { name: 'V7-Base64', fn: getSaltVariation7_Base64 },
        { name: 'V8-XorWithPass', fn: function(s) { return getSaltVariation8_XorWithPass(s, pass); } }
    ];
    
    var keyVars = [
        { name: 'K1-Simple', fn: deriveKey1_Simple },
        { name: 'K2-FullSalt', fn: deriveKey2_FullSalt },
        { name: 'K3-HashLike', fn: deriveKey3_HashLike }
    ];
    
    var logs = [];
    logs.push('\n=== SALT & KEY VARIATIONS ===');
    logs.push('CT: ' + ct.length + ', IV: ' + iv.length);
    logs.push('SaltHex: ' + saltHex.substring(0, 50) + '...');
    
    var foundUrl = null;
    
    for (var s = 0; s < saltVars.length; s++) {
        var salt = saltVars[s].fn(saltHex);
        if (salt.length === 0) {
            logs.push('\n[' + saltVars[s].name + '] Invalid salt');
            continue;
        }
        
        for (var k = 0; k < keyVars.length; k++) {
            var key = keyVars[k].fn(salt, pass);
            var result = simpleDecrypt(ct, iv, key);
            
            var hasUrl = result.indexOf('http') >= 0 || result.indexOf('//') >= 0;
            var marker = hasUrl ? '✓✓✓' : '✗';
            
            logs.push('\n[' + saltVars[s].name + ' + ' + keyVars[k].name + '] ' + marker);
            logs.push('SaltLen: ' + salt.length + ', KeyLen: ' + key.length);
            logs.push('Result: ' + result.substring(0, 50));
            
            if (hasUrl && !foundUrl) {
                foundUrl = result.replace(/\\\//g, '/');
                if (foundUrl.indexOf('://') === 0) foundUrl = 'https' + foundUrl;
                else if (foundUrl.indexOf('//') === 0) foundUrl = 'https:' + foundUrl;
                else if (foundUrl.indexOf('http') !== 0) foundUrl = 'https://' + foundUrl;
            }
        }
    }
    
    logs.push('\n=== FINAL ===');
    logs.push(foundUrl ? 'FOUND: ' + foundUrl : 'NOTHING FOUND');
    
    return { logs: logs.join('\n'), url: foundUrl };
}

// ========== MAIN ==========

function slugify(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY;

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var title = tmdbData.title || tmdbData.name;
                var s = slugify(title);
                var url = BASE_URL + '/bolum/' + s + '-' + seasonNum + 'x' + episodeNum;

                return fetch(url, { headers: HEADERS }).then(function(res) { return res.text(); });
            })
            .then(function(html) {
                var $ = cheerio.load(html);
                var encryptedDiv = $('div[data-rm-k=true]');
                
                if (encryptedDiv.length === 0) {
                    console.error('[DiziPal] NO ENCRYPTED DATA');
                    resolve([]);
                    return;
                }
                
                var encryptedText = encryptedDiv.text();
                var data = JSON.parse(encryptedText);
                
                var result = tryAllVariations(data.ciphertext, data.iv, data.salt);
                console.error('[DiziPal] ' + result.logs);
                
                if (result.url) {
                    resolve([{ name: 'DiziPal', url: result.url, quality: 'Auto', provider: 'dizipal' }]);
                } else {
                    resolve([]);
                }
            })
            .catch(function(err) {
                console.error('[DiziPal] ERROR: ' + err.message);
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
