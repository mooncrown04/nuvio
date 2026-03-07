const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.dizibox.live/'
};

async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. Slug oluştur (TMDB fetch işlemini küçük tutuyoruz)
        const tmdbUrl = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        const slug = (tmdbData.original_name || tmdbData.name).toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');

        const epUrl = `https://www.dizibox.live/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd-izle/`;
        
        // 2. Ana Sayfayı Çek
        const mainRes = await fetch(epUrl, { headers: HEADERS });
        const html = await mainRes.text();
        
        const streams = [];

        // --- BELLEK DOSTU TARAMA ---
        // video_id'yi bul (FAILED BINDER TRANSACTION hatasını önlemek için spesifik arama)
        const idRegex = /video_id\s*[:=]\s*["']?(\d+)["']?/i;
        const idMatch = html.match(idRegex);
        
        if (idMatch && idMatch[1]) {
            const vId = idMatch[1];
            // King Player sayfasını ekle (Hemen fetch atmıyoruz, kullanıcı tıklayınca uygulama çözsün)
            streams.push({
                name: "DiziBox | King Player",
                url: `https://www.dizibox.live/player/king.php?v=${vId}`,
                quality: "1080p",
                headers: { 'Referer': epUrl }
            });
        }

        // Alternatif: Unescape (Moly vb.)
        if (html.includes('unescape')) {
            const uMatch = html.match(/unescape\("([^"]+)"\)/);
            if (uMatch) {
                const dec = decodeURIComponent(uMatch[1]);
                const sMatch = dec.match(/src="([^"]+)"/i);
                if (sMatch) {
                    streams.push({
                        name: "DiziBox | Alternatif",
                        url: sMatch[1].startsWith('//') ? 'https:' + sMatch[1] : sMatch[1],
                        quality: "720p",
                        headers: { 'Referer': epUrl }
                    });
                }
            }
        }

        // Değişkeni temizle (Garbage Collection yardımı)
        // html = null; 

        return streams;
    } catch (err) {
        return [];
    }
}

// Global Tanımlamalar
if (typeof exports !== 'undefined') exports.getStreams = getStreams;
if (typeof globalThis !== 'undefined') globalThis.getStreams = getStreams;
