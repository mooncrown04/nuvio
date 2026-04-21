/**
 * JetFilmizle & Videopark - Universal Stream Extractor
 * Hem m3u8 linklerini hem de gizli JS değişkenlerini yakalar.
 */

async function getStreams(id, mediaType, season, episode) {
    // Videopark'ın tarayıcıda çalışan o meşhur linki
    const playerUrl = "https://videopark.top/titan/w/DFADXFgPDU4";

    try {
        console.error(`[EXTRACTOR] Analiz Başladı: ${playerUrl}`);

        const response = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; TV Box) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
        });
        
        const html = await response.text();

        // STRATEJİ 1: JSON formatında saklanan 'file' parametresi
        let videoUrl = html.match(/["']?file["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i)?.[1] ||
                       html.match(/["']?src["']?\s*:\s*["']([^"']+\.m3u8[^"']*)["']/i)?.[1];

        // STRATEJİ 2: Eğer m3u8 doğrudan yoksa, sayfa içindeki Base64 veya Packed veriyi tara
        if (!videoUrl) {
            console.error("[EXTRACTOR] Doğrudan link yok, derin tarama yapılıyor...");
            
            // Videopark bazen linki bir JS değişkenine atar (Örn: var stream = "...")
            const scripts = html.match(/<script\b[^>]*>([\s\S]*?)<\/script>/gm);
            scripts?.forEach((s) => {
                // 'eval' içeren veya çok uzun tek satırlı scriptleri logla
                if (s.length > 500 && (s.includes('eval') || s.includes('p,a,c,k,e,d'))) {
                    console.error(`[GIZLI-KOD] ${s.substring(0, 1000)}`);
                }
                
                // Gizli m3u8 linklerini her ihtimale karşı regex ile tekrar tara
                const innerMatch = s.match(/(https?:\/\/[^"']+\.m3u8[^"']*)/i);
                if (innerMatch) videoUrl = innerMatch[1];
            });
        }

        if (videoUrl) {
            // Linki temizle ve protokol ekle
            if (videoUrl.startsWith('//')) videoUrl = 'https:' + videoUrl;

            console.error(`[BULUNDU] Video Adresi: ${videoUrl}`);
            
            return [{
                name: "Videopark HLS",
                url: videoUrl,
                type: "hls",
                headers: {
                    'Referer': 'https://videopark.top/',
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; TV Box)'
                }
            }];
        }

        console.error("[HATA] Sayfa çekildi ama video linki ayıklanamadı.");
        return [];

    } catch (err) {
        console.error(`[KRITIK-HATA] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
