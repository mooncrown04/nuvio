/**
 * JetFilmizle - Nuvio Provider 
 * STRIKE TEAM - Düğüm Çözüldü
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    // Not: Buradaki URL'yi dinamik film ismiyle değiştirebilirsin (id parametresi ile)
    const url = `${BASE_URL}/dizi/cobra-kai`; 

    try {
        const response = await fetch(url);
        const html = await response.text();

        // 1. Güvenlik anahtarlarını al
        const token = html.match(/name="csrf-token"\s+content="([^"]+)"/i)?.[1];
        const filmId = html.match(/data-film-id=["'](\d+)["']/i)?.[1] || html.match(/name=["']film_id["']\s*value=["'](\d+)["']/i)?.[1];
        
        // Bölüm butonunu bul
        const btnRegex = new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`, 'i');
        const btnMatch = html.match(btnRegex);

        if (!filmId || !btnMatch) return [];

        const sourceIndex = btnMatch[1];
        const playerType = btnMatch[0].includes('dublaj') ? 'dublaj' : 'altyazili';

        // 2. Player verisini çek
        const playerRes = await fetch(`${BASE_URL}/jetplayer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': token,
                'Referer': url
            },
            body: `film_id=${filmId}&source_index=${sourceIndex}&player_type=${playerType}&is_series=1`
        });

        const playerRaw = await playerRes.text();

        // 3. TUZAĞI ATLA VE LİNKİ AL
        // Logda gördüğümüz videopark linkini cımbızla çekiyoruz
        const videoMatch = playerRaw.match(/src=['"](https?:\/\/videopark\.top\/[^'"]+)['"]/i);
        
        if (videoMatch) {
            const finalLink = videoMatch[1];
            console.error(`[JET-FINAL] Video Linki: ${finalLink}`);

            return [{
                name: "JetFilmizle",
                title: `S${s} E${e} (VideoPark)`,
                url: finalLink,
                type: "embed"
            }];
        }

        // Eğer videopark değil de başka bir host gelirse (Alternatif)
        const altMatch = playerRaw.match(/iframe[^>]+src=['"]([^'"]+)['"]/i);
        if (altMatch && !altMatch[1].includes('embed.js')) {
             return [{
                name: "JetFilmizle",
                title: `S${s} E${e} (Alt)`,
                url: altMatch[1].startsWith('//') ? 'https:' + altMatch[1] : altMatch[1],
                type: "embed"
            }];
        }

        console.error('[JET-HATA] Video kaynağı bulunamadı.');
        return [];

    } catch (err) {
        console.error(`[JET-KRITIK] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
