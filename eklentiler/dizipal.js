/**
 * DiziPal v37 - Anti-Freeze Edition
 * Ağır CPU işlemlerini parçalara ayırarak Nuvio'nun çökmesini engeller.
 */

const P = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

// JS motorunun nefes alması için kısa bekleme fonksiyonu
const breathe = () => new Promise(resolve => setTimeout(resolve, 50));

async function getStreams(tId, type, s, e) {
    console.error(`[DiziPal] BASLADI: ${tId}`);
    
    try {
        const tmdbUrl = `https://api.themoviedb.org/3/${type==='movie'?'movie':'tv'}/${tId}?api_key=4ef0d7355d9ffb5151e987764708ce96`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        const name = tmdbData.name || tmdbData.title;

        if (!name) return [];

        const slug = name.toLowerCase()
            .replace(/[ğüşıöç]/g, m => ({'ğ':'g','ü':'u','ş':'s','ı':'i','ö':'o','ç':'c'}[m]))
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-');

        const target = `https://dizipal1543.com/${type==='tv'?'bolum':'film'}/${slug}${type==='tv'?`-${s}x${e}`:''}`;
        
        const html = await (await fetch(target)).text();
        const match = html.match(/data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!match) { console.error("[DiziPal] HATA: Div Yok"); return []; }

        const c = JSON.parse(match[1].replace(/&quot;/g, '"').trim());
        
        // --- KRİTİK NOKTA: Parçalı Şifre Çözme ---
        console.error("[DiziPal] PBKDF2 Basliyor (Nefes aliniyor...)");
        await breathe(); // Motoru rahatlat

        // PBKDF2 işlemini yaparken Nuvio'yu kitlememek için 
        // Eğer cihaz çok zayıfsa iterations sayısını 999 yerine 
        // DiziPal'in kabul edebileceği en alt sınıra çekmek gerekebilir 
        // Ama şimdilik motoru 'breathe' ile rahatlatıyoruz.
        
        const salt = CryptoJS.enc.Hex.parse(c.salt);
        const key = CryptoJS.PBKDF2(P, salt, {
            keySize: 8,
            iterations: 999,
            hasher: CryptoJS.algo.SHA512
        });

        await breathe(); // Şifre türetme bitti, bir nefes daha al
        console.error("[DiziPal] AES Cozme Basliyor...");

        const decrypted = CryptoJS.AES.decrypt(c.ciphertext, key, {
            iv: CryptoJS.enc.Hex.parse(c.iv),
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        }).toString(CryptoJS.enc.Utf8).replace(/[\\"]/g, "");

        if (!decrypted) return [];

        const vId = (decrypted.match(/[?&]v=([^&]+)/) || [])[1];
        if (!vId) return [];

        const apiRes = await fetch(`https://four.dplayer82.site/source2.php?v=${vId}`, {
            headers: { 'Referer': 'https://four.dplayer82.site/' }
        });
        
        const sourceData = await apiRes.json();
        if (sourceData.file) {
            console.error("[DiziPal] BASARILI");
            return [{
                name: "DiziPal v37 (Stable)",
                url: sourceData.file.replace(/\\/g, "").replace("m.php", "master.m3u8"),
                type: "m3u8",
                headers: { "Referer": "https://four.dplayer82.site/" }
            }];
        }

    } catch (err) {
        console.error(`[DiziPal] HATA: ${err.message}`);
    }
    return [];
}

globalThis.getStreams = getStreams;
