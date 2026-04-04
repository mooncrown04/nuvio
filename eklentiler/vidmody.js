var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "6.2.0-PURE-DEBUG";

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    console.log(`[V${VERSION}] İstek Başlatıldı: TMDB ID -> ${tmdbId}`);

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        
        if (!tmdbRes.ok) {
            throw new Error(`TMDB API Hatası: ${tmdbRes.status}`);
        }

        const d = await tmdbRes.json();
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const movieTitle = d.title || "Bilinmeyen Film";
        const releaseYear = (d.release_date || '').slice(0, 4);

        if (!imdbId) {
            console.error(`[V${VERSION}] HATA: Bu film için IMDb ID bulunamadı!`);
            return [];
        }

        const results = [];

        // --- SOURCE 1: VidSrc ---
        // Reklam korumasını bir nebze aşmak için 'referer' bilgisi gerekebilir
        results.push({
            url: `https://vidsrc.to/embed/movie/${imdbId}`,
            name: "VidSrc (Global)",
            title: `[VidSrc] ${movieTitle}`,
            quality: "1080p",
            score: 100,
            headers: {
                "Referer": "https://vidsrc.to/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        // --- SOURCE 2: MultiEmbed ---
        results.push({
            url: `https://multiembed.mov/?video_id=${imdbId}`,
            name: "MultiEmbed",
            title: `[Multi] ${movieTitle}`,
            quality: "1080p",
            score: 90,
            headers: {
                "Referer": "https://multiembed.mov/",
                "Origin": "https://multiembed.mov"
            }
        });

        console.log(`[V${VERSION}] Başarılı: ${results.length} kaynak oluşturuldu.`);
        return results;

    } catch (e) {
        // Detaylı hata logu: Hangi aşamada patladığını görmeni sağlar
        console.error(`[V${VERSION}] KRİTİK HATA: ${e.stack || e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
