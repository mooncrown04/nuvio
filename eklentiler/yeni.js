/**
 * JetFilmizle - Nuvio Provider
 */

const BASE_URL = 'https://jetfilmizle.net';

async function getStreams(id, mediaType, season, episode) {
    const s = season || 1;
    const e = episode || 1;
    
    // Slug oluşturma (Cobra Kai örneği)
    const url = `${BASE_URL}/dizi/cobra-kai`;

    try {
        const response = await fetch(url);
        const html = await response.text();

        if (!html) return [];

        // 1. ADIM: Doğru butonun source-index değerini yakala
        const pattern = `data-source-index=["'](\\d+)["'][^>]*data-season=["']${s}["'][^>]*data-episode=["']${e}["']`;
        const regex = new RegExp(pattern, 'i');
        const match = html.match(regex);

        if (!match) {
            console.error('[JetFilm] Bölüm butonu bulunamadı.');
            return [];
        }

        const sourceIndex = match[1];
        console.error(`[JetFilm] Hedef Index Bulundu: ${sourceIndex}`);

        // 2. ADIM: Sayfa içindeki player_sources JSON bloğunu bul
        // JetFilm linkleri şu formatta saklar: var player_sources = {"21": "https://...", ...}
        const playerSourcesRegex = /var\s+player_sources\s*=\s*({[^;]+});/;
        const playerMatch = html.match(playerSourcesRegex);

        if (playerMatch) {
            try {
                const sources = JSON.parse(playerMatch[1]);
                const videoUrl = sources[sourceIndex];

                if (videoUrl) {
                    return [{
                        name: "JetFilmizle",
                        title: `S${s} E${e} (Kaynak: ${sourceIndex})`,
                        url: videoUrl,
                        type: "embed"
                    }];
                }
            } catch (e) {
                console.error('[JetFilm] JSON Ayrıştırma Hatası');
            }
        }

        // 3. ADIM: Yedek Plan - Sayfa içindeki tüm iframe ve dış linkleri tara
        const allLinksRegex = /https?:\/\/(?:pixeldrain\.com|vidmoly\.to|ok\.ru|mail\.ru)\/[^\s"']+/gi;
        const allLinks = html.match(allLinksRegex) || [];
        const uniqueLinks = [...new Set(allLinks)];

        return uniqueLinks.map((link, i) => ({
            name: "JetFilm - Kaynak",
            title: `S${s} E${e} (Alternatif ${i + 1})`,
            url: link,
            type: "embed"
        }));

    } catch (err) {
        console.error('[JetFilm] Fetch Hatası: ' + err);
        return [];
    }
}

// CloudStream/Nuvio uyumluluğu için kritik dışa aktarma
if (typeof module !== 'undefined') {
    module.exports = { getStreams };
} else {
    globalThis.getStreams = getStreams;
}
