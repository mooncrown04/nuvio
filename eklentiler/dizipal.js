/**
 * DiziPal 1543 - Full Functional Plugin
 * Powered by MoonCrown Fix
 */

const BASE_URL = 'https://dizipal1543.com';
const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

// AES Sifre Cozucu Fonksiyon
function decryptData(rawJson) {
    try {
        const ct = rawJson.match(/"ciphertext"\s*:\s*"([^"]+)"/)?.[1];
        const ivHex = rawJson.match(/"iv"\s*:\s*"([^"]+)"/)?.[1];
        const saltHex = rawJson.match(/"salt"\s*:\s*"([^"]+)"/)?.[1];

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
    console.error(`[DiziPal] Sorgu: ${tmdbId} | Sezon: ${seasonNum} | Bolum: ${episodeNum}`);

    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        const query = (tmdbData.name || tmdbData.title || "").trim();

        // 1. Arama Yap ve Slug Bul
        const searchUrl = `${BASE_URL}/arama?q=${encodeURIComponent(query)}`;
        const searchRes = await fetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
        });
        const searchHtml = await searchRes.text();
        
        const pathMatch = searchHtml.match(new RegExp(`href="\/([^"]*${mediaType === 'tv' ? 'series|dizi' : 'movie|film'}[^"]*)"`, 'i'));
        let slug = pathMatch ? pathMatch[1].split('/').pop() : query.toLowerCase().replace(/\s+/g, '-');

        // 2. Bolum Sayfasına Git
        let targetUrl = `${BASE_URL}/${mediaType === 'tv' ? 'bolum' : 'film'}/${slug}`;
        if (mediaType === 'tv') targetUrl += `-${seasonNum}x${episodeNum}`;

        console.error(`[DiziPal] Hedef: ${targetUrl}`);
        const pageRes = await fetch(targetUrl);
        const pageHtml = await pageRes.text();
        
        const encryptedDiv = pageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!encryptedDiv) return [];

        // 3. Iframe URL Coz
        let iframeUrl = decryptData(encryptedDiv[1]);
        if (!iframeUrl) return [];
        if (iframeUrl.startsWith("//")) iframeUrl = "https:" + iframeUrl;

        console.error(`[DiziPal] Player: ${iframeUrl}`);

        // 4. Player Iceriginden Video ID Yakala
        const playerRes = await fetch(iframeUrl, { headers: { 'Referer': targetUrl } });
        const playerHtml = await playerRes.text();
        const playlistId = playerHtml.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/)?.[1];
        
        if (!playlistId) return [];

        // 5. API'den Master M3U8 Linkini Al
        const playerOrigin = new URL(iframeUrl).origin;
        const apiRes = await fetch(`${playerOrigin}/source2.php?v=${playlistId}`, { 
            headers: { 'Referer': iframeUrl, 'X-Requested-With': 'XMLHttpRequest' } 
        });
        const apiJson = await apiRes.json();
        
        if (!apiJson.file) return [];
        let streamUrl = apiJson.file.replace(/\\/g, "").replace("m.php", "master.m3u8");

        console.error(`[DiziPal] Stream OK: ${streamUrl}`);

        // Nuvio/Cloudstream Return
        return [{
            name: "DiziPal (DPlayer)",
            url: streamUrl,
            quality: 1080,
            type: 'm3u8',
            headers: { 
                'Referer': iframeUrl,
                'Origin': playerOrigin,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }];

    } catch (err) {
        console.error(`[DiziPal] Hata: ${err.message}`);
        return [];
    }
}

globalThis.getStreams = getStreams;
