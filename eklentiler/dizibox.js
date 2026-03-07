var VER = '3.5.0-FINAL-FIX';
console.log('[Dizibox V' + VER + '] Senin URL formatinla baslatildi');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        
        // Ismi temizle: "Breaking Bad" -> "breaking-bad"
        const slug = (tmdbData.original_name || tmdbData.name)
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-');

        // SENIN VERDIGIN CALISAN FORMAT: ...-1-sezon-1-bolum-hd-izle/
        const targetUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        
        // Proxy olarak artik Google'in kisisel servislerini taklit eden bir yapi kullanicaz
        const proxyUrl = `https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=604800&url=${encodeURIComponent(targetUrl)}`;

        console.log(`[Dizibox] Deneniyor: ${targetUrl}`);

        const res = await fetch(proxyUrl);
        const html = await res.text();

        if (!html || html.length < 500) {
            // Eğer HD linki de çalışmazsa eski formatı son bir kez Google üzerinden dene
            const fallbackUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-izle/`;
            const fbRes = await fetch(`https://images1-focus-opensocial.googleusercontent.com/gadgets/proxy?container=focus&refresh=604800&url=${encodeURIComponent(fallbackUrl)}`);
            const fbHtml = await fbRes.text();
            return parseStreams(fbHtml);
        }

        return parseStreams(html);

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
        if (src.includes('vidmoly') || src.includes('player') || src.includes('moly') || src.includes('king')) {
            streams.push({
                name: "Dizibox HD",
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
