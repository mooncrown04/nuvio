/**
 * JetFilmizle - Videopark "Titan" Worker Bypass
 * Bulunan stream_url ve altyazıları sisteme enjekte eder.
 */

async function getStreams(id, mediaType, season, episode) {
    // Videopark Player Linki
    const playerUrl = "https://videopark.top/titan/w/DFADXFgPDU4";

    try {
        console.error(`[TITAN] Bağlanılıyor: ${playerUrl}`);

        const response = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const html = await response.text();

        // Loglarda yakaladığımız _sd objesini HTML içinden cımbızla çekelim
        const sdMatch = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (sdMatch) {
            const data = JSON.parse(sdMatch[1]);
            const streamUrl = data.stream_url;

            console.error(`[TITAN-BAŞARILI] Proxy Akışı Yakalandı: ${streamUrl}`);

            // Altyazıları da ekleyelim (Türkçe, İngilizce vb.)
            const subtitles = data.subtitles ? data.subtitles.map(s => ({
                url: s.file,
                language: s.label,
                format: "vtt"
            })) : [];

            return [{
                name: "Videopark (Hızlı Sunucu)",
                url: streamUrl,
                type: "hls", // Cloudflare Worker genelde HLS döner
                subtitles: subtitles,
                headers: {
                    'Referer': 'https://videopark.top/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            }];
        }

        console.error("[TITAN-HATA] _sd objesi bulunamadı, şifreleme değişmiş olabilir.");
        return [];

    } catch (err) {
        console.error(`[TITAN-KRITIK] Hata: ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
