var VER = '1.4.0';
console.log('[Dizibox V' + VER + '] Başlatıldı');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

// Agresif Header yapısı (Dizipal'den esinlenildi)
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7'
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB Bilgisi
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;

        // 2. Arama Sayfası (Dizipal'in başarılı olduğu protokolü taklit ediyoruz)
        // NOT: .pw yerine .live veya .tv denenebilir eğer timeout devam ederse
        const searchUrl = `https://www.dizibox.pw/?s=${encodeURIComponent(query)}`;
        console.log(`[Dizibox V${VER}] İstek: ${searchUrl}`);

        const response = await fetch(searchUrl, { 
            headers: HEADERS,
            method: 'GET'
        });

        const html = await response.text();
        
        // Link yakalama (Daha esnek Regex)
        const linkMatch = html.match(/href="(https?:\/\/(www\.)?dizibox\.[a-z]+\/[^"]+)"[^>]*rel="bookmark"/i) || 
                          html.match(/<h2[^>]*>\s*<a href="([^"]+)"/i);

        if (!linkMatch) throw new Error('Dizi bulunamadı');

        const mainUrl = linkMatch[1].replace(/\/$/, '');
        const epUrl = `${mainUrl}-sezon-${seasonNum}-bolum-${episodeNum}-izle/`;
        
        console.log(`[Dizibox V${VER}] Hedef: ${epUrl}`);

        // 3. Iframe Yakalama
        const epRes = await fetch(epUrl, { headers: HEADERS });
        const epHtml = await epRes.text();

        const streams = [];
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        let match;

        while ((match = iframeRegex.exec(epHtml)) !== null) {
            let src = match[1];
            if (src.includes('vidmoly') || src.includes('player') || src.includes('moly')) {
                streams.push({
                    name: `⌜ Dizibox ⌟ | V${VER}`,
                    url: src.startsWith('//') ? 'https:' + src : src,
                    quality: '1080p',
                    headers: { 'Referer': 'https://www.dizibox.pw/' }
                });
            }
        }

        return streams;

    } catch (err) {
        console.log(`[Dizibox V${VER}] Hata: ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
