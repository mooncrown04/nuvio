async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.dizibox.live/'
    };

    try {
        // 1. TMDB Verisi
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        
        // 2. Sayfa İçeriği
        const response = await fetch(epUrl, { headers: HEADERS });
        const html = await response.text();
        const streams = [];

        // 3. KRİTİK: Video ID Yakalama
        // Dizibox bazen 'var video_id = "12345";' bazen de 'data-id="12345"' kullanır.
        const idMatch = html.match(/video_id\s*[:=]\s*["']?(\d+)["']?/i) || 
                        html.match(/data-id=["']?(\d+)["']?/i);

        if (idMatch) {
            const videoId = idMatch[1];
            // DNS sorununu aşmak için tam URL protokolüyle ekliyoruz
            streams.push({
                name: "DiziBox | King Player HD",
                url: "https://www.dizibox.live/player/king.php?v=" + videoId,
                quality: "1080p",
                headers: { 
                    'Referer': epUrl,
                    'User-Agent': HEADERS['User-Agent']
                }
            });
        }

        // 4. Alternatif Kaynak (Vidmoly vb.)
        const iframes = html.match(/<iframe[^>]+src=["']([^"']+)["']/gi);
        if (iframes) {
            for (let ifr of iframes) {
                let src = ifr.match(/src=["']([^"']+)["']/i)[1];
                if (src.includes('moly') || src.includes('player')) {
                    if (src.startsWith('//')) src = 'https:' + src;
                    streams.push({
                        name: "DiziBox | Alternatif Kaynak",
                        url: src,
                        quality: "720p",
                        headers: { 'Referer': epUrl }
                    });
                }
            }
        }

        return streams;
    } catch (err) {
        return [];
    }
}

if (typeof exports !== 'undefined') exports.getStreams = getStreams;
if (typeof globalThis !== 'undefined') globalThis.getStreams = globalThis.getStreams || globalThis.getStreams;
