var cheerio = require("cheerio-without-node-native");

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    const baseUrl = "https://dizipal1543.com"; 
    
    // Masaüstü tarayıcı taklidi yapalım
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': baseUrl,
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    try {
        const isMovie = mediaType === 'movie' || mediaType === 'film';
        const tmdbUrl = `https://api.themoviedb.org/3/${isMovie ? 'movie' : 'tv'}/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`;
        
        const tmdbRes = await fetch(tmdbUrl).catch(() => null);
        if (!tmdbRes) return [];
        const tmdbData = await tmdbRes.json();
        const title = tmdbData.title || tmdbData.name;

        const slug = title.toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').trim();
        const finalUrl = `${baseUrl}/${isMovie ? 'film' : 'bolum'}/${slug}${isMovie ? '' : '-' + seasonNum + 'x' + episodeNum}`;

        // İsteği headers ile gönderelim
        const res = await fetch(finalUrl, { headers }).catch(() => null);
        if (!res || !res.ok) return [];
        const html = await res.text();
        
        // Hem klasik JSON hem de data-config taraması
        const match = html.match(/\{&quot;ciphertext&quot;:.*?&quot;\}/) || 
                      html.match(/\{"ciphertext":.*?"\}/) ||
                      html.match(/data-config=['"](.*?)['"]/);
        
        if (match) {
            let jsonStr = match[1] || match[0];
            jsonStr = jsonStr.replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            
            const jsonData = JSON.parse(jsonStr);
            console.error("Dizipal_Debug: Yeni Uzunluk: " + (jsonData.ciphertext ? jsonData.ciphertext.length : 0));
            
            const streamUrl = decrypt(jsonData);
            
            if (streamUrl && streamUrl.startsWith('http')) {
                return [{ name: "DiziPal HD", url: streamUrl, quality: '1080p', provider: 'dizipal' }];
            }
        }
    } catch (e) { console.error("Dizipal_Debug: Hata: " + e.message); }
    return [];
}

function base64ToBytes(b64) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let str = b64.replace(/[=]/g, "").replace(/\\/g, '').replace(/\s/g, '');
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
        const ct = base64ToBytes(data.ciphertext);
        const iv = new Uint8Array(data.iv.match(/.{1,2}/g).map(h => parseInt(h, 16)));
        const salt = new Uint8Array(data.salt.match(/.{1,2}/g).map(h => parseInt(h, 16)));
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
