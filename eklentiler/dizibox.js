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
        console.log(`[Dizibox] Hedef: ${epUrl}`);

        const mainRes = await fetch(epUrl, { headers: HEADERS });
        const html = await mainRes.text();
        const streams = [];

        // 1. En Geniş Kapsamlı Link Tarayıcı (King, Moly, Player, Vidmoly yakalar)
        const linkRegex = /["'](https?:[^"']*(?:king|moly|player|vidmoly|ok\.ru|video)[^"']*)["']/gi;
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
            let foundUrl = match[1].replace(/\\/g, ''); // Ters eğik çizgileri temizle
            
            if (!streams.find(s => s.url === foundUrl)) {
                let name = "DiziBox | ";
                if (foundUrl.includes('king')) name += "King Player";
                else if (foundUrl.includes('moly')) name += "MolyStream";
                else name += "Alternatif";

                streams.push({
                    name: name,
                    url: foundUrl,
                    quality: "1080p",
                    headers: { 'Referer': epUrl }
                });
            }
        }

        // 2. Eğer link bulunamadıysa King Player ID'sini manuel yakala
        if (streams.length === 0) {
            const idMatch = html.match(/video(?:_id)?\s*[:=]\s*["']([^"']{5,})["']/i);
            if (idMatch) {
                streams.push({
                    name: "DiziBox | King Player (Auto)",
                    url: `https://www.dizibox.live/player/king.php?v=${idMatch[1]}`,
                    quality: "1080p",
                    headers: { 'Referer': epUrl }
                });
            }
        }

        console.log(`[Dizibox] Tarama Tamamlandi. Bulunan: ${streams.length}`);
        return streams;

    } catch (err) {
        return [];
    }
}

// Export ayarları
if (typeof exports !== 'undefined') exports.getStreams = getStreams;
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
