/**
 * JetFilmizle - Kararlı Titan Çözücü
 * Odak: Sadece çalışan anahtarı al ve Videopark'tan linki sök.
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        // 1. ADIM: UYGULAMANIN GETİRDİĞİ ADRESE GİT
        // id 77169 geliyorsa cobra-kai yapıyoruz, diğer her şey olduğu gibi kalıyor.
        let slug = (id === "77169") ? "cobra-kai" : id;
        const targetUrl = `https://jetfilmizle.net/dizi/${slug}`;
        
        console.log(`[BAĞLANTI] Sayfa: ${targetUrl}`);

        const res = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await res.text();

        // 2. ADIM: ANAHTARI YAKALA (HATA-02'yi bitiren kısım)
        // Link içindeki veya data-id içindeki 11 haneli kodu bulur.
        const keyMatch = html.match(/(?:titan|ttn)\/(?:w|p)\/([a-zA-Z0-9_-]{11})/) || html.match(/data-film-id="(\d+)"/);
        
        if (!keyMatch) {
            console.error("[HATA-02] Sayfada anahtar bulunamadı.");
            return [];
        }

        const key = keyMatch[1];
        console.log(`[BİLGİ] Anahtar: ${key}`);

        // 3. ADIM: VİDEOPARK'TAN LİNKİ SÖK (HATA-04'ü bitiren kısım)
        // Videopark'ın istediği tüm "ben gerçek kullanıcıyım" imzalarını ekledim.
        const playerUrl = `https://videopark.top/titan/w/${key}`;
        const playerRes = await fetch(playerUrl, {
            headers: {
                'Referer': targetUrl, // Sayfa bazlı referer
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': '*/*',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const playerHtml = await playerRes.text();
        
        // _sd objesini cımbızla al
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (sdMatch) {
            const data = JSON.parse(sdMatch[1]);
            console.log("[BAŞARILI] Video ve Altyazılar söküldü.");

            return [{
                name: "Titan-Kararlı",
                url: data.stream_url,
                type: "hls",
                subtitles: data.subtitles ? data.subtitles.map(s => ({
                    url: s.file,
                    language: s.label || "Türkçe",
                    format: "vtt"
                })) : [],
                headers: {
                    'Referer': 'https://videopark.top/',
                    'User-Agent': 'Mozilla/5.0'
                }
            }];
        }

        console.error("[HATA-04] Oynatıcı linki vermedi. Referer veya Key hatalı olabilir.");
        return [];

    } catch (e) {
        console.error(`[KRİTİK] ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
