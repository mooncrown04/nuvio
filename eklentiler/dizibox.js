// Cheerio bağımlılığını kaldırdık (Binder hatasını önlemek için)
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB'den isim çek
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        
        const slug = (tmdbData.original_name || tmdbData.name)
            .toLowerCase().trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w-]+/g, '');

        // 2. Senin tarayıcıda açtığın çalışan link yapısı
        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        console.log(`[Dizibox] Sayfa Cekiliyor: ${epUrl}`);

        const mainRes = await fetch(epUrl, { headers: HEADERS });
        const mainHtml = await mainRes.text();

        const streams = [];
        
        // 3. Iframe/Player Ayıklama (Regex ile - Binder hatası vermez)
        // Dizibox genelde 'video-area' div'i içinde iframe kullanır.
        const iframeRegex = /<iframe[^>]+src="([^"]*(?:player|king|vidmoly|moly|ok\.ru)[^"]*)"/gi;
        let match;

        while ((match = iframeRegex.exec(mainHtml)) !== null) {
            let src = match[1];
            if (src.startsWith('//')) src = 'https:' + src;

            // Moly veya King player ise ekle
            streams.push({
                name: "DiziBox | Player",
                url: src,
                quality: "1080p",
                headers: { 
                    'Referer': 'https://www.dizibox.live/',
                    'User-Agent': HEADERS['User-Agent']
                }
            });
        }

        console.log(`[Dizibox] Bitti. Bulunan kaynak: ${streams.length}`);
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
