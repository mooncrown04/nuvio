/**
 * JetFilmizle - Deep Scan & Iframe Resolver
 * Odak: Sayfa içindeki tüm gizli iframe ve data-src linklerini taramak.
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

        // --- 1. ADIM: SAYFADAKİ TÜM VİDEOPARK LİNKLERİNİ AYIKLA ---
        // Sadece anahtarı değil, linkin tamamını yakalamaya çalışıyoruz.
        const linkRegex = /(?:https?:)?\/\/videopark\.top\/(?:titan|ttn)\/(?:w|p)\/[a-zA-Z0-9_-]{8,20}/g;
        const foundLinks = html.match(linkRegex) || [];
        
        let finalPlayerUrl = "";

        if (foundLinks.length > 0) {
            // En uzun olan link genellikle doğru olandır (analytics veya tracker değildir)
            finalPlayerUrl = foundLinks.sort((a, b) => b.length - a.length)[0];
            if (!finalPlayerUrl.startsWith('http')) finalPlayerUrl = 'https:' + finalPlayerUrl;
            console.log(`[BİLGİ] Doğrudan Link Yakalandı: ${finalPlayerUrl}`);
        } else {
            // Eğer tam link yoksa, 12 haneli anahtarı (05b44f317d2a) "v" parametresiyle deneyelim
            // Bazı yeni player'lar titan/v/ kullanıyor.
            const keyMatch = html.match(/[a-f0-9]{12}/);
            if (keyMatch) {
                finalPlayerUrl = `https://videopark.top/titan/v/${keyMatch[0]}`;
                console.log(`[BİLGİ] Anahtar 'v' parametresiyle deneniyor: ${finalPlayerUrl}`);
            }
        }

        if (!finalPlayerUrl) {
            console.error("[HATA-02] Player URL bulunamadı.");
            return [];
        }

        // --- 2. ADIM: VİDEOPARK'TAN KAYNAĞI ÇEK ---
        const playerRes = await fetch(finalPlayerUrl, {
            headers: {
                'Referer': targetUrl,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const playerHtml = await playerRes.text();
        
        // Videopark'ın meşhur değişkenlerini tara (_file, _sd, _v, _m3u8)
        const sourceMatch = playerHtml.match(/var\s+_(?:file|sd|v|m3u8)\s*=\s*({[\s\S]*?}|"https:[^"]+");/);
        
        if (sourceMatch) {
            let streamUrl = "";
            let matchContent = sourceMatch[1];

            if (matchContent.startsWith('{')) {
                const data = JSON.parse(matchContent);
                streamUrl = data.stream_url || data.file || data.url;
            } else {
                streamUrl = matchContent.replace(/"/g, '');
            }

            if (streamUrl) {
                return [{
                    name: "Videopark-V3",
                    url: streamUrl,
                    type: "hls",
                    headers: {
                        'Referer': 'https://videopark.top/',
                        'User-Agent': 'Mozilla/5.0'
                    }
                }];
            }
        }

        // --- 3. ADIM: EĞER HALA BULAMADIYSAK (DEBUG) ---
        console.error(`[HATA-04] Kaynak sökülemedi. URL: ${finalPlayerUrl}`);
        // Loglara Videopark'tan ne döndüğünü kısaca bas (Sadece ilk 100 karakter)
        console.log(`[DEBUG] Videopark Yanıtı: ${playerHtml.substring(0, 100)}`);
        
        return [];

    } catch (e) {
        console.error(`[SİSTEM] Hata: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
