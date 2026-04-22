/**
 * JetFilmizle - TMDB to Slug + Titan Resolver (Nuvio Compatible)
 */

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        // 1. ADIM: TMDB ID'yi kullanarak site içinde arama yap ve gerçek Slug'ı bul
        const searchUrl = `https://jetfilmizle.net/arama?q=${tmdbId}`;
        const searchRes = await fetch(searchUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://jetfilmizle.net/' }
        });
        const searchHtml = await searchRes.text();

        // Arama sonuçlarından TMDB ID eşleşen ilk dizi linkini al
        // JetFilmizle arama sonuçlarında linkler genelde /dizi/dizi-adi şeklindedir
        const slugMatch = searchHtml.match(/href="https:\/\/jetfilmizle\.net\/dizi\/([^"]+)"/);
        const slug = slugMatch ? slugMatch[1] : null;

        if (!slug) {
            console.error(`[TMDB-HATA] TMDB ID (${tmdbId}) için uygun slug bulunamadı.`);
            return [];
        }

        const targetUrl = `https://jetfilmizle.net/dizi/${slug}`;
        console.error(`[BAĞLANTI] Hedef URL: ${targetUrl}`);

        // 2. ADIM: Dizi sayfasından Titan Master Key'i al
        const res = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://jetfilmizle.net/' }
        });
        const html = await res.text();

        const masterMatch = html.match(/videopark\.top\/(?:titan|ttn)\/w\/([a-zA-Z0-9_-]{10,15})/);
        const masterKey = masterMatch ? masterMatch[1] : null;

        if (!masterKey) {
            console.error(`[TITAN-HATA] Master Key bulunamadı: ${slug}`);
            return [];
        }

        // 3. ADIM: Player'a gir ve Worker/Bölüm verisini çek
        const playerUrl = `https://videopark.top/titan/w/${masterKey}`;
        const pRes = await fetch(playerUrl, {
            headers: { 'Referer': targetUrl, 'User-Agent': 'Mozilla/5.0' }
        });
        const pHtml = await pRes.text();

        const dataMatch = pHtml.match(/var\s+_(?:data|sd|sources)\s*=\s*({[\s\S]*?});/);
        
        if (dataMatch) {
            const allData = JSON.parse(dataMatch[1]);
            const targetKey = `${season}-${episode}`;
            const target = allData[targetKey] || allData;
            
            const streamUrl = target.stream_url || target.file;

            if (streamUrl) {
                console.error(`[TITAN-OK] Worker Linki Yakalandı: ${streamUrl}`);
                return [{
                    name: `Videopark (TMDB: ${tmdbId})`,
                    url: streamUrl,
                    type: "hls",
                    headers: {
                        'Referer': 'https://videopark.top/',
                        'Origin': 'https://videopark.top',
                        'User-Agent': 'Mozilla/5.0'
                    }
                }];
            }
        }

        return [];

    } catch (err) {
        console.error(`[TITAN-KRITIK] ${err.message}`);
        return [];
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    globalThis.getStreams = getStreams;
}
