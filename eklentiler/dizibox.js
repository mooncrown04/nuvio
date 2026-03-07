/**
 * Dizigom Ultimate Provider - v14
 */
function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    const BASE_URL = 'https://dizigom104.com';
    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': BASE_URL + '/'
    };

    return new Promise(async (resolve) => {
        if (mediaType !== 'tv') return resolve([]);

        try {
            // 1. TMDB Bilgilerini Al
            const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
            const tmdbData = await tmdbRes.json();
            const name = tmdbData.name || tmdbData.original_name;
            
            // Slug Oluştur (Türkçe karakter temizliği)
            const slug = name.toLowerCase().trim()
                .replace(/[üçşğöı]/g, m => ({'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]))
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            console.log(`[Dizigom-Debug] Başlatıldı: ${name} -> Slug: ${slug}`);

            // 2. Dizigom'un kullandığı tüm muhtemel URL varyasyonları
            const urls = [
                `${BASE_URL}/dizi/${slug}-izle-${seasonNum}-sezon-${episodeNum}-bolum/`,
                `${BASE_URL}/dizi/${slug}-${seasonNum}-sezon-${episodeNum}-bolum/`,
                `${BASE_URL}/dizi/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd1/`,
                `${BASE_URL}/${slug}-${seasonNum}-sezon-${episodeNum}-bolum/`
            ];

            let html = "";
            let successUrl = "";

            for (const url of urls) {
                console.log(`[Dizigom-Debug] Deneniyor: ${url}`);
                try {
                    const res = await fetch(url, { headers: HEADERS });
                    console.log(`[Dizigom-Debug] Durum: ${res.status}`);
                    
                    if (res.status === 200) {
                        const text = await res.text();
                        if (text.includes('iframe') || text.includes('moly')) {
                            html = text;
                            successUrl = url;
                            console.log(`[Dizigom-Debug] BAŞARILI: Sayfa yakalandı!`);
                            break;
                        }
                    }
                } catch (e) {
                    console.log(`[Dizigom-Debug] Hata: ${url} -> ${e.message}`);
                }
            }

            if (!html) {
                console.log('[Dizigom-Debug] SONUÇ: Hiçbir URL çalışmadı. (Check Slug/Bot Protection)');
                return resolve([]);
            }

            // 3. Kaynak Ayıklama
            const streams = [];
            const videoRegex = /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi;
            let match;

            while ((match = videoRegex.exec(html)) !== null) {
                let src = match[1].startsWith('//') ? 'https:' + match[1] : match[1];
                console.log(`[Dizigom-Debug] Bulunan Video: ${src}`);
                streams.push({
                    name: "Dizigom | Kaynak",
                    url: src,
                    quality: "1080p",
                    headers: { 'Referer': successUrl }
                });
            }

            console.log(`[Dizigom-Debug] BİTTİ. Toplam: ${streams.length}`);
            resolve(streams);

        } catch (err) {
            console.error(`[Dizigom-Debug] Kritik Hata: ${err.message}`);
            resolve([]);
        }
    });
}

// Export İşlemleri
if (typeof module !== 'undefined') { module.exports = { getStreams }; }
globalThis.getStreams = getStreams;
