/**
 * JetFilmizle - Nuvio Provider (Debug Mode)
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    const url = `${BASE_URL}/dizi/cobra-kai`;

    console.error(`[DEBUG-BAŞLADI] Hedef: S${s} E${e} | URL: ${url}`);

    try {
        const response = await fetch(url);
        const html = await response.text();

        if (!html) {
            console.error('[DEBUG-HATA] Sayfa içeriği boş döndü!');
            return [];
        }

        // 1. ADIM: Buton Arama Debug
        const btnPattern = `data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`;
        const btnRegex = new RegExp(btnPattern, 'i');
        const btnMatch = html.match(btnRegex);

        if (!btnMatch) {
            console.error(`[DEBUG-HATA] Buton bulunamadı! HTML içinde S${s} E${e} için 'data-episode' arandı ama eşleşme yok.`);
            // Alternatif: Sayfadaki tüm source-indexleri logla ki neyi gördüğümüzü bilelim
            const allIndices = html.match(/data-source-index="\d+"/g);
            console.error(`[DEBUG-BİLGİ] Sayfada bulunan tüm indexler: ${allIndices ? allIndices.join(', ') : 'Yok'}`);
            return [];
        }

        const sourceIndex = btnMatch[1];
        console.error(`[DEBUG-BAŞARI] Kaynak Indexi: ${sourceIndex}`);

        // 2. ADIM: JSON ve Link Debug
        const jsonRegex = /var\s+player_sources\s*=\s*({[^;]+});/;
        const jsonMatch = html.match(jsonRegex);

        if (!jsonMatch) {
            console.error('[DEBUG-HATA] HTML içinde "player_sources" değişkeni bulunamadı!');
            return [];
        }

        const sources = JSON.parse(jsonMatch[1]);
        let videoUrl = sources[sourceIndex];

        if (!videoUrl) {
            console.error(`[DEBUG-HATA] JSON bulundu ama index "${sourceIndex}" için link boş!`);
            return [];
        }

        console.error(`[DEBUG-HAM-LİNK] ${videoUrl}`);

        // 3. ADIM: Çözme (Decryption) Debug
        if (!videoUrl.startsWith('http')) {
            try {
                const decoded = atob(videoUrl);
                console.error(`[DEBUG-ÇÖZÜLDÜ] ${decoded}`);
                videoUrl = decoded;
            } catch (decErr) {
                console.error(`[DEBUG-HATA] Base64 çözülemedi: ${decErr.message}`);
            }
        }

        return [{
            name: "JetFilm - Debug",
            title: `S${s} E${e} (ID: ${sourceIndex})`,
            url: videoUrl,
            type: "embed"
        }];

    } catch (err) {
        console.error(`[DEBUG-KRİTİK-HATA] ${err.message}`);
        return [];
    }
}

// Export yapısı
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    globalThis.getStreams = getStreams;
}
