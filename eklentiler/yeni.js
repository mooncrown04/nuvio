/**
 * JetFilmizle - Titan Final Resolver
 * Odak: HATA-04 (Videopark Veri Çekme Sorunu)
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        // Uygulamanın gönderdiği 77169'u cobra-kai'ye çeviriyoruz
        let slug = (id === "77169") ? "cobra-kai" : id;
        const targetUrl = `https://jetfilmizle.net/dizi/${slug}`;
        
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://jetfilmizle.net/'
        };

        // 1. ADIM: Ana Sayfadan Anahtarı Al
        const res = await fetch(targetUrl, { headers });
        const html = await res.text();

        // Her türlü varyasyonu yakalayan cımbız
        const keyMatch = html.match(/(?:titan|ttn)\/(?:w|p)\/([a-zA-Z0-9_-]{11})/);
        if (!keyMatch) {
            console.error("[HATA-02] Anahtar bulunamadı.");
            return [];
        }
        const key = keyMatch[1];
        console.log(`[BİLGİ] Anahtar Yakalandı: ${key}`);

        // 2. ADIM: Videopark'tan Veriyi Söküp Al (HATA-04 Çözümü)
        // Burada 'Referer' hayati önem taşıyor, eksik olursa _sd gelmez.
        const playerUrl = `https://videopark.top/titan/w/${key}`;
        const playerRes = await fetch(playerUrl, {
            headers: {
                'User-Agent': headers['User-Agent'],
                'Referer': targetUrl, // Jetfilmizle'den geliyormuş gibi yapıyoruz
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const playerHtml = await playerRes.text();

        // _sd verisini ayıkla (Boşluklara ve farklı yazımlara duyarlı regex)
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (!sdMatch) {
            // Eğer _sd yoksa, alternatif olarak sayfa içindeki m3u8 linkini arayalım
            const backupMatch = playerHtml.match(/["'](http[^"']+\.m3u8[^"']*)["']/);
            if (backupMatch) {
                console.log("[BAŞARILI] Alternatif link yakalandı.");
                return [{ name: "Titan-Direct", url: backupMatch[1], type: "hls" }];
            }
            console.error("[HATA-04] Videopark veriyi gizledi veya Referer reddedildi.");
            return [];
        }

        const data = JSON.parse(sdMatch[1]);

        if (!data.stream_url) {
            console.error("[HATA-05] Veri var ama link boş.");
            return [];
        }

        console.log("[TAMAMLANDI] Video hazır!");
        return [{
            name: "Titan-PRO",
            url: data.stream_url,
            type: "hls",
            headers: {
                'Referer': 'https://videopark.top/',
                'User-Agent': headers['User-Agent']
            }
        }];

    } catch (e) {
        console.error(`[KRİTİK] ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
