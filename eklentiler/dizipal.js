/**
 * DiziPal 1543 - Bulletproof Logic (No Hang)
 */

var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

function decryptData(raw) {
    try {
        if (!raw || typeof raw !== 'string') return null;
        var cleanRaw = raw.replace(/&quot;/g, '"').replace(/\\\//g, '/').trim();
        var ctMatch = cleanRaw.match(/"ciphertext"\s*:\s*"([^"]+)"/);
        var ivMatch = cleanRaw.match(/"iv"\s*:\s*"([^"]+)"/);
        var slMatch = cleanRaw.match(/"salt"\s*:\s*"([^"]+)"/);
        
        if (!ctMatch || !ivMatch || !slMatch) return null;

        var key = CryptoJS.PBKDF2(PASSPHRASE, CryptoJS.enc.Hex.parse(slMatch[1]), { keySize: 8, iterations: 999, hasher: CryptoJS.algo.SHA512 });
        var dec = CryptoJS.AES.decrypt(ctMatch[1], key, { iv: CryptoJS.enc.Hex.parse(ivMatch[1]), padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC });
        return dec.toString(CryptoJS.enc.Utf8).replace(/[\\"]/g, "").trim();
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, season, episode) {
    var BASE = 'https://dizipal1543.com';
    var tmdbUrl = "https://api.themoviedb.org/3/" + (mediaType === 'movie' ? 'movie' : 'tv') + "/" + tmdbId + "?api_key=4ef0d7355d9ffb5151e987764708ce96";

    return fetch(tmdbUrl)
        .then(function(r) { return r.ok ? r.json() : Promise.reject("TMDB Error"); })
        .then(function(tmdb) {
            var name = tmdb.name || tmdb.title;
            if (!name) return Promise.reject("No Name");
            
            var slug = name.toLowerCase()
                .replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[şŞ]/g, 's')
                .replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
                .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            
            var target = BASE + (mediaType === 'tv' ? "/bolum/" : "/film/") + slug;
            if (mediaType === 'tv') target += "-" + season + "x" + episode;
            
            return fetch(target);
        })
        .then(function(res) { return res.ok ? res.text() : Promise.reject("Page Error"); })
        .then(function(html) {
            var m = html.match(/data-rm-k="true"[^>]*>(.*?)<\/div>/);
            if (!m || !m[1]) return [];
            
            var iframe = decryptData(m[1]);
            if (!iframe) return [];
            
            var pidMatch = iframe.match(/[?&]v=([^&]+)/);
            if (!pidMatch) return [];
            
            var origin = "https://four.dplayer82.site";
            return fetch(origin + "/source2.php?v=" + pidMatch[1], {
                headers: { 'Referer': iframe, 'X-Requested-With': 'XMLHttpRequest' }
            });
        })
        .then(function(r) { return r.json(); })
        .then(function(j) {
            if (j && j.file) {
                return [{
                    name: "DiziPal (Fixed)",
                    url: j.file.replace(/\\/g, "").replace("m.php", "master.m3u8"),
                    type: 'm3u8',
                    headers: { 'Referer': 'https://four.dplayer82.site/' }
                }];
            }
            return [];
        })
        .catch(function(err) {
            console.error("[DiziPal] Islem Durduruldu: " + err);
            return [];
        });
}

globalThis.getStreams = getStreams;
