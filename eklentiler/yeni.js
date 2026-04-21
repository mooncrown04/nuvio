/**
 * JetFilmizle - Nuvio Provider
 * SMART LINK SELECTOR (No more embed.js trap)
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    const url = `${BASE_URL}/dizi/cobra-kai`; 

    try {
        const response = await fetch(url);
        const html = await response.text();

        // 1. Verileri Ayıkla
        const tokenMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/i);
        const filmIdMatch = html.match(/data-film-id=["'](\d+)["']/i) || html.match(/name=["']film_id["']\s*value=["'](\d+)["']/i);
        const btnRegex = new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`, 'i');
        const btnMatch = html.match(btnRegex);

        if (!filmIdMatch || !btnMatch) return [];

        const token = tokenMatch ? tokenMatch[1] : "";
        const filmId = filmIdMatch[1];
        const sourceIndex = btnMatch[1];
        const playerType = btnMatch[0].includes('dublaj') ? 'dublaj' : 'altyazili';

        // 2. jetplayer POST İsteği
        const playerResponse = await fetch(`${BASE_URL}/jetplayer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': token,
                'Referer': url
            },
            body: `film_id=${filmId}&source_index=${sourceIndex}&player_type=${playerType}&is_series=1`
        });

        const playerRaw = await playerResponse.text();
        
        // 3. SEÇİCİ LİNK AYIKLAMA (Strateji Değişikliği)
        let finalUrl = "";

        // ÖNCELİK 1: Gerçek video hostları (videopark, vidmoly, pixeldrain vb.)
        const videoHostMatch = playerRaw.match(/src=['"](https?:\/\/(?:videopark|vidmoly|pixeldrain|ok\.ru|mail\.ru)[^'"]+)['"]/i);
        
        if (videoHostMatch) {
            finalUrl = videoHostMatch[1];
            console.error(`[JET-HOST] Video Hostu Yakalandı: ${finalUrl}`);
        } 
        // ÖNCELİK 2: Eğer host yoksa ama iframe varsa (herhangi bir src)
        else {
            const genericIframe = playerRaw.match(/iframe[^>]+src=['"]([^'"]+)['"]/i);
            if (genericIframe && !genericIframe[1].includes('embed.js')) {
                finalUrl = genericIframe[1];
                console.error(`[JET-IFRAME] Iframe Yakalandı: ${finalUrl}`);
            }
        }

        // 4. Protokol Tamamlama ve Sonuç
        if (finalUrl) {
            if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;

            return [{
                name: "JetFilmizle",
                title: `S${s} E${e} (Kaynak: ${sourceIndex})`,
                url: finalUrl,
                type: "embed"
            }];
        }

        console.error('[JET-HATA] Geçerli bir video kaynağı ayıklanamadı.');
        return [];

    } catch (err) {
        console.error(`[JET-CRITICAL] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
