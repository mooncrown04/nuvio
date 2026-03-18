/**
 * DiziPal 1543 - Universal PID Discovery
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
        var res = dec.toString(CryptoJS.enc.Utf8) || dec.toString(CryptoJS.enc.Latin1);
        return res ? res.replace(/[\\"]/g, "").trim() : null;
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE = 'https://dizipal1543.com';
    var type = (mediaType === 'movie') ? 'movie' : 'tv';
    
    return fetch("https://api.themoviedb.org/3/" + type + "/" + tmdbId + "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96")
        .then(function(r) { return r.json(); })
        .then(function(tmdb) {
            var name = (tmdb.name || tmdb.title || "").trim();
            var slug = name.toLowerCase().replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[şŞ]/g, 's').replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            var target = BASE + "/" + (mediaType === 'tv' ? 'bolum' : 'film') + "/" + slug;
            if (mediaType === 'tv') target += "-" + seasonNum + "x" + episodeNum;
            
            console.error("[DiziPal] Hedef: " + target);
            return fetch(target).then(function(res) { return res.text(); }).then(function(html) {
                return { html: html, url: target };
            });
        })
        .then(function(data) {
            var m = data.html.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
            if (!m) return [];
            
            var iframe = decryptData(m[1]);
            if (!iframe) return [];
            iframe = iframe.replace(/[\\"]/g, "").trim();
            if (iframe.indexOf("//") === 0) iframe = "https:" + iframe;
            
            console.error("[DiziPal] Iframe: " + iframe);

            return fetch(iframe, { headers: { 'Referer': data.url } })
                .then(function(r) { return r.text(); })
                .then(function(p) {
                    // PID Yakalama: 3 Farklı Yöntem
                    var pid = null;
                    var m1 = p.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/);
                    var m2 = p.match(/source2\.php\?v=([^"&']+)/);
                    var m3 = p.match(/var\s+(?:playlistId|vid|fileId)\s*=\s*['"]([^'"]+)['"]/);
                    
                    pid = (m1 ? m1[1] : (m2 ? m2[1] : (m3 ? m3[1] : null)));

                    if (!pid) {
                        console.error("[DiziPal] PID bulunamadi! HTML boyutu: " + p.length);
                        return [];
                    }
                    
                    var origin = iframe.split('/').slice(0, 3).join('/');
                    return fetch(origin + "/source2.php?v=" + pid, { 
                        headers: { 
                            'Referer': iframe,
                            'X-Requested-With': 'XMLHttpRequest'
                        } 
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(j) {
                        if (!j.file) return [];
                        var s = j.file.replace(/\\/g, "").replace("m.php", "master.m3u8");
                        console.error("[DiziPal] STREAM OK: " + s);
                        
                        return [{ 
                            name: "DiziPal (DPlayer)", 
                            url: s, 
                            type: 'm3u8',
                            headers: { 'Referer': origin + '/', 'Origin': origin }
                        }];
                    });
                });
        })
        .catch(function(e) { return []; });
}

globalThis.getStreams = getStreams;
