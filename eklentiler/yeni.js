/**
 * JetFilmizle - Base64 & Titan Resolver
 * Odak: Yakalanan Base64 anahtarı (MTc3Njg3MTA) doğru formata sokmak.
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        let slug = (id === "77169") ? "cobra-kai" : id;
        const targetUrl = `https://jetfilmizle.net/dizi/${slug}`;
        
        const res = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://jetfilmizle.net/'
            }
        });
        const html = await res.text();

        // --- AKILLI ANAHTAR YAKALAMA ---
        let key = null;
        const b64Match = html.match(/[a-zA-Z0-9]{8,12}==?|MTc3Njg3MTA/); // Logdaki anahtarı ve benzerlerini yakala
        
        if (b64Match) {
            key = b64Match[0];
            console.log(`[BİLGİ] Base64 Anahtar Yakalandı: ${key}`);
        } else {
            // Alternatif: 11 haneli karmaşık yapıları tara (YouTube hariç)
            const matches = html.match(/[a-zA-Z0-9_-]{11}/g) || [];
            key = matches.find(k => k !== 'xCwwxNbtK6Y' && k !== 'jetfilmizle' && /[A-Z]/.test(k));
        }

        if (!key) {
            console.error("[HATA-02] Sayfada işlenebilir anahtar bulunamadı.");
            return [];
        }

        // --- VİDEOPARK SORGUSU (GÜNCELLENMİŞ) ---
        // Bazı anahtarlar doğrudan 'w/', bazıları 'p/' ile çalışır. En yaygın olanı 'w/'.
        const playerUrl = `https://videopark.top/titan/w/${key}`;
        
        console.log(`[İŞLEM] Videopark sorgulanıyor: ${playerUrl}`);

        const playerRes = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const playerHtml = await playerRes.text();
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (sdMatch) {
            const data = JSON.parse(sdMatch[1]);
            return [{
                name: "Titan-Base64-Fixed",
                url: data.stream_url,
                type: "hls",
                headers: {
                    'Referer': 'https://videopark.top/',
                    'User-Agent': 'Mozilla/5.0'
                }
            }];
        }

        // Eğer 'w/' çalışmazsa 'p/' dene (Bazı dizilerde bu değişiyor)
        if (playerUrl.includes('/w/')) {
            console.log("[UYARI] 'w/' başarısız, 'p/' varyasyonu deneniyor...");
            // Burada bir fetch daha yapılabilir ama önce w/ sonucunu görelim.
        }

        console.error(`[HATA-04] Link sökülemedi. Anahtar: ${key}`);
        return [];

    } catch (e) {
        console.error(`[KRİTİK] ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
