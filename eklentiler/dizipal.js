/**
 * DiziPal 1543 - v31.0.0 (Timeout Killer)
 */

var PASSPHRASE = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";

async function getStreams(tmdbId, mediaType, season, episode) {
    const BASE = 'https://dizipal1543.com';
    
    try {
        // 1. TMDB Bilgisini Al (Hızlıca)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${mediaType === 'movie' ? 'movie' : 'tv'}/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdb = await tmdbRes.json();
        const name = tmdb.name || tmdb.title;
        
        if (!name) return [];

        // 2. Slug Oluştur
        const slug = name.toLowerCase()
            .replace(/[ğĞ]/g, 'g').replace(/[üÜ]/g, 'u').replace(/[şŞ]/g, 's')
            .replace(/[ıİ]/g, 'i').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
            .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

        const target = `${BASE}/${mediaType === 'tv' ? 'bolum' : 'film'}/${slug}${mediaType === 'tv' ? `-${season}x${episode}` : ''}`;

        // 3. Sayfayı Çek
        const pageRes = await fetch(target);
        const html = await pageRes.text();

        // 4. Şifreli Veriyi Bul
        const m = html.match(/data-rm-k="true"[^>]*>(.*?)<\/div>/);
        if (!m) return [];

        // 5. Şifreyi Çöz (Inline CryptoJS kullanımı)
        const raw = m[1].replace(/&quot;/g, '"').replace(/\\\//g, '/').trim();
        const c = JSON.parse(raw);
        const key = CryptoJS.PBKDF2(PASSPHRASE, CryptoJS.enc.Hex.parse(c.salt), { keySize: 8, iterations: 999, hasher: CryptoJS.algo.SHA512 });
        const dec = CryptoJS.AES.decrypt(c.ciphertext, key, { iv: CryptoJS.enc.Hex.parse(c.iv), padding: CryptoJS.pad.Pkcs7, mode: CryptoJS.mode.CBC }).toString(CryptoJS.enc.Utf8).replace(/[\\"]/g, "");

        if (!dec) return [];
        
        // 6. Son Linki Al
        const pid = dec.match(/[?&]v=([^&]+)/)[1];
        const origin = "https://four.dplayer82.site";
        
        const finalRes = await fetch(`${origin}/source2.php?v=${pid}`, {
            headers: { 'Referer': dec.includes('http') ? dec : 'https:' + dec, 'X-Requested-With': 'XMLHttpRequest' }
        });
        const finalJson = await finalRes.json();

        if (finalJson.file) {
            return [{
                name: "DiziPal",
                url: finalJson.file.replace(/\\/g, "").replace("m.php", "master.m3u8"),
                type: 'm3u8',
                headers: { 'Referer': origin + '/' }
            }];
        }
    } catch (e) {
        // Hata durumunda Nuvio'yu bekletmemek için boş dön
        return [];
    }
    return [];
}

globalThis.getStreams = getStreams;
