var VER = '1.5.0-PROXY';
console.log('[Dizibox V' + VER + '] Proxy Modu Aktif');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

// Engelleri aşmak için kullanılacak güvenli köprüler
var PROXY_LIST = [
    'https://api.allorigins.win/get?url=',
    'https://thingproxy.freeboard.io/fetch/'
];

async function proxyFetch(targetUrl) {
    // Önce doğrudan dene, olmazsa proxy'ye geç
    try {
        const res = await fetch(targetUrl, { timeout: 5000 });
        if (res.ok) return await res.text();
    } catch (e) {
        console.log('[Dizibox] Doğrudan bağlantı başarısız, Proxy deneniyor...');
    }

    // Proxy üzerinden dene
    const proxyUrl = PROXY_LIST[0] + encodeURIComponent(targetUrl);
    const res = await fetch(proxyUrl);
    const data = await res.json();
    return data.contents; // AllOrigins formatı
}

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB - Bu zaten çalışıyor
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;

        // 2. Arama (Proxy ile)
        const searchUrl = `https://www.dizibox.pw/?s=${encodeURIComponent(query)}`;
        console.log(`[Dizibox V${VER}] Arama: ${searchUrl}`);
        
        const html = await proxyFetch(searchUrl);

        if (!html) throw new Error('Proxy üzerinden veri alınamadı');

        const linkMatch = html.match(/href="(https?:\/\/[^"]+dizibox[^"]+)"[^>]*rel="bookmark"/i);
        if (!linkMatch) throw new Error('Dizi linki bulunamadı');

        const epUrl = linkMatch[1].replace(/\/$/, '') + `-sezon-${seasonNum}-bolum-${episodeNum}-izle/`;
        console.log(`[Dizibox V${VER}] Bölüm Linki: ${epUrl}`);

        // 3. Bölüm Sayfası (Proxy ile)
        const epHtml = await proxyFetch(epUrl);

        const streams = [];
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        let match;

        while ((match = iframeRegex.exec(epHtml)) !== null) {
            let src = match[1];
            if (src.includes('vidmoly') || src.includes('player') || src.includes('moly')) {
                streams.push({
                    name: `⌜ Dizibox PROXY ⌟`,
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
