/**
 * JetFilmizle - Ultra Resolver
 * Odak: HATA-02 (Cımbızın kaçırdığı gizli anahtarlar)
 */

async function getStreams(id, mediaType, season, episode) {
    try {
        // ID 77169 ise cobra-kai yap, değilse id'yi olduğu gibi kullan
        let slug = (id === "77169") ? "cobra-kai" : id;
        
        // Uygulamanın bizi getirdiği o meşhur anahtar sayfası
        const targetUrl = `https://jetfilmizle.net/dizi/${slug}`;
        
        console.log(`[İŞLEM] Hedef sayfa kazınıyor: ${targetUrl}`);

        const res = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': 'https://jetfilmizle.net/',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
            }
        });

        const html = await res.text();

        // --- ULTRA AGRESİF CIMBIZ (REGEX) ---
        // 1. Klasik titan/w/ veya ttn/w/
        // 2. data-id, data-key veya player-id içindeki 11 haneler
        // 3. Iframe src içindeki 11 haneler
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
            // Eğer hala bulunamadıysa, sayfa içeriğinin ilk 100 karakterini logla (Bot engeli var mı bakmak için)
            console.error(`[HATA-02] Anahtar yok. Sayfa başı: ${html.substring(0, 100).replace(/\n/g, '')}`);
            return [];
        }

        console.log(`[BİLGİ] Anahtar ele geçirildi: ${key}`);

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
        
        // _sd objesini veya doğrudan m3u8 linkini ara
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
            console.error("[HATA-04] Oynatıcıdan link sökülemedi.");
            return [];
        }

        return [{
            name: "Titan-Ultra",
            url: finalUrl,
            type: "hls",
            headers: {
                'Referer': 'https://videopark.top/',
                'User-Agent': 'Mozilla/5.0'
            }
        }];

    } catch (e) {
        console.error(`[KRİTİK] Sistem hatası: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
