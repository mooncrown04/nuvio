/**
 * JetFilmizle - Nuvio Ultra (v73)
 * SENİN BULDUĞUN ÇALIŞAN KODU (DFADXFgPDU4) TEMEL ALIR.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    // SENİN VERDİĞİN VE ÇALIŞTIĞINI BİLDİĞİMİZ KOD
    const KNOWN_WORKING_KEY = "DFADXFgPDU4"; 

    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || "").toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const targetUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;

        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // 1. ADIM: Sayfada senin koduna benzeyen (11 haneli) yeni bir kod var mı bak?
        const pattern = /[a-zA-Z0-9_-]{11}/g;
        const matches = html.match(pattern) || [];
        const dynamicKey = matches.find(c => /[A-Z]/.test(c) && /[0-9]/.test(c) && !/google|GTM/i.test(c));

        // 2. ADIM: Eğer sayfada yeni kod bulursak onu, bulamazsak SENİN KODUNU kullan
        const finalKey = dynamicKey || KNOWN_WORKING_KEY;

        console.error(`[JET-FINAL] Kullanılan Anahtar: ${finalKey}`);

        // 3. ADIM: Doğrudan Videopark sorgusunu at
        const response = await fetch(`https://videopark.top/titan/w/${finalKey}`, {
            headers: { 
                'Referer': targetUrl,
                'User-Agent': 'Mozilla/5.0' 
            }
        });

        const content = await response.text();

        if (content.includes('_sd')) {
            const data = JSON.parse(content.match(/var\s+_sd\s*=\s*({[\s\S]*?});/)[1]);
            return [{
                name: "Jet-Working (TITAN)",
                url: data.stream_url,
                type: "hls",
                headers: { 
                    'Referer': 'https://videopark.top/',
                    'User-Agent': 'Mozilla/5.0'
                }
            }];
        }

        // Eğer hiçbir şey olmazsa, en azından player'a gitmeyi denetelim
        return [{
            name: "Jet-Link (Direct)",
            url: `https://videopark.top/titan/w/${finalKey}`,
            type: "hls",
            is_redirect: true,
            headers: { 'Referer': targetUrl }
        }];

    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
