/**
 * JetFilmizle - Saf Titan Sökücü
 * Odak: Dışarıdan URL dayatmadan, sadece eldeki anahtarla linki sökme.
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        // 1. ADIM: ANAHTARI BELİRLE
        // Uygulama id olarak "77169" gönderiyorsa onu "cobra-kai"ye çeviriyoruz 
        // ki ana sayfaya ulaşıp o bölüme ait anahtarı (key) çekebilelim.
        let slug = (id === "77169") ? "cobra-kai" : id;
        const pageUrl = `https://jetfilmizle.net/dizi/${slug}`;

        console.log(`[İŞLEM] Sayfa kaynağından anahtar aranıyor: ${pageUrl}`);

        const pageRes = await fetch(pageUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await pageRes.text();

        // Sayfadaki titan/w/ veya ttn/w/ kodunu bul
        const keyMatch = html.match(/(?:titan|ttn)\/(?:w|p)\/([a-zA-Z0-9_-]{11})/);
        
        if (!keyMatch) {
            console.error("[HATA-02] Sayfada titan anahtarı bulunamadı.");
            return [];
        }

        const key = keyMatch[1];
        const playerUrl = `https://videopark.top/titan/w/${key}`;
        console.log(`[BİLGİ] Anahtar bulundu: ${key} | Oynatıcıya gidiliyor...`);

        // 2. ADIM: VİDEOPARK'TAN LİNKİ SÖK (Senin paylaştığın mantık)
        const response = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        
        const playerHtml = await response.text();

        // HTML içindeki _sd objesini cımbızla çekiyoruz
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (sdMatch) {
            const data = JSON.parse(sdMatch[1]);
            const streamUrl = data.stream_url;

            console.log(`[BAŞARILI] Akış yakalandı.`);

            // Altyazıları ayıkla
            const subtitles = data.subtitles ? data.subtitles.map(s => ({
                url: s.file,
                language: s.label || "Türkçe",
                format: "vtt"
            })) : [];

            return [{
                name: "Titan-Videopark",
                url: streamUrl,
                type: "hls",
                subtitles: subtitles,
                headers: {
                    'Referer': 'https://videopark.top/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                }
            }];
        }

        console.error("[HATA-04] Oynatıcı sayfasında _sd verisi bulunamadı.");
        return [];

    } catch (err) {
        console.error(`[KRİTİK] Hata: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
