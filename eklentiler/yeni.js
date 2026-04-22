/**
 * JetFilmizle - Nuvio Ultra (v39 The Architect)
 * Klasik taramayı bırakır; filmId/epId ikilisine odaklanır.
 * Sitenin kendi AJAX yapısını kullanarak gerçek video anahtarını söküp alır.
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

        // 1. ADIM: Sayfanın derinliklerindeki kritik ID'leri yakala
        // Geliştirici bunları 'data-id', 'film-id' veya 'post-id' olarak saklıyor.
        const filmIdMatch = html.match(/filmId\s*[:=]\s*["']?(\d+)["']?/i) || html.match(/data-id=["'](\d+)["']/i);
        const epIdMatch = html.match(/epId\s*[:=]\s*["']?(\d+)["']?/i) || html.match(/data-episode=["'](\d+)["']/i);
        
        const postId = filmIdMatch ? filmIdMatch[1] : null;
        const episodeId = epIdMatch ? epIdMatch[1] : null;

        console.error(`[ARCHITECT] PostID: ${postId}, EpID: ${episodeId}`);

        let candidates = [];

        // 2. ADIM: Eğer AJAX ID'lerini bulduysak, sistemin anahtarını sök
        // Titan ID'si genelde bu ID'lerin yanındaki şifreli bir string'dir.
        if (postId) {
            // Sayfa sonundaki o "bilinen ama saklanan" devasa JS bloğunu tara
            const scriptBlocks = html.match(/<script[\s\S]*?<\/script>/g) || [];
            for (let script of scriptBlocks) {
                if (script.includes(postId)) {
                    // Script içindeki 11-12 haneli karmaşık yapıları (Titan ID) çek
                    const matches = script.match(/[a-zA-Z0-9]{11,12}/g);
                    if (matches) candidates.push(...matches);
                }
            }
        }

        // 3. ADIM: Gereksiz 95 aday yerine, sadece nokta atışı 5 aday
        candidates = [...new Set(candidates)].filter(c => /[0-9]/.test(c) && /[A-Z]/.test(c)).slice(0, 5);

        let streams = [];
        for (let wId of candidates) {
            try {
                // Videopark'a direkt 'w' (worker) üzerinden değil, 
                // daha önce keşfettiğimiz alternatif 'v' veya 'embed' yoluyla sızmayı dene
                const paths = [`titan/w/${wId}`, `ajax/v/${wId}`];
                
                for (let path of paths) {
                    const wRes = await fetch(`https://videopark.top/${path}`, { 
                        headers: { 'Referer': BASE_URL, 'User-Agent': 'Mozilla/5.0' } 
                    });
                    const wHtml = await wRes.text();
                    
                    if (wHtml.includes('_sd')) {
                        const sdMatch = wHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                        if (sdMatch) {
                            const data = JSON.parse(sdMatch[1]);
                            return [{
                                name: "Jet-Architect",
                                url: data.stream_url,
                                type: "hls",
                                headers: { 'Referer': 'https://videopark.top/' }
                            }];
                        }
                    }
                }
            } catch (e) {}
        }

        return streams;
    } catch (err) { return []; }
}

module.exports = { getStreams };
