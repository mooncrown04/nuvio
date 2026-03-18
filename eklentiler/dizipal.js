/**
 * DiziPal 1543 - Final Working Version
 */

var decryptData = function(rawContent) {
    try {
        if (typeof CryptoJS === 'undefined') return null;
        var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";
        var clean = rawContent.replace(/&quot;/g, '"').replace(/\\\//g, '/').trim();
        var ct = clean.match(/"ciphertext"\s*:\s*"([^"]+)"/)?.[1];
        var iv = clean.match(/"iv"\s*:\s*"([^"]+)"/)?.[1];
        var salt = clean.match(/"salt"\s*:\s*"([^"]+)"/)?.[1];
        if (!ct || !iv || !salt) return null;
        var key = CryptoJS.PBKDF2(PASSPHRASE, CryptoJS.enc.Hex.parse(salt), {
            keySize: 256 / 32, iterations: 999, hasher: CryptoJS.algo.SHA512
        });
        var decrypted = CryptoJS.AES.decrypt(ct, key, {
            iv: CryptoJS.enc.Hex.parse(iv), padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC
        });
        var result = "";
        try { result = decrypted.toString(CryptoJS.enc.Utf8); } catch (e) { result = decrypted.toString(CryptoJS.enc.Latin1); }
        return result ? result.replace(/[\\"]/g, "").trim() : null;
    } catch (e) { return null; }
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    var BASE_URL = 'https://dizipal1543.com';
    try {
        var type = mediaType === 'movie' ? 'movie' : 'tv';
        var tmdbRes = await fetch("https://api.themoviedb.org/3/" + type + "/" + tmdbId + "?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96");
        var tmdbData = await tmdbRes.json();
        var query = (tmdbData.name || tmdbData.title || "").trim();

        var searchRes = await fetch(BASE_URL + "/arama?q=" + encodeURIComponent(query), {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        var searchHtml = await searchRes.text();
        var pathMatch = searchHtml.match(new RegExp('href="\/([^"]*' + (mediaType === 'tv' ? 'series|dizi' : 'movie|film') + '[^"]*)"', 'i'));
        var slug = pathMatch ? pathMatch[1].split('/').pop() : query.toLowerCase().replace(/\s+/g, '-');

        var targetUrl = BASE_URL + "/" + (mediaType === 'tv' ? 'bolum' : 'film') + "/" + slug;
        if (mediaType === 'tv') targetUrl += "-" + seasonNum + "x" + episodeNum;
        
        var pageRes = await fetch(targetUrl);
        var pageHtml = await pageRes.text();
        var divMatch = pageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!divMatch) return [];

        var iframeUrl = decryptData(divMatch[1]);
        if (!iframeUrl) return [];
        if (iframeUrl.startsWith("//")) iframeUrl = "https:" + iframeUrl;
        
        // --- BURASI KRİTİK: Player'dan playlistId çekiyoruz ---
        var playerRes = await fetch(iframeUrl, { headers: { 'Referer': targetUrl } });
        var playerHtml = await playerRes.text();
        var playlistId = playerHtml.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/)?.[1];
        
        if (playlistId) {
            var playerOrigin = new URL(iframeUrl).origin;
            var apiRes = await fetch(playerOrigin + "/source2.php?v=" + playlistId, { 
                headers: { 'Referer': iframeUrl, 'X-Requested-With': 'XMLHttpRequest' } 
            });
            var apiJson = await apiRes.json();
            
            if (apiJson.file) {
                var streamUrl = apiJson.file.replace(/\\/g, "").replace("m.php", "master.m3u8");
                console.error("[DiziPal] STREAM OK: " + streamUrl);
                return [{
                    name: "DiziPal (DPlayer)",
                    url: streamUrl,
                    type: 'm3u8',
                    headers: { 'Referer': iframeUrl, 'Origin': playerOrigin, 'User-Agent': 'Mozilla/5.0' }
                }];
            }
        }
    } catch (err) {
        console.error("[DiziPal] Hata: " + err.message);
    }
    return [];
}

globalThis.getStreams = getStreams;
if (typeof module !== 'undefined') { module.exports = { getStreams: getStreams }; }
