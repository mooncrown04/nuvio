async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.dizibox.live/'
    };

    try {
        // 1. TMDB Bilgisi
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim()
            .replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        
        // 2. Sayfayı Çek
        const response = await fetch(epUrl, { headers: HEADERS });
        const fullHtml = await response.text();
        const streams = [];

        // --- OPTİMİZASYON: Satır Satır Tarama ---
        const lines = fullHtml.split('\n');
        let foundId = null;

        for (let line of lines) {
            if (line.includes('video_id')) {
                const match = line.match(/video_id\s*[:=]\s*["']?(\d+)["']?/i);
                if (match) {
                    foundId = match[1];
                    break;
                }
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

        // 3. Vidmoly Alternatifi (Eğer King yoksa)
        if (streams.length === 0 && fullHtml.includes('unescape')) {
            const uMatch = fullHtml.match(/unescape\("([^"]+)"\)/);
            if (uMatch) {
                const dec = decodeURIComponent(uMatch[1]);
                const sMatch = dec.match(/src="([^"]+)"/i);
                if (sMatch) {
                    streams.push({
                        name: "DiziBox | VidMoly",
                        url: sMatch[1].startsWith('//') ? 'https:' + sMatch[1] : sMatch[1],
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
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
