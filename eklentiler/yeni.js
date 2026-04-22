/**
 * JetFilmizle - Titan Otomatik Çözücü
 * Odak: Sayfa kaynağındaki 11 haneli anahtarı bulmak ve videoyu getirmek.
 */

async function getStreams(id, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        // --- ADIM 1: SAYFAYA ERİŞİM ---
        const url = `https://jetfilmizle.net/dizi/${id}/sezon-${season}/bolum-${episode}`;
        const res = await fetch(url);
        
        if (!res.ok) {
            console.error(`[HATA-01] Siteye girilemedi. URL: ${url}`);
            return [];
        }

        const html = await res.text();

        // --- ADIM 2: ANAHTAR YAKALAMA (KRİTİK) ---
        // Sayfa içinde "titan/w/kod" yapısını arar.
        const match = html.match(/titan\/w\/([a-zA-Z0-9_-]{11})/);
        
        if (!match) {
            console.error("[HATA-02] Kod bulunamadı! Sayfa yapısı değişmiş olabilir.");
            return [];
        }

        const key = match[1];
        console.log(`[BİLGİ] Anahtar bulundu: ${key}`);

        // --- ADIM 3: VİDEOPARK SORGUSU ---
        const playerRes = await fetch(`https://videopark.top/titan/w/${key}`, {
            headers: { 'Referer': 'https://jetfilmizle.net/' }
        });

        if (!playerRes.ok) {
            console.error("[HATA-03] Videopark sayfası açılmıyor.");
            return [];
        }

        const playerHtml = await playerRes.text();

        // --- ADIM 4: VERİ AYIKLAMA ---
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (!sdMatch) {
            console.error("[HATA-04] Video verisi (_sd) sayfa içinde yok.");
            return [];
        }

        const data = JSON.parse(sdMatch[1]);
        
        if (!data.stream_url) {
            console.error("[HATA-05] _sd objesi geldi ama içinde video linki yok.");
            return [];
        }

        // --- BAŞARILI SONUÇ ---
        console.log("[BAŞARILI] Video linki alındı.");
        return [{
            name: "Titan-Auto",
            url: data.stream_url,
            type: "hls",
            headers: {
                'Referer': 'https://videopark.top/',
                'User-Agent': 'Mozilla/5.0'
            }
        }];

    } catch (e) {
        console.error(`[HATA-SİSTEM] Beklenmedik hata: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
