/**
 * JetFilmizle - Nuvio Provider
 * PLAYER ANALYZER MODE
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    const url = `${BASE_URL}/dizi/cobra-kai`; 

    try {
        const response = await fetch(url);
        const html = await response.text();

        // 1. Film ID ve Index yakala
        const filmIdMatch = html.match(/name=["']film_id["']\s*value=["'](\d+)["']/i) || html.match(/data-film-id=["'](\d+)["']/i);
        const btnRegex = new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`, 'i');
        const btnMatch = html.match(btnRegex);

        if (!filmIdMatch || !btnMatch) return [];

        const filmId = filmIdMatch[1];
        const sourceIndex = btnMatch[1];
        const playerType = btnMatch[0].includes('dublaj') ? 'dublaj' : 'altyazili';

        // 2. jetplayer POST isteği
        const playerResponse = await fetch(`${BASE_URL}/jetplayer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: `film_id=${filmId}&source_index=${sourceIndex}&player_type=${playerType}`
        });

        const playerHtml = await playerResponse.text();
        
        // DEBUG: Yanıtın ilk kısmını görerek yapıyı anlayalım
        console.error(`[JET-HAM-YALIN] ${playerHtml.substring(0, 300).replace(/\n/g, ' ')}`);

        // 3. AGRESİF LİNK AYIKLAMA
        // Iframe, source, window.location veya Base64 her şeyi tara
        const linkPatterns = [
            /src=["'](https?:\/\/[^"']+)["']/i,               // Klasik Iframe
            /url\s*:\s*["'](https?:\/\/[^"']+)["']/i,        // JS Değişkeni
            /location\.replace\(["']([^"']+)["']\)/i,         // Redirect
            /["'](https?:\/\/(?:pixeldrain|vidmoly)[^"']+)["']/i // Doğrudan host linki
        ];

        let streamUrl = "";
        for (let pattern of linkPatterns) {
            const m = playerHtml.match(pattern);
            if (m) {
                streamUrl = m[1];
                break;
            }
        }

        // Eğer hala link yoksa ve içerde Base64 varsa çözmeyi dene
        if (!streamUrl) {
            const b64 = playerHtml.match(/[A-Za-z0-9+/]{40,}=*/);
            if (b64) {
                try {
                    const decoded = atob(b64[0]);
                    if (decoded.includes('http')) streamUrl = decoded;
                } catch(e) {}
            }
        }

        if (streamUrl) {
            if (streamUrl.startsWith('//')) streamUrl = 'https:' + streamUrl;
            console.error(`[JET-BULDUM] ${streamUrl}`);
            return [{
                name: "JetFilmizle",
                title: `S${s} E${e} (ID: ${sourceIndex})`,
                url: streamUrl,
                type: "embed"
            }];
        }

        console.error('[JET-HATA] Hiçbir pattern eşleşmedi.');
        return [];

    } catch (err) {
        console.error(`[JET-CRITICAL] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
