/**
 * JetFilmizle - Otomatik Titan Çözücü
 * Amacımız: Sayfa kaynağındaki 11 haneli gizli anahtarı bulup videoyu oynatmak.
 */

var BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    // Sadece TV dizileri için çalışır
    if (mediaType !== 'tv') return [];

    try {
        // --- ADIM 1: Dizi Sayfasına Bağlanma ---
        // Örn: https://jetfilmizle.net/dizi/cobra-kai/sezon-1/bolum-1
        // Not: 'slug' kısmını eklentinin kendi sisteminden aldığını varsayıyoruz.
        const targetUrl = `${BASE_URL}/dizi/${id}/sezon-${season}/bolum-${episode}`;
        
        const pageRes = await fetch(targetUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
        });

        if (!pageRes.ok) {
            console.error(`[HATA-01] Dizi sayfasına ulaşılamadı. Durum: ${pageRes.status}`);
            return [];
        }

        const html = await pageRes.text();

        // --- ADIM 2: GİZLİ ANAHTARI BULMA (EN ÖNEMLİ YER) ---
        // Sayfa kaynağında (senin attığın cobra-kai.js gibi) titan/w/ kalıbını arar.
        // Bu "Aha burada!" dediğimiz 11 haneli kodu yakalayan kısımdır.
        const keyMatch = html.match(/titan\/w\/([a-zA-Z0-9_-]{11})/);
        
        if (!keyMatch || !keyMatch[1]) {
            console.error("[HATA-02] Sayfa kaynağında 11 haneli Titan anahtarı bulunamadı!");
            return [];
        }

        const finalKey = keyMatch[1];
        console.log(`[BAŞARILI] Giriş Anahtarı Yakalandı: ${finalKey}`);

        // --- ADIM 3: VİDEOPARK SİSTEMİNE GİRİŞ ---
        const playerUrl = `https://videopark.top/titan/w/${finalKey}`;
        
        const response = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        
        if (!response.ok) {
            console.error("[HATA-03] Videopark oynatıcı sayfasına girilemedi.");
            return [];
        }

        const playerHtml = await response.text();

        // --- ADIM 4: _SD OBJESİNİ ÇÖZME ---
        // Senin dün üzerinde çalıştığın, video linklerini içeren JSON objesi.
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (!sdMatch) {
            console.error("[HATA-04] Oynatıcı sayfasında '_sd' veri objesi bulunamadı.");
            return [];
        }

        const data = JSON.parse(sdMatch[1]);
        const streamUrl = data.stream_url;

        if (!streamUrl) {
            console.error("[HATA-05] _sd objesi var ama içinde video linki (stream_url) yok.");
            return [];
        }

        // --- SONUÇ: VERİYİ NUVIO/PLAYER FORMATINA GÖNDERME ---
        console.log("[TAMAMLANDI] Video linki başarıyla hazırlandı.");
        
        return [{
            name: "Jet-Titan (Auto)",
            url: streamUrl,
            type: "hls",
            subtitles: data.subtitles ? data.subtitles.map(s => ({
                url: s.file,
                language: s.label,
                format: "vtt"
            })) : [],
            headers: {
                'Referer': 'https://videopark.top/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        }];

    } catch (err) {
        console.error(`[KRİTİK HATA] Beklenmedik bir sorun oluştu: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
