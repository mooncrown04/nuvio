/**
 * JetFilmizle - Videopark Titan "Dynamic Season/Episode" Resolver
 */

async function getStreams(id, mediaType, season, episode) {
    // Videopark'ın ana giriş kapısı (Master Key)
    const masterKey = "DFADXFgPDU4"; 
    const playerUrl = `https://videopark.top/titan/w/${masterKey}`;

    try {
        console.log(`[TITAN] Sezon ${season} Bölüm ${episode} aranıyor...`);

        const response = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        const html = await response.text();

        // 1. ADIM: Sayfadaki tüm sezon/bölüm verilerini içeren devasa JSON bloğunu bul
        // Videopark'ta bu genellikle 'var _data = ...' veya 'var _seasons = ...' içindedir.
        const dataMatch = html.match(/var\s+_data\s*=\s*({[\s\S]*?});/);
        
        if (dataMatch) {
            const allData = JSON.parse(dataMatch[1]);
            
            // 2. ADIM: İstediğin bölümün anahtarını oluştur (Örn: "1-1", "2-5" gibi)
            const episodeKey = `${season}-${episode}`;
            const targetEpisode = allData[episodeKey];

            if (targetEpisode) {
                console.log(`[TITAN] Bölüm bulundu: ${episodeKey}`);
                
                // Altyazıları formatla
                const subtitles = targetEpisode.subtitles ? targetEpisode.subtitles.map(s => ({
                    url: s.file,
                    language: s.label,
                    format: "vtt"
                })) : [];

                return [{
                    name: `Videopark S${season}E${episode}`,
                    url: targetEpisode.file || targetEpisode.stream_url,
                    type: "hls",
                    subtitles: subtitles,
                    headers: {
                        'Referer': 'https://videopark.top/',
                        'User-Agent': 'Mozilla/5.0'
                    }
                }];
            }
        }

        // 3. ADIM: Eğer JSON yoksa (Tek bölümlük veya farklı yapı), mevcut _sd objesine bak
        const sdMatch = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        if (sdMatch) {
            const sdData = JSON.parse(sdMatch[1]);
            return [{
                name: "Videopark (Varsayılan)",
                url: sdData.stream_url,
                type: "hls",
                headers: { 'Referer': 'https://videopark.top/' }
            }];
        }

        console.error("[TITAN] Aranan bölüm verisi sayfada bulunamadı.");
        return [];

    } catch (err) {
        console.error(`[TITAN-KRİTİK] Hata: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
