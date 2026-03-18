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
                return [{ 
                    name: "DiziPal (Full HD)", 
                    url: streamUrl, 
                    quality: '1080p', 
                    provider: 'dizipal' 
                }];
            } else {
                console.error("Dizipal_Debug: Gecersiz Link: " + streamUrl);
            }
        }
    } catch (e) {
        console.error("Dizipal_Debug: Kritik Hata: " + e.message);
    }
    return [];
}

function decrypt(data) {
    const P = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";
    
    try {
        // 1. Base64 verisini hazırla ve Padding (==) ekle
        let b64 = data.ciphertext.replace(/\\/g, '').replace(/\s/g, '');
        while (b64.length % 4 !== 0) b64 += '=';

        // 2. Binary dönüşümü
        const binaryStr = atob(b64);
        const ct = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
            ct[i] = binaryStr.charCodeAt(i);
        }

        // 3. IV ve SALT
        const iv = new Uint8Array(data.iv.match(/.{1,2}/g).map(h => parseInt(h, 16)));
        const salt = new Uint8Array(data.salt.match(/.{1,2}/g).map(h => parseInt(h, 16)));

        // 4. Anahtar Üretimi (32 byte)
        const key = new Uint8Array(32);
        for (let i = 0; i < 32; i++) {
            key[i] = salt[i] ^ P.charCodeAt(i % P.length);
        }

        // 5. XOR Çözümü ve String İnşası
        let decrypted = "";
        for (let i = 0; i < ct.length; i++) {
            const byte = ct[i] ^ key[i % key.length] ^ iv[i % iv.length];
            // Sadece anlamlı karakterleri ekle (Null byte temizliği)
            if (byte > 0) decrypted += String.fromCharCode(byte);
        }

        // 6. Link Ayıklama (Gelişmiş Regex)
        const linkMatch = decrypted.match(/https?:\/\/[^"'\s<>\\^`{|}[\]]+/);
        if (linkMatch) {
            let finalLink = linkMatch[0].replace(/\\\//g, '/');
            // Link sonundaki olası bozuklukları temizle
            return finalLink.split(/[ "']/)[0];
        }
    } catch (e) {
        console.error("Dizipal_Debug: Decrypt Hatasi: " + e.message);
    }
    return null;
}

if (typeof module !== 'undefined') module.exports = { getStreams };
