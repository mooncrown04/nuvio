/**
 * JetFilmizle - Deep Scraper
 * Odak: Sayfada gizlenen, düz metin olmayan anahtarı yakalamak.
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

        // --- ULTRA AGRESİF TARAMA ---
        // Sadece titan/w/ değil, her türlü 11 haneli rastgele dizilimi ara.
        // Ama site adını (jetfilmizle) ve bilinen sabit kelimeleri ele.
        const potentialKeys = html.match(/[a-zA-Z0-9_-]{11}/g) || [];
        const forbidden = ['jetfilmizle', 'googleanal', 'description', 'viewport-fi'];
        
        let key = null;
        for (let k of potentialKeys) {
            // Basit filtre: İçinde hem büyük hem küçük harf veya rakam karışık olanları seç (Rastgelelik kontrolü)
            if (!forbidden.some(f => k.toLowerCase().includes(f)) && 
                /[a-z]/.test(k) && /[A-Z]/.test(k) && /[0-9]/.test(k)) {
                key = k;
                break;
            }
        }

        // Eğer hala yoksa iframe src'sini manuel parçala
        if (!key) {
            const iframeSrc = html.match(/iframe[^>]+src=["']([^"']+)["']/);
            if (iframeSrc && iframeSrc[1].includes('titan')) {
                const part = iframeSrc[1].split('/').pop();
                if (part.length === 11) key = part;
            }
        }

        if (!key) {
            console.error("[HATA-02] Anahtar hala gizli. Kaynak kodunda 11 haneli rastgele dizi yok.");
            return [];
        }

        console.log(`[BİLGİ] Bulunan Muhtemel Anahtar: ${key}`);

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
                name: "Titan-Universal",
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
        console.error(`[SİSTEM HATASI] ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
