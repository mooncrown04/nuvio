/**
 * JetFilmizle - Titan Debugger
 * Odak: HATA-04 anında yakalanan anahtarı ve sayfa durumunu görmek.
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

        const patterns = [
            /(?:titan|ttn)\/(?:w|p)\/([a-zA-Z0-9_-]{11})/,
            /["'](?:id|key|data-id|data-film-id)["']\s*[:=]\s*["']([a-zA-Z0-9_-]{11})["']/,
            /\/([a-zA-Z0-9_-]{11})(?:["']|\?|&)/
        ];

        let key = null;
        for (let pattern of patterns) {
            const match = html.match(pattern);
            if (match) {
                key = match[1];
                break; 
            }
        }

        if (!key) {
            console.error(`[HATA-02] Anahtar bulunamadı. Sayfa: ${targetUrl}`);
            return [];
        }

        // --- ANAHTAR TEŞHİSİ ---
        console.log(`[BİLGİ] Yakalanan Anahtar: ${key}`);

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
        const directM3u8 = playerHtml.match(/["'](http[^"']+\.m3u8[^"']*)["']/);

        let finalUrl = null;
        if (sdMatch) {
            const data = JSON.parse(sdMatch[1]);
            finalUrl = data.stream_url;
        } else if (directM3u8) {
            finalUrl = directM3u8[1];
        }

        if (!finalUrl) {
            // HATA-04 BURADA: Hem anahtarı hem de Videopark'ın verdiği tepkiyi logluyoruz.
            console.error(`[HATA-04] Link sökülemedi! Kullanılan Anahtar: ${key} | Videopark Yanıt Başlangıcı: ${playerHtml.substring(0, 80).replace(/\n/g, '')}`);
            return [];
        }

        return [{
            name: "Titan-Debug",
            url: finalUrl,
            type: "hls",
            headers: {
                'Referer': 'https://videopark.top/',
                'User-Agent': 'Mozilla/5.0'
            }
        }];

    } catch (e) {
        console.error(`[KRİTİK] ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
