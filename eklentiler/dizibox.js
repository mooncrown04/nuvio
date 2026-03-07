var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    // www ve https bazen bloklanır, pw/live/tv uzantıları sürekli değişir.
    // En stabil arama yolu budur.
    var BASE_URL = 'http://www.dizibox.pw'; 

    try {
        console.log('[Dizibox] TMDB Sorgusu Başlatıldı');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;

        // ARAMA ADIMI: 30 saniyelik beklemeyi aşmak için timeout ekliyoruz
        console.log('[Dizibox] Arama Yapılıyor:', query);
        const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
        
        const searchRes = await fetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/110.0.0.0 Safari/537.36' },
            method: 'GET'
        });
        
        const searchHtml = await searchRes.text();

        // Regex ile link ayıklama
        const linkMatch = findFirst(searchHtml, 'href="(http[^"]+dizibox[^"]+)"[^>]*rel="bookmark"') || 
                          findFirst(searchHtml, '<h2[^>]*>\\s*<a href="([^"]+)"');

        if (!linkMatch) throw new Error('Dizi bulunamadı veya site erişimi engellendi');

        const mainUrl = linkMatch[1].replace('https:', 'http:'); // SSL hatasını bypass et
        const epUrl = `${mainUrl.replace(/\/$/, '')}-sezon-${seasonNum}-bolum-${episodeNum}-izle/`;

        console.log('[Dizibox] Bölüm Linki:', epUrl);
        const epRes = await fetch(epUrl);
        const epHtml = await epRes.text();

        const streams = [];
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        let match;

        while ((match = iframeRegex.exec(epHtml)) !== null) {
            let src = match[1];
            if (src.includes('vidmoly') || src.includes('player') || src.includes('moly') || src.includes('king')) {
                streams.push({
                    name: "Dizibox | " + (src.includes('vidmoly') ? "Vidmoly" : "Player"),
                    url: src.startsWith('//') ? 'https:' + src : src,
                    quality: "1080p",
                    headers: { 'Referer': BASE_URL + '/' }
                });
            }
        }

        return streams;

    } catch (err) {
        console.error("[Dizibox] Hata Detayı:", err.message);
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
