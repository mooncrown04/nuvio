/**
 * DiziPal 1543 - Ultra-Fast Shadow Bypass
 */

var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

function decryptData(raw) {
    try {
        var c = raw.replace(/&quot;/g, '"').replace(/\\\//g, '/').trim();
        var ct = c.match(/"ciphertext"\s*:\s*"([^"]+)"/)[1];
        var iv = c.match(/"iv"\s*:\s*"([^"]+)"/)[1];
        var sl = c.match(/"salt"\s*:\s*"([^"]+)"/)[1];
        var key = CryptoJS.PBKDF2(PASSPHRASE, CryptoJS.enc.Hex.parse(sl), { keySize: 8, iterations: 999, hasher: CryptoJS.algo.SHA512 });
        var dec = CryptoJS.AES.decrypt(ct, key, { iv: CryptoJS.enc.Hex.parse(iv), padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC });
        return dec.toString(CryptoJS.enc.Utf8).replace(/[\\"]/g, "").trim();
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE = 'https://dizipal1543.com';
    // HIZ İÇİN: TMDB fetch'ini atla, Nuvio'nun sağladığı başlığı (title) kullan (varsa) 
    // veya doğrudan slug oluşturmaya çalış.
    
    // Nuvio'nun içindeki 'title' objesi mevcutsa onu kullanmalısın. 
    // Şimdilik TMDB'yi en hızlı hale getirelim:
    return fetch("https://api.themoviedb.org/3/" + (mediaType === 'movie' ? 'movie' : 'tv') + "/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96")
        .then(function(r) { return r.json(); })
        .then(function(tmdb) {
            var name = tmdb.name || tmdb.title;
            var slug = name.toLowerCase().replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[şŞ]/g, 's').replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            var target = BASE + "/" + (mediaType === 'tv' ? 'bolum' : 'film') + "/" + slug + (mediaType === 'tv' ? "-" + seasonNum + "x" + episodeNum : "");
            
            return fetch(target);
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var m = html.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
            if (!m) return [];
            
            var iframe = decryptData(m[1]);
            if (!iframe) return [];
            iframe = iframe.replace(/[\\"]/g, "").trim();
            if (iframe.indexOf("//") === 0) iframe = "https:" + iframe;
            
            var pid = iframe.match(/[?&]v=([^&]+)/);
            if (!pid) return [];
            
            var origin = iframe.split('/').slice(0, 3).join('/');
            
            // source2.php isteğini timeout riski için beklemeden (Promise.race gibi) en hızlı şekilde atalım
            return fetch(origin + "/source2.php?v=" + pid[1], {
                headers: { 'Referer': iframe, 'X-Requested-With': 'XMLHttpRequest' }
            });
        })
        .then(function(r) { return r.json(); })
        .then(function(j) {
            if (j.file) {
                return [{
                    name: "DiziPal (Nitro)",
                    url: j.file.replace(/\\/g, "").replace("m.php", "master.m3u8"),
                    type: 'm3u8',
                    headers: { 'Referer': 'https://four.dplayer82.site/' }
                }];
            }
            return [];
        })
        .catch(function() { return []; });
}

globalThis.getStreams = getStreams;
