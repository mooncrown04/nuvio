const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Referer': 'https://www.dizibox.live/'
};

/**
 * Ana Akış Fonksiyonu
 */
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB'den Slug Oluşturma
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name)
            .toLowerCase().trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '');

        // 2. Sayfayı Çek
        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        console.log(`[Dizibox] Sayfa Cekiliyor: ${epUrl}`);

        const mainRes = await fetch(epUrl, { headers: HEADERS });
        const html = await mainRes.text();

        const streams = [];

        // 3. Iframe ve King Player Analizi
        // King Player genelde /player/king.php?v=ID yapısındadır
        const kingMatch = html.match(/src="([^"]*king\.php\?v=[^"]*)"/i);
        
        if (kingMatch) {
            let kingUrl = kingMatch[1];
            if (kingUrl.startsWith('//')) kingUrl = 'https:' + kingUrl;

            streams.push({
                name: "DiziBox | King Player",
                url: kingUrl,
                quality: "1080p",
                headers: { 
                    'Referer': epUrl,
                    'User-Agent': HEADERS['User-Agent']
                }
            });
        }

        // 4. Moly ve Diğer Alternatifleri Tara
        const genericMatches = html.match(/src="([^"]*(?:moly|vidmoly|ok\.ru)[^"]*)"/gi);
        if (genericMatches) {
            genericMatches.forEach(m => {
                let url = m.replace('src="', '').replace('"', '');
                if (url.startsWith('//')) url = 'https:' + url;
                if (!streams.find(s => s.url === url)) {
                    streams.push({
                        name: "DiziBox | Alternatif",
                        url: url,
                        quality: "1080p",
                        headers: { 'Referer': 'https://www.dizibox.live/' }
                    });
                }
            });
        }

        return streams;

    } catch (err) {
        console.error(`[Dizibox] Hata: ${err.message}`);
        return [];
    }
}

// UYGULAMA İÇİN KRİTİK AKTARMA (EXPORT) KISMI
if (typeof exports !== 'undefined') {
    exports.getStreams = getStreams;
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
}
// Bazı sistemler için doğrudan pencereye ata
if (typeof window !== 'undefined') {
    window.getStreams = getStreams;
}
