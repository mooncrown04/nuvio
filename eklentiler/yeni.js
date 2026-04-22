/**
 * JetFilmizle - Universal Titan Resolver (Tam Otomatik)
 * Bu kod, sayfa kaynağından 11 haneli anahtarı otomatik olarak çeker.
 */

var BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    // Sadece TV dizileri için çalışır, film ise boş döner
    if (mediaType !== 'tv') return [];

    try {
        // --- 1. ADIM: Dizi Sayfasına Gidiş ---
        // 'id' burada dizinin slug adıdır (örneğin: cobra-kai)
        const targetUrl = `${BASE_URL}/dizi/${id}/sezon-${season}/bolum-${episode}`;
        console.log(`[İŞLEM] Sayfaya gidiliyor: ${targetUrl}`);

        const pageRes = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });

        if (!pageRes.ok) {
            console.error(`[HATA-01] Dizi sayfasına ulaşılamadı. Durum: ${pageRes.status}`);
            return [];
        }

        const html = await pageRes.text();

        // --- 2. ADIM: ANAHTARIN BULUNDUĞU YER (REGEX) ---
        // Senin attığın cobra-kai.js dosyasındaki "titan/w/XXXXXXXXXXX" yapısını arar.
        // Buradaki parantez içindeki kısım bizim 11 haneli anahtarımızdır.
        const keyMatch = html.match(/titan\/w\/([a-zA-Z0-9_-]{11})/);

        if (!keyMatch || !keyMatch[1]) {
            console.error("[HATA-02] 'Aha burada' dediğimiz 11 haneli anahtar sayfada bulunamadı!");
            return [];
        }

        const finalKey = keyMatch[1];
        console.log(`[BAŞARILI] Giriş Anahtarı Yakalandı: ${finalKey}`);

        // --- 3. ADIM: VİDEOPARK/TITAN ÜZERİNDEN VERİ ÇEKME ---
        const playerUrl = `https://videopark.top/titan/w/${finalKey}`;
        
        const response = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        if (!response.ok) {
            console.error("[HATA-03] Titan oynatıcı sayfası yanıt vermedi.");
            return [];
        }

        const playerHtml = await response.text();

        // --- 4. ADIM: _SD OBJESİNİ AYIKLAMA ---
        // Senin dün üzerinde çalıştığın, içinde stream_url olan JSON verisi.
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (!sdMatch) {
            console.error("[HATA-04] _sd objesi (video verileri) bulunamadı.");
            return [];
        }

        const data = JSON.parse(sdMatch[1]);
        const streamUrl = data.stream_url;

        if (!streamUrl) {
            console.error("[HATA-05] _sd bulundu ama içinde stream_url yok.");
            return [];
        }

        // --- SONUÇ: OYNATICIYA GÖNDERME ---
        console.log("[TAMAMLANDI] Video linki başarıyla oluşturuldu.");

        return [{
            name: "Jet-Titan (Otomatik)",
            url: streamUrl,
            type: "hls", // Genelde m3u8 formatında döner
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
        console.error(`[KRİTİK HATA] Sistem durdu: ${err.message}`);
        return [];
    }
}

// Modül olarak dışa aktar (Cloudstream/Nuvio uyumu için)
module.exports = { getStreams };
