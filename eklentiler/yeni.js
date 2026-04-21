/**
 * JetFilmizle - Nuvio Provider (API Injection Mode)
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    const url = `${BASE_URL}/dizi/cobra-kai`;

    console.error(`[STEP-1] Başladı: S${s} E${e}`);

    try {
        const response = await fetch(url);
        const html = await response.text();

        // 1. Doğru Buton ve Index'i Yakala
        const btnRegex = new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`, 'i');
        const btnMatch = html.match(btnRegex);
        
        if (!btnMatch) {
            console.error('[ERR] Hedef buton bulunamadı.');
            return [];
        }

        const sourceIndex = btnMatch[1];
        console.error(`[STEP-2] Index Bulundu: ${sourceIndex}`);

        // 2. Gizli API Ucuna İstek At
        // JetFilmizle genelde linkleri şu adresten çeker:
        const apiUrl = `${BASE_URL}/ajax/get-player?index=${sourceIndex}`;
        console.error(`[STEP-3] API Sorgusu: ${apiUrl}`);

        const apiRes = await fetch(apiUrl, {
            headers: {
                'X-Requested-With': 'XMLHttpRequest', // AJAX isteği olduğunu belirtir
                'Referer': url
            }
        });

        const apiData = await apiRes.json();
        
        // API genelde {status: true, link: "..."} veya direkt link döner
        let videoUrl = apiData.link || apiData.url || apiData.video;

        if (videoUrl) {
            console.error(`[STEP-4] API'den Link Geldi: ${videoUrl}`);
            
            // Eğer link Base64 ise çöz
            if (!videoUrl.startsWith('http')) {
                videoUrl = atob(videoUrl);
                console.error(`[STEP-5] Base64 Çözüldü: ${videoUrl}`);
            }

            return [{
                name: "JetFilm - API",
                title: `S${s} E${e} (Index: ${sourceIndex})`,
                url: videoUrl,
                type: "embed"
            }];
        }

        // 3. Eğer API boş dönerse (Yedek Plan)
        console.error('[STEP-6] API boş döndü, alternatif tarama...');
        const b64Regex = /["']([A-Za-z0-9+/]{40,}=*)["']/g;
        let bMatch;
        while ((bMatch = b64Regex.exec(html)) !== null) {
            try {
                const decoded = atob(bMatch[1]);
                if (decoded.includes('http') && (decoded.includes('pixeldrain') || decoded.includes('vidmoly'))) {
                    console.error(`[BULDUM] Kritik Link: ${decoded}`);
                    return [{ name: "JetFilm-Alt", title: "Alternatif", url: decoded, type: "embed" }];
                }
            } catch (e) {}
        }

        return [];

    } catch (err) {
        console.error(`[FATAL] Hata: ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
