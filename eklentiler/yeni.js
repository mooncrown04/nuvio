/**
 * JetFilmizle - Nuvio Ultra (v31 Worker Bridge)
 * Videopark ID'lerini ExoPlayer'ın anlayacağı HLS (.m3u8) formatına çevirir.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';
        
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || info.title || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

        const targetUrl = (mediaType === 'tv') 
            ? `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`
            : `${BASE_URL}/film/${slug}`;

        // 1. Sayfaya git ve asıl "Worker ID"yi (DFADX...) ara
        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // Regex'i senin verdiğin Cobra Kai örneğine (DFADX) göre özelleştirdim
        const workerRegex = /(DFADX[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]{11})/g;
        let workerIds = [...new Set(html.match(workerRegex) || [])];

        let streams = [];

        // 2. Bulunan her bir Worker ID için ExoPlayer köprüsü kur
        for (let wId of workerIds) {
            // Analiz kodlarını ve gereksizleri ele
            if (wId.length < 11 || wId.startsWith('G-')) continue;

            const workerUrl = `https://videopark.top/titan/w/${wId}`;
            console.error(`[WORKER] Exo Bridge Kuruluyor: ${workerUrl}`);

            try {
                const wRes = await fetch(workerUrl, { 
                    headers: { 'Referer': 'https://jetfilmizle.net/', 'User-Agent': 'Mozilla/5.0' } 
                });
                const wHtml = await wRes.text();

                // ASIL MESELE: videopark sayfasındaki _sd değişkenini yakalamak
                const sdMatch = wHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                if (sdMatch) {
                    const data = JSON.parse(sdMatch[1]);
                    if (data.stream_url) {
                        streams.push({
                            name: "Jet-Worker (Exo)",
                            title: `⌜ Kaynak: ${wId.substring(0,5)} ⌟`,
                            url: data.stream_url, // Bu artık .m3u8 veya Exo'nun açacağı direkt linktir
                            type: "hls",
                            headers: { 
                                'Referer': 'https://videopark.top/',
                                'User-Agent': 'Mozilla/5.0'
                            }
                        });
                    }
                }
            } catch (e) { console.error(`[WORKER-ERR] ${e.message}`); }
        }

        // Eğer Worker bulunamazsa direkt link ara (Bazı filmlerde direkt gelir)
        if (streams.length === 0) {
            const sdDirect = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sdDirect) {
                const d = JSON.parse(sdDirect[1]);
                streams.push({ name: "Jet-Direct", url: d.stream_url, type: "hls" });
            }
        }

        return streams;

    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
