var cheerio = require("cheerio-without-node-native");

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        var isMovie = mediaType === 'movie' || mediaType === 'film';
        var tmdbUrl = "https://api.themoviedb.org/3/" + (isMovie ? "movie" : "tv") + "/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR";
        
        var tmdbRes = await fetch(tmdbUrl).catch(function() { return null; });
        if (!tmdbRes) return [{ name: "ADIM 1: TMDB Baglantisi Yok", url: "http://error.com" }];

        var tmdbData = await tmdbRes.json();
        var title = tmdbData.title || tmdbData.name;
        
        // Slug temizliği (DiziPal formatı)
        var slug = title.toLowerCase()
            .replace(/ç/g,'c').replace(/ğ/g,'g').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ü/g,'u')
            .replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').trim();

        var targetUrl = "https://dizipal1227.com/" + (isMovie ? "film/" : "dizi/") + slug + (isMovie ? "" : "/sezon-" + seasonNum + "/bolum-" + episodeNum);

        // ASIL KRİTİK NOKTA: Siteye gidiş
        var res = await fetch(targetUrl, { 
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',
                'Referer': 'https://dizipal1227.com/'
            } 
        }).catch(function(e) { return { error: e.message }; });

        if (res.error) return [{ name: "ADIM 2: SSL/Sertifika Hatasi", url: "http://error.com" }];
        
        var html = await res.text();
        
        // Log yerine isimde gösteriyoruz
        if (html.includes("Cloudflare") || html.includes("Ray ID")) {
            return [{ name: "ADIM 3: Cloudflare Engeli (Bot)", url: "http://error.com" }];
        }

        var m = html.match(/\{&quot;ciphertext&quot;:.*?&quot;\}/) || html.match(/\{"ciphertext":.*?"\}/);
        
        if (!m) {
            // Ciphertext yoksa sayfa içeriğine dair ipucu ver
            var hint = html.length > 100 ? "Sayfa Yuklendi ama Video Yok" : "Sayfa Bos Dondu";
            return [{ name: "ADIM 4: " + hint, url: "http://error.com" }];
        }

        var streamUrl = decrypt(JSON.parse(m[0].replace(/&quot;/g, '"').replace(/&amp;/g, '&'))); 

        if (streamUrl) {
            return [{ name: "DiziPal: " + title, url: streamUrl, quality: 'Auto', provider: 'dizipal' }];
        } else {
            return [{ name: "ADIM 5: Sifre Cozulemedi (Key Yanlis)", url: "http://error.com" }];
        }

    } catch (e) {
        return [{ name: "HATA: " + e.message.substring(0, 15), url: "http://error.com" }];
    }
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

if (typeof module !== 'undefined') module.exports = { getStreams: getStreams };
