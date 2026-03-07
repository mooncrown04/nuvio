var VER = '3.8.0-SMART-URL';
console.log('[Dizibox V' + VER + '] Akilli URL denemesi basladi');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        
        const slug = (tmdbData.original_name || tmdbData.name)
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        // 3 Farklı varyasyon hazırlıyoruz
        const urls = [
            `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`,
            `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-izle/`,
            `https://www.dizibox.live/${slug}-sezon-${seasonNum}-bolum-${episodeNum}-izle/`
        ];

        for (let targetUrl of urls) {
            console.log(`[Dizibox] Deneniyor: ${targetUrl}`);
            const proxyUrl = `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=604800&url=${encodeURIComponent(targetUrl)}`;
            
            const res = await fetch(proxyUrl);
            const html = await res.text();

            // Eğer sayfa bulunduysa (404 değilse ve içinde iframe varsa)
            if (res.status === 200 && html.includes('<iframe')) {
                return parseStreams(html);
            }
        }
        
        throw new Error('Hicbir URL varyasyonu sonuc vermedi.');

    } catch (err) {
        console.log(`[Dizibox] Hata: ${err.message}`);
        return [];
    }
}

function parseStreams(html) {
    const streams = [];
    const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
    let match;
    while ((match = iframeRegex.exec(html)) !== null) {
        let src = match[1];
        if (src.includes('vidmoly') || src.includes('player') || src.includes('moly')) {
            streams.push({
                name: "Dizibox (Google Proxy)",
                url: src.startsWith('//') ? 'https:' + src : src,
                quality: '1080p'
            });
        }
    }
    return streams;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
