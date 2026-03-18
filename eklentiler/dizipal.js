/**
 * DiziPal v57 - Mega Test (Tüm olasılıklar)
 * 15 farklı decryption yöntemi tek seferde
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
    for (var i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
    return bytes;
}

function base64ToBytes(base64) {
    var cleaned = base64.replace(/\\\//g, '/').replace(/\\=/g, '=');
    try {
        var binary = atob(cleaned);
        var bytes = [];
        for (var i = 0; i < binary.length; i++) bytes.push(binary.charCodeAt(i));
        return bytes;
    } catch (e) { return []; }
}

function bytesToString(bytes) {
    var result = '';
    for (var i = 0; i < bytes.length; i++) {
        if (bytes[i] >= 32 && bytes[i] < 127) result += String.fromCharCode(bytes[i]);
    }
    return result;
}

function bytesToHex(bytes) {
    return bytes.map(function(b) { return (b < 16 ? '0' : '') + b.toString(16); }).join('');
}

function rotateLeft(byte, n) { return ((byte << n) | (byte >> (8 - n))) & 0xff; }
function rotateRight(byte, n) { return ((byte >> n) | (byte << (8 - n))) & 0xff; }

// ========== 15 FARKLI DECRYPTION DENEMESİ ==========

function attempt1_SimpleXor(ct, iv, salt, pass) {
    var key = salt.slice(0, 32);
    var res = [];
    for (var i = 0; i < ct.length; i++) res.push(ct[i] ^ key[i % key.length] ^ iv[i % iv.length]);
    return bytesToString(res);
}

function attempt2_FullSaltXor(ct, iv, salt, pass) {
    var res = [];
    for (var i = 0; i < ct.length; i++) res.push(ct[i] ^ salt[i % salt.length] ^ iv[i % iv.length]);
    return bytesToString(res);
}

function attempt3_PassphraseXor(ct, iv, salt, pass) {
    var res = [];
    for (var i = 0; i < ct.length; i++) res.push(ct[i] ^ pass[i % pass.length] ^ iv[i % iv.length]);
    return bytesToString(res);
}

function attempt4_CombinedXor(ct, iv, salt, pass) {
    var res = [];
    for (var i = 0; i < ct.length; i++) {
        var key = (salt[i % salt.length] + pass[i % pass.length]) & 0xff;
        res.push(ct[i] ^ key ^ iv[i % iv.length]);
    }
    return bytesToString(res);
}

function attempt5_SaltPassMix(ct, iv, salt, pass) {
    var mixed = [];
    for (var i = 0; i < 64; i++) mixed.push((salt[i % salt.length] ^ pass[i % pass.length]) & 0xff);
    var res = [];
    for (var i = 0; i < ct.length; i++) res.push(ct[i] ^ mixed[i % mixed.length] ^ iv[i % iv.length]);
    return bytesToString(res);
}

function attempt6_ReversedCT(ct, iv, salt, pass) {
    var rev = ct.slice().reverse();
    var key = salt.slice(0, 32);
    var res = [];
    for (var i = 0; i < rev.length; i++) res.push(rev[i] ^ key[i % key.length]);
    return bytesToString(res);
}

function attempt7_RotatedCT(ct, iv, salt, pass) {
    var key = salt.slice(0, 32);
    var res = [];
    for (var i = 0; i < ct.length; i++) res.push(rotateLeft(ct[i], 3) ^ key[i % key.length] ^ iv[i % iv.length]);
    return bytesToString(res);
}

function attempt8_Additive(ct, iv, salt, pass) {
    var res = [];
    for (var i = 0; i < ct.length; i++) {
        var key = (salt[i % salt.length] + pass[i % pass.length] + iv[i % iv.length]) & 0xff;
        res.push((ct[i] - key + 256) & 0xff);
    }
    return bytesToString(res);
}

function attempt9_SaltOnlyFirstHalf(ct, iv, salt, pass) {
    var halfSalt = salt.slice(0, 128);
    var res = [];
    for (var i = 0; i < ct.length; i++) res.push(ct[i] ^ halfSalt[i % halfSalt.length] ^ iv[i % iv.length]);
    return bytesToString(res);
}

function attempt10_SaltOnlySecondHalf(ct, iv, salt, pass) {
    var halfSalt = salt.slice(128);
    var res = [];
    for (var i = 0; i < ct.length; i++) res.push(ct[i] ^ halfSalt[i % halfSalt.length] ^ iv[i % iv.length]);
    return bytesToString(res);
}

function attempt11_Every2ndByteSalt(ct, iv, salt, pass) {
    var res = [];
    for (var i = 0; i < ct.length; i++) {
        var s = salt[(i * 2) % salt.length];
        res.push(ct[i] ^ s ^ iv[i % iv.length]);
    }
    return bytesToString(res);
}

function attempt12_SaltHashSimple(ct, iv, salt, pass) {
    var hash = 0;
    for (var i = 0; i < salt.length; i++) hash = (hash + salt[i]) & 0xff;
    var res = [];
    for (var i = 0; i < ct.length; i++) res.push(ct[i] ^ hash ^ iv[i % iv.length] ^ pass[i % pass.length]);
    return bytesToString(res);
}

function attempt13_CtrModeLike(ct, iv, salt, pass) {
    var key = salt.slice(0, 32);
    var res = [];
    for (var i = 0; i < ct.length; i++) {
        var counter = (iv[i % iv.length] + i + pass[i % pass.length]) & 0xff;
        res.push(ct[i] ^ key[i % key.length] ^ counter);
    }
    return bytesToString(res);
}

function attempt14_NoIV(ct, iv, salt, pass) {
    var key = salt.slice(0, 32);
    var res = [];
    for (var i = 0; i < ct.length; i++) res.push(ct[i] ^ key[i % key.length]);
    return bytesToString(res);
}

function attempt15_SaltAsKeyDirect(ct, iv, salt, pass) {
    // Salt'ı direkt key olarak kullan (32 byte al)
    var key = salt.slice(0, 32);
    var res = [];
    for (var i = 0; i < ct.length; i++) {
        // CBC-like: önceki sonucu da XOR'la
        var prev = i > 0 ? res[i-1] : iv[i % iv.length];
        res.push(ct[i] ^ key[i % key.length] ^ prev);
    }
    return bytesToString(res);
}

// ========== TÜM DENEMELERİ ÇALIŞTIR ==========

function tryAllDecryptions(ciphertext, ivHex, saltHex) {
    var ct = base64ToBytes(ciphertext);
    var iv = hexToBytes(ivHex);
    var salt = hexToBytes(saltHex);
    var pass = [];
    for (var i = 0; i < PASSPHRASE.length; i++) pass.push(PASSPHRASE.charCodeAt(i) & 0xff);
    
    var attempts = [
        { name: '01-SimpleXor-32byte', fn: attempt1_SimpleXor },
        { name: '02-FullSaltXor-256byte', fn: attempt2_FullSaltXor },
        { name: '03-PassphraseXor', fn: attempt3_PassphraseXor },
        { name: '04-CombinedXor', fn: attempt4_CombinedXor },
        { name: '05-SaltPassMix', fn: attempt5_SaltPassMix },
        { name: '06-ReversedCT', fn: attempt6_ReversedCT },
        { name: '07-RotatedCT', fn: attempt7_RotatedCT },
        { name: '08-Additive', fn: attempt8_Additive },
        { name: '09-SaltFirstHalf', fn: attempt9_SaltOnlyFirstHalf },
        { name: '10-SaltSecondHalf', fn: attempt10_SaltOnlySecondHalf },
        { name: '11-Every2ndByte', fn: attempt11_Every2ndByteSalt },
        { name: '12-SaltHash', fn: attempt12_SaltHashSimple },
        { name: '13-CtrMode', fn: attempt13_CtrModeLike },
        { name: '14-NoIV', fn: attempt14_NoIV },
        { name: '15-SaltKeyDirect-CBC', fn: attempt15_SaltAsKeyDirect }
    ];
    
    var logs = [];
    logs.push('\n=== 15 DECRYPTION ATTEMPTS ===');
    logs.push('CT: ' + ct.length + ' bytes, IV: ' + iv.length + ' bytes, Salt: ' + salt.length + ' bytes');
    logs.push('Pass: ' + pass.length + ' bytes');
    logs.push('Salt[0-7]: ' + salt.slice(0, 8).join(','));
    logs.push('IV[0-7]: ' + iv.slice(0, 8).join(','));
    logs.push('CT[0-7]: ' + ct.slice(0, 8).join(','));
    
    var foundUrl = null;
    
    for (var i = 0; i < attempts.length; i++) {
        try {
            var result = attempts[i].fn(ct, iv, salt, pass);
            var hasUrl = result.indexOf('http') >= 0 || result.indexOf('//') >= 0;
            var status = hasUrl ? '✓✓✓ URL FOUND!' : '✗';
            logs.push('\n[' + attempts[i].name + '] ' + status);
            logs.push('Result: ' + result.substring(0, 60));
            
            if (hasUrl && !foundUrl) {
                foundUrl = result.replace(/\\\//g, '/');
                if (foundUrl.indexOf('://') === 0) foundUrl = 'https' + foundUrl;
                else if (foundUrl.indexOf('//') === 0) foundUrl = 'https:' + foundUrl;
                else if (foundUrl.indexOf('http') !== 0) foundUrl = 'https://' + foundUrl;
            }
        } catch (e) {
            logs.push('\n[' + attempts[i].name + '] ERROR: ' + e.message);
        }
    }
    
    logs.push('\n=== BEST RESULT ===');
    logs.push(foundUrl ? 'URL: ' + foundUrl : 'NO VALID URL FOUND');
    
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
                
                var result = tryAllDecryptions(data.ciphertext, data.iv, data.salt);
                
                // Tek seferde tüm loglar
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
