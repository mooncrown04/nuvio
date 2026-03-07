var VER = '1.9.0-G-PROXY';
console.log('[Dizibox V' + VER + '] Google Proxy Aktif');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

// Google üzerinden veriyi bypass ederek çekmek için bir yöntem
async function googleProxyFetch(url) {
    // Google Translate altyapısını bir proxy gibi kullanıyoruz
    const proxyUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(url)}`;
    
    try {
        const res = await fetch(proxyUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        return await res.text();
    } catch (e) {
        console.log("Bağlantı hatası: " + e.message);
        return null;
    }
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;

        // Adres olarak .live kullanıyoruz
        const targetUrl = `https://www.dizibox.live/?s=${encodeURIComponent(query)}`;
        console.log(`[Dizibox] Google üzerinden sorgulanıyor...`);

        const html = await googleProxyFetch(targetUrl);

        if (!html) throw new Error('Ağ engeli aşılamadı.');

        // Google Translate bazen HTML yapısını değiştirir, regex'i esnetiyoruz
        const linkMatch = html.match(/href="([^"]+dizibox\.live\/[^"]+)"[^>]*rel="bookmark"/i) || 
                          html.match(/href="([^"]+dizibox\.live\/[^"]+)"/i);
                          
        if (!linkMatch) throw new Error('Dizi linki bulunamadı.');

        let epUrl = linkMatch[1];
        // Eğer link Google Translate linkine dönüşmüşse temizle
        if (epUrl.includes('translate.google')) {
            const urlParams = new URLSearchParams(epUrl.split('?')[1]);
            epUrl = urlParams.get('u');
        }
        
        epUrl = epUrl.replace(/\/$/, '') + `-sezon-${seasonNum}-bolum-${episodeNum}-izle/`;
        console.log(`[Dizibox] Bölüm: ${epUrl}`);

        const epHtml = await googleProxyFetch(epUrl);
        const streams = [];
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        let match;

        while ((match = iframeRegex.exec(epHtml)) !== null) {
            let src = match[1];
            if (src.includes('vidmoly') || src.includes('player')) {
                streams.push({
                    name: "Dizibox G-PROXY",
                    url: src.startsWith('//') ? 'https:' + src : src,
                    quality: '1080p'
                });
            }
        }

        return streams;
    } catch (err) {
        console.log(`[Dizibox] Hata: ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
