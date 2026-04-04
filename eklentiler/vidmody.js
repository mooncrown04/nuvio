var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "6.3.0-STREAM-DIRECT";

async function getStreams(tmdbId, mediaType) {
    if (mediaType === 'tv') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const movieTitle = d.title || "Film";

        if (!imdbId) return [];

        const results = [];

        // Vidmody benzeri, direkt stream odaklı çalışan yapı örnekleri:
        
        // Kaynak 1: Vidmody (Zaten kullandığın)
        results.push({
            url: `https://vidmody.com/vs/${imdbId}`,
            title: `[Vidmody] ${movieTitle}`,
            quality: "1080p",
            score: 100
        });

        // Kaynak 2: Vidsrc (Stream alternatifi)
        // Not: Bazı sürümlerde /pro/ eki direkt stream tetikleyebilir
        results.push({
            url: `https://vidsrc.me/embed/${imdbId}/`, 
            title: `[Vidsrc-ME] ${movieTitle}`,
            quality: "1080p",
            score: 80
        });

        return results;

    } catch (e) {
        // Loglardaki hatayı yakalamak için detaylı error
        console.error(`[V${VERSION}] Stream Hatası: ${e.message}`);
        return [];
    }
}
