/**
 * JetFilmizle - Nuvio Ultra (v36 Memory Guard)
 * Cihazı yormadan nokta atışı yapar. 
 * 'Batch' sayısını düşürdük, zaman aşımını ekledik.
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

        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // GİZLİ SİLAH: Sayfa içinde doğrudan videopark ID'si geçiyorsa yakala
        let directMatches = html.match(/titan\/w\/([a-zA-Z0-9_-]{8,30})/g) || [];
        
        const allPossibleIds = html.match(/["']([a-zA-Z0-9_-]{8,25})["']/g) || [];
        let candidates = [...new Set([
            ...directMatches.map(m => m.split('/').pop()),
            ...allPossibleIds.map(m => m.replace(/["']/g, ''))
        ])];
        
        // Çöpleri temizle (Bellek koruması için liste küçültme)
        candidates = candidates.filter(c => 
            c.length > 7 && 
            !/^(http|google|amazon|netflix|Image|viewport|charset|script|style|true|false|hidden|visible)/i.test(c)
        );

        console.error(`[GUARD] Net Aday: ${candidates.length}`);

        let streams = [];
        const batchSize = 6; // Cihazın boğulmaması için 10'dan 6'ya düşürdük

        for (let i = 0; i < candidates.length; i += batchSize) {
            const currentBatch = candidates.slice(i, i + batchSize);
            
            const batchResults = await Promise.all(currentBatch.map(async (wId) => {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 4000); // 4 saniye sınırı

                try {
                    const wRes = await fetch(`https://videopark.top/titan/w/${wId}`, { 
                        headers: { 'Referer': BASE_URL, 'User-Agent': 'Mozilla/5.0' },
                        signal: controller.signal
                    });
                    const wHtml = await wRes.text();
                    clearTimeout(timeout);

                    if (wHtml.includes('var _sd')) {
                        const sdMatch = wHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                        if (sdMatch) {
                            const data = JSON.parse(sdMatch[1]);
                            if (data.stream_url) {
                                return {
                                    name: `Jet-HD-${wId.substring(0,3)}`,
                                    url: data.stream_url,
                                    type: "hls",
                                    headers: { 'Referer': 'https://videopark.top/' }
                                };
                            }
                        }
                    }
                } catch (e) {}
                return null;
            }));

            const found = batchResults.filter(r => r !== null);
            if (found.length > 0) {
                streams.push(...found);
                break; 
            }
        }

        return streams;
    } catch (err) { return []; }
}

module.exports = { getStreams };
