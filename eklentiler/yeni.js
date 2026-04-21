/**
 * JetFilmizle - Nuvio Provider
 * BYPASS MODE (Anti-Bot & Cookie Simulation)
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    const url = `${BASE_URL}/dizi/cobra-kai`; 

    try {
        // 1. ADIM: Önce sayfayı ziyaret et ve Token/ID al (Oturum açılışı)
        const response = await fetch(url);
        const html = await response.text();

        // CSRF Token ve Film ID'yi çek
        const tokenMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/i);
        const filmIdMatch = html.match(/data-film-id=["'](\d+)["']/i) || html.match(/name=["']film_id["']\s*value=["'](\d+)["']/i);
        
        const btnRegex = new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`, 'i');
        const btnMatch = html.match(btnRegex);

        if (!filmIdMatch || !btnMatch) return [];

        const token = tokenMatch ? tokenMatch[1] : "";
        const filmId = filmIdMatch[1];
        const sourceIndex = btnMatch[1];
        const playerType = btnMatch[0].includes('dublaj') ? 'dublaj' : 'altyazili';

        console.error(`[JET-BYPASS] Hazırlanıyor: ID:${filmId} Token:${token ? 'OK' : 'YOK'}`);

        // 2. ADIM: Bekleme Simülasyonu (Bot koruması için kısa bir ara)
        await new Promise(resolve => setTimeout(resolve, 500));

        // 3. ADIM: POST İsteği (Gerçek Tarayıcı Başlıkları ile)
        const playerResponse = await fetch(`${BASE_URL}/jetplayer`, {
            method: 'POST',
            headers: {
                'Accept': '*/*',
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': token,
                'Referer': url,
                'Origin': BASE_URL,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            body: `film_id=${filmId}&source_index=${sourceIndex}&player_type=${playerType}&is_series=1`
        });

        const playerHtml = await playerResponse.text();
        console.error(`[JET-YANIT] ${playerHtml.substring(0, 100)}`);

        // 4. ADIM: Link Ayıklama
        // Erişim engellendi mesajı hala geliyorsa yedek olarak Base64 taraması yap
        if (playerHtml.includes('engellendi')) {
            console.error('[JET-UYARI] WAF hala devrede, HTML içi deşifre deneniyor...');
            return scanForBase64Links(html, sourceIndex, s, e);
        }

        const streamUrl = extractUrl(playerHtml);
        if (streamUrl) {
            console.error(`[JET-BAŞARI] ${streamUrl}`);
            return [{
                name: "JetFilmizle",
                title: `S${s} E${e} (Kaynak: ${sourceIndex})`,
                url: streamUrl,
                type: "embed"
            }];
        }

        return [];

    } catch (err) {
        console.error(`[JET-KRİTİK] ${err.message}`);
        return [];
    }
}

// Yardımcı Fonksiyonlar
function extractUrl(text) {
    const m = text.match(/src=["']([^"']+)["']/i) || text.match(/https?:\/\/(?:pixeldrain|vidmoly|ok\.ru|mail\.ru)[^"'\s]+/i);
    if (m) return m[1].startsWith('//') ? 'https:' + m[1] : m[1];
    return null;
}

function scanForBase64Links(html, targetIndex, s, e) {
    const b64Regex = /[A-Za-z0-9+/]{50,}=*/g;
    let found = [];
    let m;
    while ((m = b64Regex.exec(html)) !== null) {
        try {
            const d = atob(m[0]);
            if (d.includes('http') && (d.includes('pixeldrain') || d.includes('vidmoly'))) found.push(d);
        } catch(e) {}
    }
    if (found.length > 0) {
        const link = found[targetIndex] || found[0];
        return [{ name: "JetFilm (B64)", title: `S${s} E${e}`, url: link, type: "embed" }];
    }
    return [];
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
