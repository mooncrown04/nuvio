async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    // Dizibox bot korumasını geçmek için mobil User-Agent şart
    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Referer': 'https://www.google.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    };

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        
        // Önce çerezleri almak için ana sayfaya küçük bir 'ping' atıyoruz (Opsiyonel ama etkili)
        await fetch('https://www.dizibox.live/', { headers: { 'User-Agent': HEADERS['User-Agent'] } });

        const response = await fetch(epUrl, { headers: HEADERS });
        const html = await response.text();
        const streams = [];

        // 1. ADIM: King Player (Dizibox'ın ana player'ı)
        // Sayfa içinde gizlenen tırnaklı veya tırnaksız sayısal ID'leri yakalar
        const idMatch = html.match(/video_id\s*[:=]\s*["']?(\d{5,7})["']?/i);
        
        if (idMatch) {
            streams.push({
                name: "DiziBox | King Player (Hızlı)",
                url: `https://www.dizibox.live/player/king.php?v=${idMatch[1]}`,
                quality: "1080p",
                headers: { 'Referer': epUrl }
            });
        }

        // 2. ADIM: Vidmoly veya Moly (Genellikle 'unescape' içinde saklanır)
        const unescapeData = html.match(/unescape\s*\(\s*["']([^"']+)["']/i);
        if (unescapeData) {
            const decoded = decodeURIComponent(unescapeData[1]);
            const srcMatch = decoded.match(/src=["']([^"']+)["']/i);
            if (srcMatch) {
                let vUrl = srcMatch[1];
                if (vUrl.startsWith('//')) vUrl = 'https:' + vUrl;
                streams.push({
                    name: "DiziBox | Vidmoly (Alternatif)",
                    url: vUrl,
                    quality: "720p",
                    headers: { 'Referer': epUrl }
                });
            }
        }

        // 3. ADIM: Kaba Kuvvet (Hiçbir şey bulunamazsa sayfadaki 6 haneli rakamları dene)
        if (streams.length === 0) {
            const potentialIds = html.match(/"(\d{5,7})"/g);
            if (potentialIds) {
                potentialIds.slice(0, 2).forEach((idStr, index) => {
                    const id = idStr.replace(/"/g, '');
                    streams.push({
                        name: `DiziBox | Kaynak #${index + 1}`,
                        url: `https://www.dizibox.live/player/king.php?v=${id}`,
                        quality: "HD",
                        headers: { 'Referer': epUrl }
                    });
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
