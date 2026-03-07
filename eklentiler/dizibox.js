async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.dizibox.live/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8'
    };

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        const response = await fetch(epUrl, { headers: HEADERS });
        const html = await response.text();
        const streams = [];

        // --- TEST MODU ---
        // Eğer bu listede çıkarsa, kodun buraya kadar çalıştığını anlarız.
        streams.push({
            name: "--- DIZIBOX TEST HATTI ---",
            url: "http://test.com/check",
            quality: "SD"
        });

        // 1. YÖNTEM: King Player ID Yakala (Gelişmiş Regex)
        const idMatch = html.match(/video_id["']?\s*[:=]\s*["']?(\d+)["']?/i) || 
                        html.match(/post_id["']?\s*[:=]\s*["']?(\d+)["']?/i);
        
        if (idMatch) {
            streams.push({
                name: "DiziBox | King Player HD",
                url: `https://www.dizibox.live/player/king.php?v=${idMatch[1]}`,
                quality: "1080p",
                headers: { 'Referer': epUrl }
            });
        }

        // 2. YÖNTEM: Sayfadaki tüm iFrame'leri tarayıp vidmoly ara
        const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/gi);
        if (iframeMatch) {
            iframeMatch.forEach(ifr => {
                const src = ifr.match(/src=["']([^"']+)["']/i);
                if (src && (src[1].includes('moly') || src[1].includes('player'))) {
                    let finalUrl = src[1].startsWith('//') ? 'https:' + src[1] : src[1];
                    streams.push({
                        name: "DiziBox | Alternatif Player",
                        url: finalUrl,
                        quality: "720p",
                        headers: { 'Referer': epUrl }
                    });
                }
            });
        }

        // 3. YÖNTEM: Sadece sayısal ID'yi zorla çek (Eğer ilk 2 yöntem boşsa)
        if (streams.length < 2) {
             const anyId = html.match(/["'](\d{5,7})["']/);
             if (anyId) {
                streams.push({
                    name: "DiziBox | Auto-Detected ID",
                    url: `https://www.dizibox.live/player/king.php?v=${anyId[1]}`,
                    quality: "HD",
                    headers: { 'Referer': epUrl }
                });
             }
        }

        return streams;
    } catch (err) {
        return [];
    }
}

if (typeof exports !== 'undefined') exports.getStreams = getStreams;
if (typeof globalThis !== 'undefined') globalThis.getStreams = globalThis.getStreams || getStreams;
