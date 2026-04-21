/**
 * JetFilmizle - Nuvio Provider (Hybrid API Mode)
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    const url = `${BASE_URL}/dizi/cobra-kai`;

    console.error(`[DEBUG] Başlatıldı: S${s} E${e}`);

    try {
        const response = await fetch(url);
        const html = await response.text();

        // 1. Index'i bul
        const btnRegex = new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`, 'i');
        const btnMatch = html.match(btnRegex);
        
        if (!btnMatch) {
            console.error('[DEBUG] Buton bulunamadı.');
            return [];
        }

        const sourceIndex = btnMatch[1];
        const apiUrl = `${BASE_URL}/ajax/get-player?index=${sourceIndex}`;
        console.error(`[DEBUG] API Sorgusu Gönderiliyor: ${apiUrl}`);

        // 2. API'den veriyi TEXT olarak çek (JSON hatasını önlemek için)
        const apiRes = await fetch(apiUrl, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': url,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });

        const apiRaw = await apiRes.text();
        console.error(`[DEBUG] API'den Gelen Ham Yanıt: ${apiRaw.substring(0, 100)}...`);

        // 3. Yanıtın içindeki linki ayıkla (Hem JSON hem HTML ihtimaline karşı)
        let videoUrl = "";
        
        // Eğer yanıt JSON ise:
        try {
            const j = JSON.parse(apiRaw);
            videoUrl = j.link || j.url || j.video || "";
        } catch(e) {
            // Eğer yanıt HTML ise içindeki ilk linki bulmaya çalış:
            const linkMatch = apiRaw.match(/https?:\/\/[^"'\s]+/i);
            if (linkMatch) videoUrl = linkMatch[0];
        }

        if (videoUrl) {
            // Base64 Kontrolü
            if (!videoUrl.startsWith('http')) {
                try { videoUrl = atob(videoUrl); } catch(e) {}
            }

            console.error(`[DEBUG] Final Link: ${videoUrl}`);
            return [{
                name: "JetFilmizle",
                title: `S${s} E${e} (ID: ${sourceIndex})`,
                url: videoUrl,
                type: "embed"
            }];
        }

        console.error('[DEBUG] API yanıtında link bulunamadı.');
        return [];

    } catch (err) {
        console.error(`[DEBUG] Kritik Hata: ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
