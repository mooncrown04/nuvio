/**
 * DiziPal 1543 - Logger & Debugger
 */

var BASE_URL = 'https://dizipal1543.com';
var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

function decryptData(rawContent) {
    try {
        console.error(`[DiziPal] Gelen Ham Veri Uzunlugu: ${rawContent.length}`);
        
        // HTML Entity temizle ve temizlenmis hali logla
        let clean = rawContent.replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
        console.error(`[DiziPal] Temizlenmis Veri (Ilk 100 Karakter): ${clean.substring(0, 100)}`);

        // Degerleri cimbizla cek
        const ct = clean.match(/"ciphertext"\s*:\s*"([^"]+)"/)?.[1];
        const iv = clean.match(/"iv"\s*:\s*"([^"]+)"/)?.[1];
        const salt = clean.match(/"salt"\s*:\s*"([^"]+)"/)?.[1];

        // Hangi degerin eksik oldugunu spesifik olarak logla
        if (!ct) console.error("[DiziPal] Eksik Parca: ciphertext bulunamadi!");
        if (!iv) console.error("[DiziPal] Eksik Parca: iv bulunamadi!");
        if (!salt) console.error("[DiziPal] Eksik Parca: salt bulunamadi!");

        if (!ct || !iv || !salt) return null;

        const key = CryptoJS.PBKDF2(PASSPHRASE, CryptoJS.enc.Hex.parse(salt), {
            keySize: 256 / 32, iterations: 999, hasher: CryptoJS.algo.SHA512
        });

        const decrypted = CryptoJS.AES.decrypt(ct, key, {
            iv: CryptoJS.enc.Hex.parse(iv), padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC
        });

        const result = decrypted.toString(CryptoJS.enc.Utf8);
        return result ? result.replace(/[\\"]/g, "") : null;

    } catch (e) {
        console.error(`[DiziPal] KRITIK HATA (Decrypt): ${e.message}`);
        return null;
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    console.error(`[DiziPal] ISTEK: ${tmdbId} | S${seasonNum}E${episodeNum}`);

    try {
        const type = mediaType === 'movie' ? 'movie' : 'tv';
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        const query = (tmdbData.name || tmdbData.title || "").trim();

        // GET ile Arama
        const searchRes = await fetch(`${BASE_URL}/arama?q=${encodeURIComponent(query)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const searchHtml = await searchRes.text();
        const pathMatch = searchHtml.match(new RegExp(`href="\/([^"]*${mediaType === 'tv' ? 'series|dizi' : 'movie|film'}[^"]*)"`, 'i'));
        let slug = pathMatch ? pathMatch[1].split('/').pop() : query.toLowerCase().replace(/\s+/g, '-');

        let targetUrl = `${BASE_URL}/${mediaType === 'tv' ? 'bolum' : 'film'}/${slug}`;
        if (mediaType === 'tv') targetUrl += `-${seasonNum}x${episodeNum}`;
        
        console.error(`[DiziPal] Sayfa Hedefi: ${targetUrl}`);
        const pageRes = await fetch(targetUrl);
        const pageHtml = await pageRes.text();
        
        // Div'in ham halini yakala
        const divMatch = pageHtml.match(/<div[^>]*data-rm-k="true"[^>]*>(.*?)<\/div>/);
        
        if (!divMatch) {
            console.error("[DiziPal] HATA: data-rm-k div'i sayfada yok! (Sayfa HTML uzunlugu: " + pageHtml.length + ")");
            return [];
        }

        let iframeUrl = decryptData(divMatch[1]);
        if (!iframeUrl) return [];
        
        console.error(`[DiziPal] COZULEN URL: ${iframeUrl}`);
        
        // ... (Bundan sonrasi playlist ID ve stream çekme)
        return []; 

    } catch (err) {
        console.error(`[DiziPal] ANA HATA: ${err.message}`);
    }
    return [];
}

globalThis.getStreams = getStreams;
