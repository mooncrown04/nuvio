var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

// Bellek dostu Regex arama fonksiyonu
function findFirst(html, pattern) {
    var regex = new RegExp(pattern, 'i');
    var match = regex.exec(html);
    return match ? match : null;
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB'den isim al (Arama yapmak en garantisidir, slug her zaman tutmaz)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;

        // 2. Arama Sayfasına Git (Dizipal tarzı arama)
        const searchUrl = `https://www.dizibox.pw/?s=${encodeURIComponent(query)}`;
        const searchRes = await fetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Safari/537.36' }
        });
        const searchHtml = await searchRes.text();

        // Regex ile ilk dizi linkini cımbızla (Cheerio yerine Regex RAM yemez)
        const linkMatch = findFirst(searchHtml, 'href="(https?:\\/\\/www\\.dizibox\\.pw\\/[^"]+)"[^>]*rel="bookmark"') || 
                          findFirst(searchHtml, '<h2[^>]*>\\s*<a href="([^"]+)"');

        if (!linkMatch) return [];

        // 3. Bölüm URL'sini oluştur
        const mainUrl = linkMatch[1].replace(/\/$/, '');
        const epUrl = `${mainUrl}-sezon-${seasonNum}-bolum-${episodeNum}-izle/`;

        const epRes = await fetch(epUrl);
        const epHtml = await epRes.text();

        // 4. Iframe Ayıklama (King/Sheila/Moly)
        const streams = [];
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        let match;

        while ((match = iframeRegex.exec(epHtml)) !== null) {
            let src = match[1];
            if (src.includes('vidmoly') || src.includes('player') || src.includes('king') || src.includes('moly')) {
                const finalUrl = src.startsWith('//') ? 'https:' + src : src;
                
                streams.push({
                    name: "Dizibox | Player",
                    url: finalUrl,
                    quality: "1080p",
                    headers: {
                        'Referer': 'https://www.dizibox.pw/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Safari/537.36'
                    }
                });
            }
        }

        return streams;

    } catch (err) {
        console.error("[Dizibox] Hata:", err.message);
        return [];
    }
}

// Nuvio / Mooncrown Export Protokolü
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    global.getStreams = getStreams;
}
