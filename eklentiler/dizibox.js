async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

    try {
        // 1. TMDB'den orijinal ismi al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const name = tmdbData.original_name || tmdbData.name;
        
        // Dizibox uyumlu slug
        const slug = name.toLowerCase().trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;

        // 2. Sayfayı "No-Cache" ile çekerek korumayı atlatmaya çalış
        const response = await fetch(epUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': 'https://www.google.com/',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        const html = await response.text();
        const streams = [];

        // 3. EĞER HALA ENGEL VARSA (bodyLen kontrolü yerine içerik kontrolü)
        if (html.includes('cloudflare') || html.length < 300000) {
            // Alternatif Yol: King Player'a direkt tahminle git (ID genellikle TMDB ID ile bağlantılı değildir ama deneyelim)
            // Bazı sitelerde bu bir pattern izler.
        }

        // 4. King Player ve iframe yakalama (Gelişmiş Regex)
        const videoIdMatch = html.match(/video_id["']?\s*[:=]\s*["']?(\d+)["']?/i);
        const dataIdMatch = html.match(/data-id=["']?(\d+)["']?/i);
        const finalId = videoIdMatch ? videoIdMatch[1] : (dataIdMatch ? dataIdMatch[1] : null);

        if (finalId) {
            streams.push({
                name: "DiziBox | King Player",
                url: `https://www.dizibox.live/player/king.php?v=${finalId}`,
                quality: "1080p",
                headers: { 'Referer': epUrl, 'User-Agent': USER_AGENT }
            });
        }

        // 5. Vidmoly / Moly Bulucu
        const molyMatch = html.match(/https?:\/\/(?:www\.)?(?:vidmoly|moly)\.[a-z]+\/(?:embed-)?([a-z0-9]+)/gi);
        if (molyMatch) {
            molyMatch.forEach((link, i) => {
                streams.push({
                    name: `DiziBox | Kaynak #${i + 1}`,
                    url: link.startsWith('//') ? 'https:' + link : link,
                    quality: "720p",
                    headers: { 'Referer': epUrl }
                });
            });
        }

        return streams;
    } catch (err) {
        return [];
    }
}

if (typeof exports !== 'undefined') exports.getStreams = getStreams;
if (typeof globalThis !== 'undefined') globalThis.getStreams = globalThis.getStreams || getStreams;
