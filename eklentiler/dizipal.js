/**
 * DiziPal v66 - mPlayerFd Selector & List-Safe Output
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
            var binary = (typeof atob !== 'undefined') ? atob(base64.replace(/\\/g, '')) : Buffer.from(base64.replace(/\\/g, ''), 'base64').toString('binary');
            return Array.from(binary).map(function(c) { return c.charCodeAt(0); });
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

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    // KESİN KURAL: Dönecek sonuç daima liste olmalı
    var finalResults = []; 

    try {
        var isMovie = mediaType === 'movie' || mediaType === 'film';
        var tmdbUrl = 'https://api.themoviedb.org/3/' + (isMovie ? 'movie' : 'tv') + '/' + tmdbId + '?api_key=' + TMDB_KEY + '&language=tr-TR';
        
        var tmdbRes = await fetch(tmdbUrl);
        var tmdbData = await tmdbRes.json();
        var slug = utils.slugify(tmdbData.title || tmdbData.name || "");

        var targetUrl = isMovie 
            ? BASE_URL + '/film/' + slug 
            : BASE_URL + '/dizi/' + slug + '/sezon-' + seasonNum + '/bolum-' + episodeNum;

        var response = await fetch(targetUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Referer': BASE_URL } 
        });
        
        var html = await response.text();
        var $ = cheerio.load(html);

        // --- YENİ SEÇİCİ STRATEJİSİ ---
        // data-rm-k="true" olan ve mPlayerFd içeren her şeyi tara
        var rawData = $('div[data-rm-k="true"], .mPlayerFd, #mPlayerFd').first().text();
        
        // Regex Fallback (Eğer Cheerio yine kaçırırsa)
        if (!rawData || rawData.length < 20) {
            var regex = /\{&quot;ciphertext&quot;:.*?\}/g;
            var match = html.match(regex);
            if (match) rawData = match[0];
        }

        if (rawData) {
            // HTML Entity temizliği ve JSON parse
            var cleanJson = rawData.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            var data = JSON.parse(cleanJson);
            
            var streamUrl = decryptLogic(data);
            if (streamUrl) {
                finalResults.push({
                    name: "DiziPal (v66)",
                    url: streamUrl,
                    quality: 'Auto',
                    provider: 'dizipal'
                });
            }
        } else {
            console.error('[DiziPal] Veri kaynağı (mPlayerFd) bulunamadı.');
        }

    } catch (err) {
        console.error('[DiziPal] Kritik Hata:', err.message);
    }

    return finalResults; // List-safe return
}

function decryptLogic(data) {
    if (!data.ciphertext || !data.iv || !data.salt) return null;

    var ct = utils.base64ToBytes(data.ciphertext);
    var iv = utils.hexToBytes(data.iv);
    var salt = utils.hexToBytes(data.salt);
    var pass = PASSPHRASE;

    // Uzun salt desteği ile anahtar türetme
    var key = salt.slice(0, 32).map(function(b, i) {
        return b ^ pass.charCodeAt(i % pass.length);
    });

    var res = ct.map(function(b, i) { return b ^ key[i % key.length] ^ iv[i % iv.length]; });
    var decoded = utils.bytesToString(res);

    if (decoded.includes('http')) {
        var match = decoded.match(/https?:\/\/[^\s"']+/);
        return match ? match[0].replace(/\\\//g, '/') : null;
    }
    return null;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
