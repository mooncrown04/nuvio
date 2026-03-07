const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        
        const slug = (tmdbData.original_name || tmdbData.name)
            .toLowerCase().trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        console.log(`[Dizibox] Sayfa Cekiliyor: ${epUrl}`);

        const mainRes = await fetch(epUrl, { headers: HEADERS });
        const mainHtml = await mainRes.text();

        const streams = [];
        
        // 1. Standart Iframe ve Data-Src taraması
        const regexList = [
            /iframe[^>]+src=["']([^"']*(?:player|king|vidmoly|moly|ok\.ru|mail\.ru|dizibox)[^"']*)["']/gi,
            /data-src=["']([^"']*(?:player|king|vidmoly|moly|ok\.ru|mail\.ru|dizibox)[^"']*)["']/gi,
            /file:\s*["']([^"']*\.m3u8[^"']*)["']/gi  // Doğrudan video dosyası varsa
        ];

        regexList.forEach(reg => {
            let match;
            while ((match = reg.exec(mainHtml)) !== null) {
                let url = match[1];
                if (url.startsWith('//')) url = 'https:' + url;
                
                // MolyStream adıyla listeye ekle
                if (!streams.find(s => s.url === url)) {
                    streams.push({
                        name: "DiziBox | " + (url.includes('moly') ? "MolyStream" : "Alternatif"),
                        url: url,
                        quality: "1080p",
                        headers: { 
                            'Referer': 'https://www.dizibox.live/',
                            'User-Agent': HEADERS['User-Agent']
                        }
                    });
                }
            }
        });

        console.log(`[Dizibox] Tarama bitti. Bulunan kaynak: ${streams.length}`);
        return streams;

    } catch (err) {
        console.log(`[Dizibox] Hata: ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
