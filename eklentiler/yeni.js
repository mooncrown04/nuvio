/**
 * JetFilmizle - Nuvio Ultra (v50 Decoded Truth)
 * Yakalanan Base64 (MTc3Njg1MzE2 vb.) veriyi işler.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
        const targetUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;

        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // 1. ADIM: Loglarda yakaladığımız o meşhur Base64 formatını avla
        // MTc3... gibi 12+ karakterli Base64 yapıları
        const b64Pattern = /[A-Za-z0-9+/]{12,}={0,2}/g;
        let matches = html.match(b64Pattern) || [];
        
        // Logda çıkan 'MTc3Njg1MzE2' benzeri olanı bul
        let rawB64 = matches.find(m => m.startsWith('MTc3') || m.length > 10);
        
        if (!rawB64) return [];
        console.error(`[DECODED] Ham Veri Yakalandı: ${rawB64}`);

        // 2. ADIM: İkili Strateji (Hem Ham hem Decode)
        let candidates = [rawB64];
        try {
            let decoded = Buffer.from(rawB64, 'base64').toString('utf-8');
            if (decoded && decoded.length > 3) candidates.push(decoded);
        } catch(e) {}

        for (let wId of candidates) {
            try {
                // Videopark'ın hem titan/w hem de doğrudan embed yollarını dene
                const testUrls = [
                    `https://videopark.top/titan/w/${wId}`,
                    `https://videopark.top/get_player?id=${wId}`
                ];

                for (let pUrl of testUrls) {
                    const response = await fetch(pUrl, {
                        headers: { 'Referer': BASE_URL + '/', 'User-Agent': 'Mozilla/5.0' },
                        timeout: 3000
                    });
                    const pContent = await response.text();

                    if (pContent.includes('_sd')) {
                        const data = JSON.parse(pContent.match(/var\s+_sd\s*=\s*({[\s\S]*?});/)[1]);
                        console.error(`[SUCCESS] Akış Çözüldü: ${wId}`);
                        return [{
                            name: "Jet-Ultra (Decoded)",
                            url: data.stream_url,
                            type: "hls",
                            subtitles: data.subtitles ? data.subtitles.map(s => ({
                                url: s.file, language: s.label, format: "vtt"
                            })) : [],
                            headers: { 'Referer': 'https://videopark.top/', 'User-Agent': 'Mozilla/5.0' }
                        }];
                    }
                }
            } catch (e) {}
        }
        return [];
    } catch (err) { return []; }
}

module.exports = { getStreams };
