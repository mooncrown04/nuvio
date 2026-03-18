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

        // URL Oluşturma (Loglarına göre bu kısım çalışıyor)
        const slug = title.toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c').replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-').trim();
        const finalUrl = `${baseUrl}/${isMovie ? 'film' : 'bolum'}/${slug}${isMovie ? '' : '-' + seasonNum + 'x' + episodeNum}`;

        const res = await fetch(finalUrl).catch(() => null);
        if (!res || !res.ok) return [];

        const html = await res.text();
        
        // Regex'i biraz daha esnettik
        const match = html.match(/\{&quot;ciphertext&quot;:.*?&quot;\}/) || html.match(/\{"ciphertext":.*?"\}/);
        
        if (match) {
            const cleanData = match[0].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
            const streamUrl = decrypt(JSON.parse(cleanData));
            
            if (streamUrl) {
                return [{
                    name: "DiziPal (Full HD)",
                    url: streamUrl,
                    quality: '1080p',
                    provider: 'dizipal'
                }];
            } else {
                console.error("Dizipal_Debug: Decrypt fonksiyonu null dondu.");
            }
        }
    } catch (e) {
        console.error("Dizipal_Debug: Hata: " + e.message);
    }
    return [];
}

function decrypt(data) {
    // P anahtarı güncellendi ve temizlendi
    const P = "3hPn4uCjTVtfYWcjIcoJQ4cL1WWk1qxXI39egLYOmNv6IblA7eKJz68uU3eLzux1biZLCms0quEjTYniGv5z1JcKbNIsDQFSeIZOBZJz4is6pD7UyWDggWWzTLBQbHcQFpBQdClnuQaMNUHtLHTpzCvZy33p6I7wFBvL4fnXBYH84aUIyWGTRvM2G5cfoNf4705tO2kv";
    
    try {
        // Ciphertext'teki kaçış karakterlerini ve boşlukları temizle
        let encryptedText = data.ciphertext.replace(/\\/g, '').replace(/\s/g, '');
        
        // atob yerine manuel Buffer kullanımı veya daha güvenli string-to-binary
        const ct = Array.from(atob(encryptedText)).map(c => c.charCodeAt(0));
        const iv = data.iv.match(/.{1,2}/g).map(h => parseInt(h, 16));
        const salt = data.salt.match(/.{1,2}/g).map(h => parseInt(h, 16));
        
        // Şifre çözme döngüsü (Orijinal algoritma)
        const key = salt.slice(0, 32).map((b, i) => b ^ P.charCodeAt(i % P.length));
        const res = ct.map((b, i) => b ^ key[i % key.length] ^ iv[i % iv.length]);
        
        // Sonucu string'e çevir ve sadece okunabilir karakterleri al
        const dec = res.map(b => String.fromCharCode(b)).join('');
        
        // URL'yi içinden çek (Regex güncellendi)
        const linkMatch = dec.match(/https?:\/\/[^\s"']+/);
        if (linkMatch) {
            return linkMatch[0].replace(/\\\//g, '/').split('"')[0].split("'")[0];
        }
    } catch (e) {
        console.error("Dizipal_Debug: Decrypt Hatasi: " + e.message);
    }
    return null;
}

if (typeof module !== 'undefined') module.exports = { getStreams };
