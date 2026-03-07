async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.dizibox.live/'
    };

    try {
        // 1. TMDB -> Slug
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim()
            .replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        
        // 2. Sayfa Çekimi
        const response = await fetch(epUrl, { headers: HEADERS });
        const html = await response.text();
        const streams = [];

        // 3. Çoklu ID Arama Stratejisi
        // Strateji A: JSON objesi içinde (Yeni nesil)
        // Strateji B: Klasik var video_id
        // Strateji C: iframe src içindeki v= parametresi
        const idPatterns = [
            /["']video_id["']\s*[:=]\s*["']?(\d+)["']?/i,
            /var\s+video_id\s*=\s*["']?(\d+)["']?/i,
            /player\/king\.php\?v=(\d+)/i
        ];

        let foundId = null;
        for (let pattern of idPatterns) {
            const match = html.match(pattern);
            if (match && match[1]) {
                foundId = match[1];
                break;
            }
        }

        if (foundId) {
            streams.push({
                name: "DiziBox | King Player HD",
                url: `https://www.dizibox.live/player/king.php?v=${foundId}`,
                quality: "1080p",
                headers: { 'Referer': epUrl }
            });
        }

        // 4. Alternatif Vidmoly (King bulunamazsa veya yedek olarak)
        const molyMatch = html.match(/unescape\("([^"]+)"\)/);
        if (molyMatch) {
            const decoded = decodeURIComponent(molyMatch[1]);
            const src = decoded.match(/src="([^"]+)"/i);
            if (src) {
                streams.push({
                    name: "DiziBox | VidMoly",
                    url: src[1].startsWith('//') ? 'https:' + src[1] : src[1],
                    quality: "720p",
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
