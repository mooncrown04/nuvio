/**
 * JetFilmizle - Nuvio Provider
 * EMBED DECODER MODE
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    const url = `${BASE_URL}/dizi/cobra-kai`; 

    try {
        const response = await fetch(url);
        const html = await response.text();

        // 1. Verileri yakala
        const tokenMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/i);
        const filmIdMatch = html.match(/data-film-id=["'](\d+)["']/i) || html.match(/name=["']film_id["']\s*value=["'](\d+)["']/i);
        const btnRegex = new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`, 'i');
        const btnMatch = html.match(btnRegex);

        if (!filmIdMatch || !btnMatch) return [];

        const token = tokenMatch ? tokenMatch[1] : "";
        const filmId = filmIdMatch[1];
        const sourceIndex = btnMatch[1];
        const playerType = btnMatch[0].includes('dublaj') ? 'dublaj' : 'altyazili';

        // 2. jetplayer POST isteği
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
        console.error(`[JET-DEBUG] Gelen Yanıt: ${playerRaw}`);

        // 3. Eğer gelen yanıt bir JS dosyasıysa (/public/embed.js gibi)
        let finalLink = "";
        if (playerRaw.includes('.js')) {
            const jsPath = playerRaw.match(/src=["']([^"']+)["']/i) || [null, playerRaw.trim()];
            let fullJsUrl = jsPath[1];
            
            if (fullJsUrl) {
                if (fullJsUrl.startsWith('/')) fullJsUrl = BASE_URL + fullJsUrl;
                
                console.error(`[JET-EMBED] JS Dosyası Okunuyor: ${fullJsUrl}`);
                const jsRes = await fetch(fullJsUrl);
                const jsContent = await jsRes.text();
                
                // JS içindeki linkleri veya Base64 bloklarını tara
                const linkM = jsContent.match(/https?:\/\/(?:pixeldrain|vidmoly|ok\.ru|mail\.ru)[^"'\s]+/i);
                if (linkM) {
                    finalLink = linkM[0];
                } else {
                    // JS içinde gizli bir Base64 listesi var mı?
                    const b64M = jsContent.match(/[A-Za-z0-9+/]{50,}=*/);
                    if (b64M && typeof atob !== 'undefined') {
                        const decoded = atob(b64M[0]);
                        if (decoded.includes('http')) finalLink = decoded;
                    }
                }
            }
        } else {
            // Eğer doğrudan link geldiyse ayıkla
            const linkM = playerRaw.match(/https?:\/\/[^"'\s]+/i);
            if (linkM) finalLink = linkM[0];
        }

        // 4. Sonuç Döndür
        if (finalLink) {
            console.error(`[JET-BULDUM] Final: ${finalLink}`);
            return [{
                name: "JetFilmizle",
                title: `S${s} E${e} (ID: ${sourceIndex})`,
                url: finalLink,
                type: "embed"
            }];
        }

        console.error('[JET-HATA] Link deşifre edilemedi.');
        return [];

    } catch (err) {
        console.error(`[JET-CRITICAL] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
