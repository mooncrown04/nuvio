/**
 * JetFilmizle - Saf Çözücü
 * Odak: Uygulamanın bizi getirdiği sayfadan direkt anahtarı çekmek.
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        // --- KRİTİK: URL OLUŞTURMAYI BIRAKIYORUZ ---
        // Uygulama seni zaten anahtarın olduğu sayfaya (Slug: cobra-kai vb.) getirdi.
        // Bu yüzden id parametresini direkt URL'nin kendisi olarak kabul ediyoruz.
        
        const targetUrl = `https://jetfilmizle.net/dizi/${id}`;
        
        console.log(`[İŞLEM] Uygulamanın getirdiği adresteyim: ${targetUrl}`);

        const res = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (!res.ok) {
            console.error(`[HATA-01] Bu sayfa açılmıyor: ${targetUrl}`);
            return [];
        }

        const html = await res.text();

        // --- ADIM 2: ANAHTARI ÇEK ---
        // Sayfada titan/w/ kodunu arıyoruz
        const match = html.match(/titan\/w\/([a-zA-Z0-9]{11})/);
        
        if (!match) {
            console.error("[HATA-02] Sayfa açıldı ama içinde titan kodu yok. Kaynağı kontrol et.");
            return [];
        }

        const key = match[1];
        console.log(`[BİLGİ] Anahtar yakalandı: ${key}`);

        // --- ADIM 3: VİDEOPARK SORGUSU ---
        const playerRes = await fetch(`https://videopark.top/titan/w/${key}`, {
            headers: { 'Referer': 'https://jetfilmizle.net/' }
        });

        const playerHtml = await playerRes.text();
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (!sdMatch) {
            console.error("[HATA-04] Oynatıcı sayfasında veri yok.");
            return [];
        }

        const data = JSON.parse(sdMatch[1]);

        return [{
            name: "Titan-Direkt",
            url: data.stream_url,
            type: "hls",
            headers: {
                'Referer': 'https://videopark.top/',
                'User-Agent': 'Mozilla/5.0'
            }
        }];

    } catch (e) {
        console.error(`[HATA-SİSTEM] Teknik hata: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
