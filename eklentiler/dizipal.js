/**
 * DiziPal - Nuvio Engine Optimized
 * Author: MoOnCrOwN
 */

const mainUrl = "https://dizipal1542.com";
const P = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

// 1. ANA SAYFA VE SAYFALAMA (Python'daki Load-Series Mantığı)
async function getMainPage(page, categoryId = "1") {
    try {
        let url = `${mainUrl}/diziler?tur=${categoryId}`;
        let response;

        if (page <= 1) {
            response = await fetch(url);
        } else {
            // Python'daki POST isteği: /api/load-series
            // Not: 'date' parametresi için son öğenin verisi gerekir, 
            // Nuvio'da bunu basitleştirmek için stabil GET tercih edilebilir veya 
            // meta-data üzerinden 'date' taşınabilir.
            response = await fetch(`${mainUrl}/api/load-series`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `date=${globalThis.lastDate || ""}&tur=${categoryId}`
            });
        }

        const text = await response.text();
        // HTML Parser burada devreye girer (Nuvio built-in parser kullanır)
        // Örnek dönüt: [{title, link, poster}]
        return parseHtmlToItems(text);
    } catch (e) {
        console.error("MainPage Error: " + e);
        return [];
    }
}

// 2. VİDEO ÇEKME (Kotlin'deki PBKDF2 + AES Mantığı)
async function getStreams(tId, type, s, e) {
    console.log(`[DiziPal] Stream aranıyor: ${tId}`);
    try {
        // TMDB üzerinden isim alıp slug oluşturma
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type === 'movie' ? 'movie' : 'tv'}/${tId}?api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        const name = tmdbData.name || tmdbData.title;

        const slug = name.toLowerCase()
            .replace(/[ğĞüÜşŞıİöÖçÇ]/g, x => ({'ğ':'g','ü':'u','ş':'s','ı':'i','ö':'o','ç':'c'}[x.toLowerCase()]))
            .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

        const targetUrl = `${mainUrl}/${type === 'tv' ? 'bolum' : 'film'}/${slug}${type === 'tv' ? `-${s}x${e}` : ''}`;
        
        const pageHtml = await (await fetch(targetUrl)).text();
        const match = pageHtml.match(/data-rm-k="true"[^>]*>(.*?)<\/div>/);
        
        if (!match) return [];

        // Şifre Çözme (İşlemciyi yormamak için parçalı JSON parse)
        const encrypted = JSON.parse(match[1].replace(/&quot;/g, '"').trim());
        
        // PBKDF2 - 999 Iterations (Kotlin'deki karşılığı)
        const key = CryptoJS.PBKDF2(P, CryptoJS.enc.Hex.parse(encrypted.salt), {
            keySize: 8,
            iterations: 999,
            hasher: CryptoJS.algo.SHA512
        });

        const decrypted = CryptoJS.AES.decrypt(encrypted.ciphertext, key, {
            iv: CryptoJS.enc.Hex.parse(encrypted.iv),
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        }).toString(CryptoJS.enc.Utf8).replace(/[\\"]/g, "");

        // DPlayer API (source2.php)
        const videoId = decrypted.match(/[?&]v=([^&]+)/)[1];
        const apiRes = await fetch(`https://four.dplayer82.site/source2.php?v=${videoId}`, {
            headers: { 'Referer': 'https://four.dplayer82.site/' }
        });
        
        const finalData = await apiRes.json();
        
        if (finalData.file) {
            return [{
                name: "DiziPal (Full HD)",
                url: finalData.file.replace(/\\/g, "").replace("m.php", "master.m3u8"),
                type: "m3u8",
                headers: { "Referer": "https://four.dplayer82.site/" }
            }];
        }
    } catch (err) {
        console.error("[DiziPal] Hata: " + err.message);
    }
    return [];
}

// Nuvio exportları
globalThis.getStreams = getStreams;
globalThis.getMainPage = getMainPage;
