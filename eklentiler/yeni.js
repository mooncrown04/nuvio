/**
 * JetFilmizle - Nuvio Provider
 * GÜNCEL JETPLAYER SİSTEMİ (POST Method)
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    // Not: dizi sayfasının URL'si değişebilir, gerekirse burayı 'id' ile güncelle
    const url = `${BASE_URL}/dizi/cobra-kai`; 

    try {
        // 1. ADIM: Sayfadan Film ID ve Kaynak Index'ini çek
        const response = await fetch(url);
        const html = await response.text();

        // Film ID'yi yakala (input name="film_id")
        const filmIdMatch = html.match(/name=["']film_id["']\s*value=["'](\d+)["']/i);
        // Sizin logdaki 21 numaralı index'i butondan yakala
        const btnRegex = new RegExp(`data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`, 'i');
        const btnMatch = html.match(btnRegex);

        if (!filmIdMatch || !btnMatch) {
            console.error('[JET-HATA] ID veya Index bulunamadı.');
            return [];
        }

        const filmId = filmIdMatch[1];
        const sourceIndex = btnMatch[1];
        const playerType = btnMatch[0].includes('dublaj') ? 'dublaj' : 'altyazili';

        console.error(`[JET-DEBUG] İstek Hazırlanıyor: ID:${filmId} Index:${sourceIndex} Tip:${playerType}`);

        // 2. ADIM: 'jetplayer' endpoint'ine POST isteği at (Sitenin yeni yöntemi)
        const playerResponse = await fetch(`${BASE_URL}/jetplayer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: `film_id=${filmId}&source_index=${sourceIndex}&player_type=${playerType}`
        });

        const playerHtml = await playerResponse.text();

        // 3. ADIM: Gelen HTML içindeki iframe veya video linkini ayıkla
        const iframeMatch = playerHtml.match(/src=["']([^"']+)["']/i);
        
        if (iframeMatch) {
            let streamUrl = iframeMatch[1];
            if (streamUrl.startsWith('//')) streamUrl = 'https:' + streamUrl;

            console.error(`[JET-BAŞARI] Link Bulundu: ${streamUrl}`);
            return [{
                name: "JetFilmizle",
                title: `S${s} E${e} (Kaynak: ${sourceIndex})`,
                url: streamUrl,
                type: "embed"
            }];
        }

        console.error('[JET-HATA] Player HTML içinde link bulunamadı.');
        return [];

    } catch (err) {
        console.error(`[JET-KRİTİK] ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
