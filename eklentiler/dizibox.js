async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.dizibox.live/',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
    };

    try {
        // 1. TMDB -> Slug Dönüşümü
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim()
            .replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        
        // 2. Sayfa Çekimi
        const response = await fetch(epUrl, { headers: HEADERS });
        const html = await response.text();
        const streams = [];

        // 3. KRİTİK ALAN TARAMASI (Bellek dostu)
        // Genelde player bilgileri sayfanın ortasından sonra başlar
        const scanZone = html.substring(Math.max(0, html.length - 150000));

        // STRATEJİ 1: King Player ID
        const kingMatch = scanZone.match(/video_id\s*[:=]\s*["'](\d+)["']/i) || 
                         scanZone.match(/data-id=["'](\d+)["']/i);
        
        if (kingMatch) {
            streams.push({
                name: "DiziBox | King Player HD",
                url: `https://www.dizibox.live/player/king.php?v=${kingMatch[1]}`,
                quality: "1080p",
                headers: { 'Referer': epUrl }
            });
        }

        // STRATEJİ 2: Unescape Vidmoly/Moly (Dizibox klasiği)
        const unMatch = html.match(/unescape\("([^"]+)"\)/);
        if (unMatch) {
            const dec = decodeURIComponent(unMatch[1]);
            const srcMatch = dec.match(/src=["']([^"']+)["']/i);
            if (srcMatch) {
                let vUrl = srcMatch[1];
                if (vUrl.startsWith('//')) vUrl = 'https:' + vUrl;
                streams.push({
                    name: "DiziBox | Alternatif Kaynak",
                    url: vUrl,
                    quality: "720p",
                    headers: { 'Referer': epUrl }
                });
            }
        }

        // STRATEJİ 3: Manuel Iframe Arama (Eğer yukarıdakiler patlarsa)
        if (streams.length === 0) {
            const iframes = html.match(/<iframe[^>]+src=["']([^"']+)["']/gi);
            if (iframes) {
                iframes.forEach(ifr => {
                    if (ifr.includes('vidmoly') || ifr.includes('moly')) {
                        const finalSrc = ifr.match(/src=["']([^"']+)["']/i);
                        if (finalSrc) {
                            streams.push({
                                name: "DiziBox | Player v2",
                                url: finalSrc[1].startsWith('//') ? 'https:' + finalSrc[1] : finalSrc[1],
                                quality: "SD/HD",
                                headers: { 'Referer': epUrl }
                            });
                        }
                    }
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
