/**
 * JetFilmizle - Universal Titan Resolver (Auto-Key)
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        // 1. ADIM: Dizinin JetFilmizle sayfasına gidip anahtarı (Master Key) çekelim
        const targetUrl = `https://jetfilmizle.net/dizi/${id}`;
        const res = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://jetfilmizle.net/'
            }
        });
        const html = await res.text();

        // 2. ADIM: Sayfadaki Titan anahtarını bul (DFADXFgPDU4 gibi)
        const iframeMatch = html.match(/videopark\.top\/titan\/w\/([a-zA-Z0-9_-]{10,15})/);
        const masterKey = iframeMatch ? iframeMatch[1] : null;

        if (!masterKey) {
            console.error("[TITAN] Anahtar bulunamadı.");
            return [];
        }

        // 3. ADIM: Bulunan anahtarla Videopark'a bağlan
        const playerUrl = `https://videopark.top/titan/w/${masterKey}`;
        const response = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const playerHtml = await response.text();

        // 4. ADIM: Veriyi (Bölüm listesi veya tekil sd) ayıkla
        const dataMatch = playerHtml.match(/var\s+_(?:data|sd)\s*=\s*({[\s\S]*?});/);
        
        if (dataMatch) {
            const parsed = JSON.parse(dataMatch[1]);
            
            // Bölüm seçimi (Örn: 1-1)
            const target = parsed[`${season}-${episode}`] || parsed;
            const streamUrl = target.stream_url || target.file;

            if (streamUrl) {
                return [{
                    name: "Videopark (Auto-Titan)",
                    url: streamUrl,
                    type: "hls",
                    subtitles: target.subtitles ? target.subtitles.map(s => ({
                        url: s.file, language: s.label, format: "vtt"
                    })) : [],
                    headers: {
                        'Referer': 'https://videopark.top/',
                        'User-Agent': 'Mozilla/5.0'
                    }
                }];
            }
        }

        return [];

    } catch (err) {
        console.error(`[TITAN-HATA] ${err.message}`);
        return [];
    }
}

// --- KRİTİK NOKTA: EXPORTS HATASINI ÇÖZEN KISIM ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    globalThis.getStreams = getStreams;
}
