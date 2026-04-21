/**
 * JetFilmizle - Nuvio Provider (Advanced Debug)
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

        // 1. İndeks Bulma
        const btnRegex = new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`, 'i');
        const btnMatch = html.match(btnRegex);
        
        if (!btnMatch) {
            console.error('[ERR] Buton bulunamadı');
            return [];
        }

        const sourceIndex = btnMatch[1];
        console.error(`[STEP-2] İndeks: ${sourceIndex}`);

        // 2. Gizli Veriyi Arama (Regex genişletildi)
        // Bazı siteler JSON'ı tek tırnakla veya boşluksuz yazar
        const jsonPatterns = [
            /player_sources\s*=\s*({.+?});/,
            /sources\s*=\s*({.+?});/,
            /video_data\s*=\s*({.+?});/
        ];

        let foundSources = null;
        for (let p of jsonPatterns) {
            const m = html.match(p);
            if (m) {
                console.error(`[STEP-3] Veri Bloğu Yakalandı: ${p}`);
                foundSources = JSON.parse(m[1]);
                break;
            }
        }

        if (foundSources && foundSources[sourceIndex]) {
            let link = foundSources[sourceIndex];
            console.error(`[STEP-4] Ham Link: ${link}`);
            
            if (!link.startsWith('http')) {
                link = atob(link);
                console.error(`[STEP-5] Çözüldü: ${link}`);
            }

            return [{ name: "JetFilm", title: "Kaynak " + sourceIndex, url: link, type: "embed" }];
        }

        // 3. EĞER YUKARIDAKİLER ÇALIŞMAZSA: Sayfadaki tüm Base64 metinleri tara
        console.error('[STEP-6] JSON bulunamadı, Base64 taraması yapılıyor...');
        const b64Regex = /["']([A-Za-z0-9+/]{30,}=*)["']/g;
        let bMatch;
        while ((bMatch = b64Regex.exec(html)) !== null) {
            try {
                const decoded = atob(bMatch[1]);
                if (decoded.includes('http') && (decoded.includes('pixeldrain') || decoded.includes('vidmoly'))) {
                    console.error(`[STEP-7] KRİTİK BULGU (Base64 içinde): ${decoded}`);
                    // Buradaki mantık: Eğer çözülen şey bir linkse ve aradığımız index ile bir şekilde bağdaşıyorsa...
                    // Şimdilik tüm bulunanları döndürelim:
                    return [{ name: "JetFilm-B64", title: "Bulunan Kaynak", url: decoded, type: "embed" }];
                }
            } catch (e) {}
        }

        console.error('[ERR] Hiçbir kaynak bulunamadı.');
        return [];

    } catch (err) {
        console.error(`[FATAL] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
