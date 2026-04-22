/**
 * JetFilmizle - Universal Titan Resolver
 * Her dizi için anahtarı otomatik bulur ve bölümlere ulaşmanı sağlar.
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        // 1. ADIM: Dizinin JetFilmizle sayfasına git (Anahtarı oradan çalacağız)
        let slug = id; 
        const targetUrl = `https://jetfilmizle.net/dizi/${slug}`;
        
        const res = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://jetfilmizle.net/'
            }
        });
        const html = await res.text();

        // 2. ADIM: Sayfadaki Titan Master Key'i bul
        // Genellikle 11-12 haneli karışık harf/rakamdır (Örn: DFADXFgPDU4 veya 05b44f317d2a)
        let masterKey = null;

        // Önce iframe veya data-id içindeki temiz anahtarı ara
        const iframeMatch = html.match(/videopark\.top\/titan\/w\/([a-zA-Z0-9_-]{10,15})/);
        if (iframeMatch) {
            masterKey = iframeMatch[1];
        } else {
            // Alternatif: Sayfadaki 11-12 haneli hex/string kodlarını tara, Analytics (G-) kodlarını ele
            const potentialKeys = html.match(/[a-zA-Z0-9_-]{11,12}/g) || [];
            masterKey = potentialKeys.find(k => !k.startsWith('G-') && /[a-zA-Z]/.test(k) && /[0-9]/.test(k));
        }

        if (!masterKey) {
            console.error("[HATA] Bu dizi için Titan anahtarı bulunamadı.");
            return [];
        }

        // 3. ADIM: Bulduğumuz anahtarı senin o "çalışan" sistemine sokalım
        const playerUrl = `https://videopark.top/titan/w/${masterKey}`;
        console.error(`[TITAN] Otomatik Anahtar Bulundu (${masterKey}). Bağlanılıyor...`);

        const response = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        
        const playerHtml = await response.text();

        // 4. ADIM: Senin yöntemle _sd veya _data objesini çek (Bölüm eşleme dahil)
        // Eğer çoklu bölüm varsa _data, tek bölümlük bir yapıysa _sd kullanılır
        const dataMatch = playerHtml.match(/var\s+_(?:data|sd)\s*=\s*({[\s\S]*?});/);
        
        if (dataMatch) {
            const parsedData = JSON.parse(dataMatch[1]);
            
            // Eğer _data (bölüm listesi) geldiyse, istediğimiz bölüme zıplayalım
            const episodeKey = `${season}-${episode}`;
            const targetData = parsedData[episodeKey] || parsedData; // Eğer liste değilse direkt objeyi al

            const streamUrl = targetData.stream_url || targetData.file;

            if (streamUrl) {
                console.error(`[TITAN-BAŞARILI] Akış Yakalandı: ${streamUrl}`);
                
                return [{
                    name: `Videopark (S${season}E${episode})`,
                    url: streamUrl,
                    type: "hls",
                    subtitles: targetData.subtitles ? targetData.subtitles.map(s => ({
                        url: s.file, language: s.label, format: "vtt"
                    })) : [],
                    headers: {
                        'Referer': 'https://videopark.top/',
                        'User-Agent': 'Mozilla/5.0'
                    }
                }];
            }
        }

        console.error("[TITAN-HATA] Video verisi ayıklanamadı.");
        return [];

    } catch (err) {
        console.error(`[TITAN-KRITIK] Hata: ${err.message}`);
        return [];
    }
}
