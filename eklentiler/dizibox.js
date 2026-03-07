var VER = '1.6.0-FINAL';
console.log('[Dizibox V' + VER + '] Cloudflare Bypass Modu');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

// Tarayıcı gibi görünmek için kritik header bilgileri
var AGGRESSIVE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://www.google.com/',
    'Cache-Control': 'max-age=0',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'cross-site',
    'Upgrade-Insecure-Requests': '1'
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;

        // Sadece .live üzerinden gidiyoruz çünkü diğerleri IP seviyesinde engelli
        const domain = 'https://www.dizibox.live';
        console.log(`[Dizibox V${VER}] Sorgulanıyor: ${domain} | Dizi: ${query}`);

        const searchRes = await fetch(`${domain}/?s=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: AGGRESSIVE_HEADERS
        });

        // 403 kontrolü
        if (searchRes.status === 403) {
            console.log(`[Dizibox V${VER}] HATA: Hala 403 alıyoruz. Cloudflare geçilemedi.`);
        }

        const html = await searchRes.text();
        if (!html || html.length < 1000) throw new Error('HTML içeriği yetersiz.');

        // Link ayıklama
        const linkMatch = html.match(/href="(https?:\/\/www\.dizibox\.live\/[^"]+)"[^>]*rel="bookmark"/i);
        if (!linkMatch) throw new Error('Dizi linki bulunamadı.');

        const epUrl = linkMatch[1].replace(/\/$/, '') + `-sezon-${seasonNum}-bolum-${episodeNum}-izle/`;
        console.log(`[Dizibox V${VER}] Bölüm Linki Bulundu: ${epUrl}`);

        const epRes = await fetch(epUrl, { headers: AGGRESSIVE_HEADERS });
        const epHtml = await epRes.text();

        const streams = [];
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        let match;

        while ((match = iframeRegex.exec(epHtml)) !== null) {
            let src = match[1];
            if (src.includes('vidmoly') || src.includes('moly') || src.includes('player')) {
                streams.push({
                    name: `Dizibox | ${VER}`,
                    url: src.startsWith('//') ? 'https:' + src : src,
                    quality: '1080p',
                    headers: { 'Referer': domain + '/' }
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
