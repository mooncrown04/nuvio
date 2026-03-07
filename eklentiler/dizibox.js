async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.dizibox.live/'
    };

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        const response = await fetch(epUrl, { headers: HEADERS });
        const html = await response.text();
        const streams = [];

        // 1. ADIM: Sayfa içindeki tüm muhtemel Video ID'leri topla
        // Dizibox video ID'leri genellikle 5-7 haneli rakamlardır.
        const potentialIds = html.match(/\b\d{5,7}\b/g) || [];
        const uniqueIds = [...new Set(potentialIds)];

        uniqueIds.forEach(id => {
            // Sadece çok yaygın olmayan (statik olmayan) sayıları dene
            if (id !== "123456" && id !== "261726") { 
                streams.push({
                    name: `DiziBox | Kaynak (ID: ${id})`,
                    url: `https://www.dizibox.live/player/king.php?v=${id}`,
                    quality: "1080p",
                    headers: { 'Referer': epUrl }
                });
            }
        });

        // 2. ADIM: "data-video" veya "data-src" içeren elementleri tara
        const dataMatches = html.match(/data-(?:video|v|id|src)=["']([^"']+)["']/gi) || [];
        dataMatches.forEach(m => {
            const val = m.match(/=["']([^"']+)["']/i)[1];
            if (val.length > 3) {
                let finalUrl = val.includes('http') ? val : `https://www.dizibox.live/player/king.php?v=${val}`;
                streams.push({
                    name: "DiziBox | Alternatif (Data)",
                    url: finalUrl.startsWith('//') ? 'https:' + finalUrl : finalUrl,
                    quality: "720p",
                    headers: { 'Referer': epUrl }
                });
            }
        });

        // Bellek koruması için listeyi sınırla
        return streams.slice(0, 5); 
    } catch (err) {
        return [];
    }
}

if (typeof exports !== 'undefined') exports.getStreams = getStreams;
if (typeof globalThis !== 'undefined') globalThis.getStreams = globalThis.getStreams || getStreams;
