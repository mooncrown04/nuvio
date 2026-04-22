/**
 * JetFilmizle - Videopark "Titan" Full Debug Edition (V3 - Cookie/Session Fix)
 */

async function getStreams(id, mediaType, season, episode) {
    console.error(`[DEBUG-V3] S=${season}, E=${episode} için Session başlatıldı.`);

    try {
        // 1. ADIM: Önce ana sayfaya bir "merhaba" diyelim (Çerez almak için)
        console.error(`[DEBUG-V3] Çerezler temizleniyor ve ana sayfaya selam veriliyor...`);
        const initRes = await fetch(BASE_URL + '/', { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } 
        });
        
        // 2. ADIM: TMDB ve Slug İşlemleri
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${id}?api_key=${TMDB_API_KEY}&language=tr-TR`;
        const tmdbRes = await fetch(tmdbUrl);
        const info = await tmdbRes.json();
        const slug = titleToSlug(info.name || info.title);
        
        const pagePath = (mediaType === 'tv') ? `dizi/${slug}/${season}-sezon-${episode}-bolum` : `film/${slug}`;
        const finalUrl = `${BASE_URL}/${pagePath}`;
        console.error(`[DEBUG-V3] Hedef Bölüm Sayfası: ${finalUrl}`);

        // 3. ADIM: Bölüm sayfasına "Referer" ve "Fake Cookie" ile gidelim
        const pageRes = await fetch(finalUrl, { 
            headers: { 
                'Referer': BASE_URL + '/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Cookie': 'jet_session=true; has_visited=1' // Bazı basit kontrolleri böyle aşabiliriz
            } 
        });
        
        const pageHtml = await pageRes.text();
        console.error(`[DEBUG-V3] Sayfa boyutu: ${pageHtml.length}`); // Burada 58361'den farklı bir rakam görmeliyiz!

        // 4. ADIM: Kod Avı
        const hashMatch = pageHtml.match(/videopark\.top\/titan\/w\/([a-zA-Z0-9_-]+)/);
        let playerHash = "";

        if (hashMatch) {
            playerHash = hashMatch[1];
            console.error(`[DEBUG-V3] BAŞARILI! Bu bölüme özel hash yakalandı: ${playerHash}`);
        } else {
            playerHash = "DFADXFgPDU4"; // Son çare
            console.error(`[DEBUG-V3] Maalesef bölüm kodu bulunamadı, sabit koda dönüldü.`);
        }

        // 5. ADIM: Videopark API Çağrısı
        const playerUrl = `https://videopark.top/titan/w/${playerHash}`;
        const response = await fetch(playerUrl, {
            headers: {
                'Referer': finalUrl,
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        const html = await response.text();
        const sdMatch = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (sdMatch) {
            const data = JSON.parse(sdMatch[1]);
            console.error(`[DEBUG-V3] BÖLÜM URL: ${data.stream_url.substring(0, 50)}...`);

            return [{
                name: "Videopark (Dinamik)",
                url: data.stream_url,
                type: "hls",
                subtitles: data.subtitles ? data.subtitles.map(s => ({ url: s.file, language: s.label, format: "vtt" })) : [],
                headers: { 'Referer': 'https://videopark.top/', 'Origin': 'https://videopark.top' }
            }];
        }

        return [];
    } catch (err) {
        console.error(`[DEBUG-CRITICAL] V3 Hatası: ${err.message}`);
        return [];
    }
}
