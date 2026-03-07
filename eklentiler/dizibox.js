var VER = '1.7.0-PROXY';
console.log('[Dizibox V' + VER + '] Proxy ile Engel Aşılıyor...');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

// Cloudflare 403 hatasını aşmak için köprü sunucusu
// Bu servis isteği senin yerine yapıp içeriği bize getirir
var PROXY = 'https://api.allorigins.win/get?url=';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB Aşaması
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;

        // 2. Arama (Sadece .live ve PROXY üzerinden)
        const targetSearchUrl = `https://www.dizibox.live/?s=${encodeURIComponent(query)}`;
        console.log(`[Dizibox V${VER}] Proxy üzerinden aranıyor: ${targetSearchUrl}`);

        const proxyRes = await fetch(PROXY + encodeURIComponent(targetSearchUrl));
        const proxyData = await proxyRes.json();
        const html = proxyData.contents; // Sitenin gerçek HTML içeriği burada

        if (!html || html.length < 1000) {
            throw new Error('Proxy içeriği alamadı (Boş cevap)');
        }

        // 3. Link Ayıklama
        const linkMatch = html.match(/href="(https?:\/\/www\.dizibox\.live\/[^"]+)"[^>]*rel="bookmark"/i);
        if (!linkMatch) throw new Error('Arama sonucunda dizi bulunamadı.');

        const epUrl = linkMatch[1].replace(/\/$/, '') + `-sezon-${seasonNum}-bolum-${episodeNum}-izle/`;
        console.log(`[Dizibox V${VER}] Bölüm bulundu: ${epUrl}`);

        // 4. Bölüm Sayfası (Yine Proxy ile)
        const proxyEpRes = await fetch(PROXY + encodeURIComponent(epUrl));
        const proxyEpData = await proxyEpRes.json();
        const epHtml = proxyEpData.contents;

        const streams = [];
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        let match;

        while ((match = iframeRegex.exec(epHtml)) !== null) {
            let src = match[1];
            if (src.includes('vidmoly') || src.includes('moly') || src.includes('player')) {
                streams.push({
                    name: "⌜ Dizibox PROXY 1080p ⌟",
                    url: src.startsWith('//') ? 'https:' + src : src,
                    quality: '1080p'
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
