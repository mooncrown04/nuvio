var VER = '4.5.0-PURE-DIRECT';
console.log('[Dizibox V' + VER + '] Proxy devre disi, dogrudan baglanti deneniyor');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        
        // Ismi temizle
        const slug = (tmdbData.original_name || tmdbData.name)
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        // Senin tarayicida actigin kesin link yapisi
        const targetUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        
        console.log(`[Dizibox] Dogrudan Baglanti: ${targetUrl}`);

        // Proxy kullanmadan, sadece headers ile kandirarak
        const res = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'tr,en-US;q=0.7,en;q=0.3'
            }
        });

        const html = await res.text();

        // Eger Cloudflare engeli gelirse html icinde "Just a moment" yazar
        if (html.includes('Just a moment') || html.includes('DDoS protection')) {
            throw new Error('Cloudflare Duvari Asilamadi (Doğrudan)');
        }

        const streams = [];
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        let match;

        while ((match = iframeRegex.exec(html)) !== null) {
            let src = match[1];
            if (src.includes('vidmoly') || src.includes('player') || src.includes('moly')) {
                streams.push({
                    name: "Dizibox (Direct)",
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
