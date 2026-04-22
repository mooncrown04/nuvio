/**
 * JetFilmizle - Videopark "Worker Generator" Bypass
 * Buton tetiklemesini ve Worker yönlendirmesini simüle eder.
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        // 1. ADIM: Dizinin ana sayfasından "Master Key"i bul
        const targetUrl = `https://jetfilmizle.net/dizi/${id}`;
        const mainRes = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://jetfilmizle.net/' }
        });
        const mainHtml = await mainRes.text();

        const masterKeyMatch = mainHtml.match(/videopark\.top\/(?:titan|ttn)\/w\/([a-zA-Z0-9_-]{10,15})/);
        const masterKey = masterKeyMatch ? masterKeyMatch[1] : null;

        if (!masterKey) return [];

        // 2. ADIM: Player sayfasına git (Butonların olduğu yer)
        const playerUrl = `https://videopark.top/titan/w/${masterKey}`;
        const playerRes = await fetch(playerUrl, {
            headers: { 'Referer': targetUrl, 'User-Agent': 'Mozilla/5.0' }
        });
        const playerHtml = await playerRes.text();

        // 3. ADIM: Buton verisini (Worker linklerini) çek
        // Videopark'ta butonlar 'var _data' veya 'var _sources' içinde worker linklerini tutar.
        const dataMatch = playerHtml.match(/var\s+_(?:data|sd|sources)\s*=\s*({[\s\S]*?});/);
        
        if (dataMatch) {
            const allData = JSON.parse(dataMatch[1]);
            const episodeKey = `${season}-${episode}`;
            
            // Eğer bastığımız bölüm listede varsa, onun Worker verisini alalım
            const target = allData[episodeKey] || allData;
            
            // 4. ADIM: Worker'dan stream_url al (Tetikleme sonrası gelen link)
            let finalUrl = target.stream_url || target.file;

            if (finalUrl) {
                // Eğer link bir "Worker Proxy" ise (genelde /worker/ veya /v/ ile başlar)
                // Cloudstream'in bunu oynatabilmesi için gerekli header'ları ekliyoruz.
                return [{
                    name: `Videopark Worker (S${season}E${episode})`,
                    url: finalUrl,
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

        console.error("[HATA] Worker linki oluşturulamadı.");
        return [];

    } catch (err) {
        console.error(`[TITAN-KRITIK] ${err.message}`);
        return [];
    }
}

// Global Export (Kritik: Hata almamak için)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    globalThis.getStreams = getStreams;
}
