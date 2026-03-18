/**
 * DiziPal v64 - Entity & Salt Length Fix
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://dizipal1227.com';
var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';
var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

var utils = {
    hexToBytes: function(hex) {
        var bytes = [];
        for (var i = 0; i < hex.length; i += 2) bytes.push(parseInt(hex.substr(i, 2), 16));
        return bytes;
    },
    base64ToBytes: function(base64) {
        try {
            var cleaned = base64.replace(/\\/g, '').replace(/\s/g, '');
            var binary = (typeof atob !== 'undefined') ? atob(cleaned) : Buffer.from(cleaned, 'base64').toString('binary');
            var bytes = [];
            for (var i = 0; i < binary.length; i++) bytes.push(binary.charCodeAt(i));
            return bytes;
        } catch (e) { return []; }
    },
    bytesToString: function(bytes) {
        return bytes.map(function(b) { return (b >= 32 && b < 127) ? String.fromCharCode(b) : ''; }).join('');
    },
    slugify: function(text) {
        var trMap = {'ç':'c','ğ':'g','ş':'s','ı':'i','ö':'o','ü':'u'};
        return text.toLowerCase()
            .replace(/[çğşıöü]/g, function(m) { return trMap[m]; })
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .trim();
    }
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        var isMovie = mediaType === 'movie' || mediaType === 'film';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?language=tr-TR&api_key=' + TMDB_KEY;
        
        var tmdbRes = await fetch(tmdbUrl);
        var tmdbData = await tmdbRes.json();
        var slug = utils.slugify(tmdbData.title || tmdbData.name);

        var targetUrl = isMovie 
            ? BASE_URL + '/film/' + slug 
            : BASE_URL + '/dizi/' + slug + '/sezon-' + seasonNum + '/bolum-' + episodeNum;

        var response = await fetch(targetUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': BASE_URL } 
        });
        
        var html = await response.text();
        var $ = cheerio.load(html);

        // Paylaştığın div'i tam olarak yakalamak için
        var encryptedDiv = $('div[data-rm-k=true]');
        var rawText = encryptedDiv.text() || '';

        if (!rawText) {
            console.error('[DiziPal] Veri divi boş veya bulunamadı.');
            return [];
        }

        // HTML Entity temizliği (&quot; -> ")
        var cleanJson = rawText.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        
        var data;
        try {
            data = JSON.parse(cleanJson);
        } catch(e) {
            console.error('[DiziPal] JSON Parse Hatası:', e.message);
            return [];
        }

        // Şifre Çözme Başlangıcı
        var streamUrl = decryptLogic(data);

        if (streamUrl) {
            return [{
                name: "DiziPal (Fixed)",
                url: streamUrl,
                quality: 'Auto',
                provider: 'dizipal'
            }];
        }
    } catch (err) {
        console.error('[DiziPal] Genel Hata:', err.message);
    }
    return []; // Uygulama array beklediği için her zaman array dönüyoruz.
}

function decryptLogic(data) {
    if (!data.ciphertext || !data.iv || !data.salt) return null;

    var ct = utils.base64ToBytes(data.ciphertext);
    var iv = utils.hexToBytes(data.iv);
    var salt = utils.hexToBytes(data.salt);
    var pass = PASSPHRASE;

    // Uzun Salt değerlerinde DiziPal genelde ilk 32 veya 64 byte'ı kullanır
    // Burada hem XOR hem de Toplam (Mix) yöntemini deniyoruz
    var keyVaryasyonlari = [
        salt.slice(0, 32).map(function(b, i) { return b ^ pass.charCodeAt(i % pass.length); }),
        Array.from({length: 32}, function(_, i) { return (salt[i % salt.length] + pass.charCodeAt(i % pass.length)) & 0xff; })
    ];

    for (var key of keyVaryasyonlari) {
        var res = [];
        for (var i = 0; i < ct.length; i++) {
            res.push(ct[i] ^ key[i % key.length] ^ iv[i % iv.length]);
        }
        var decoded = utils.bytesToString(res);
        
        if (decoded.includes('http')) {
            var match = decoded.match(/https?:\/\/[^\s"']+/);
            if (match) return match[0].replace(/\\\//g, '/');
        }
    }
    return null;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
