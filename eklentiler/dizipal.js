var cheerio = require("cheerio-without-node-native");

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    const baseUrl = "https://dizipal1543.com"; 
    console.error("Dizipal_Debug: Baslatiliyor... TMDB ID: " + tmdbId);

    try {
        const isMovie = mediaType === 'movie' || mediaType === 'film';
        const tmdbUrl = `https://api.themoviedb.org/3/${isMovie ? 'movie' : 'tv'}/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`;
        
        const tmdbRes = await fetch(tmdbUrl).catch(e => {
            console.error("Dizipal_Debug: TMDB Fetch Hatasi: " + e.message);
            return null;
        });
        
        if (!tmdbRes) return [];
        const tmdbData = await tmdbRes.json();
        const title = tmdbData.title || tmdbData.name;
        console.error("Dizipal_Debug: Aranan Baslik: " + title);

        // 1. ADIM: Arama Motorunu Test Et
        const searchUrl = `${baseUrl}/search/${encodeURIComponent(title)}`;
        console.error("Dizipal_Debug: Arama Yapiliyor: " + searchUrl);
        
        const searchRes = await fetch(searchUrl).catch(e => {
            console.error("Dizipal_Debug: Arama Fetch Hatasi: " + e.message);
            return null;
        });

        let finalUrl = "";
        if (searchRes && searchRes.ok) {
            const searchHtml = await searchRes.text();
            const $ = cheerio.load(searchHtml);
            const firstResult = $('.video-block a').first().attr('href');
            
            if (firstResult) {
                finalUrl = firstResult.startsWith('http') ? firstResult : baseUrl + firstResult;
                if (!isMovie) {
                    finalUrl = finalUrl.replace('/dizi/', '/bolum/') + `-${seasonNum}x${episodeNum}`;
                }
                console.error("Dizipal_Debug: Arama Sonucu Bulundu: " + finalUrl);
            } else {
                console.error("Dizipal_Debug: Arama Yapildi Ama Link Bulunamadi.");
            }
        }

        // 2. ADIM: Yedek Slug Denemesi
        if (!finalUrl) {
            const slug = title.toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').trim();
            finalUrl = `${baseUrl}/${isMovie ? 'film' : 'bolum'}/${slug}${isMovie ? '' : '-' + seasonNum + 'x' + episodeNum}`;
            console.error("Dizipal_Debug: Yedek URL Olusturuldu: " + finalUrl);
        }

        // 3. ADIM: Sayfa Icerigini Kontrol Et
        const res = await fetch(finalUrl).catch(e => {
            console.error("Dizipal_Debug: Sayfa Fetch Hatasi: " + e.message);
            return null;
        });

        if (!res || !res.ok) {
            console.error("Dizipal_Debug: Sayfa Bulunamadi (404) veya Baglanti Reddedildi.");
            return [];
        }

        const html = await res.text();
        console.error("Dizipal_Debug: Sayfa Yuklendi, Sifreli Veri Araniyor...");
        
        const match = html.match(/\{&quot;ciphertext&quot;:.*?&quot;\}/) || html.match(/\{"ciphertext":.*?"\}/);
        
        if (match) {
            console.error("Dizipal_Debug: Ciphertext Yakalandi!");
            const cleanData = match[0].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            const streamUrl = decrypt(JSON.parse(cleanData));
            
            if (streamUrl) {
                console.error("Dizipal_Debug: Sifre Cozuldu, Link: " + streamUrl);
                return [{ name: "DiziPal (Debug)", url: streamUrl, quality: 'Auto', provider: 'dizipal' }];
            } else {
                console.error("Dizipal_Debug: Sifre Cozme (Decrypt) Basarisiz.");
            }
        } else {
            console.error("Dizipal_Debug: Sayfada Ciphertext Bulunamadi. Site Yapisi Degismis Olabilir.");
        }
    } catch (e) { 
        console.error("Dizipal_Debug: Kritik Hata: " + e.toString());
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
