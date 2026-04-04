var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "7.0.0-TV-AUTO";

async function getStreams(tmdbId, mediaType, season, episode) {
    // Bu dosya sadece diziler (tv) için çalışacak şekilde ayarlandı
    if (mediaType !== 'tv') return [];

    try {
        // 1. TMDB'den dizinin ana IMDb ID'sini alıyoruz
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`);
        const d = await tmdbRes.json();
        
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const showName = d.name || "Bilinmeyen Dizi";

        const results = [];

        // 2. Eğer IMDb ID varsa, dizi formatında linki oluştur (tt.../sezon/bolum)
        if (imdbId && imdbId.startsWith('tt')) {
            results.push({
                url: `https://vidmody.com/vs/${imdbId}/${season}/${episode}`, 
                name: `${showName} - S${season}E${episode}`,
                title: `[Vidmody-TV] ${showName} (Sezon ${season} / Bölüm ${episode})`,
                quality: "1080p",
                score: 100
            });
        }

        return results;

    } catch (e) {
        console.error(`[V${VERSION}] HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
