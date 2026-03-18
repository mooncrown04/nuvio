/**
 * DiziPal 1543 - Syntax Error Fixed
 */

var BASE_URL = 'https://dizipal1543.com';
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

function decryptDizipalData(rawJsonText) {
    try {
        const ct = rawJsonText.match(/"ciphertext"\s*:\s*"([^"]+)"/)?.[1];
        const ivHex = rawJsonText.match(/"iv"\s*:\s*"([^"]+)"/)?.[1];
        const saltHex = rawJsonText.match(/"salt"\s*:\s*"([^"]+)"/)?.[1];

        if (!ct || !ivHex || !saltHex) return null;

        const salt = CryptoJS.enc.Hex.parse(saltHex);
        const iv = CryptoJS.enc.Hex.parse(ivHex);
        const key = CryptoJS.PBKDF2(PASSPHRASE, salt, {
            keySize: 256 / 32,
            iterations: 999,
            hasher: CryptoJS.algo.SHA512
        });

        const decrypted = CryptoJS.AES.decrypt(ct, key, {
            iv: iv,
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        });

        return decrypted.toString(CryptoJS.enc.Utf8).replace(/\\/g, "");
    } catch (e) {
        return null;
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[DiziPal] Sorgu Baslatildi: ${tmdbId}`);
    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        
        const query = (tmdbData.name || tmdbData.title || "").replace(/[^a-zA-Z0-9 ]/g, "").trim();
        console.error(`[DiziPal] Araniyor: ${query}`);

        const searchRes = await fetch(`${BASE_URL}/bg/searchcontent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Requested-With': 'XMLHttpRequest' },
            body: `searchterm=${encodeURIComponent(query)}`
        });

        const searchData = await searchRes.json();
        const results = Object.values(searchData);

        if (!results || results.length === 0) {
            console.error("[DiziPal] Sonuc yok.");
            return [];
        }

        let resObj = results[0];
        let path = resObj.url || resObj.path || "";
        if (!path) return [];

        let targetUrl = BASE_URL + path;
        if (mediaType === 'tv') {
            const slug = path.split('/').filter(p => p && p !== 'series' && p !== 'dizi').pop();
            targetUrl = `${BASE_URL}/bolum/${slug}-${seasonNum}x${episodeNum}`;
        }

        console.error(`[DiziPal] Hedef: ${targetUrl}`);
        const pageRes = await fetch(targetUrl);
        const pageHtml = await pageRes.text();
        
        const encryptedMatch = pageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!encryptedMatch) return [];

        let iframeUrl = decryptDizipalData(encryptedMatch[1]);
        if (!iframeUrl) return [];
        if (iframeUrl.startsWith("//")) iframeUrl = "https:" + iframeUrl;

        console.error(`[DiziPal] Player: ${iframeUrl}`);
        const playerRes = await fetch(iframeUrl, { headers: { 'Referer': targetUrl } });
        const playerHtml = await playerRes.text();
        
        const playlistId = playerHtml.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/)?.[1];
        if (!playlistId) return [];

        const playerOrigin = new URL(iframeUrl).origin;
        const apiRes = await fetch(`${playerOrigin}/source2.php?v=${playlistId}`, { headers: { 'Referer': iframeUrl } });
        const apiText = await apiRes.text();

        const fileMatch = apiText.match(/"file"\s*:\s*"([^"]+)"/);
        if (!fileMatch) return [];

        let streamUrl = fileMatch[1].replace(/\\/g, "").replace("m.php", "master.m3u8");

        // Nuvio/Cloudstream uyumlu donus objesi
        return [{
            name: "DiziPal (DPlayer)",
            url: streamUrl,
            quality: 720,
            type: 'm3u8',
            headers: { 
                'Referer': iframeUrl,
                'Origin': playerOrigin,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }];
    } catch (err) {
        console.error(`[DiziPal] HATA: ${err.message}`);
        return [];
    }
}

// Export kisminda yazim hatasi olmamali
globalThis.getStreams = getStreams;
