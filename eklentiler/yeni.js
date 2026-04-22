/**
 * JetFilmizle - Kesin Çözüm (Anti-Fragman)
 * Odak: YouTube fragmanlarını atlayıp gerçek Titan anahtarını sökme.
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        let slug = (id === "77169") ? "cobra-kai" : id;
        const targetUrl = `https://jetfilmizle.net/dizi/${slug}`;
        
        console.log(`[İŞLEM] Sayfa Taranıyor: ${targetUrl}`);

        const res = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://jetfilmizle.net/'
            }
        });
        const html = await res.text();

        // --- GELİŞMİŞ AYIKLAMA ---
        let key = null;

        // 1. Strateji: Titan/TTN linklerini ara (Fragmanlar youtube.com/embed/ kullanır)
        const titanMatch = html.match(/(?:titan|ttn)\/(?:w|p)\/([a-zA-Z0-9_-]{11})/);
        if (titanMatch) {
            key = titanMatch[1];
        }

        // 2. Strateji: Eğer titan linki yoksa, sayfadaki tüm 11 hanelileri tara ama fragmanı (xCwwxNbtK6Y) ele
        if (!key) {
            const matches = html.match(/[a-zA-Z0-9_-]{11}/g) || [];
            const youtubeKey = "xCwwxNbtK6Y"; // Senin logda yakaladığın fragman kodu
            
            for (let k of matches) {
                // Eğer yakalanan şey: Fragman değilse VE 'jetfilmizle' değilse VE karışık harf/rakam içeriyorsa
                if (k !== youtubeKey && k !== 'jetfilmizle' && /[a-z]/.test(k) && /[A-Z]/.test(k) && /[0-9]/.test(k)) {
                    key = k;
                    break;
                }
            }
        }

        if (!key) {
            console.error("[HATA-02] Fragman harici gerçek anahtar bulunamadı.");
            return [];
        }

        console.log(`[BİLGİ] Gerçek Anahtar Bulundu: ${key}`);

        // --- VİDEOPARK SORGUSU ---
        const playerUrl = `https://videopark.top/titan/w/${key}`;
        const playerRes = await fetch(playerUrl, {
            headers: {
                'Referer': targetUrl,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const playerHtml = await playerRes.text();
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (sdMatch) {
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
        }

        console.error(`[HATA-04] Link sökülemedi. Anahtar: ${key}`);
        return [];

    } catch (e) {
        console.error(`[KRİTİK] ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
