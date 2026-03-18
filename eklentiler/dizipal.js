var cheerio = require("cheerio-without-node-native");

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        const isMovie = mediaType === 'movie' || mediaType === 'film';
        const tmdbUrl = `https://api.themoviedb.org/3/${isMovie ? 'movie' : 'tv'}/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`;
        
        const tmdbRes = await fetch(tmdbUrl).catch(() => null);
        if (!tmdbRes) return [];
        const tmdbData = await tmdbRes.json();
        const title = tmdbData.title || tmdbData.name;

        // Daha agresif temizlik: Sadece harf ve rakam
        const slug = title.toLowerCase()
            .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').trim();

        const url = `https://dizipal1227.com/${isMovie ? 'film' : 'dizi'}/${slug}${isMovie ? '' : '/sezon-' + seasonNum + '/bolum-' + episodeNum}`;

        // Siteye istek atarken cihaz bilgisini Android olarak set ediyoruz
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Fire TV) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.210 Mobile Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Referer': 'https://dizipal1227.com/'
            }
        }).catch(() => null);

        if (!res || !res.ok) return [];

        const html = await res.text();
        
        // Şifreli veriyi yakala
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
            }
        }
    } catch (e) {
        // Hata durumunda hiçbir şey döndürme ki uygulama çökmesin
    }
    return [];
}

function decrypt(data) {
    const P = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";
    try {
        const ct = Array.from(atob(data.ciphertext.replace(/\\/g, '').replace(/\s/g, ''))).map(c => c.charCodeAt(0));
        const iv = data.iv.match(/.{1,2}/g).map(h => parseInt(h, 16));
        const salt = data.salt.match(/.{1,2}/g).map(h => parseInt(h, 16));
        const key = salt.slice(0, 32).map((b, i) => b ^ P.charCodeAt(i % P.length));
        const res = ct.map((b, i) => b ^ key[i % key.length] ^ iv[i % iv.length]);
        const dec = res.map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '').join('');
        const link = dec.match(/https?:\/\/[^\s"']+/);
        return link ? link[0].replace(/\\\//g, '/') : null;
    } catch (e) { return null; }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
