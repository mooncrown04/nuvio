async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    
    // Cloudflare ve Bot kontrolü için dinamik zaman damgası (dbxu)
    const timestamp = Date.now().toString();

    try {
        // 1. TMDB Bilgilerini Çek
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const name = tmdbData.original_name || tmdbData.name;
        
        // Dizibox uyumlu slug oluşturma
        const slug = name.toLowerCase().trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;

        // 2. Sayfayı Çerez ve Referer ile "Gerçek Tarayıcı" gibi iste
        const response = await fetch(epUrl, {
            headers: {
                'User-Agent': USER_AGENT,
                'Referer': 'https://www.google.com/',
                'Cookie': `LockUser=true; isTrustedUser=true; dbxu=${timestamp}`,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        const html = await response.text();
        const streams = [];

        // 3. Loglardaki 261727 (Cloudflare) kontrolü
        if (html.length < 270000 && html.includes("cloudflare")) {
            // Eğer buraya giriyorsa kalkan hala aşılamamış demektir.
            // Alternatif alan adını dene (Bazen .live kapalıyken .de açıktır)
            const altUrl = epUrl.replace(".live", ".de");
            const altRes = await fetch(altUrl, { headers: { 'User-Agent': USER_AGENT } });
            const altHtml = await altRes.text();
            if (altHtml.length > 300000) return parseHtml(altHtml, altUrl, USER_AGENT);
        }

        return parseHtml(html, epUrl, USER_AGENT);

    } catch (err) {
        return [];
    }
}

// HTML içeriğinden linkleri ayıklayan yardımcı fonksiyon
function parseHtml(html, epUrl, UA) {
    const streams = [];

    // King Player (video_id veya data-id)
    const idMatch = html.match(/video_id["']?\s*[:=]\s*["']?(\d+)["']?/i) || 
                    html.match(/data-id=["']?(\d+)["']?/i);

    if (idMatch) {
        streams.push({
            name: "DiziBox | King Player HD",
            url: `https://www.dizibox.live/player/king.php?wmode=opaque&v=${idMatch[1]}`,
            quality: "1080p",
            headers: { 
                'Referer': epUrl, 
                'User-Agent': UA 
            }
        });
    }

    // Moly / Vidmoly Kaynakları
    const molyRegex = /https?:\/\/(?:www\.)?(?:vidmoly|moly)\.[a-z]+\/(?:embed-)?([a-z0-9]+)/gi;
    let m;
    while ((m = molyRegex.exec(html)) !== null) {
        streams.push({
            name: "DiziBox | Moly",
            url: m[0],
            quality: "720p",
            headers: { 'Referer': epUrl }
        });
    }

    return streams;
}

if (typeof exports !== 'undefined') exports.getStreams = getStreams;
if (typeof globalThis !== 'undefined') globalThis.getStreams = globalThis.getStreams || getStreams;
