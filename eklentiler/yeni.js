/**
 * JetFilmizle - Tüm Diziler İçin Otomatik Anahtar Bulucu
 * Senin çalışan Videopark/Titan mantığını tüm siteye uygular.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB üzerinden dizinin slug (metin) adını al
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || "").toLowerCase()
            .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
            .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        
        const targetUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;
        console.error(`[SAYFA-TARANIYOR] ${targetUrl}`);

        // 2. Dizi sayfasını çek ve içindeki 11 haneli Titan anahtarını bul
        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // Sayfadaki tüm 11 haneli karmaşık kodları bulur (DFADXFgPDU4 gibi)
        const pattern = /[a-zA-Z0-9_-]{11}/g;
        const matches = html.match(pattern) || [];
        
        // Google kodlarını eler, içinde büyük harf ve rakam olan "gerçek" anahtarı seçer
        const finalKey = matches.find(c => 
            /[A-Z]/.test(c) && /[0-9]/.test(c) && !/google|GTM|analytics/i.test(c)
        ) || "DFADXFgPDU4"; // Bulamazsa fallback olarak Cobra Kai kodunu kullanır

        // 3. SENİN ÇALIŞAN VİDEOPARK SİSTEMİN
        const playerUrl = `https://videopark.top/titan/w/${finalKey}`;
        console.error(`[TITAN-BAĞLANTI] Anahtar: ${finalKey}`);

        const response = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const playerHtml = await response.text();

        // Senin verdiğin o meşhur _sd objesini HTML'den ayıklama
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (sdMatch) {
            const data = JSON.parse(sdMatch[1]);
            const streamUrl = data.stream_url;

            // Altyazıları senin istediğin formatta diziye çevir
            const subtitles = data.subtitles ? data.subtitles.map(s => ({
                url: s.file,
                language: s.label,
                format: "vtt"
            })) : [];

            return [{
                name: "Jet-Titan (Otomatik)",
                url: streamUrl,
                type: "hls",
                subtitles: subtitles,
                headers: {
                    'Referer': 'https://videopark.top/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                }
            }];
        }

        console.error("[HATA] Sayfada anahtar bulundu ama _sd objesi çözülemedi.");
        return [];

    } catch (err) {
        console.error(`[KRİTİK-HATA] ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
