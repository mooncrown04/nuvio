/**
 * JetFilmizle - Analytics & Trap Bypass
 * Odak: G- ile başlayan Analytics kodlarını ve YouTube fragmanlarını elemek.
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

        // --- TUZAKLARI ELE ---
        const forbiddenKeys = [
            'G-P2W3FQ2F7', // Senin logdaki Analytics kodu
            'xCwwxNbtK6Y', // Fragman kodu
            'jetfilmizle'
        ];

        let key = null;

        // 1. ÖNCELİK: Sayfa içinde videopark/titan linkini doğrudan ara (En güvenli yol)
        const directLinkMatch = html.match(/videopark\.top\/titan\/(?:w|p)\/([a-zA-Z0-9_-]{11,12})/);
        if (directLinkMatch) {
            key = directLinkMatch[1];
        } 

        // 2. ÖNCELİK: Eğer link yoksa, 11-12 haneli karışık kodları tara ama tuzakları filtrele
        if (!key) {
            const potentialKeys = html.match(/[a-zA-Z0-9_-]{11,12}/g) || [];
            for (let k of potentialKeys) {
                // Filtre: Yasaklı listede olmasın VE "G-" ile başlamasın (Analytics engeli)
                if (!forbiddenKeys.includes(k) && !k.startsWith('G-')) {
                    // Ve gerçek bir anahtar gibi hem harf hem rakam içersin
                    if (/[a-zA-Z]/.test(k) && /[0-9]/.test(k)) {
                        key = k;
                        break;
                    }
                }
            }
        }

        if (!key) {
            console.error("[HATA-02] Gerçek video anahtarı bulunamadı.");
            return [];
        }

        console.log(`[BİLGİ] Doğru Anahtar Filtrelendi: ${key}`);

        // --- VİDEOPARK SORGUSU ---
        const playerUrl = `https://videopark.top/titan/w/${key}`;
        const playerRes = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        const playerHtml = await playerRes.text();
        
        // Videopark'tan gelen stream verisini ayıkla
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
                name: "Titan-Secure-Server",
                url: streamUrl,
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
        console.error(`[SİSTEM] Hata: ${e.message}`);
        return [];
    }
}

module.exports = { getStreams };
