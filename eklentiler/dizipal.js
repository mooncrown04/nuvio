/**
 * DiziPal 1543 - Fixed Export Structure
 */

const PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

// Yardımcı Fonksiyon: Sadece bu modül içinde tanımlı kalsın
function decryptData(rawContent) {
    try {
        if (typeof CryptoJS === 'undefined') return null;

        // Ters slash temizliği
        let clean = rawContent.replace(/&quot;/g, '"').replace(/\\\//g, '/').trim();
        
        const ct = clean.match(/"ciphertext"\s*:\s*"([^"]+)"/)?.[1];
        const iv = clean.match(/"iv"\s*:\s*"([^"]+)"/)?.[1];
        const salt = clean.match(/"salt"\s*:\s*"([^"]+)"/)?.[1];

        if (!ct || !iv || !salt) return null;

        const key = CryptoJS.PBKDF2(PASSPHRASE, CryptoJS.enc.Hex.parse(salt), {
            keySize: 256 / 32, iterations: 999, hasher: CryptoJS.algo.SHA512
        });

        const decrypted = CryptoJS.AES.decrypt(ct, key, {
            iv: CryptoJS.enc.Hex.parse(iv), padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC
        });

        let result = "";
        try {
            result = decrypted.toString(CryptoJS.enc.Utf8);
        } catch (e) {
            result = decrypted.toString(CryptoJS.enc.Latin1);
        }

        return result ? result.replace(/[\\"]/g, "").trim() : null;
    } catch (e) {
        return null;
    }
}

// ANA FONKSIYON: Nuvio'nun bulabilmesi için hem globalThis hem module.exports
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    const BASE_URL = 'https://dizipal1543.com';
    console.error(`[DiziPal] Sorgu basladi: ${tmdbId}`);

    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        const query = (tmdbData.name || tmdbData.title || "").trim();

        const searchRes = await fetch(`${BASE_URL}/arama?q=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const searchHtml = await searchRes.text();
        const pathMatch = searchHtml.match(new RegExp(`href="\/([^"]*${mediaType === 'tv' ? 'series|dizi' : 'movie|film'}[^"]*)"`, 'i'));
        let slug = pathMatch ? pathMatch[1].split('/').pop() : query.toLowerCase().replace(/\s+/g, '-');

        let targetUrl = `${BASE_URL}/${mediaType === 'tv' ? 'bolum' : 'film'}/${slug}`;
        if (mediaType === 'tv') targetUrl += `-${seasonNum}x${episodeNum}`;
        
        console.error(`[DiziPal] Hedef: ${targetUrl}`);
        const pageRes = await fetch(targetUrl);
        const pageHtml = await pageRes.text();
        
        const divMatch = pageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!divMatch) return [];

        let iframeUrl = decryptData(divMatch[1]);
        if (!iframeUrl) return [];
        if (iframeUrl.startsWith("//")) iframeUrl = "https:" + iframeUrl;
        
        console.error(`[DiziPal] Iframe bulundu: ${iframeUrl}`);

        const playerRes = await fetch(iframeUrl, { headers: { 'Referer': targetUrl } });
        const playerHtml = await playerRes.text();
        const playlistId = playerHtml.match(/window\.openPlayer\s*\(\s*['"]([^'"]+)['"]/)?.[1];
        
        if (playlistId) {
            const playerOrigin = new URL(iframeUrl).origin;
            const apiRes = await fetch(`${playerOrigin}/source2.php?v=${playlistId}`, { 
                headers: { 'Referer': iframeUrl, 'X-Requested-With': 'XMLHttpRequest' } 
            });
            const apiJson = await apiRes.json();
            
            if (apiJson.file) {
                const streamUrl = apiJson.file.replace(/\\/g, "").replace("m.php", "master.m3u8");
                return [{
                    name: "DiziPal (DPlayer)",
                    url: streamUrl,
                    type: 'm3u8',
                    headers: { 'Referer': iframeUrl, 'Origin': playerOrigin }
                }];
            }
        }
    } catch (err) {
        console.error(`[DiziPal] Hata: ${err.message}`);
    }
    return [];
}

// Nuvio ve Cloudstream uyumluluğu için ÇİFT YÖNLÜ EXPORT
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    globalThis.getStreams = getStreams;
}
