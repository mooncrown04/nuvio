/**
 * Provider: Dizigom (Advanced Debug)
 */
async function getStreams(tmdbId, mediaType, seasonNum, episodeNum) {
    const BASE_URL = 'https://dizigom104.com';
    const HEADERS = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Referer': BASE_URL + '/'
    };

    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB Verisi ve İsim Temizleme
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const name = tmdbData.name || tmdbData.original_name;
        
        // Slug Oluşturma (Türkçe karakter ve özel karakter temizliği)
        const slug = name.toLowerCase()
            .replace(/[üçşğöı]/g, m => ({'ü':'u','ç':'c','ş':'s','ğ':'g','ö':'o','ı':'i'}[m]))
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        console.log(`[Dizigom] Analiz Ediliyor: ${name} -> Slug: ${slug}`);

        // 2. Denenecek URL Listesi (Arama motoru bozuksa direkt buralara bakar)
        const possibleUrls = [
            `${BASE_URL}/dizi/${slug}-${seasonNum}-sezon-${episodeNum}-bolum/`,
            `${BASE_URL}/dizi/${slug}-${seasonNum}-sezon-${episodeNum}-bolum-hd1/`,
            `${BASE_URL}/${slug}-${seasonNum}-sezon-${episodeNum}-bolum/`
        ];

        let html = "";
        let finalUrl = "";

        for (const url of possibleUrls) {
            console.log(`[Dizigom] Deneniyor: ${url}`);
            try {
                const res = await fetch(url, { headers: HEADERS });
                console.log(`[Dizigom] Yanıt: ${res.status}`);
                if (res.status === 200) {
                    html = await res.text();
                    if (html.includes('moly') || html.includes('iframe')) {
                        finalUrl = url;
                        break; 
                    }
                }
            } catch (e) { 
                console.log(`[Dizigom] İstek Hatası: ${e.message}`);
            }
        }

        if (!html) {
            console.log('[Dizigom] HATA: Hiçbir URL varyasyonu sonuç vermedi.');
            return [];
        }

        // 3. Kaynak Ayıklama (Regex)
        const streams = [];
        const videoRegex = /src="([^"]*(?:vidmoly|moly|player|embed|ok\.ru)[^"]*)"/gi;
        let match;

        while ((match = videoRegex.exec(html)) !== null) {
            let src = match[1].startsWith('//') ? 'https:' + match[1] : match[1];
            console.log(`[Dizigom] Bulundu: ${src}`);
            streams.push({
                name: "Dizigom | Kaynak",
                url: src,
                quality: "1080p",
                headers: { 'Referer': finalUrl }
            });
        }

        console.log(`[Dizigom] Bitti. Toplam: ${streams.length}`);
        return streams;

    } catch (err) {
        console.log(`[Dizigom] Kritik Hata: ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') { module.exports = { getStreams }; }
globalThis.getStreams = getStreams;
