/**
 * DiziPal 1543 - URL Slug Correction
 */

var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

function decryptData(rawContent) {
    try {
        if (typeof CryptoJS === 'undefined') return null;
        var clean = rawContent.replace(/&quot;/g, '"').replace(/\\\//g, '/').trim();
        var ct = clean.match(/"ciphertext"\s*:\s*"([^"]+)"/);
        var iv = clean.match(/"iv"\s*:\s*"([^"]+)"/);
        var salt = clean.match(/"salt"\s*:\s*"([^"]+)"/);
        if (!ct || !iv || !salt) return null;
        var key = CryptoJS.PBKDF2(PASSPHRASE, CryptoJS.enc.Hex.parse(salt[1]), {
            keySize: 256 / 32, iterations: 999, hasher: CryptoJS.algo.SHA512
        });
        var decrypted = CryptoJS.AES.decrypt(ct[1], key, {
            iv: CryptoJS.enc.Hex.parse(iv[1]), padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC
        });
        var res = decrypted.toString(CryptoJS.enc.Utf8) || decrypted.toString(CryptoJS.enc.Latin1);
        return res ? res.replace(/[\\"]/g, "").trim() : null;
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizipal1543.com';
    var type = (mediaType === 'movie') ? 'movie' : 'tv';
    
    return fetch("https://api.themoviedb.org/3/" + type + "/" + tmdbId + "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96")
        .then(function(res) { return res.json(); })
        .then(function(tmdbData) {
            var originalName = (tmdbData.name || tmdbData.title || "").trim();
            // Arama yapmadan önce TMDB isminden bir yedek slug oluştur
            var fallbackSlug = originalName.toLowerCase()
                .replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[şŞ]/g, 's')
                .replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
                .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

            return fetch(BASE_URL + "/arama?q=" + encodeURIComponent(originalName))
                .then(function(r) { return r.text(); })
                .then(function(searchHtml) {
                    var regex = new RegExp('href="\/([^"]*' + (mediaType === 'tv' ? 'series|dizi' : 'movie|film') + '[^"]*)"', 'i');
                    var match = searchHtml.match(regex);
                    var slug = match ? match[1].split('/').pop() : fallbackSlug;
                    
                    var targetUrl = BASE_URL + "/" + (mediaType === 'tv' ? 'bolum' : 'film') + "/" + slug;
                    if (mediaType === 'tv') targetUrl += "-" + seasonNum + "x" + episodeNum;
                    
                    console.error("[DiziPal] Hedef: " + targetUrl);
                    return fetch(targetUrl);
                });
        })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var divMatch = html.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
            if (!divMatch) return [];
            var iframeUrl = decryptData(divMatch[1]);
            if (!iframeUrl) return [];
            if (iframeUrl.indexOf("//") === 0) iframeUrl = "https:" + iframeUrl;

            return fetch(iframeUrl).then(function(r) { return r.text(); }).then(function(playerHtml) {
                var pid = playerHtml.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/);
                if (!pid) return [];
                var origin = iframeUrl.split('/').slice(0, 3).join('/');
                return fetch(origin + "/source2.php?v=" + pid[1], {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' }
                }).then(function(r) { return r.json(); }).then(function(api) {
                    if (!api.file) return [];
                    return [{
                        name: "DiziPal",
                        url: api.file.replace(/\\/g, "").replace("m.php", "master.m3u8"),
                        type: 'm3u8'
                    }];
                });
            });
        })
        .catch(function(err) { return []; });
}

globalThis.getStreams = getStreams;
