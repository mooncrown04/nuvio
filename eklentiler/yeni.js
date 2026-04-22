/**
 * JetFilmizle - Nuvio Ultra (v35 Turbo Shredder)
 * Sayfadaki her şeyi toplar, 10'arlı gruplar halinde (Batch) seri tarama yapar.
 * Bu sayede hem her şeyi görürüz hem de sistemi dondurmayız.
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

        // 1. ADIM: Sayfadaki her tırnak içini (8-25 karakter) süpür
        const allPossibleIds = html.match(/["']([a-zA-Z0-9_-]{8,25})["']/g) || [];
        let candidates = [...new Set(allPossibleIds.map(m => m.replace(/["']/g, '')))];
        
        // 2. ADIM: Çok bariz çöpleri hızla ele (İşlem yükünü azaltmak için)
        candidates = candidates.filter(c => !/^(http|https|google|jetfilmizle|ImageObject|viewport|charset|Permissions|accelerometer|autoplay|clipboard|gyroscope|magnetometer|payment|usb|true|false|hidden|visible|search|index|follow|width|initial|maximum|minimum|user-scalable|yes|no|content|meta|link|script|style|div|span|button|input|form|label|table|tbody|tr|td|th|thead|tfoot|section|header|footer|aside|article|nav|main|canvas|video|audio|source|track|embed|object|param|iframe|img|picture|svg|path|circle|rect|line|polyline|polygon|ellipse|text|tspan|defs|g|symbol|use|clipPath|mask|pattern|linearGradient|radialGradient|stop|filter|feFlood|feColorMatrix|feComponentTransfer|feComposite|feConvolveMatrix|feDiffuseLighting|feDisplacementMap|feDistantLight|feDropShadow|feGaussianBlur|feImage|feMerge|feMergeNode|feMorphology|feOffset|fePointLight|feSpecularLighting|feSpotLight|feTile|feTurbulence)$/i.test(c));

        console.error(`[SHREDDER] Net Aday Sayısı: ${candidates.length}`);

        let streams = [];
        
        // 3. ADIM: GRUPLAMA (Batching)
        // 94 isteği aynı anda atmak yerine 10'arlı gruplar halinde atıyoruz.
        // İlk grupta videoyu bulursak diğerlerini hiç sormuyoruz (Hız kazandırır).
        const batchSize = 10;
        for (let i = 0; i < candidates.length; i += batchSize) {
            const currentBatch = candidates.slice(i, i + batchSize);
            console.error(`[SHREDDER] Grup ${Math.floor(i/batchSize) + 1} taranıyor...`);

            const batchResults = await Promise.all(currentBatch.map(async (wId) => {
                try {
                    const wRes = await fetch(`https://videopark.top/titan/w/${wId}`, { 
                        headers: { 'Referer': BASE_URL, 'User-Agent': 'Mozilla/5.0' } 
                    });
                    const wHtml = await wRes.text();
                    const sdMatch = wHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                    if (sdMatch) {
                        const data = JSON.parse(sdMatch[1]);
                        if (data.stream_url) {
                            return {
                                name: `Jet-Harvest-${wId.substring(0,4)}`,
                                url: data.stream_url,
                                type: "hls",
                                headers: { 'Referer': 'https://videopark.top/' }
                            };
                        }
                    }
                } catch (e) {}
                return null;
            }));

            const foundInBatch = batchResults.filter(r => r !== null);
            if (foundInBatch.length > 0) {
                streams.push(...foundInBatch);
                console.error(`[SHREDDER] Kaynak bulundu, tarama durduruluyor.`);
                break; // İlk bulduğumuz grupta videoyu alıp çıkıyoruz!
            }
        }

        return streams;
    } catch (err) { return []; }
}

module.exports = { getStreams };
