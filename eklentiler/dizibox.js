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
        console.log(`[Dizibox] Analiz: ${epUrl}`);

        const mainRes = await fetch(epUrl, { headers: HEADERS });
        const html = await mainRes.text();
        const streams = [];

        // 1. King Player ID Yakalayıcı (Sayfada link olmasa bile ID'den oluşturur)
        // Kotlin örneğindeki gibi regex ile ID ara
        const idRegex = /"video_id"\s*:\s*"(\d+)"|video_id\s*=\s*'(\d+)'/i;
        const idMatch = html.match(idRegex);
        const videoId = idMatch ? (idMatch[1] || idMatch[2]) : null;

        if (videoId) {
            streams.push({
                name: "DiziBox | King Player (Hızlı)",
                url: `https://www.dizibox.live/player/king.php?v=${videoId}`,
                quality: "1080p",
                headers: { 'Referer': epUrl }
            });
        }

        // 2. Gizli Moly Linklerini Çöz (unescape yakalama)
        const unescapeMatch = html.match(/unescape\("([^"]+)"\)/);
        if (unescapeMatch) {
            const decoded = decodeURIComponent(unescapeMatch[1]);
            const molyMatch = decoded.match(/src="([^"]*moly[^"]*)"/i);
            if (molyMatch) {
                streams.push({
                    name: "DiziBox | MolyStream",
                    url: molyMatch[1].startsWith('//') ? 'https:' + molyMatch[1] : molyMatch[1],
                    quality: "1080p",
                    headers: { 'Referer': epUrl }
                });
            }
        }

        // 3. Genel Link Tarama (Eğer yukarıdakiler yemezse)
        const allLinks = html.match(/https?:\/\/[^"']*(?:king|moly|vidmoly|ok\.ru)[^"']*/gi) || [];
        allLinks.forEach(link => {
            if (!streams.find(s => s.url === link)) {
                streams.push({
                    name: "DiziBox | Alternatif",
                    url: link,
                    quality: "1080p",
                    headers: { 'Referer': epUrl }
                });
            }
        });

        console.log(`[Dizibox] Islem bitti. Bulunan: ${streams.length}`);
        return streams;

    } catch (err) {
        console.error(`[Dizibox] Hata: ${err.message}`);
        return [];
    }
}

// Global Exportlar
if (typeof exports !== 'undefined') exports.getStreams = getStreams;
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
