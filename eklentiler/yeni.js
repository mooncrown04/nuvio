/**
 * JetFilmizle - Universal Titan Resolver
 * Buton etkileşimini ve Worker yönlendirmesini otomatikleştirir.
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        // 1. Dizinin JetFilmizle sayfasından Master Key'i yakala
        const targetUrl = `https://jetfilmizle.net/dizi/${id}`;
        const res = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://jetfilmizle.net/' }
        });
        const html = await res.text();

        const masterKeyMatch = html.match(/videopark\.top\/(?:titan|ttn)\/w\/([a-zA-Z0-9_-]{10,15})/);
        const masterKey = masterKeyMatch ? masterKeyMatch[1] : null;

        if (!masterKey) {
            console.error(`[TITAN-HATA] Anahtar bulunamadı: ${id}`);
            return [];
        }

        // 2. Titan Player sayfasından Worker verilerini çek
        const playerUrl = `https://videopark.top/titan/w/${masterKey}`;
        const pRes = await fetch(playerUrl, {
            headers: { 'Referer': targetUrl, 'User-Agent': 'Mozilla/5.0' }
        });
        const pHtml = await pRes.text();

        // Butonların arkasındaki JSON verisini cımbızla çek
        const dataMatch = pHtml.match(/var\s+_(?:data|sd|sources)\s*=\s*({[\s\S]*?});/);
        
        if (dataMatch) {
            const allData = JSON.parse(dataMatch[1]);
            const targetKey = `${season}-${episode}`;
            
            // Seçilen bölüme ait Worker verisi
            const target = allData[targetKey] || allData;
            const streamUrl = target.stream_url || target.file;

            if (streamUrl) {
                console.error(`[TITAN-OK] Worker Linki: ${streamUrl}`);
                
                return [{
                    name: `Videopark S${season}E${episode}`,
                    url: streamUrl,
                    type: "hls",
                    subtitles: target.subtitles ? target.subtitles.map(s => ({
                        url: s.file, language: s.label, format: "vtt"
                    })) : [],
                    headers: {
                        'Referer': 'https://videopark.top/',
                        'Origin': 'https://videopark.top',
                        'User-Agent': 'Mozilla/5.0'
                    }
                }];
            }
        }

        console.error("[TITAN-HATA] Worker verisi ayıklanamadı.");
        return [];

    } catch (err) {
        console.error(`[TITAN-KRITIK] ${err.message}`);
        return [];
    }
}

// Global Export - Cloudstream/Plugin uyumluluğu için
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    globalThis.getStreams = getStreams;
}
