var VER = '1.9.5-G-BYPASS';
console.log('[Dizibox V' + VER + '] Google Bypass Modu Devreye Girdi');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

// Google Translate'i bir tünel gibi kullanıyoruz
function getGoogleProxyUrl(target) {
    return `https://translate.google.com/translate?sl=en&tl=tr&u=${encodeURIComponent(target)}`;
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;

        // Arama sayfasını Google üzerinden çek
        const searchUrl = `https://www.dizibox.live/?s=${encodeURIComponent(query)}`;
        console.log(`[Dizibox] Tünel açılıyor: ${searchUrl}`);

        const res = await fetch(getGoogleProxyUrl(searchUrl));
        const html = await res.text();

        if (!html || html.length < 1000) throw new Error('Google Tüneli yanıt vermedi.');

        // Link ayıklama (Google Translate linkleri biraz değiştirir, o yüzden esnek regex)
        const linkMatch = html.match(/href="([^"]+dizibox\.live\/[^"]+)"/i);
        if (!linkMatch) throw new Error('Dizi bulunamadı (Google engeli veya sonuç yok).');

        let cleanUrl = linkMatch[1];
        // Google parametrelerini temizle
        if (cleanUrl.includes('translate.google')) {
            const urlObj = new URL(cleanUrl);
            cleanUrl = urlObj.searchParams.get('u') || cleanUrl;
        }

        const epUrl = cleanUrl.replace(/\/$/, '') + `-sezon-${seasonNum}-bolum-${episodeNum}-izle/`;
        console.log(`[Dizibox] Bölüm Sayfası: ${epUrl}`);

        const epRes = await fetch(getGoogleProxyUrl(epUrl));
        const epHtml = await epRes.text();

        const streams = [];
        // Iframe'leri yakala
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        let match;

        while ((match = iframeRegex.exec(epHtml)) !== null) {
            let src = match[1];
            // Google tünelinden geliyorsa orijinal linki geri al
            if (src.includes('u=')) {
                const urlObj = new URL(src.startsWith('http') ? src : 'https:' + src);
                src = urlObj.searchParams.get('u') || src;
            }
            
            if (src.includes('vidmoly') || src.includes('moly') || src.includes('player')) {
                streams.push({
                    name: "Dizibox (Google Bypass)",
                    url: src.startsWith('//') ? 'https:' + src : src,
                    quality: '1080p'
                });
            }
        }

        return streams;

    } catch (err) {
        console.log(`[Dizibox V${VER}] Hata: ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
