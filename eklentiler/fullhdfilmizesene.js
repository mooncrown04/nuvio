// src/fullhd/extractor.js (Şablondaki boş extractStreams fonksiyonunun dolmuş hali)
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

async function extractStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return []; // Sadece film destekliyor

    try {
        // 1. TMDB Bilgisini Al (Eşleştirme için)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        
        // 2. Sitede Ara
        const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(tmdbData.title)}`);
        const searchHtml = await searchRes.text();
        
        // Regex ile film linkini yakala
        const filmPathMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/);
        if (!filmPathMatch) return [];
        const filmUrl = filmPathMatch[1].startsWith('http') ? filmPathMatch[1] : BASE_URL + filmPathMatch[1];

        // 3. Film Sayfasını Çöz (SCX Şifreleme Katmanı)
        const pageRes = await fetch(filmUrl);
        const pageHtml = await pageRes.text();
        
        const scxMatch = pageHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];
        const scx = JSON.parse(scxMatch[1]);

        const streams = [];
        const sources = ['atom', 'proton', 'fast', 'tr', 'en'];

        for (const key of sources) {
            if (!scx[key] || !scx[key].sx) continue;
            const links = scx[key].sx.t;
            const linkArray = Array.isArray(links) ? links : Object.values(links);

            for (const encLink of linkArray) {
                // ROT13 + Base64 Çözümü (Siteye özgü protokol)
                const decoded = atob(encLink.replace(/[a-zA-Z]/g, c => 
                    String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26)
                ));

                if (decoded.includes('http')) {
                    streams.push({
                        name: `FHD - ${key.toUpperCase()}`,
                        url: decoded,
                        type: decoded.includes('m3u8') ? 'm3u8' : 'file',
                        headers: { 'Referer': filmUrl }
                    });
                }
            }
        }
        return streams;
    } catch (e) {
        return [];
    }
}

// src/fullhd/index.js (Ana giriş noktası)
function getStreams(tmdbId, mediaType, season, episode) {
    return __async(this, null, function* () {
        try {
            console.log(`[FullHD] Request: ${mediaType} ${tmdbId}`);
            // Şablondaki boş fonksiyona yönlendirme yapar
            const streams = yield extractStreams(tmdbId, mediaType);
            return streams;
        } catch (error) {
            console.error(`[FullHD] Error: ${error.message}`);
            return [];
        }
    });
}
