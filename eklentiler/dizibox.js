const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.dizibox.live/'
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        const mainRes = await fetch(epUrl, { headers: HEADERS });
        const html = await mainRes.text();
        
        const streams = [];

        // 1. King Player ID'yi bul
        const idMatch = html.match(/"video_id"\s*:\s*"(\d+)"|video_id\s*=\s*'(\d+)'/i);
        const videoId = idMatch ? (idMatch[1] || idMatch[2]) : null;

        if (videoId) {
            const playerUrl = `https://www.dizibox.live/player/king.php?v=${videoId}`;
            
            // --- KRİTİK ADIM: Player Sayfasının İçine Gir ---
            try {
                const pRes = await fetch(playerUrl, { headers: { 'Referer': epUrl, ...HEADERS } });
                const pHtml = await pRes.text();

                // Sayfa içindeki asıl video linkini (mp4/m3u8) ara
                // Genelde "file": "URL" veya sources: [...] şeklinde olur
                const finalUrlMatch = pHtml.match(/["']?file["']?\s*[:=]\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
                
                if (finalUrlMatch) {
                    streams.push({
                        name: "DiziBox | King HD",
                        url: finalUrlMatch[1].replace(/\\/g, ''),
                        quality: "1080p",
                        headers: { 'Referer': playerUrl }
                    });
                } else {
                    // Eğer doğrudan link yoksa, mecbur player sayfasını gönder (Bazı uygulamalar bunu içeride çözer)
                    streams.push({
                        name: "DiziBox | King Player",
                        url: playerUrl,
                        quality: "720p",
                        headers: { 'Referer': epUrl }
                    });
                }
            } catch (pErr) {
                console.log("Player ic sayfa hatasi");
            }
        }

        // 2. Alternatif (Moly) kontrolü
        const molyMatch = html.match(/unescape\("([^"]+)"\)/);
        if (molyMatch) {
            const decoded = decodeURIComponent(molyMatch[1]);
            const mSrc = decoded.match(/src="([^"]+)"/i);
            if (mSrc) {
                streams.push({
                    name: "DiziBox | VidMoly",
                    url: mSrc[1].startsWith('//') ? 'https:' + mSrc[1] : mSrc[1],
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
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
