/**
 * JetFilmizle - Videopark Button & Ajax Simulator
 * Odak: /titan/w/ linkindeki buton etkileşimini simüle ederek m3u8'i çekmek.
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        // Senin verdiğin çalışan örnek anahtar üzerinden gidelim
        const masterKey = "DFADXFgPDU4"; 
        const playerUrl = `https://videopark.top/titan/w/${masterKey}`;
        
        console.log(`[İŞLEM] Player sayfası yükleniyor: ${playerUrl}`);

        const playerRes = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });

        const playerHtml = await playerRes.text();

        // --- BUTON TETİKLEME / AJAX SİMÜLASYONU ---
        // Videopark butonlara basıldığında genellikle /api/get_source veya benzeri bir yere gider.
        // Ama bazen tüm bölümlerin linkleri JSON olarak 'var _data' içinde saklıdır.
        
        let streamUrl = "";

        // 1. İhtimal: Sayfa içinde gömülü m3u8 (Butona basılmış gibi arıyoruz)
        const m3u8Match = playerHtml.match(/["'](https?:\/\/[^"']+\.m3u8[^"']*)["']/);
        
        // 2. İhtimal: Bölüm verilerini içeren büyük bir JSON bloğu
        const dataMatch = playerHtml.match(/var\s+_data\s*=\s*({[\s\S]*?});/);

        if (dataMatch) {
            const videoData = JSON.parse(dataMatch[1]);
            // Sezon ve bölüm eşleşmesi yap (Örn: S1 E1 -> "1-1")
            const targetKey = `${season}-${episode}`;
            if (videoData[targetKey]) {
                streamUrl = videoData[targetKey].file || videoData[targetKey].url;
                console.log(`[BAŞARI] Bölüm ${targetKey} verisi JSON içinden çekildi.`);
            }
        }

        if (!streamUrl && m3u8Match) {
            streamUrl = m3u8Match[1].replace(/\\/g, '');
        }

        // --- 3. İHTİMAL: BASE64 ÇÖZÜCÜ (Eğer veri gizliyse) ---
        if (!streamUrl) {
            const b64Source = playerHtml.match(/atob\(['"]([a-zA-Z0-9+/=]+)['"]\)/);
            if (b64Source) {
                // Base64 decode simülasyonu (Plugin ortamında atob mevcuttur)
                streamUrl = Buffer.from(b64Source[1], 'base64').toString('utf-8');
            }
        }

        if (streamUrl) {
            return [{
                name: `Videopark S${season}E${episode}`,
                url: streamUrl,
                type: "hls",
                headers: {
                    'Referer': 'https://videopark.top/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    'Origin': 'https://videopark.top'
                }
            }];
        }

        console.error(`[HATA-04] Link sökülemedi. Sayfa buton etkileşimi bekliyor olabilir.`);
        return [];

    } catch (e) {
        console.error(`[SİSTEM] Kritik Hata: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
