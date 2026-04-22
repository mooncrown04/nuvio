/**
 * JetFilmizle - Full Spectrum Resolver
 * Odak: HATA-02 (Gizli değişken içindeki anahtarı yakalamak)
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        // Cobra Kai için slug düzeltmesi (HATA-01 engelleyici)
        let slug = (id === "77169") ? "cobra-kai" : id;
        const targetUrl = `https://jetfilmizle.net/dizi/${slug}`;
        
        console.log(`[İŞLEM] Sayfa taranıyor: ${targetUrl}`);

        const res = await fetch(targetUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'text/html'
            }
        });
        
        const html = await res.text();

        // --- GELİŞMİŞ "HER ŞEYİ YAKALA" CIMBIZI ---
        // 1. Titan formatı: titan/w/XXXXX
        // 2. Ttn formatı: ttn/w/XXXXX veya ttn/p/XXXXX
        // 3. Tırnak içindeki bağımsız 11 haneli yapılar (data-id="XXXXX" veya id: 'XXXXX')
        const keyRegex = /(?:titan|ttn)\/(?:w|p)\/([a-zA-Z0-9_-]{11})|["'](?:id|key|data-id)["']\s*[:=]\s*["']([a-zA-Z0-9_-]{11})["']/;
        
        const match = html.match(keyRegex);
        let key = null;

        if (match) {
            // Regex'teki gruplardan hangisi doluysa onu al (1. grup veya 2. grup)
            key = match[1] || match[2];
        }

        // Eğer hala bulunamadıysa manuel bir arama daha (son çare)
        if (!key) {
            const lastChance = html.match(/\/([a-zA-Z0-9_-]{11})["']/);
            if (lastChance) key = lastChance[1];
        }

        if (!key) {
            console.error("[HATA-02] Sayfada 11 haneli anahtar bulunamadı. Sayfa içeriği kısıtlı olabilir.");
            return [];
        }

        console.log(`[BAŞARILI] Anahtar Bulundu: ${key}`);

        // --- VİDEOPARK SORGUSU ---
        const playerRes = await fetch(`https://videopark.top/titan/w/${key}`, {
            headers: { 
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0'
            }
        });

        const playerHtml = await playerRes.text();
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (!sdMatch) {
            console.error("[HATA-04] Oynatıcı sayfasında _sd verisi yok.");
            return [];
        }

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

    } catch (e) {
        console.error(`[KRİTİK HATA] ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
