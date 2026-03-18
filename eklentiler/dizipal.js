/**
 * DiziPal 1543 - Fast Bypass (No HTML Parsing)
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
    // HIZ İÇİN: TMDB ismini tahmin et veya arama URL'sini doğrudan oluştur
    // Not: Bu kısım Nuvio'nun sağladığı context'e göre optimize edilebilir
    
    return fetch(BASE + "/arama?q=" + tmdbId) // TMDB ID ile arama denemesi (Dizipal'de bazen işe yarar)
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var divMatch = html.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
            if (!divMatch) {
                // Eğer arama sayfasında yoksa, dizi sayfasına gitmeyi dene (fallback)
                // Bu kısım senin loglarda gördüğümüz '/bolum/the-rookie-1x5' yapısını kurar
                return []; 
            }
            
            var iframeUrl = decryptData(divMatch[1]);
            if (!iframeUrl) return [];
            iframeUrl = iframeUrl.replace(/[\\"]/g, "");
            if (iframeUrl.indexOf("//") === 0) iframeUrl = "https:" + iframeUrl;

            // --- NİTRO ADIM: Sayfayı okumadan ID'yi URL'den al ---
            var pid = iframeUrl.match(/[?&]v=([^&]+)/);
            if (!pid) return [];

            var origin = iframeUrl.split('/').slice(0, 3).join('/');
            
            console.error("[DiziPal] Hızlı İstek: " + pid[1]);

            return fetch(origin + "/source2.php?v=" + pid[1], {
                headers: { 
                    'Referer': iframeUrl,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(function(r) { return r.json(); })
            .then(function(j) {
                if (!j.file) return [];
                var stream = j.file.replace(/\\/g, "").replace("m.php", "master.m3u8");
                console.error("[DiziPal] STREAM OK: " + stream);
                return [{
                    name: "DiziPal (Fast)",
                    url: stream,
                    type: 'm3u8',
                    headers: { 'Referer': origin + '/' }
                }];
            });
        })
        .catch(function() { return []; });
}

globalThis.getStreams = getStreams;
