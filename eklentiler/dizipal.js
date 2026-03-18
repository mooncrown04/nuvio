/**
 * DiziPal v67 - Safe Return & Bot Bypass
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
            var b = base64.replace(/\\/g, '').replace(/\s/g, '');
            var binary = (typeof atob !== 'undefined') ? atob(b) : Buffer.from(b, 'base64').toString('binary');
            return Array.from(binary).map(function(c) { return c.charCodeAt(0); });
        } catch (e) { return []; }
    },
    bytesToString: function(bytes) {
        return bytes.map(function(b) { return (b >= 32 && b < 127) ? String.fromCharCode(b) : ''; }).join('');
    },
    slugify: function(text) {
        var trMap = {'ç':'c','ğ':'g','ş':'s','ı':'i','ö':'o','ü':'u'};
        return String(text).toLowerCase().replace(/[çğşıöü]/g, function(m) { return trMap[m]; }).replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim();
    }
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    // KRİTİK: Her zaman bu diziyi döndüreceğiz
    var results = []; 

    try {
        var isMovie = mediaType === 'movie' || mediaType === 'film';
        var tmdbUrl = "https://api.themoviedb.org/3/" + (isMovie ? "movie" : "tv") + "/" + tmdbId + "?api_key=" + TMDB_KEY + "&language=tr-TR";
        
        var tmdbRes = await fetch(tmdbUrl);
        var tmdbData = await tmdbRes.json();
        var slug = utils.slugify(tmdbData.title || tmdbData.name || "");

        var targetUrl = isMovie 
            ? BASE_URL + "/film/" + slug 
            : BASE_URL + "/dizi/" + slug + "/sezon-" + seasonNum + "/bolum-" + episodeNum;

        // BOT Korumasını geçmek için daha detaylı header
        var response = await fetch(targetUrl, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Referer': BASE_URL + '/',
                'Accept-Language': 'tr-TR,tr;q=0.9'
            } 
        });
        
        var html = await response.text();
        
        // --- VERİ BULMA ---
        var rawData = "";
        
        // 1. mPlayerFd veya data-rm-k ara
        var $ = cheerio.load(html);
        rawData = $('div[data-rm-k="true"], .mPlayerFd, #mPlayerFd, [data-component="Player"]').first().text();
        
        // 2. Regex (Eğer div bulunamazsa HTML içinde ham ara)
        if (!rawData || rawData.length < 10) {
            var m = html.match(/\{&quot;ciphertext&quot;:.*?&quot;\}/) || html.match(/\{"ciphertext":.*?"\}/);
            if (m) rawData = m[0];
        }

        if (rawData) {
            var clean = rawData.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            var data = JSON.parse(clean);
            
            var streamUrl = decryptLogic(data);
            if (streamUrl) {
                results.push({
                    name: "DiziPal (v67)",
                    url: streamUrl,
                    quality: 'Auto',
                    provider: 'dizipal'
                });
            }
        }
    } catch (err) {
        console.error('[DiziPal Error]: ' + err.message);
    }

    // java.lang.IllegalStateException: Expected BEGIN_ARRAY çözümüdür
    return results; 
}

function decryptLogic(data) {
    if (!data.ciphertext || !data.iv || !data.salt) return null;
    var ct = utils.base64ToBytes(data.ciphertext);
    var iv = utils.hexToBytes(data.iv);
    var salt = utils.hexToBytes(data.salt);
    
    var key = salt.slice(0, 32).map(function(b, i) {
        return b ^ PASSPHRASE.charCodeAt(i % PASSPHRASE.length);
    });

    var res = ct.map(function(b, i) { return b ^ key[i % key.length] ^ iv[i % iv.length]; });
    var decoded = utils.bytesToString(res);

    if (decoded.indexOf('http') !== -1) {
        var match = decoded.match(/https?:\/\/[^\s"']+/);
        return match ? match[0].replace(/\\\//g, '/') : null;
    }
    return null;
}

// Global scope kaydı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
