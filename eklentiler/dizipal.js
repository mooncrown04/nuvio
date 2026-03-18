/**
 * DiziPal v62 - Anti-Bot & Selector Update
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://dizipal1227.com';
var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';
var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en;q=0.8',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
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
        } catch (e) { return []; }
    },
    bytesToString: function(bytes) {
        return bytes.map(function(b) { return (b >= 32 && b < 127) ? String.fromCharCode(b) : ''; }).join('');
    },
    slugify: function(text) {
        var trMap = {'ç':'c','ğ':'g','ş':'s','ı':'i','ö':'o','ü':'u'};
        return text.toLowerCase().replace(/[çğşıöü]/g, function(m) { return trMap[m]; }).replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim();
    }
};

function decryptData(ciphertext, ivHex, saltHex) {
    var ct = utils.base64ToBytes(ciphertext);
    var iv = utils.hexToBytes(ivHex);
    
    // Salt metotları
    var variations = [
        function(s) { return utils.hexToBytes(s); },
        function(s) { return utils.hexToBytes(s.toUpperCase()); },
        function(s) { return utils.hexToBytes(s.split('').reverse().join('')); }
    ];

    for (var i = 0; i < variations.length; i++) {
        var salt = variations[i](saltHex);
        if (!salt.length) continue;

        var keys = [
            salt.slice(0, 32).map(function(b, idx) { return b ^ PASSPHRASE.charCodeAt(idx % PASSPHRASE.length); }),
            Array.from({length: 32}, function(_, idx) { return (salt[idx % salt.length] + PASSPHRASE.charCodeAt(idx % PASSPHRASE.length)) & 0xff; })
        ];

        for (var key of keys) {
            var res = ct.map(function(b, k) { return b ^ key[k % key.length] ^ iv[k % iv.length]; });
            var resultStr = utils.bytesToString(res);
            if (resultStr.includes('http')) {
                var match = resultStr.match(/https?:\/\/[^\s"']+/);
                if (match) return match[0].replace(/\\\//g, '/');
            }
        }
    }
    return null;
}

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

        console.log('[DiziPal] Requesting URL:', targetUrl);

        var response = await fetch(targetUrl, { headers: HEADERS });
        var html = await response.text();
        var $ = cheerio.load(html);

        // GENİŞLETİLMİŞ SEÇİCİ: data-rm-k olmazsa data-k veya player-data ara
        var encryptedDiv = $('div[data-rm-k=true], div[data-k], div#player-data, script#__NEXT_DATA__');
        
        if (encryptedDiv.length === 0) {
            console.error('[DiziPal] HATA: Veri divi bulunamadı. Gelen HTML Özeti:', html.substring(0, 300).replace(/\n/g, ' '));
            return [];
        }

        var rawData = encryptedDiv.text();
        // Eğer veri __NEXT_DATA__ içindeyse JSON parse etmemiz gerekebilir
        var data;
        try {
            data = JSON.parse(rawData);
            // Eğer veri props içindeyse oraya dallan (Next.js yapısı için)
            if (data.props && data.props.pageProps) data = data.props.pageProps;
        } catch(e) {
            console.error('[DiziPal] JSON Parse Hatası veya veri temiz değil.');
            return [];
        }
        
        // Veri yapısı kontrolü (ciphertext, iv, salt var mı?)
        if (!data.ciphertext || !data.iv || !data.salt) {
            console.error('[DiziPal] HATA: JSON bulundu ama ciphertext/iv/salt eksik. Mevcut keyler:', Object.keys(data));
            return [];
        }

        var streamUrl = decryptData(data.ciphertext, data.iv, data.salt);

        if (streamUrl) {
            return [{ name: "DiziPal", url: streamUrl, quality: 'Auto', provider: 'dizipal' }];
        }
    } catch (err) {
        console.error('[DiziPal] Kritik Hata:', err.message);
    }
    return [];
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
