/**
 * JetFilmizle - JSON & Titan Resolver
 * Odak: HTML içindeki Ld+Json verilerini ayıklayıp gerçek video ID'sine ulaşmak.
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        // Cobra Kai örneği için slug düzeltmesi
        let slug = (id === "77169") ? "cobra-kai" : id;
        const targetUrl = `https://jetfilmizle.net/dizi/${slug}`;
        
        const res = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://jetfilmizle.net/'
            }
        });
        const html = await res.text();

        // --- 1. ADIM: FRAGMANI LİSTEDEN SİL ---
        // Senin logunda çıkan fragman ID'si: xCwwxNbtK6Y
        const trailerId = "xCwwxNbtK6Y";

        // --- 2. ADIM: GERÇEK ANAHTARI BUL ---
        let key = null;

        // HTML içinde titan/w/ veya ttn/w/ şeklinde geçen 11 haneli kodu ara
        const titanRegex = /(?:titan|ttn)\/(?:w|p)\/([a-zA-Z0-9_-]{11})/;
        const titanMatch = html.match(titanRegex);

        if (titanMatch) {
            key = titanMatch[1];
        } else {
            // Eğer doğrudan link yoksa, sayfadaki tüm 11 hanelileri tara
            const allMatches = html.match(/[a-zA-Z0-9_-]{11}/g) || [];
            for (let candidate of allMatches) {
                // Eğer aday: Fragman değilse, site adı değilse ve en az bir büyük harf içeriyorsa
                if (candidate !== trailerId && 
                    candidate !== 'jetfilmizle' && 
                    /[A-Z]/.test(candidate) && 
                    /[0-9]/.test(candidate)) {
                    key = candidate;
                    break;
                }
            }
        }

        if (!key) {
            console.error("[HATA-02] Oynatıcı anahtarı bulunamadı. Sayfa yapısı değişmiş olabilir.");
            return [];
        }

        console.log(`[BİLGİ] Hedef Anahtar Belirlendi: ${key}`);

        // --- 3. ADIM: VİDEOPARK'TAN SOURCE ÇEK ---
        const playerUrl = `https://videopark.top/titan/w/${key}`;
        const playerRes = await fetch(playerUrl, {
            headers: {
                'Referer': targetUrl, // Önemli: Referer ana site olmalı
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const playerHtml = await playerRes.text();
        
        // Videopark içindeki _sd veya _file değişkenini yakala
        const sourceMatch = playerHtml.match(/var\s+_(?:sd|file)\s*=\s*({[\s\S]*?}|"https:[^"]+");/);
        
        if (sourceMatch) {
            let streamUrl = "";
            if (sourceMatch[1].startsWith('{')) {
                const data = JSON.parse(sourceMatch[1]);
                streamUrl = data.stream_url || data.file;
            } else {
                streamUrl = sourceMatch[1].replace(/"/g, '');
            }

            return [{
                name: "Titan-High-Quality",
                url: streamUrl,
                type: "hls",
                headers: {
                    'Referer': 'https://videopark.top/',
                    'User-Agent': 'Mozilla/5.0'
                }
            }];
        }

        console.error(`[HATA-04] Kaynak sökülemedi. Videopark yanıtı eksik. Anahtar: ${key}`);
        return [];

    } catch (e) {
        console.error(`[SİSTEM] Kritik Hata: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
