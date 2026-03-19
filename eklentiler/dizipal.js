var cheerio = require("cheerio-without-node-native");

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    const baseUrl = "https://dizipal1543.com"; 
    
    // Tarayıcıyı en gerçekçi şekilde taklit edelim
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Referer': baseUrl + '/',
        'Upgrade-Insecure-Requests': '1'
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

        // Sayfayı çek
        const res = await fetch(finalUrl, { headers }).catch(() => null);
        if (!res || !res.ok) return [];
        const html = await res.text();
        
        // 108 karakterlik bloktan kaçınmak için farklı yakalama yöntemleri
        let jsonData = null;
        const jsonMatch = html.match(/\{"ciphertext":.*?"\}/) || html.match(/\{&quot;ciphertext&quot;:.*?&quot;\}/);
        
        if (jsonMatch) {
            const raw = jsonMatch[0].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            jsonData = JSON.parse(raw);
            
            // Eğer hala 108 ise, sayfa içindeki iframe'lere veya yedek scriptlere bak
            if (jsonData.ciphertext && jsonData.ciphertext.length <= 108) {
                console.error("Dizipal_Debug: Kısa veri algılandı (108), yedek yönteme geçiliyor...");
                const iframeMatch = html.match(/<iframe.*?src=["'](.*?)["']/);
                if (iframeMatch && !iframeMatch[1].includes('google')) {
                    return [{ name: "DiziPal (Yedek)", url: iframeMatch[1], quality: 'Auto', provider: 'dizipal' }];
                }
            }
        }

        if (jsonData) {
            const streamUrl = decrypt(jsonData);
            if (streamUrl && streamUrl.startsWith('http')) {
                return [{ name: "DiziPal (Full HD)", url: streamUrl, quality: '1080p', provider: 'dizipal' }];
            }
        }
    } catch (e) { console.error("Dizipal_Debug: Hata: " + e.message); }
    return [];
}

function decrypt(data) {
    const P = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";
    try {
        let b64 = data.ciphertext.replace(/\\/g, '').replace(/\s/g, '');
        while (b64.length % 4 !== 0) b64 += '=';
        const binaryStr = atob(b64);
        const ct = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) ct[i] = binaryStr.charCodeAt(i);
        const iv = new Uint8Array(data.iv.match(/.{1,2}/g).map(h => parseInt(h, 16)));
        const salt = new Uint8Array(data.salt.match(/.{1,2}/g).map(h => parseInt(h, 16)));
        const key = new Uint8Array(32);
        for (let i = 0; i < 32; i++) key[i] = salt[i] ^ P.charCodeAt(i % P.length);
        let decrypted = "";
        for (let i = 0; i < ct.length; i++) {
            const b = ct[i] ^ key[i % key.length] ^ iv[i % iv.length];
            if (b > 0) decrypted += String.fromCharCode(b);
        }
        const linkMatch = decrypted.match(/https?:\/\/[^\s"']+/);
        return linkMatch ? linkMatch[0].replace(/\\\//g, '/').split(/[\\\\"']/)[0] : null;
    } catch (e) { return null; }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
