/**
 * MoOnCrOwN - DiziPal Scraper v73
 * SSL Sertifika ve Uzun Salt Desteği eklendi.
 */

var cheerio = require("cheerio-without-node-native");

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    // KESİN KURAL: Daima [] dönmeli
    const finalResults = [];

    try {
        const isMovie = mediaType === 'movie' || mediaType === 'film';
        const tmdbUrl = `https://api.themoviedb.org/3/${isMovie ? 'movie' : 'tv'}/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`;
        
        const tmdbRes = await fetch(tmdbUrl).catch(() => null);
        if (!tmdbRes) return [];
        const tmdbData = await tmdbRes.json().catch(() => ({}));
        
        const title = tmdbData.title || tmdbData.name;
        if (!title) return [];

        const slug = title.toLowerCase()
            .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
            .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').trim();

        // Hedef URL
        const targetUrl = isMovie 
            ? `https://dizipal1227.com/film/${slug}` 
            : `https://dizipal1227.com/dizi/${slug}/sezon-${seasonNum}/bolum-${episodeNum}`;

        // SSL ve Bot Koruması Bypass
        const response = await fetch(targetUrl, { 
            method: 'GET',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://dizipal1227.com/'
            } 
        }).catch(err => {
            console.error("[DiziPal] Bağlantı Hatası: Cihaz sertifikayı reddetti.");
            return null;
        });
        
        if (!response || !response.ok) return [];

        const html = await response.text();
        
        // Veriyi bulma (Senin paylaştığın &quot; yapısına göre regex)
        const match = html.match(/\{&quot;ciphertext&quot;:.*?&quot;\}/) || html.match(/\{"ciphertext":.*?"\}/);
        
        if (match) {
            const cleanJson = match[0].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            const data = JSON.parse(cleanJson);
            
            const streamUrl = decryptLogic(data);
            
            if (streamUrl && streamUrl.includes('http')) {
                finalResults.push({
                    name: "MoOnCrOwN DiziPal",
                    url: streamUrl,
                    quality: 'Auto',
                    provider: 'dizipal'
                });
            }
        }
    } catch (e) {
        console.error("[DiziPal Global Error]: " + e.message);
    }
    
    return finalResults; 
}

function decryptLogic(data) {
    const PASS = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";
    
    try {
        // Ciphertext Base64 -> Bytes
        const b64 = data.ciphertext.replace(/\\/g, '').replace(/\s/g, '');
        const bin = (typeof atob !== 'undefined') ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
        const ct = Array.from(bin).map(c => c.charCodeAt(0));
        
        // IV ve Salt Hex -> Bytes
        const iv = data.iv.match(/.{1,2}/g).map(h => parseInt(h, 16));
        const salt = data.salt.match(/.{1,2}/g).map(h => parseInt(h, 16));

        // Uzun Salt Desteği: Salt'ın ilk 32 byte'ı ile Passphrase'i XOR'la
        const key = salt.slice(0, 32).map((b, i) => b ^ PASS.charCodeAt(i % PASS.length));
        
        // Veriyi Çöz
        const res = ct.map((b, i) => b ^ key[i % key.length] ^ iv[i % iv.length]);
        const decoded = res.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '').join('');

        const link = decoded.match(/https?:\/\/[^\s"']+/);
        return link ? link[0].replace(/\\\//g, '/') : null;
    } catch (e) { 
        return null; 
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    globalThis.getStreams = getStreams;
}
