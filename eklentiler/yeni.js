/**
 * JetFilmizle - Filtreli Titan Sökücü
 * Odak: Yanlış anahtar (jetfilmizle) yerine GERÇEK anahtarı yakalamak.
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

        // --- GELİŞMİŞ FİLTRELİ CIMBIZ ---
        // 'jetfilmizle' kelimesini ve 11 hane olmayanları otomatik eler.
        const allMatches = html.matchAll(/(?:titan|ttn)\/(?:w|p)\/([a-zA-Z0-9_-]{11})|["'](?:id|key|data-id|data-film-id)["']\s*[:=]\s*["']([a-zA-Z0-9_-]{11})["']/g);
        
        let key = null;
        for (const match of allMatches) {
            let tempKey = match[1] || match[2];
            // Eğer yakalanan şey 'jetfilmizle' ise veya sayıdan ibaretse pas geç, gerçeğini ara
            if (tempKey && tempKey.toLowerCase() !== 'jetfilmizle' && tempKey.length === 11) {
                key = tempKey;
                break; 
            }
        }

        // Eğer hala bulunamadıysa iframe src'lerine daha dikkatli bak
        if (!key) {
            const iframeMatch = html.match(/iframe[^>]+src="[^"]+(?:titan|ttn)\/(?:w|p)\/([a-zA-Z0-9_-]{11})/);
            if (iframeMatch) key = iframeMatch[1];
        }

        if (!key) {
            console.error(`[HATA-02] Gerçek anahtar bulunamadı. Filtreye takılmış olabilir.`);
            return [];
        }

        console.log(`[BİLGİ] Gerçek Anahtar Yakalandı: ${key}`);

        // --- VİDEOPARK SORGUSU ---
        const playerUrl = `https://videopark.top/titan/w/${key}`;
        const playerRes = await fetch(playerUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Referer': targetUrl,
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const playerHtml = await playerRes.text();
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (sdMatch) {
            const data = JSON.parse(sdMatch[1]);
            return [{
                name: "Titan-Fixed",
                url: data.stream_url,
                type: "hls",
                subtitles: data.subtitles ? data.subtitles.map(s => ({
                    url: s.file,
                    language: s.label,
                    format: "vtt"
                })) : [],
                headers: {
                    'Referer': 'https://videopark.top/',
                    'User-Agent': 'Mozilla/5.0'
                }
            }];
        }

        console.error(`[HATA-04] Link sökülemedi! Anahtar: ${key} | Yanıt: ${playerHtml.substring(0, 50)}`);
        return [];

    } catch (e) {
        console.error(`[KRİTİK] ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
