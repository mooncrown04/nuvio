/**
 * DiziPal v56 - Üçlü Test (Crypto API + AES + Sonuç)
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

// ========== TEST 1: CRYPTO API VAR MI? ==========
function testCryptoAPI() {
    var results = [];
    
    results.push('=== TEST 1: CRYPTO API ===');
    
    if (typeof crypto !== 'undefined') {
        results.push('crypto: YES');
        results.push('crypto.subtle: ' + (crypto.subtle ? 'YES' : 'NO'));
        results.push('crypto.getRandomValues: ' + (crypto.getRandomValues ? 'YES' : 'NO'));
    } else {
        results.push('crypto: NO');
    }
    
    try {
        var nodeCrypto = require('crypto');
        results.push('node crypto: YES');
        results.push('node crypto.pbkdf2: ' + (nodeCrypto.pbkdf2 ? 'YES' : 'NO'));
        results.push('node crypto.createDecipheriv: ' + (nodeCrypto.createDecipheriv ? 'YES' : 'NO'));
    } catch (e) {
        results.push('node crypto: NO (' + e.message + ')');
    }
    
    if (typeof std !== 'undefined') {
        results.push('QuickJS std: YES');
        results.push('std.crypto: ' + (std.crypto ? 'YES' : 'NO'));
    } else {
        results.push('QuickJS std: NO');
    }
    
    return results.join('\n');
}

// ========== TEST 2: AES DECRYPTION ==========

// Minimal AES-256-CBC
var SBOX = [0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16];

var INV_SBOX = [0x52,0x09,0x6a,0xd5,0x30,0x36,0xa5,0x38,0xbf,0x40,0xa3,0x9e,0x81,0xf3,0xd7,0xfb,0x7c,0xe3,0x39,0x82,0x9b,0x2f,0xff,0x87,0x34,0x8e,0x43,0x44,0xc4,0xde,0xe9,0xcb,0x54,0x7b,0x94,0x32,0xa6,0xc2,0x23,0x3d,0xee,0x4c,0x95,0x0b,0x42,0xfa,0xc3,0x4e,0x08,0x2e,0xa1,0x66,0x28,0xd9,0x24,0xb2,0x76,0x5b,0xa2,0x49,0x6d,0x8b,0xd1,0x25,0x72,0xf8,0xf6,0x64,0x86,0x68,0x98,0x16,0xd4,0xa4,0x5c,0xcc,0x5d,0x65,0xb6,0x92,0x6c,0x70,0x48,0x50,0xfd,0xed,0xb9,0xda,0x5e,0x15,0x46,0x57,0xa7,0x8d,0x9d,0x84,0x90,0xd8,0xab,0x00,0x8c,0xbc,0xd3,0x0a,0xf7,0xe4,0x58,0x05,0xb8,0xb3,0x45,0x06,0xd0,0x2c,0x1e,0x8f,0xca,0x3f,0x0f,0x02,0xc1,0xaf,0xbd,0x03,0x01,0x13,0x8a,0x6b,0x3a,0x91,0x11,0x41,0x4f,0x67,0xdc,0xea,0x97,0xf2,0xcf,0xce,0xf0,0xb4,0xe6,0x73,0x96,0xac,0x74,0x22,0xe7,0xad,0x35,0x85,0xe2,0xf9,0x37,0xe8,0x1c,0x75,0xdf,0x6e,0x47,0xf1,0x1a,0x71,0x1d,0x29,0xc5,0x89,0x6f,0xb7,0x62,0x0e,0xaa,0x18,0xbe,0x1b,0xfc,0x56,0x3e,0x4b,0xc6,0xd2,0x79,0x20,0x9a,0xdb,0xc0,0xfe,0x78,0xcd,0x5a,0xf4,0x1f,0xdd,0xa8,0x33,0x88,0x07,0xc7,0x31,0xb1,0x12,0x10,0x59,0x27,0x80,0xec,0x5f,0x60,0x51,0x7f,0xa9,0x19,0xb5,0x4a,0x0d,0x2d,0xe5,0x7a,0x9f,0x93,0xc9,0x9c,0xef,0xa0,0xe0,0x3b,0x4d,0xae,0x2a,0xf5,0xb0,0xc8,0xeb,0xbb,0x3c,0x83,0x53,0x99,0x61,0x17,0x2b,0x04,0x7e,0xba,0x77,0xd6,0x26,0xe1,0x69,0x14,0x63,0x55,0x21,0x0c,0x7d];

function gmul(a, b) {
    var p = 0;
    for (var i = 0; i < 8; i++) {
        if ((b & 1) !== 0) p ^= a;
        var hi = a & 0x80;
        a <<= 1;
        if (hi !== 0) a ^= 0x1b;
        b >>= 1;
    }
    return p & 0xff;
}

function expandKey(key) {
    var w = [];
    for (var i = 0; i < 60; i++) w[i] = 0;
    for (var i = 0; i < 8; i++) {
        w[i] = (key[i*4] << 24) | (key[i*4+1] << 16) | (key[i*4+2] << 8) | key[i*4+3];
    }
    var RCON = [0x00,0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];
    for (var i = 8; i < 60; i++) {
        var temp = w[i-1];
        if (i % 8 === 0) {
            temp = ((SBOX[(temp >> 16) & 0xff] << 24) | (SBOX[(temp >> 8) & 0xff] << 16) | (SBOX[temp & 0xff] << 8) | SBOX[(temp >> 24) & 0xff]) ^ (RCON[Math.floor(i/8)] << 24);
        } else if (i % 8 === 4) {
            temp = (SBOX[(temp >> 24) & 0xff] << 24) | (SBOX[(temp >> 16) & 0xff] << 16) | (SBOX[(temp >> 8) & 0xff] << 8) | SBOX[temp & 0xff];
        }
        w[i] = w[i-8] ^ temp;
    }
    return w;
}

function decryptBlock(input, key) {
    var state = [];
    for (var i = 0; i < 16; i++) state[i] = input[i];
    var w = expandKey(key);
    
    // AddRoundKey (round 14)
    for (var i = 0; i < 4; i++) {
        var word = w[56 + i];
        state[i*4] ^= (word >> 24) & 0xff;
        state[i*4+1] ^= (word >> 16) & 0xff;
        state[i*4+2] ^= (word >> 8) & 0xff;
        state[i*4+3] ^= word & 0xff;
    }
    
    // 13 rounds
    for (var round = 13; round >= 1; round--) {
        // InvShiftRows
        var t = [state[0],state[13],state[10],state[7],state[4],state[1],state[14],state[11],state[8],state[5],state[2],state[15],state[12],state[9],state[6],state[3]];
        for (var i = 0; i < 16; i++) state[i] = t[i];
        
        // InvSubBytes
        for (var i = 0; i < 16; i++) state[i] = INV_SBOX[state[i]];
        
        // AddRoundKey
        for (var i = 0; i < 4; i++) {
            var word = w[round*4 + i];
            state[i*4] ^= (word >> 24) & 0xff;
            state[i*4+1] ^= (word >> 16) & 0xff;
            state[i*4+2] ^= (word >> 8) & 0xff;
            state[i*4+3] ^= word & 0xff;
        }
        
        // InvMixColumns
        for (var i = 0; i < 4; i++) {
            var s0 = state[i*4], s1 = state[i*4+1], s2 = state[i*4+2], s3 = state[i*4+3];
            state[i*4] = gmul(s0,0x0e) ^ gmul(s1,0x0b) ^ gmul(s2,0x0d) ^ gmul(s3,0x09);
            state[i*4+1] = gmul(s0,0x09) ^ gmul(s1,0x0e) ^ gmul(s2,0x0b) ^ gmul(s3,0x0d);
            state[i*4+2] = gmul(s0,0x0d) ^ gmul(s1,0x09) ^ gmul(s2,0x0e) ^ gmul(s3,0x0b);
            state[i*4+3] = gmul(s0,0x0b) ^ gmul(s1,0x0d) ^ gmul(s2,0x09) ^ gmul(s3,0x0e);
        }
    }
    
    // Final round
    var t = [state[0],state[13],state[10],state[7],state[4],state[1],state[14],state[11],state[8],state[5],state[2],state[15],state[12],state[9],state[6],state[3]];
    for (var i = 0; i < 16; i++) state[i] = t[i];
    for (var i = 0; i < 16; i++) state[i] = INV_SBOX[state[i]];
    for (var i = 0; i < 4; i++) {
        var word = w[i];
        state[i*4] ^= (word >> 24) & 0xff;
        state[i*4+1] ^= (word >> 16) & 0xff;
        state[i*4+2] ^= (word >> 8) & 0xff;
        state[i*4+3] ^= word & 0xff;
    }
    
    return state;
}

function aes256CbcDecrypt(ciphertext, key, iv) {
    var result = [];
    var prevBlock = iv.slice(0, 16);
    for (var i = 0; i < ciphertext.length; i += 16) {
        var block = ciphertext.slice(i, i + 16);
        while (block.length < 16) block.push(0);
        var decrypted = decryptBlock(block, key);
        for (var j = 0; j < 16; j++) decrypted[j] ^= prevBlock[j];
        result = result.concat(decrypted);
        prevBlock = block;
    }
    var padLen = result[result.length - 1];
    if (padLen > 0 && padLen <= 16) result = result.slice(0, result.length - padLen);
    return result;
}

function sha512(message) {
    var h = [];
    for (var i = 0; i < 64; i++) h[i] = 0;
    for (var i = 0; i < message.length; i++) {
        h[i % 64] = (h[i % 64] + message[i]) & 0xff;
        h[i % 64] = ((h[i % 64] << 1) | (h[i % 64] >> 7)) & 0xff;
    }
    return h;
}

function pbkdf2Sha512(password, salt, iterations, keyLen) {
    var result = [];
    var block = salt.slice(0);
    block.push(0, 0, 0, 1);
    var U = sha512(password.concat(block));
    var T = U.slice(0);
    for (var i = 1; i < Math.min(iterations, 10); i++) {
        U = sha512(password.concat(U));
        for (var j = 0; j < 64; j++) T[j] ^= U[j];
    }
    return T.slice(0, keyLen);
}

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
    for (var i = 0; i < bytes.length; i++) result += String.fromCharCode(bytes[i]);
    return result;
}

function testAESDecryption(encryptedText) {
    var results = [];
    results.push('\n=== TEST 2: AES DECRYPTION ===');
    
    try {
        var data = JSON.parse(encryptedText);
        var ct = base64ToBytes(data.ciphertext);
        var iv = hexToBytes(data.iv);
        var salt = hexToBytes(data.salt);
        
        results.push('CT: ' + ct.length + ' bytes');
        results.push('IV: ' + iv.length + ' bytes');
        results.push('Salt: ' + salt.length + ' bytes');
        
        var shortSalt = salt.slice(0, 32);
        var passBytes = [];
        for (var i = 0; i < PASSPHRASE.length; i++) passBytes.push(PASSPHRASE.charCodeAt(i) & 0xff);
        
        var key = pbkdf2Sha512(passBytes, shortSalt, 999, 32);
        results.push('Key: ' + key.slice(0, 8).join(','));
        
        var decrypted = aes256CbcDecrypt(ct, key, iv);
        results.push('Decrypted: ' + decrypted.length + ' bytes');
        
        var str = bytesToString(decrypted);
        results.push('String: ' + str.substring(0, 50));
        results.push('Contains http: ' + (str.indexOf('http') >= 0 || str.indexOf('//') >= 0));
        
        return { results: results.join('\n'), url: str };
        
    } catch (e) {
        results.push('ERROR: ' + e.message);
        return { results: results.join('\n'), url: '' };
    }
}

// ========== TEST 3: FULL FLOW ==========

function slugify(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    return new Promise(function(resolve, reject) {
        var allLogs = [];
        
        // Test 1
        allLogs.push(testCryptoAPI());
        
        var isMovie = mediaType === 'movie';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY;

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(tmdbData) {
                var title = tmdbData.title || tmdbData.name;
                var s = slugify(title);
                var url = BASE_URL + '/bolum/' + s + '-' + seasonNum + 'x' + episodeNum;
                
                allLogs.push('\nTitle: ' + title);
                allLogs.push('URL: ' + url);

                return fetch(url, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var $ = cheerio.load(html);
                var encryptedDiv = $('div[data-rm-k=true]');
                
                allLogs.push('\n=== TEST 3: FULL FLOW ===');
                allLogs.push('Encrypted div found: ' + (encryptedDiv.length > 0 ? 'YES' : 'NO'));
                
                if (encryptedDiv.length > 0) {
                    var encryptedText = encryptedDiv.text();
                    allLogs.push('Encrypted length: ' + encryptedText.length);
                    
                    // Test 2
                    var aesResult = testAESDecryption(encryptedText);
                    allLogs.push(aesResult.results);
                    
                    // Final result
                    var finalUrl = aesResult.url;
                    if (finalUrl) {
                        finalUrl = finalUrl.replace(/\\\//g, '/');
                        if (finalUrl.indexOf('://') === 0) finalUrl = 'https' + finalUrl;
                        else if (finalUrl.indexOf('//') === 0) finalUrl = 'https:' + finalUrl;
                        else if (finalUrl.indexOf('http') !== 0) finalUrl = 'https://' + finalUrl;
                    }
                    
                    allLogs.push('\n=== FINAL RESULT ===');
                    allLogs.push('URL: ' + (finalUrl || 'FAILED'));
                    
                    // Tek seferde tüm logları yazdır
                    console.error('[DiziPal] ' + allLogs.join('\n[DiziPal] '));
                    
                    if (finalUrl && finalUrl.indexOf('http') === 0) {
                        resolve([{ name: 'DiziPal', url: finalUrl, quality: 'Auto', referer: url, provider: 'dizipal' }]);
                    } else {
                        resolve([]);
                    }
                } else {
                    allLogs.push('No encrypted data found');
                    console.error('[DiziPal] ' + allLogs.join('\n[DiziPal] '));
                    resolve([]);
                }
            })
            .catch(function(err) {
                allLogs.push('ERROR: ' + err.message);
                console.error('[DiziPal] ' + allLogs.join('\n[DiziPal] '));
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
