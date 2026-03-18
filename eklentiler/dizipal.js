/**
 * DiziPal v61 - Debug Enhanced Edition
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://dizipal1227.com';
var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';
var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

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
        } catch (e) { 
            console.error('[DiziPal] Base64 Decode Hatası:', e.message);
            return []; 
        }
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

function decryptData(ciphertext, ivHex, saltHex) {
    console.log('[DiziPal] Şifre çözme başlatıldı...');
    var ct = utils.base64ToBytes(ciphertext);
    var iv = utils.hexToBytes(ivHex);
    
    var saltMethods = [
        { name: 'Direct', fn: function(s) { return utils.hexToBytes(s); } },
        { name: 'Upper', fn: function(s) { return utils.hexToBytes(s.toUpperCase()); } },
        { name: 'Reverse', fn: function(s) { return utils.hexToBytes(s.split('').reverse().join('')); } }
    ];

    for (var i = 0; i < saltMethods.length; i++) {
        var salt = saltMethods[i].fn(saltHex);
        if (!salt.length) continue;

        var keys = [
            { name: 'XOR', key: salt.slice(0, 32).map(function(b, idx) { return b ^ PASSPHRASE.charCodeAt(idx % PASSPHRASE.length); }) },
            { name: 'Mix', key: Array.from({length: 32}, function(_, idx) { return (salt[idx % salt.length] + PASSPHRASE.charCodeAt(idx % PASSPHRASE.length)) & 0xff; }) }
        ];

        for (var j = 0; j < keys.length; j++) {
            var key = keys[j].key;
            var res = [];
            for (var k = 0; k < ct.length; k++) {
                res.push(ct[k] ^ key[k % key.length] ^ iv[k % iv.length]);
            }
            var resultStr = utils.bytesToString(res);
            
            if (resultStr.indexOf('http') >= 0) {
                console.log('[DiziPal] Başarılı! Metod:', saltMethods[i].name, '+', keys[j].name);
                var match = resultStr.match(/https?:\/\/[^\s"']+/);
                if (match) return match[0].replace(/\\\//g, '/');
            }
        }
    }
    console.error('[DiziPal] Şifre çözülemedi: Hiçbir varyasyon URL döndürmedi.');
    return null;
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.log('[DiziPal] getStreams çağrıldı. ID:', tmdbId, 'Tip:', mediaType);
    try {
        var isMovie = mediaType === 'movie' || mediaType === 'film';
        
        // TMDB İsteği
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY;
        console.log('[DiziPal] TMDB İsteği:', tmdbUrl);
        
        var tmdbRes = await fetch(tmdbUrl);
        if (!tmdbRes.ok) throw new Error('TMDB isteği başarısız: ' + tmdbRes.status);
        
        var tmdbData = await tmdbRes.json();
        var slug = utils.slugify(tmdbData.title || tmdbData.name);
        console.log('[DiziPal] Slug oluşturuldu:', slug);

        // Hedef URL
        var targetPath = isMovie 
            ? '/film/' + slug 
            : '/dizi/' + slug + '/sezon-' + seasonNum + '/bolum-' + episodeNum;
        
        var targetUrl = BASE_URL + targetPath;
        console.log('[DiziPal] Hedef URL çekiliyor:', targetUrl);

        var response = await fetch(targetUrl, { headers: HEADERS });
        if (!response.ok) {
            console.error('[DiziPal] Sayfa çekilemedi. Durum:', response.status, 'URL:', targetUrl);
            return [];
        }

        var html = await response.text();
        var $ = cheerio.load(html);

        var encryptedDiv = $('div[data-rm-k=true]');
        if (encryptedDiv.length === 0) {
            console.error('[DiziPal] HATA: Sayfada "data-rm-k=true" divi bulunamadı! Site yapısı değişmiş olabilir.');
            return [];
        }

        var encryptedText = encryptedDiv.text();
        console.log('[DiziPal] Şifreli veri bulundu, uzunluk:', encryptedText.length);
        
        var data = JSON.parse(encryptedText);
        var streamUrl = decryptData(data.ciphertext, data.iv, data.salt);

        if (streamUrl) {
            console.log('[DiziPal] Akış URL adresi:', streamUrl);
            return [{
                name: "DiziPal (Debug)",
                url: streamUrl,
                quality: 'Auto',
                provider: 'dizipal'
            }];
        }
    } catch (err) {
        console.error('[DiziPal KRİTİK HATA]:', err.stack || err.message);
    }
    return [];
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
