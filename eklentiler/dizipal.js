/**
 * DiziPal v68 - Ultimate Error Handling & Structure Fix
 */

var cheerio = require("cheerio-without-node-native");

var BASE_URL = 'https://dizipal1227.com';
var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';
var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    // EN DIŞ KATMAN: Uygulama asla Obje görmemeli
    try {
        return await mainLogic(tmdbId, mediaType, seasonNum, episodeNum);
    } catch (globalErr) {
        console.error('[DiziPal Global] Çökme Engellendi: ' + globalErr.message);
        return []; // Hata anında KESİN Array dön
    }
}

async function mainLogic(tmdbId, mediaType, seasonNum, episodeNum) {
    var results = [];
    
    // 1. TMDB Verisi Çekme (Hata payı düşük)
    var isMovie = mediaType === 'movie' || mediaType === 'film';
    var tmdbUrl = "https://api.themoviedb.org/3/" + (isMovie ? "movie" : "tv") + "/" + tmdbId + "?api_key=" + TMDB_KEY + "&language=tr-TR";
    
    var tmdbRes = await fetch(tmdbUrl).catch(function() { return null; });
    if (!tmdbRes) return [];
    
    var tmdbData = await tmdbRes.json().catch(function() { return {}; });
    var title = tmdbData.title || tmdbData.name || "";
    if (!title) return [];

    var slug = title.toLowerCase()
        .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim();

    var targetUrl = isMovie 
        ? BASE_URL + "/film/" + slug 
        : BASE_URL + "/dizi/" + slug + "/sezon-" + seasonNum + "/bolum-" + episodeNum;

    // 2. Sayfayı Çekme
    var response = await fetch(targetUrl, { 
        headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': BASE_URL + '/' 
        } 
    }).catch(function() { return null; });
    
    if (!response || !response.ok) return [];

    var html = await response.text();
    
    // 3. Veriyi Ayıklama (Regex en güvenlisi)
    var rawJson = "";
    var m = html.match(/\{&quot;ciphertext&quot;:.*?&quot;\}/) || html.match(/\{"ciphertext":.*?"\}/);
    
    if (!m) {
        // Regex bulamazsa Cheerio dene
        var $ = cheerio.load(html);
        rawJson = $('div[data-rm-k="true"], .mPlayerFd, #mPlayerFd').first().text();
    } else {
        rawJson = m[0];
    }

    if (!rawJson) return [];

    // 4. JSON Parse ve Şifre Çözme
    try {
        var clean = rawJson.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
        var data = JSON.parse(clean);
        
        var streamUrl = decrypt(data.ciphertext, data.iv, data.salt);
        if (streamUrl) {
            results.push({
                name: "DiziPal v68",
                url: streamUrl,
                quality: 'Auto',
                provider: 'dizipal'
            });
        }
    } catch (e) {
        console.error('[DiziPal JSON] Hata: ' + e.message);
    }

    return results;
}

function decrypt(ciphertext, ivHex, saltHex) {
    try {
        var b64 = ciphertext.replace(/\\/g, '').replace(/\s/g, '');
        var bin = (typeof atob !== 'undefined') ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
        var ct = Array.from(bin).map(function(c) { return c.charCodeAt(0); });
        
        var iv = []; for (var i = 0; i < ivHex.length; i += 2) iv.push(parseInt(ivHex.substr(i, 2), 16));
        var salt = []; for (var i = 0; i < saltHex.length; i += 2) salt.push(parseInt(saltHex.substr(i, 2), 16));

        var key = salt.slice(0, 32).map(function(b, i) {
            return b ^ PASSPHRASE.charCodeAt(i % PASSPHRASE.length);
        });

        var res = ct.map(function(b, i) { return b ^ key[i % key.length] ^ iv[i % iv.length]; });
        var decoded = res.map(function(b) { return (b >= 32 && b < 127) ? String.fromCharCode(b) : ''; }).join('');

        if (decoded.indexOf('http') !== -1) {
            var match = decoded.match(/https?:\/\/[^\s"']+/);
            return match ? match[0].replace(/\\\//g, '/') : null;
        }
    } catch (e) { return null; }
    return null;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    globalThis.getStreams = getStreams;
}
