/**
 * DiziPal v60 - Final Optimized Resolver
 * Target: https://dizipal1227.com/dizi/...
 */

var cheerio = require("cheerio-without-node-native");

// ========== YAPILANDIRMA ==========
var BASE_URL = 'https://dizipal1227.com';
var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';
var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    'Referer': BASE_URL + '/'
};

// ========== YARDIMCI ARAÇLAR ==========
var utils = {
    hexToBytes: function(hex) {
        var bytes = [];
        for (var i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
        return bytes;
    },
    base64ToBytes: function(base64) {
        try {
            var cleaned = base64.replace(/\\/g, '');
            var binary = (typeof atob !== 'undefined') ? atob(cleaned) : Buffer.from(cleaned, 'base64').toString('binary');
            var bytes = [];
            for (var i = 0; i < binary.length; i++) bytes.push(binary.charCodeAt(i));
            return bytes;
        } catch (e) { return []; }
    },
    bytesToString: function(bytes) {
        return bytes.map(function(b) {
            return (b >= 32 && b < 127) ? String.fromCharCode(b) : '';
        }).join('');
    },
    slugify: function(text) {
        var trMap = {'ç':'c','ğ':'g','ş':'s','ı':'i','ö':'o','ü':'u'};
        return text.toLowerCase()
            .replace(/[çğşıöü]/g, function(m) { return trMap[m]; })
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }
};

// ========== ŞİFRE ÇÖZME MOTORU ==========
function decryptData(ciphertext, ivHex, saltHex) {
    var ct = utils.base64ToBytes(ciphertext);
    var iv = utils.hexToBytes(ivHex);
    var passBytes = utils.base64ToBytes(btoa(PASSPHRASE)); // Byte array conversion

    // Salt Varyasyonları
    var saltMethods = [
        function(s) { return utils.hexToBytes(s); }, // V1: Direct
        function(s) { return utils.hexToBytes(s.toUpperCase()); }, // V2: Upper
        function(s) { return utils.hexToBytes(s.split('').reverse().join('')); } // V3: Reverse
    ];

    for (var i = 0; i < saltMethods.length; i++) {
        var salt = saltMethods[i](saltHex);
        if (!salt.length) continue;

        // Key Varyasyonları (Simple & Full)
        var keys = [
            salt.slice(0, 32).map(function(b, idx) { return b ^ PASSPHRASE.charCodeAt(idx % PASSPHRASE.length); }),
            Array.from({length: 32}, function(_, idx) { return (salt[idx % salt.length] + PASSPHRASE.charCodeAt(idx % PASSPHRASE.length)) & 0xff; })
        ];

        for (var j = 0; j < keys.length; j++) {
            var key = keys[j];
            var res = [];
            for (var k = 0; k < ct.length; k++) {
                res.push(ct[k] ^ key[k % key.length] ^ iv[k % iv.length]);
            }
            var resultStr = utils.bytesToString(res);
            
            if (resultStr.indexOf('http') >= 0) {
                var match = resultStr.match(/https?:\/\/[^\s"']+/);
                if (match) return match[0].replace(/\\\//g, '/');
            }
        }
    }
    return null;
}

// ========== ANA GİRİŞ NOKTASI (getStreams) ==========
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        var isMovie = mediaType === 'movie' || mediaType === 'film';
        
        // 1. TMDB'den orijinal ismi al ve slug oluştur
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY;
        var tmdbRes = await fetch(tmdbUrl);
        var tmdbData = await tmdbRes.json();
        var slug = utils.slugify(tmdbData.title || tmdbData.name);

        // 2. DiziPal URL Yapısını kur
        var targetPath = isMovie 
            ? '/film/' + slug 
            : '/dizi/' + slug + '/sezon-' + seasonNum + '/bolum-' + episodeNum;
        
        var targetUrl = BASE_URL + targetPath;
        console.log('[DiziPal] Fetching: ' + targetUrl);

        // 3. Sayfayı çek ve veriyi parse et
        var response = await fetch(targetUrl, { headers: HEADERS });
        var html = await response.text();
        var $ = cheerio.load(html);

        var encryptedDiv = $('div[data-rm-k=true]');
        if (encryptedDiv.length === 0) return [];

        var data = JSON.parse(encryptedDiv.text());
        
        // 4. Şifreyi çöz
        var streamUrl = decryptData(data.ciphertext, data.iv, data.salt);

        if (streamUrl) {
            return [{
                name: "DiziPal (V60)",
                url: streamUrl,
                quality: 'Auto',
                provider: 'dizipal'
            }];
        }
    } catch (err) {
        console.error('[DiziPal Error] ' + err.message);
    }
    return [];
}

// ========== EXPORTS (KRİTİK KISIM) ==========
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
