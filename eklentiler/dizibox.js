async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    // En az şüphe çeken mobil profil: iPhone / Safari
    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://www.google.com.tr/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9'
    };

    try {
        // 1. TMDB Bilgisi
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const originalTitle = tmdbData.original_name || tmdbData.name;
        
        // Slug oluşturma (Dizibox formatı)
        const slug = originalTitle.toLowerCase()
            .replace(/ /g, '-')
            .replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        
        // 2. Sayfayı Çekme
        const response = await fetch(epUrl, { headers: HEADERS });
        const html = await response.text();
        const streams = [];

        // Debug için boyutu logla (Opsiyonel)
        // console.log("HTML Boyutu: " + html.length);

        // 3. Regex: King Player ID
        // Dizibox'ın player yapısı: "video_id":"123456" veya video_id = 123456
        const idMatch = html.match(/video_id["']?\s*[:=]\s*["']?(\d+)["']?/i);
        
        if (idMatch) {
            streams.push({
                name: "DiziBox | King Player (1080p)",
                url: `https://www.dizibox.live/player/king.php?v=${idMatch[1]}`,
                quality: "1080p",
                headers: { 'Referer': epUrl }
            });
        }

        // 4. Regex: Vidmoly / Moly / Alternatifler
        // Genellikle <iframe> içinde veya unescape edilmiş JS içinde olurlar
        const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/gi);
        if (iframeMatch) {
            iframeMatch.forEach(ifr => {
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
            });
        }

        return streams;
    } catch (err) {
        return [];
    }
}

if (typeof exports !== 'undefined') exports.getStreams = getStreams;
if (typeof globalThis !== 'undefined') globalThis.getStreams = globalThis.getStreams || getStreams;
