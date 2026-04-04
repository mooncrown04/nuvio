var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "6.1.0-PURE-GEN"; // Sürüm güncellendi

async function getStreams(tmdbId, mediaType) {
    // TV şovlarını (dizileri) engellemek istersen bu satır kalabilir
    if (mediaType === 'tv') return [];

    try {
        // 1. TMDB'den IMDb ID'sini ve film adını alıyoruz
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const movieTitle = d.title || "Bilinmeyen Film";
        const releaseYear = (d.release_date || '').slice(0, 4);

        const results = [];

        // 2. Eğer IMDb ID mevcutsa, Vidmody gibi çalışan diğer linkleri oluştur
        if (imdbId && imdbId.startsWith('tt')) {
            
            // Alternatif 1: Vidsrc.to
            results.push({
                url: `https://vidsrc.to/embed/movie/${imdbId}`,
                name: movieTitle,
                title: `[VidSrc] ${movieTitle} (${releaseYear})`,
                quality: "1080p",
                score: 100
            });

            // Alternatif 2: Multiembed.mov
            results.push({
                url: `https://multiembed.mov/?video_id=${imdbId}`,
                name: movieTitle,
                title: `[MultiEmbed] ${movieTitle} (${releaseYear})`,
                quality: "1080p",
                score: 95
            });

            // İstersen orijinal Vidmody linkini de burada tutabilirsin:
            /*
            results.push({
                url: `https://vidmody.com/vs/${imdbId}`,
                name: movieTitle,
                title: `[Vidmody] ${movieTitle} (${releaseYear})`,
                quality: "1080p",
                score: 90
            });
            */
        }

        return results;

    } catch (e) {
        console.error(`[V${VERSION}] HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
