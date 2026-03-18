/**
 * DiziPal 1543 - IMDB/TMDB Diagnostic Pro
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
    } catch (e) { 
        console.error("[DiziPal] Sifre cozme hatasi: " + e.message);
        return null; 
    }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE = 'https://dizipal1543.com';
    var type = (mediaType === 'movie') ? 'movie' : 'tv';
    var tmdbUrl = "https://api.themoviedb.org/3/" + type + "/" + tmdbId + "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96";

    console.error("[DiziPal] Basliyor... TMDB ID: " + tmdbId);

    return fetch(tmdbUrl)
        .then(function(r) { return r.json(); })
        .then(function(tmdb) {
            var name = (tmdb.name || tmdb.title || "").trim();
            var slug = name.toLowerCase().replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[şŞ]/g, 's').replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c').replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            
            var target = BASE + "/" + (mediaType === 'tv' ? 'bolum' : 'film') + "/" + slug;
            if (mediaType === 'tv') target += "-" + seasonNum + "x" + episodeNum;
            
            console.error("[DiziPal] Hedef Sayfa: " + target);
            return fetch(target);
        })
        .then(function(res) { 
            console.error("[DiziPal] Sayfa cevabi alindi. Durum: " + res.status);
            return res.text(); 
        })
        .then(function(html) {
            var m = html.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
            if (!m) {
                console.error("[DiziPal] Sifreli div bulunamadi! HTML Boyutu: " + html.length);
                return [];
            }
            
            var iframe = decryptData(m[1]);
            if (!iframe) return [];
            if (iframe.indexOf("//") === 0) iframe = "https:" + iframe;
            
            console.error("[DiziPal] Iframe Linki: " + iframe);

            // Adım adım izleme: Iframe'den ID koparma denemesi
            var pidFromUrl = iframe.match(/[?&]v=([^&]+)/);
            var pid = pidFromUrl ? pidFromUrl[1] : null;

            if (!pid) {
                console.error("[DiziPal] URL'den PID koparilamadi!");
                return [];
            }

            var origin = iframe.split('/').slice(0, 3).join('/');
            var finalUrl = origin + "/source2.php?v=" + pid;
            
            console.error("[DiziPal] Son Istek: " + finalUrl);

            return fetch(finalUrl, { 
                headers: { 
                    'Referer': iframe, 
                    'X-Requested-With': 'XMLHttpRequest' 
                } 
            })
            .then(function(r) { return r.json(); })
            .then(function(j) {
                if (j.file) {
                    var stream = j.file.replace(/\\/g, "").replace("m.php", "master.m3u8");
                    console.error("[DiziPal] BAŞARILI! Stream: " + stream);
                    return [{ name: "DiziPal", url: stream, type: 'm3u8', headers: { 'Referer': origin + '/' } }];
                }
                console.error("[DiziPal] source2.php bos dondu veya engellendi.");
                return [];
            });
        })
        .catch(function(e) { 
            console.error("[DiziPal] KRITIK HATA: " + e.message);
            return []; 
        });
}

globalThis.getStreams = getStreams;
