var VER = '1.4.5';
console.log('[Dizibox V' + VER + '] Başlatıldı');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

// Dizipal'in loglarda görülen başarılı Header yapısı
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache'
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB Bilgisi
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;

        // 2. Arama - Domain Alternatifi
        // .pw engelliyse alternatifleri sırayla dene
        const domains = ['https://www.dizibox.tv', 'https://www.dizibox.pw'];
        let html = "";
        let usedDomain = "";

        for (let domain of domains) {
            console.log(`[Dizibox V${VER}] Deneniyor: ${domain}`);
            try {
                const searchRes = await fetch(`${domain}/?s=${encodeURIComponent(query)}`, { headers: HEADERS });
                html = await searchRes.text();
                if (html && html.length > 500) { 
                    usedDomain = domain;
                    break; 
                }
            } catch (e) { continue; }
        }

        if (!html || html.length < 500) throw new Error('Site içeriği boş (Engellendi)');

        // 3. Link Ayıklama
        const linkMatch = html.match(/href="(https?:\/\/[^"]+dizibox[^"]+)"[^>]*rel="bookmark"/i);
        if (!linkMatch) throw new Error('Dizi linki bulunamadı');

        const epUrl = linkMatch[1].replace(/\/$/, '') + `-sezon-${seasonNum}-bolum-${episodeNum}-izle/`;
        console.log(`[Dizibox V${VER}] Bölüm Sayfası: ${epUrl}`);

        const epRes = await fetch(epUrl, { headers: HEADERS });
        const epHtml = await epRes.text();

        const streams = [];
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        let match;

        while ((match = iframeRegex.exec(epHtml)) !== null) {
            let src = match[1];
            if (src.includes('vidmoly') || src.includes('player') || src.includes('moly') || src.includes('king')) {
                streams.push({
                    name: `⌜ Dizibox ⌟ | V${VER}`,
                    url: src.startsWith('//') ? 'https:' + src : src,
                    quality: '1080p',
                    headers: { 'Referer': usedDomain + '/' }
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
