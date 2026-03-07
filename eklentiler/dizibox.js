var VER = '2.0.0-HYBRID';
console.log('[Dizibox V' + VER + '] Baslatildi');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        
        // Dizi adini URL formatina getir (Orn: Breaking Bad -> breaking-bad)
        const slug = (tmdbData.original_name || tmdbData.name)
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');

        // Arama yapmadan dogrudan bolum sayfasini tahmin et (Dizibox standardi)
        // Format: dizibox.live/dizi-adi-1-sezon-1-bolum-izle/
        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-izle/`;
        const tunnelUrl = `https://translate.google.com/translate?sl=auto&tl=en&u=${encodeURIComponent(epUrl)}`;
        
        console.log(`[Dizibox] Tahmini Bolum: ${epUrl}`);

        const res = await fetch(tunnelUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await res.text();

        const streams = [];
        // Iframe regex'ini daha genis tutalim
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        let match;

        while ((match = iframeRegex.exec(html)) !== null) {
            let src = match[1];
            // Google parametresini ayikla
            if (src.includes('u=')) {
                src = new URLSearchParams(src.split('?')[1]).get('u') || src;
            }
            if (src.includes('vidmoly') || src.includes('moly') || src.includes('player') || src.includes('king')) {
                streams.push({
                    name: "Dizibox V2",
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
