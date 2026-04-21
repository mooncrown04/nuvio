/**
 * JetFilmizle - Nuvio Provider
 * FINAL STRIKE - SUCCESS MODE
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    const url = `${BASE_URL}/dizi/cobra-kai`; 

    try {
        const response = await fetch(url);
        const html = await response.text();

        // 1. Gerekli ID ve Tokenları yakala
        const tokenMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/i);
        const filmIdMatch = html.match(/data-film-id=["'](\d+)["']/i) || html.match(/name=["']film_id["']\s*value=["'](\d+)["']/i);
        const btnRegex = new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`, 'i');
        const btnMatch = html.match(btnRegex);

        if (!filmIdMatch || !btnMatch) return [];

        const token = tokenMatch ? tokenMatch[1] : "";
        const filmId = filmIdMatch[1];
        const sourceIndex = btnMatch[1];
        const playerType = btnMatch[0].includes('dublaj') ? 'dublaj' : 'altyazili';

        // 2. jetplayer isteği (Sitenin ana damarı)
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

        // 3. Linki ayıkla (Logda gördüğümüz iframe src'yi yakalıyoruz)
        const iframeMatch = playerRaw.match(/src=['"]([^'"]+)['"]/i);
        
        if (iframeMatch) {
            let finalUrl = iframeMatch[1];
            // Protokol eksikse tamamla
            if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;

            console.error(`[JET-BINGO] Link Yakalandı: ${finalUrl}`);

            return [{
                name: "JetFilmizle",
                title: `S${s} E${e} (Kaynak: ${sourceIndex})`,
                url: finalUrl,
                type: "embed"
            }];
        }

        console.error('[JET-FAIL] Yanıt geldi ama iframe bulunamadı.');
        return [];

    } catch (err) {
        console.error(`[JET-CRITICAL] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
