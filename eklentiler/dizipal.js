/**
 * DiziPal v75 - Zero Console Output
 */
var cheerio = require("cheerio-without-node-native");

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        var isMovie = mediaType === 'movie' || mediaType === 'film';
        var tmdbUrl = "https://api.themoviedb.org/3/" + (isMovie ? "movie" : "tv") + "/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR";
        
        var tmdbRes = await fetch(tmdbUrl).catch(function() { return null; });
        if (!tmdbRes) return [];
        
        var tmdbData = await tmdbRes.json().catch(function() { return {}; });
        var title = tmdbData.title || tmdbData.name;
        if (!title) return [];

        var slug = title.toLowerCase()
            .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
            .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim();

        var url = "https://dizipal1227.com/" + (isMovie ? "film/" : "dizi/") + slug + (isMovie ? "" : "/sezon-" + seasonNum + "/bolum-" + episodeNum);

        var res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }).catch(function() { return null; });
        if (!res || !res.ok) return [];
        
        var html = await res.text().catch(function() { return ""; });
        var m = html.match(/\{&quot;ciphertext&quot;:.*?&quot;\}/) || html.match(/\{"ciphertext":.*?"\}/);
        
        if (m) {
            var clean = m[0].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            var data = JSON.parse(clean);
            var streamUrl = decrypt(data); 
            if (streamUrl) {
                return [{
                    name: "DiziPal",
                    url: streamUrl,
                    quality: 'Auto',
                    provider: 'dizipal'
                }];
            }
        }
    } catch (e) {
        // Sessiz hata yönetimi
    }
    return []; 
}

function decrypt(data) {
    var P = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";
    try {
        var ct = Array.from(atob(data.ciphertext.replace(/\\/g, '').replace(/\s/g, ''))).map(function(c) { return c.charCodeAt(0); });
        var iv = data.iv.match(/.{1,2}/g).map(function(h) { return parseInt(h, 16); });
        var salt = data.salt.match(/.{1,2}/g).map(function(h) { return parseInt(h, 16); });
        var key = salt.slice(0, 32).map(function(b, i) { return b ^ P.charCodeAt(i % P.length); });
        var res = ct.map(function(b, i) { return b ^ key[i % key.length] ^ iv[i % iv.length]; });
        var dec = res.map(function(b) { return (b >= 32 && b < 127) ? String.fromCharCode(b) : ''; }).join('');
        var link = dec.match(/https?:\/\/[^\s"']+/);
        return link ? link[0].replace(/\\\//g, '/') : null;
    } catch (e) { return null; }
}

if (typeof module !== 'undefined') {
    module.exports = { getStreams: getStreams };
}
