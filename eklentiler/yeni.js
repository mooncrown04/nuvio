/**
 * JetFilmizle - Nuvio Provider (Token & POST Mode)
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    const url = `${BASE_URL}/dizi/cobra-kai`;

    try {
        const response = await fetch(url);
        const html = await response.text();

        // 1. CSRF Token ve Index Yakalama
        const tokenMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/) || html.match(/"csrf-token":"([^"]+)"/);
        const token = tokenMatch ? tokenMatch[1] : "";
        
        const btnRegex = new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`, 'i');
        const btnMatch = html.match(btnRegex);
        
        if (!btnMatch) return [];
        const sourceIndex = btnMatch[1];

        console.error(`[DEBUG] Token: ${token ? 'Alındı' : 'YOK!'} | Index: ${sourceIndex}`);

        // 2. POST İsteği ile Gerçek Veriyi Zorla
        const apiUrl = `${BASE_URL}/ajax/get-player`;
        const apiRes = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': token,
                'Referer': url
            },
            body: `index=${sourceIndex}`
        });

        const apiRaw = await apiRes.text();
        console.error(`[DEBUG] Ham Yanıt: ${apiRaw.substring(0, 50)}`);

        // 3. Link Ayıklama (Analytics linklerini filtreleyerek)
        let videoUrl = "";
        try {
            const j = JSON.parse(apiRaw);
            videoUrl = j.link || j.url || j.video || "";
        } catch(e) {
            // HTML içinden sadece video hostlarını (pixeldrain/vidmoly) ara
            const linkMatch = apiRaw.match(/https?:\/\/(?:pixeldrain|vidmoly|ok\.ru|mail\.ru)[^"'\s]+/i);
            if (linkMatch) videoUrl = linkMatch[0];
        }

        if (videoUrl && !videoUrl.includes('googletagmanager')) {
            if (!videoUrl.startsWith('http')) {
                try { videoUrl = atob(videoUrl); } catch(e) {}
            }

            console.error(`[SUCCESS] Link: ${videoUrl}`);
            return [{
                name: "JetFilmizle",
                title: `S${s} E${e} (ID: ${sourceIndex})`,
                url: videoUrl,
                type: "embed"
            }];
        }

        console.error('[DEBUG] Geçerli video linki bulunamadı.');
        return [];

    } catch (err) {
        console.error(`[ERROR] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
