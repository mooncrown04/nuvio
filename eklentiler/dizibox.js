var VER = '1.5.5-LIVE';
console.log('[Dizibox V' + VER + '] Güncel Adres Modu Aktif');

var TMDB_KEY = '4ef0d7355d9ffb5151e987764708ce96';

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB Aşaması (Dizi adını al)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_KEY}&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const query = tmdbData.name || tmdbData.original_name;

        // 2. Arama - Senin bulduğun .live adresi ve alternatifler
        const domains = ['https://www.dizibox.live', 'https://www.dizibox.tv', 'https://www.dizibox.pw'];
        let html = "";
        let usedDomain = "";

        for (let domain of domains) {
            console.log(`[Dizibox V${VER}] Deneniyor: ${domain}`);
            try {
                const searchRes = await fetch(`${domain}/?s=${encodeURIComponent(query)}`, {
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    timeout: 8000 // 8 saniye bekle, cevap yoksa diğerine geç
                });
                if (searchRes.ok) {
                    html = await searchRes.text();
                    if (html.length > 500) { 
                        usedDomain = domain;
                        console.log(`[Dizibox V${VER}] Başarılı Bağlantı: ${domain}`);
                        break; 
                    }
                }
            } catch (e) {
                console.log(`[Dizibox V${VER}] ${domain} başarısız: ${e.message}`);
            }
        }

        if (!html) throw new Error('Tüm domainler engelli veya timeout.');

        // 3. Link Ayıklama
        const linkMatch = html.match(/href="(https?:\/\/[^"]+dizibox[^"]+)"[^>]*rel="bookmark"/i);
        if (!linkMatch) throw new Error('Arama sayfasında dizi linki bulunamadı.');

        const epUrl = linkMatch[1].replace(/\/$/, '') + `-sezon-${seasonNum}-bolum-${episodeNum}-izle/`;
        console.log(`[Dizibox V${VER}] Bölüm Adresi: ${epUrl}`);

        // 4. Bölüm Sayfası ve Video Linkleri
        const epRes = await fetch(epUrl);
        const epHtml = await epRes.text();

        const streams = [];
        const iframeRegex = /<iframe[^>]+src="([^"]+)"/gi;
        let match;

        while ((match = iframeRegex.exec(epHtml)) !== null) {
            let src = match[1];
            if (src.includes('vidmoly') || src.includes('player') || src.includes('moly') || src.includes('king')) {
                streams.push({
                    name: `⌜ Dizibox ⌟ | ${VER}`,
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
