//ayt
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

        const slug = title.toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').trim();
        const finalUrl = `${baseUrl}/${isMovie ? 'film' : 'bolum'}/${slug}${isMovie ? '' : '-' + seasonNum + 'x' + episodeNum}`;

        const res = await fetch(finalUrl).catch(() => null);
        if (!res || !res.ok) return [];
        const html = await res.text();
        
        const match = html.match(/\{&quot;ciphertext&quot;:.*?&quot;\}/) || html.match(/\{"ciphertext":.*?"\}/);
        
        if (match) {
            const cleanData = match[0].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            const streamUrl = decrypt(JSON.parse(cleanData));
            
            if (streamUrl && streamUrl.startsWith('http')) {
                return [{ name: "DiziPal (V3)", url: streamUrl, quality: 'Auto', provider: 'dizipal' }];
            } else {
                console.error("Dizipal_Debug: Cozumleme Sonucu Gecersiz: " + (streamUrl ? "Format Hatasi" : "Null"));
            }
        }
    } catch (e) { console.error("Dizipal_Debug: Kritik Hata: " + e.message); }
    return [];
}

// Manuel Base64 Çözücü (atob hatalarını önlemek için)
function base64ToBytes(b64) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let str = b64.replace(/[=]/g, "");
    let bytes = new Uint8Array((str.length * 3) >> 2);
    for (let i = 0, j = 0; i < str.length; i += 4) {
        let n = (chars.indexOf(str[i]) << 18) | (chars.indexOf(str[i + 1]) << 12) | 
                ((chars.indexOf(str[i + 2]) | 0) << 6) | (chars.indexOf(str[i + 3]) | 0);
        bytes[j++] = (n >> 16) & 0xFF;
        if (j < bytes.length) bytes[j++] = (n >> 8) & 0xFF;
        if (j < bytes.length) bytes[j++] = n & 0xFF;
    }
    return bytes;
}

function decrypt(data) {
    const P = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";
    
    try {
        const ct = base64ToBytes(data.ciphertext.replace(/\\/g, '').replace(/\s/g, ''));
        const iv = data.iv.match(/.{1,2}/g).map(h => parseInt(h, 16));
        const salt = data.salt.match(/.{1,2}/g).map(h => parseInt(h, 16));

        const key = salt.slice(0, 32).map((b, i) => b ^ P.charCodeAt(i % P.length));
        
        let decrypted = "";
        for (let i = 0; i < ct.length; i++) {
            const b = ct[i] ^ key[i % key.length] ^ iv[i % iv.length];
            if (b >= 32 && b <= 126) decrypted += String.fromCharCode(b);
        }

        const linkMatch = decrypted.match(/https?:\/\/[^\s"']+/);
        if (linkMatch) {
            return linkMatch[0].replace(/\\\//g, '/').split(/[\\\\"']/)[0];
        }
    } catch (e) { console.error("Dizipal_Debug: Decrypt Istisna: " + e.message); }
    return null;
}

if (typeof module !== 'undefined') module.exports = { getStreams };
