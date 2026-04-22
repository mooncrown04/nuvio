/**
 * JetFilmizle - Universal Titan Resolver
 * Index tabanlı buton simülasyonu ve otomatik Worker tetikleyici.
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        // 1. ADIM: Dizi sayfasına git ve buton index'ini bul
        // ID 77169 gibi sayısal gelirse sistem slug'a yönlendirir, fetch bunu takip eder.
        const targetUrl = `https://jetfilmizle.net/dizi/${id}`;
        const res = await fetch(targetUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Referer': 'https://jetfilmizle.net/' 
            }
        });
        const html = await res.text();

        // HTML içinden bastığımız bölümün 'data-source-index' değerini çekelim
        // Örn: data-season="1" data-episode="1" olan butonun index'i
        const indexRegex = new RegExp(`data-season="${season}"\\s+data-episode="${episode}"\\s+data-source-index="(\\d+)"`);
        const indexMatch = html.match(indexRegex);
        
        if (!indexMatch) {
            console.error(`[TITAN-HATA] Bölüm index'i bulunamadı: S${season}E${episode}`);
            return [];
        }
        
        const sourceIndex = indexMatch[1];

        // 2. ADIM: Sistemin Player Linkini oluşturmasını sağlayan isteği simüle et
        // JetFilmizle'de genelde bir admin-ajax veya player-fetch yapısı bulunur. 
        // Eğer doğrudan Player URL'si bir script içindeyse oradan çekiyoruz:
        const playerMatch = html.match(/videopark\.top\/(?:titan|ttn)\/w\/([a-zA-Z0-9_-]{10,15})/);
        let masterKey = playerMatch ? playerMatch[1] : null;

        if (!masterKey) {
            // Alternatif: Sayfadaki tüm scriptleri tara, Titan anahtarı genelde 11 hanelidir.
            const scriptKeys = html.match(/[a-zA-Z0-9_-]{11}/g) || [];
            masterKey = scriptKeys.find(k => /[a-zA-Z]/.test(k) && /[0-9]/.test(k) && !k.startsWith('G-'));
        }

        if (!masterKey) {
            console.error("[TITAN-HATA] Master Key (Anahtar) sayfada yakalanamadı.");
            return [];
        }

        // 3. ADIM: Player sayfasına gir ve Worker verisini çek
        const playerUrl = `https://videopark.top/titan/w/${masterKey}`;
        const pRes = await fetch(playerUrl, {
            headers: { 
                'Referer': targetUrl,
                'User-Agent': 'Mozilla/5.0' 
            }
        });
        const pHtml = await pRes.text();

        // 4. ADIM: Worker içindeki stream_url objesini ayıkla
        const dataMatch = pHtml.match(/var\s+_(?:data|sd|sources)\s*=\s*({[\s\S]*?});/);
        
        if (dataMatch) {
            const allData = JSON.parse(dataMatch[1]);
            
            // Videopark bazen index kullanır (0, 1, 2...) bazen bölüm formatı (1-1)
            const target = allData[`${season}-${episode}`] || allData[sourceIndex] || allData;
            const streamUrl = target.stream_url || target.file;

            if (streamUrl) {
                console.error(`[TITAN-OK] Akış URL: ${streamUrl}`);
                
                return [{
                    name: `Videopark (S${season}E${episode})`,
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

        console.error("[TITAN-HATA] Worker JSON verisi bulunamadı.");
        return [];

    } catch (err) {
        console.error(`[TITAN-KRITIK] Hata: ${err.message}`);
        return [];
    }
}

// Global Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    globalThis.getStreams = getStreams;
}
