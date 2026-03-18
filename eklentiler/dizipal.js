/**
 * DiziPal v36 - Nuvio Anti-Crash Edition
 * RAM kullanımını düşürmek için regex ve crypto işlemleri minimize edildi.
 */

const P = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

async function getStreams(tId, type, s, e) {
    console.error(`[DiziPal] ISLEM BASLADI: ${tId}`); // console.error kullanarak logu zorluyoruz
    
    try {
        // 1. TMDB Verisi (Cache dostu)
        const tmdbUrl = `https://api.themoviedb.org/3/${type==='movie'?'movie':'tv'}/${tId}?api_key=4ef0d7355d9ffb5151e987764708ce96`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        const name = tmdbData.name || tmdbData.title;

        if (!name) { console.error("[DiziPal] HATA: Isim bulunamadi"); return []; }

        // Slug oluşturma (Daha hızlı yöntem)
        const slug = name.toLowerCase()
            .replace(/[ğüşıöç]/g, m => ({'ğ':'g','ü':'u','ş':'s','ı':'i','ö':'o','ç':'c'}[m]))
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-');

        const target = `https://dizipal1543.com/${type==='tv'?'bolum':'film'}/${slug}${type==='tv'?`-${s}x${e}`:''}`;
        console.error(`[DiziPal] HEDEF: ${target}`);

        // 2. Sayfa Çekme
        const pageRes = await fetch(target);
        if (!pageRes.ok) { console.error(`[DiziPal] HTTP HATA: ${pageRes.status}`); return []; }
        const html = await pageRes.text();

        // 3. Şifreli Veri Ayıklama
        const match = html.match(/data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!match) { console.error("[DiziPal] HATA: Sifreli div bulunamadi"); return []; }

        // RAM'i rahatlatmak için html değişkenini boşaltalım
        const rawJson = match[1].replace(/&quot;/g, '"').trim();
        
        // 4. Şifre Çözme (CPU dostu)
        console.error("[DiziPal] Sifre cozme adimi...");
        const c = JSON.parse(rawJson);
        const key = CryptoJS.PBKDF2(P, CryptoJS.enc.Hex.parse(c.salt), {
            keySize: 8, iterations: 999, hasher: CryptoJS.algo.SHA512
        });
        
        const decrypted = CryptoJS.AES.decrypt(c.ciphertext, key, {
            iv: CryptoJS.enc.Hex.parse(c.iv),
            padding: CryptoJS.pad.Pkcs7,
            mode: CryptoJS.mode.CBC
        }).toString(CryptoJS.enc.Utf8).replace(/[\\"]/g, "");

        if (!decrypted) { console.error("[DiziPal] HATA: Decrypt bos dondu"); return []; }

        // 5. Kaynak Linki (DPlayer)
        const vId = (decrypted.match(/[?&]v=([^&]+)/) || [])[1];
        if (!vId) { console.error("[DiziPal] HATA: vId bulunamadi"); return []; }

        const apiRes = await fetch(`https://four.dplayer82.site/source2.php?v=${vId}`, {
            headers: { 'Referer': 'https://four.dplayer82.site/' }
        });
        
        const sourceData = await apiRes.json();
        if (sourceData.file) {
            console.error("[DiziPal] BASARILI: Link alindi");
            return [{
                name: "DiziPal v36",
                url: sourceData.file.replace(/\\/g, "").replace("m.php", "master.m3u8"),
                type: "m3u8",
                headers: { "Referer": "https://four.dplayer82.site/" }
            }];
        }

    } catch (err) {
        console.error(`[DiziPal] FATAL: ${err.message}`);
    }
    return [];
}

globalThis.getStreams = getStreams;
