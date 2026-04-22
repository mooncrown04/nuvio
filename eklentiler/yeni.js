/**
 * JetFilmizle - Titan Resolver
 * Odak Noktası: HATA-01 (Yanlış URL) ve HATA-02 (Yanlış Regex) düzeltmeleri.
 */

async function getStreams(id, mediaType, season, episode) {
    // id: Artık '77169' değil, 'cobra-kai' (slug) olarak gelmeli.
    if (mediaType !== 'tv') return [];

    try {
        // --- ADIM 1: DOĞRU URL YAPISI ---
        // URL'yi senin verdiğin örneğe göre (https://jetfilmizle.net/dizi/cobra-kai) güncelledim.
        // Eğer her bölüm için ayrı URL gerekiyorsa 'sezon-x/bolum-x' eklenir.
        const url = `https://jetfilmizle.net/dizi/${id}/sezon-${season}/bolum-${episode}`;
        
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (!res.ok) {
            // Eğer hala bu hatayı alıyorsan id (slug) kısmında bir uyumsuzluk vardır.
            console.error(`[HATA-01] Sayfa bulunamadı (404). Gidilen URL: ${url}`);
            return [];
        }

        const html = await res.text();

        // --- ADIM 2: ANAHTAR YAKALAMA (TITAN W) ---
        // Cobra-kai sayfa kaynağında "titan/w/XXXXXXXXXXX" yapısını cımbızla çekiyoruz.
        // Regex'i daha kapsayıcı hale getirdim.
        const match = html.match(/titan\/w\/([a-zA-Z0-9]{11})/);
        
        if (!match) {
            console.error("[HATA-02] Sayfaya girildi ama 'titan/w/' kodu bulunamadı.");
            return [];
        }

        const key = match[1];
        console.log(`[BİLGİ] Anahtar Yakalandı: ${key}`);

        // --- ADIM 3: VIDEOPARK SORGUSU ---
        const playerRes = await fetch(`https://videopark.top/titan/w/${key}`, {
            headers: { 
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        if (!playerRes.ok) {
            console.error(`[HATA-03] Titan sunucusu yanıt vermedi. Kod: ${playerRes.status}`);
            return [];
        }

        const playerHtml = await playerRes.text();

        // --- ADIM 4: _SD OBJESİNİ AYIKLAMA ---
        // Video linkinin olduğu JSON paketini çekiyoruz.
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (!sdMatch) {
            console.error("[HATA-04] Oynatıcı açıldı ama _sd verisi bulunamadı.");
            return [];
        }

        const data = JSON.parse(sdMatch[1]);
        
        if (!data.stream_url) {
            console.error("[HATA-05] Video linki boş döndü.");
            return [];
        }

        return [{
            name: "Jet-Titan",
            url: data.stream_url,
            type: "hls",
            headers: {
                'Referer': 'https://videopark.top/',
                'User-Agent': 'Mozilla/5.0'
            }
        }];

    } catch (e) {
        console.error(`[HATA-SİSTEM] Kodda teknik arıza: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
