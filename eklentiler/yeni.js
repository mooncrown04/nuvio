/**
 * JetFilmizle - Titan Gelişmiş Yakalayıcı
 * Odak: HATA-02 (Regex bulamama sorunu) çözümü.
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        // Cobra Kai için slug düzeltmesi
        let slug = (id === "77169") ? "cobra-kai" : id;
        const targetUrl = `https://jetfilmizle.net/dizi/${slug}`;
        
        console.log(`[İŞLEM] Sayfa okunuyor: ${targetUrl}`);

        const res = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        
        const html = await res.text();

        // --- YENİLENMİŞ CIMBIZ (REGEX) ---
        // Sadece titan/w/ değil, ttn/w/ veya ttn/p/ gibi varyasyonları da arar.
        // Ayrıca tırnak içinde veya dışında olmasını önemsemez.
        const titanRegex = /(?:titan|ttn)\/(?:w|p)\/([a-zA-Z0-9]{11})/;
        const match = html.match(titanRegex);
        
        if (!match) {
            // Eğer hala bulamazsa, alternatif bir "data-id" veya "player" araması yapar
            const altMatch = html.match(/data-id="([a-zA-Z0-9]{11})"/);
            if (altMatch) {
                var key = altMatch[1];
            } else {
                console.error("[HATA-02] Sayfada video anahtarı (11 hane) hiçbir formatta bulunamadı.");
                return [];
            }
        } else {
            var key = match[1];
        }

        console.log(`[BAŞARILI] Anahtar Yakalandı: ${key}`);

        // --- VİDEOPARK SORGUSU ---
        const playerRes = await fetch(`https://videopark.top/titan/w/${key}`, {
            headers: { 'Referer': 'https://jetfilmizle.net/' }
        });

        const playerHtml = await playerRes.text();
        
        // _sd objesini yakala
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (!sdMatch) {
            console.error("[HATA-04] Oynatıcı sayfasında veri paketi yok.");
            return [];
        }

        const data = JSON.parse(sdMatch[1]);

        return [{
            name: "Titan-Power",
            url: data.stream_url,
            type: "hls",
            headers: {
                'Referer': 'https://videopark.top/',
                'User-Agent': 'Mozilla/5.0'
            }
        }];

    } catch (e) {
        console.error(`[KRİTİK HATA] ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
