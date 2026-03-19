var cheerio = require("cheerio-without-node-native");

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    const baseUrl = "https://dizipal1543.com"; 
    
    try {
        const isMovie = mediaType === 'movie' || mediaType === 'film';
        const tmdbUrl = `https://api.themoviedb.org/3/${isMovie ? 'movie' : 'tv'}/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`;
        
        const tmdbRes = await fetch(tmdbUrl).catch(() => null);
        if (!tmdbRes) return [];
        const tmdbData = await tmdbRes.json();
        const title = tmdbData.title || tmdbData.name;

        // Slug oluşturma
        const slug = title.toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').trim();
        const finalUrl = `${baseUrl}/${isMovie ? 'film' : 'bolum'}/${slug}${isMovie ? '' : '-' + seasonNum + 'x' + episodeNum}`;

        const res = await fetch(finalUrl).catch(() => null);
        if (!res || !res.ok) return [];
        const html = await res.text();
        
        // Şifreli veriyi ve varsa içindeki özel anahtarları yakalamaya çalış
        const match = html.match(/\{&quot;ciphertext&quot;:.*?&quot;\}/) || 
                      html.match(/\{"ciphertext":.*?"\}/) ||
                      html.match(/data-config='(.*?)'/);
        
        if (match) {
            let jsonStr = match[1] || match[0];
            jsonStr = jsonStr.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            
            const jsonData = JSON.parse(jsonStr);
            console.error("Dizipal_Debug: Ciphertext Uzunlugu: " + (jsonData.ciphertext ? jsonData.ciphertext.length : 0));
            
            const streamUrl = decrypt(jsonData);
            
            if (streamUrl && streamUrl.startsWith('http')) {
                return [{ name: "DiziPal (Full HD)", url: streamUrl, quality: 'Auto', provider: 'dizipal' }];
            } else {
                console.error("Dizipal_Debug: Cozumleme Basarisiz veya URL Hatali.");
            }
        } else {
            console.error("Dizipal_Debug: Sayfada veri bulunamadi.");
        }
    } catch (e) { console.error("Dizipal_Debug: Hata: " + e.message); }
    return [];
}

// Güvenli Base64 Çözücü
function safeAtob(b64) {
    try {
        let str = b64.replace(/\\/g, '').replace(/\s/g, '');
        while (str.length % 4 !== 0) str += '=';
        return atob(str);
    } catch (e) { return ""; }
}

function decrypt(data) {
    // P anahtarı - Sitenin JS dosyasından alınan en güncel hali
    const P = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";
    
    try {
        const binaryStr = safeAtob(data.ciphertext);
        if (!binaryStr) return null;

        const ct = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) ct[i] = binaryStr.charCodeAt(i);

        const iv = new Uint8Array(data.iv.match(/.{1,2}/g).map(h => parseInt(h, 16)));
        const salt = new Uint8Array(data.salt.match(/.{1,2}/g).map(h => parseInt(h, 16)));

        // Key ve XOR İşlemi
        const key = new Uint8Array(32);
        for (let i = 0; i < 32; i++) key[i] = salt[i] ^ P.charCodeAt(i % P.length);
        
        let decrypted = "";
        for (let i = 0; i < ct.length; i++) {
            const b = ct[i] ^ key[i % key.length] ^ iv[i % iv.length];
            if (b >= 32 && b <= 126) decrypted += String.fromCharCode(b);
        }

        const linkMatch = decrypted.match(/https?:\/\/[^\s"']+/);
        return linkMatch ? linkMatch[0].replace(/\\\//g, '/').split(/[\\\\"']/)[0] : null;

    } catch (e) { return null; }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
