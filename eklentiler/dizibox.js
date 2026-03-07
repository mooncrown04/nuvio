async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.dizibox.live/'
    };

    try {
        // 1. TMDB'den Slug Al (Hafif Fetch)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        
        // 2. Sayfayı Çek
        const response = await fetch(epUrl, { headers: HEADERS });
        let html = await response.text();
        
        const streams = [];

        // --- OPTİMİZASYON: HTML çok büyükse sadece kritik yerleri tara ---
        // Genelde video_id değişkeni sayfanın alt kısmındaki scriptlerde olur.
        const footerArea = html.substring(html.length - 80000); // Son 80KB
        const headerArea = html.substring(0, 30000);          // İlk 30KB
        
        const searchZone = headerArea + footerArea;
        html = ""; // Belleği boşaltmak için ana stringi siliyoruz

        // 3. King Player ID yakala
        const idMatch = searchZone.match(/video_id\s*[:=]\s*["']?(\d+)["']?/i);
        
        if (idMatch) {
            streams.push({
                name: "DiziBox | King Player HD",
                url: `https://www.dizibox.live/player/king.php?v=${idMatch[1]}`,
                quality: "1080p",
                headers: { 'Referer': epUrl }
            });
        }

        // 4. Moly/Vidmoly Yakala (unescape kontrolü)
        const uMatch = searchZone.match(/unescape\("([^"]+)"\)/);
        if (uMatch) {
            const dec = decodeURIComponent(uMatch[1]);
            const sMatch = dec.match(/src="([^"]+)"/i);
            if (sMatch) {
                streams.push({
                    name: "DiziBox | Alternatif",
                    url: sMatch[1].startsWith('//') ? 'https:' + sMatch[1] : sMatch[1],
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
