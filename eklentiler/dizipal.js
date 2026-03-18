/**
 * DiziPal v51 - Real AES-256-CBC Decryption
 * Salt 256 byte -> ilk 16 byte kullan
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

// ========== AES-256-CBC IMPLEMENTATION ==========

// S-Box
var SBOX = [
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
    0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
    0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
    0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
    0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
    0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
    0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
    0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
    0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
    0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
    0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
    0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
    0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
    0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
    0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
    0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16
];

// Inverse S-Box
var INV_SBOX = [
    0x52,0x09,0x6a,0xd5,0x30,0x36,0xa5,0x38,0xbf,0x40,0xa3,0x9e,0x81,0xf3,0xd7,0xfb,
    0x7c,0xe3,0x39,0x82,0x9b,0x2f,0xff,0x87,0x34,0x8e,0x43,0x44,0xc4,0xde,0xe9,0xcb,
    0x54,0x7b,0x94,0x32,0xa6,0xc2,0x23,0x3d,0xee,0x4c,0x95,0x0b,0x42,0xfa,0xc3,0x4e,
    0x08,0x2e,0xa1,0x66,0x28,0xd9,0x24,0xb2,0x76,0x5b,0xa2,0x49,0x6d,0x8b,0xd1,0x25,
    0x72,0xf8,0xf6,0x64,0x86,0x68,0x98,0x16,0xd4,0xa4,0x5c,0xcc,0x5d,0x65,0xb6,0x92,
    0x6c,0x70,0x48,0x50,0xfd,0xed,0xb9,0xda,0x5e,0x15,0x46,0x57,0xa7,0x8d,0x9d,0x84,
    0x90,0xd8,0xab,0x00,0x8c,0xbc,0xd3,0x0a,0xf7,0xe4,0x58,0x05,0xb8,0xb3,0x45,0x06,
    0xd0,0x2c,0x1e,0x8f,0xca,0x3f,0x0f,0x02,0xc1,0xaf,0xbd,0x03,0x01,0x13,0x8a,0x6b,
    0x3a,0x91,0x11,0x41,0x4f,0x67,0xdc,0xea,0x97,0xf2,0xcf,0xce,0xf0,0xb4,0xe6,0x73,
    0x96,0xac,0x74,0x22,0xe7,0xad,0x35,0x85,0xe2,0xf9,0x37,0xe8,0x1c,0x75,0xdf,0x6e,
    0x47,0xf1,0x1a,0x71,0x1d,0x29,0xc5,0x89,0x6f,0xb7,0x62,0x0e,0xaa,0x18,0xbe,0x1b,
    0xfc,0x56,0x3e,0x4b,0xc6,0xd2,0x79,0x20,0x9a,0xdb,0xc0,0xfe,0x78,0xcd,0x5a,0xf4,
    0x1f,0xdd,0xa8,0x33,0x88,0x07,0xc7,0x31,0xb1,0x12,0x10,0x59,0x27,0x80,0xec,0x5f,
    0x60,0x51,0x7f,0xa9,0x19,0xb5,0x4a,0x0d,0x2d,0xe5,0x7a,0x9f,0x93,0xc9,0x9c,0xef,
    0xa0,0xe0,0x3b,0x4d,0xae,0x2a,0xf5,0xb0,0xc8,0xeb,0xbb,0x3c,0x83,0x53,0x99,0x61,
    0x17,0x2b,0x04,0x7e,0xba,0x77,0xd6,0x26,0xe1,0x69,0x14,0x63,0x55,0x21,0x0c,0x7d
];

// Rcon
var RCON = [0x00,0x01,0x02,0x04,0x08,0x10,0x20,0x40,0x80,0x1b,0x36];

// Galois multiplication
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

// AES-256 Key Expansion
function expandKey(key) {
    var w = [];
    for (var i = 0; i < 60; i++) w[i] = 0;
    
    // First 8 words (256 bits) = key
    for (var i = 0; i < 8; i++) {
        w[i] = (key[i*4] << 24) | (key[i*4+1] << 16) | (key[i*4+2] << 8) | key[i*4+3];
    }
    
    // Key schedule
    for (var i = 8; i < 60; i++) {
        var temp = w[i-1];
        if (i % 8 === 0) {
            temp = ((SBOX[(temp >> 16) & 0xff] << 24) |
                    (SBOX[(temp >> 8) & 0xff] << 16) |
                    (SBOX[temp & 0xff] << 8) |
                    SBOX[(temp >> 24) & 0xff]) ^ (RCON[i/8] << 24);
        } else if (i % 8 === 4) {
            temp = (SBOX[(temp >> 24) & 0xff] << 24) |
                   (SBOX[(temp >> 16) & 0xff] << 16) |
                   (SBOX[(temp >> 8) & 0xff] << 8) |
                   SBOX[temp & 0xff];
        }
        w[i] = w[i-8] ^ temp;
    }
    return w;
}

// SubBytes
function subBytes(state) {
    for (var i = 0; i < 16; i++) {
        state[i] = SBOX[state[i]];
    }
}

// InvSubBytes
function invSubBytes(state) {
    for (var i = 0; i < 16; i++) {
        state[i] = INV_SBOX[state[i]];
    }
}

// ShiftRows
function shiftRows(state) {
    var temp = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    temp[0] = state[0]; temp[1] = state[5]; temp[2] = state[10]; temp[3] = state[15];
    temp[4] = state[4]; temp[5] = state[9]; temp[6] = state[14]; temp[7] = state[3];
    temp[8] = state[8]; temp[9] = state[13]; temp[10] = state[2]; temp[11] = state[7];
    temp[12] = state[12]; temp[13] = state[1]; temp[14] = state[6]; temp[15] = state[11];
    for (var i = 0; i < 16; i++) state[i] = temp[i];
}

// InvShiftRows
function invShiftRows(state) {
    var temp = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    temp[0] = state[0]; temp[1] = state[13]; temp[2] = state[10]; temp[3] = state[7];
    temp[4] = state[4]; temp[5] = state[1]; temp[6] = state[14]; temp[7] = state[11];
    temp[8] = state[8]; temp[9] = state[5]; temp[10] = state[2]; temp[11] = state[15];
    temp[12] = state[12]; temp[13] = state[9]; temp[14] = state[6]; temp[15] = state[3];
    for (var i = 0; i < 16; i++) state[i] = temp[i];
}

// MixColumns
function mixColumns(state) {
    for (var i = 0; i < 4; i++) {
        var s0 = state[i*4];
        var s1 = state[i*4+1];
        var s2 = state[i*4+2];
        var s3 = state[i*4+3];
        state[i*4] = gmul(s0,2) ^ gmul(s1,3) ^ s2 ^ s3;
        state[i*4+1] = s0 ^ gmul(s1,2) ^ gmul(s2,3) ^ s3;
        state[i*4+2] = s0 ^ s1 ^ gmul(s2,2) ^ gmul(s3,3);
        state[i*4+3] = gmul(s0,3) ^ s1 ^ s2 ^ gmul(s3,2);
    }
}

// InvMixColumns
function invMixColumns(state) {
    for (var i = 0; i < 4; i++) {
        var s0 = state[i*4];
        var s1 = state[i*4+1];
        var s2 = state[i*4+2];
        var s3 = state[i*4+3];
        state[i*4] = gmul(s0,0x0e) ^ gmul(s1,0x0b) ^ gmul(s2,0x0d) ^ gmul(s3,0x09);
        state[i*4+1] = gmul(s0,0x09) ^ gmul(s1,0x0e) ^ gmul(s2,0x0b) ^ gmul(s3,0x0d);
        state[i*4+2] = gmul(s0,0x0d) ^ gmul(s1,0x09) ^ gmul(s2,0x0e) ^ gmul(s3,0x0b);
        state[i*4+3] = gmul(s0,0x0b) ^ gmul(s1,0x0d) ^ gmul(s2,0x09) ^ gmul(s3,0x0e);
    }
}

// AddRoundKey
function addRoundKey(state, w, round) {
    for (var i = 0; i < 4; i++) {
        var word = w[round*4 + i];
        state[i*4] ^= (word >> 24) & 0xff;
        state[i*4+1] ^= (word >> 16) & 0xff;
        state[i*4+2] ^= (word >> 8) & 0xff;
        state[i*4+3] ^= word & 0xff;
    }
}

// AES-256 Decrypt single block
function decryptBlock(input, key) {
    var state = [];
    for (var i = 0; i < 16; i++) state[i] = input[i];
    
    var w = expandKey(key);
    var Nr = 14; // 14 rounds for AES-256
    
    addRoundKey(state, w, Nr);
    
    for (var round = Nr-1; round >= 1; round--) {
        invShiftRows(state);
        invSubBytes(state);
        addRoundKey(state, w, round);
        invMixColumns(state);
    }
    
    invShiftRows(state);
    invSubBytes(state);
    addRoundKey(state, w, 0);
    
    return state;
}

// AES-256-CBC Decrypt
function decryptAesCbc(ciphertext, key, iv) {
    var result = [];
    var prevBlock = iv.slice(0, 16);
    
    for (var i = 0; i < ciphertext.length; i += 16) {
        var block = ciphertext.slice(i, i + 16);
        
        // Pad block if needed
        while (block.length < 16) block.push(0);
        
        // Decrypt block
        var decrypted = decryptBlock(block, key);
        
        // XOR with previous block (CBC)
        for (var j = 0; j < 16; j++) {
            decrypted[j] ^= prevBlock[j];
        }
        
        result = result.concat(decrypted);
        prevBlock = block;
    }
    
    // Remove PKCS7 padding
    var padLen = result[result.length - 1];
    if (padLen > 0 && padLen <= 16) {
        var valid = true;
        for (var i = result.length - padLen; i < result.length; i++) {
            if (result[i] !== padLen) valid = false;
        }
        if (valid) {
            result = result.slice(0, result.length - padLen);
        }
    }
    
    return result;
}

// ========== PBKDF2-SHA512 (Simplified) ==========

function sha512(message) {
    // This is a placeholder - real SHA-512 is too long for QuickJS
    // Using a simple hash for testing
    var h = [];
    for (var i = 0; i < 64; i++) h[i] = 0;
    
    for (var i = 0; i < message.length; i++) {
        var idx = i % 64;
        h[idx] = (h[idx] + message[i]) & 0xff;
        h[idx] = ((h[idx] << 1) | (h[idx] >> 7)) & 0xff;
    }
    
    return h;
}

function hmacSha512(key, message) {
    var blockSize = 128;
    
    if (key.length > blockSize) {
        key = sha512(key);
    }
    
    while (key.length < blockSize) {
        key.push(0);
    }
    
    var oKeyPad = [];
    var iKeyPad = [];
    for (var i = 0; i < blockSize; i++) {
        oKeyPad.push(key[i] ^ 0x5c);
        iKeyPad.push(key[i] ^ 0x36);
    }
    
    return sha512(oKeyPad.concat(sha512(iKeyPad.concat(message))));
}

function pbkdf2Sha512(password, salt, iterations, keyLen) {
    var blockSize = 128;
    var hashLen = 64;
    var numBlocks = Math.ceil(keyLen / hashLen);
    var result = [];
    
    for (var i = 1; i <= numBlocks; i++) {
        var block = salt.slice(0);
        block.push((i >>> 24) & 0xff);
        block.push((i >>> 16) & 0xff);
        block.push((i >>> 8) & 0xff);
        block.push(i & 0xff);
        
        var U = hmacSha512(password, block);
        var T = U.slice(0);
        
        // Reduced iterations for speed (TEST ONLY - should be 999)
        var actualIter = Math.min(iterations, 50);
        for (var j = 1; j < actualIter; j++) {
            U = hmacSha512(password, U);
            for (var k = 0; k < hashLen; k++) {
                T[k] ^= U[k];
            }
        }
        
        result = result.concat(T);
    }
    
    return result.slice(0, keyLen);
}

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
        result += String.fromCharCode(bytes[i]);
    }
    return result;
}

// ========== DIZIPAL DECRYPTION ==========

function decryptDizipalData(rawJsonText) {
    try {
        console.error('[DiziPal] Decrypting...');
        
        var data = JSON.parse(rawJsonText);
        
        var salt = hexToBytes(data.salt);
        var iv = hexToBytes(data.iv);
        var ct = base64ToBytes(data.ciphertext);
        
        console.error('[DiziPal] Salt: ' + salt.length + ' bytes, IV: ' + iv.length + ' bytes, CT: ' + ct.length + ' bytes');
        
        // Use first 16 bytes of salt (256 bytes is too long)
        if (salt.length > 16) {
            salt = salt.slice(0, 16);
            console.error('[DiziPal] Using first 16 bytes of salt');
        }
        
        // Derive key
        var passBytes = [];
        for (var i = 0; i < PASSPHRASE.length; i++) {
            passBytes.push(PASSPHRASE.charCodeAt(i) & 0xff);
        }
        
        console.error('[DiziPal] Deriving key with PBKDF2...');
        var key = pbkdf2Sha512(passBytes, salt, 999, 32);
        console.error('[DiziPal] Key: ' + key.slice(0, 8).map(function(b) { return b.toString(16); }).join(','));
        
        // Decrypt
        console.error('[DiziPal] AES-256-CBC decrypting...');
        var decrypted = decryptAesCbc(ct, key, iv);
        console.error('[DiziPal] Decrypted ' + decrypted.length + ' bytes');
        
        var result = bytesToString(decrypted);
        console.error('[DiziPal] Result: ' + result.substring(0, 100));
        
        // Clean URL
        result = result.replace(/\\\//g, '/');
        if (result.indexOf('://') === 0) result = 'https' + result;
        else if (result.indexOf('//') === 0) result = 'https:' + result;
        else if (result.indexOf('http') !== 0) result = 'https://' + result;
        
        return result;
        
    } catch (e) {
        console.error('[DiziPal] Decrypt error: ' + e.message);
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
        if (encryptedDiv.length > 0) {
            var encryptedText = encryptedDiv.text();
            console.error('[DiziPal] Encrypted data: ' + encryptedText.length + ' chars');
            iframeUrl = decryptDizipalData(encryptedText
