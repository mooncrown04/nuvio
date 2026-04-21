/**
 * JetFilmizle - Nuvio Provider
 * ULTIMATE BYPASS (No setTimeout, Pure JS)
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    const url = `${BASE_URL}/dizi/cobra-kai`; 

    try {
        // 1. ADIM: Sayfa içeriğini al
        const response = await fetch(url);
        const html = await response.text();

        // Verileri ayıkla
        const tokenMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/i);
        const filmIdMatch = html.match(/data-film-id=["'](\d+)["']/i) || html.match(/name=["']film_id["']\s*value=["'](\d+)["']/i);
        const btnRegex = new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`, 'i');
        const btnMatch = html.match(btnRegex);

        if (!filmIdMatch || !btnMatch) return [];

        const token = tokenMatch ? tokenMatch[1] : "";
        const filmId = filmIdMatch[1];
        const sourceIndex = btnMatch[1];
        const playerType = btnMatch[0].includes('dublaj') ? 'dublaj' : 'altyazili';

        console.error(`[JET] ID:${filmId} | Index:${sourceIndex}`);

        // 2. ADIM: Manuel Bekleme (setTimeout yerine)
        // Bot koruması için milisaniyelik bir boş döngü
        const start = Date.now();
        while (Date.now() - start < 300) { /* bekle */ }

        // 3. ADIM: POST İsteği
        const playerResponse = await fetch(`${BASE_URL}/jetplayer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': token,
                'Referer': url,
                'User-Agent': 'Mozilla/5.0 (Android TV)'
            },
            body: `film_id=${filmId}&source_index=${sourceIndex}&player_type=${playerType}&is_series=1`
        });

        const playerHtml = await playerResponse.text();

        // 4. ADIM: Link Ayıklama
        let streamUrl = "";
        
        // Önce iframe src ara
        const iframeM = playerHtml.match(/src=["']([^"']+)["']/i);
        if (iframeM) {
            streamUrl = iframeM[1];
        } else {
            // Iframe yoksa doğrudan link ara
            const linkM = playerHtml.match(/https?:\/\/(?:pixeldrain|vidmoly|ok\.ru|mail\.ru)[^"'\s]+/i);
            if (linkM) streamUrl = linkM[0];
        }

        // 5. ADIM: Eğer hala link yoksa "Erişim Engellendi" alınmış demektir, Base64 tara
        if (!streamUrl || playerHtml.includes('engellendi')) {
            console.error('[JET] Post engellendi, HTML deşifre ediliyor...');
            const b64Regex = /[A-Za-z0-9+/]{50,}=*/g;
            let m;
            while ((m = b64Regex.exec(html)) !== null) {
                try {
                    // atob yoksa alternatif (Buffer) kontrolü veya manuel decode gerekebilir
                    const decoded = (typeof atob !== 'undefined') ? atob(m[0]) : ""; 
                    if (decoded.includes('http')) {
                        streamUrl = decoded;
                        break;
                    }
                } catch(e) {}
            }
        }

        if (streamUrl) {
            if (streamUrl.startsWith('//')) streamUrl = 'https:' + streamUrl;
            console.error(`[JET-FINAL] ${streamUrl}`);
            return [{
                name: "JetFilmizle",
                title: `S${s} E${e} (${playerType})`,
                url: streamUrl,
                type: "embed"
            }];
        }

        return [];

    } catch (err) {
        console.error(`[JET-ERROR] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
