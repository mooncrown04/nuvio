async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.dizibox.live/',
        'Origin': 'https://www.dizibox.live'
    };

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        const response = await fetch(epUrl, { headers: HEADERS });
        const html = await response.text();
        const streams = [];

        // 1. ADIM: King Player ID Yakalama (Daha güvenli regex)
        const idMatch = html.match(/video_id\s*[:=]\s*["'](\d+)["']/i);
        
        if (idMatch) {
            // ExoPlayer'ın UnknownHostException vermemesi için URL'yi tam formatta yazıyoruz
            const videoId = idMatch[1];
            streams.push({
                name: "DiziBox | King Player HD",
                url: "https://www.dizibox.live/player/king.php?v=" + videoId,
                quality: "1080p",
                headers: { 
                    'Referer': epUrl,
                    'User-Agent': HEADERS['User-Agent']
                }
            });
        }

        // 2. ADIM: Alternatif Kaynak (Vidmoly vb.)
        const unescapeMatch = html.match(/unescape\("([^"]+)"\)/);
        if (unescapeMatch) {
            const decoded = decodeURIComponent(unescapeMatch[1]);
            const src = decoded.match(/src=["']([^"']+)["']/i);
            if (src) {
                let vUrl = src[1];
                if (vUrl.startsWith('//')) vUrl = 'https:' + vUrl;
                
                streams.push({
                    name: "DiziBox | Alternatif Kaynak",
                    url: vUrl,
                    quality: "720p",
                    headers: { 'Referer': epUrl }
                });
            }
        }

        // 3. ADIM: Güvenlik Ağı (Eğer hiç link yoksa TEST butonu yerine boş dönme)
        if (streams.length === 0) {
            // Sayfadaki ilk sayısal diziyi ID kabul et (Dizibox yapısı gereği)
            const backupId = html.match(/(\d{6})/); 
            if (backupId) {
                streams.push({
                    name: "DiziBox | Otomatik Kaynak",
                    url: "https://www.dizibox.live/player/king.php?v=" + backupId[1],
                    quality: "HD",
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
if (typeof globalThis !== 'undefined') globalThis.getStreams = globalThis.getStreams || getStreams;
