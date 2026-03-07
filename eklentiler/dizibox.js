async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.dizibox.live/',
        'X-Requested-With': 'XMLHttpRequest'
    };

    try {
        // 1. TMDB -> Slug
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        
        // 2. Sayfayı çekip içindeki gizli ayarları ara
        const response = await fetch(epUrl, { headers: HEADERS });
        const html = await response.text();
        const streams = [];

        // STRATEJİ: "king" veya "moly" kelimelerinin geçtiği script bloklarını bul
        // Dizibox veriyi genellikle bir JSON objesi içinde 'source' veya 'file' olarak tutar
        const regexFile = /["']?(?:file|source|link)["']?\s*[:=]\s*["'](https?:\/\/[^"']+)["']/gi;
        let match;
        while ((match = regexFile.exec(html)) !== null) {
            const foundUrl = match[1];
            if (foundUrl.includes('googleusercontent') || foundUrl.includes('.m3u8') || foundUrl.includes('.mp4')) {
                streams.push({
                    name: "DiziBox | Direkt Kaynak",
                    url: foundUrl,
                    quality: "HD",
                    headers: { 'Referer': epUrl }
                });
            }
        }

        // Eğer hala boşsa, King Player'ı zorla (Sayısal ID bulmaya çalış)
        const idMatch = html.match(/\b\d{5,7}\b/);
        if (idMatch && streams.length === 0) {
             streams.push({
                name: "DiziBox | King Player",
                url: `https://www.dizibox.live/player/king.php?v=${idMatch[0]}`,
                quality: "1080p",
                headers: { 'Referer': epUrl }
            });
        }

        return streams;
    } catch (err) {
        return [];
    }
}

if (typeof exports !== 'undefined') exports.getStreams = getStreams;
if (typeof globalThis !== 'undefined') globalThis.getStreams = globalThis.getStreams || getStreams;
