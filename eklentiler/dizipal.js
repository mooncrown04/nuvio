var cheerio = require("cheerio-without-node-native");

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    try {
        // GÜNCEL DOMAIN (Gönderdiğin dosyadan alınan)
        const baseUrl = "https://dizipal1543.com"; 
        
        const isMovie = mediaType === 'movie' || mediaType === 'film';
        const tmdbUrl = `https://api.themoviedb.org/3/${isMovie ? 'movie' : 'tv'}/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`;
        
        const tmdbRes = await fetch(tmdbUrl).catch(() => null);
        if (!tmdbRes) return [];
        const tmdbData = await tmdbRes.json();
        const title = tmdbData.title || tmdbData.name;

        // 1. ADIM: Sitede Arama Yaparak Gerçek Linki Bul
        const searchUrl = `${baseUrl}/search/${encodeURIComponent(title)}`;
        const searchRes = await fetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' }
        }).catch(() => null);

        let finalUrl = "";
        if (searchRes && searchRes.ok) {
            const searchHtml = await searchRes.text();
            const $ = cheerio.load(searchHtml);
            // Arama sonuçlarından ilk eşleşen linki al
            const firstResult = $('.video-block a').first().attr('href');
            if (firstResult) {
                finalUrl = firstResult.startsWith('http') ? firstResult : baseUrl + firstResult;
                // Dizi ise bölüm yapısını ekle (Örn: /bolum/konusanlar-1x11-c05 yapısına uygun)
                if (!isMovie) {
                    finalUrl = finalUrl.replace('/dizi/', '/bolum/') + `-${seasonNum}x${episodeNum}`;
                }
            }
        }

        // 2. ADIM: Arama başarısız olursa manuel slug oluştur (Yedek)
        if (!finalUrl) {
            const slug = title.toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').trim();
            finalUrl = `${baseUrl}/${isMovie ? 'film' : 'bolum'}/${slug}${isMovie ? '' : '-' + seasonNum + 'x' + episodeNum}`;
        }

        // 3. ADIM: Sayfayı çek ve şifreli veriyi (ciphertext) bul
        const res = await fetch(finalUrl).catch(() => null);
        if (!res || !res.ok) return [];
        const html = await res.text();
        
        // Şifreli veriyi ayıkla
        const match = html.match(/\{&quot;ciphertext&quot;:.*?&quot;\}/) || html.match(/\{"ciphertext":.*?"\}/);
        
        if (match) {
            const cleanData = match[0].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            const streamUrl = decrypt(JSON.parse(cleanData));
            if (streamUrl) {
                return [{ name: "DiziPal (V3)", url: streamUrl, quality: 'Auto', provider: 'dizipal' }];
            }
        }
    } catch (e) { console.log("Dizipal Error:", e); }
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
