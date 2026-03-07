const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8'
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB'den Slug Al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        
        // 2. Ana Sayfayı Çek
        const mainRes = await fetch(epUrl, { headers: { ...HEADERS, 'Referer': 'https://www.dizibox.live/' } });
        const html = await mainRes.text();
        const streams = [];

        // 3. King Player ID yakala
        const idMatch = html.match(/video_id\s*[:=]\s*["']?(\d+)["']?/i);
        if (idMatch) {
            const playerUrl = `https://www.dizibox.live/player/king.php?v=${idMatch[1]}`;
            
            try {
                // Player sayfasının içine sızıp asıl video dosyasını arıyoruz
                const pRes = await fetch(playerUrl, { headers: { ...HEADERS, 'Referer': epUrl } });
                const pHtml = await pRes.text();

                // Regex: MP4 veya M3U8 linklerini avla
                const videoRegex = /["'](https?:\/\/[^"']+\.(?:mp4|m3u8)[^"']*)["']/gi;
                let vMatch;
                while ((vMatch = videoRegex.exec(pHtml)) !== null) {
                    let rawUrl = vMatch[1].replace(/\\/g, '');
                    if (!streams.find(s => s.url === rawUrl)) {
                        streams.push({
                            name: "DiziBox | King HD (Direct)",
                            url: rawUrl,
                            quality: "1080p",
                            headers: { 'Referer': playerUrl, 'User-Agent': HEADERS['User-Agent'] }
                        });
                    }
                }
            } catch (e) {}
        }

        // 4. Alternatif: Vidmoly/Moly (Base64 veya unescape içinde saklı olabilir)
        const secretMatch = html.match(/unescape\("([^"]+)"\)/);
        if (secretMatch) {
            const decoded = decodeURIComponent(secretMatch[1]);
            const iframeSrc = decoded.match(/src="([^"]+)"/i);
            if (iframeSrc) {
                streams.push({
                    name: "DiziBox | Alternatif",
                    url: iframeSrc[1].startsWith('//') ? 'https:' + iframeSrc[1] : iframeSrc[1],
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

// Global Exports
if (typeof exports !== 'undefined') exports.getStreams = getStreams;
if (typeof globalThis !== 'undefined') globalThis.getStreams = globalThis.getStreams || getStreams;
