var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "8.1.0-STREAMIMDB-VERIFIED";

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        // 1. TMDB Verisini Çek (IMDb ID almak için)
        const typePath = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${typePath}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`;
        
        const tmdbRes = await fetch(tmdbUrl);
        const d = await tmdbRes.json();
        
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const title = d.title || d.name || "İçerik";
        
        if (!imdbId || !imdbId.startsWith('tt')) return [];

        // 2. URL Formatını Belirle (StreamIMDB Formatı)
        let targetUrl = "";
        let displayTitle = `⌜ STREAMIMDB ⌟ | `;

        if (mediaType === 'movie') {
            // Örnek: https://streamimdb.me/embed/tt1270797
            targetUrl = `https://streamimdb.me/embed/${imdbId}`;
            const releaseYear = (d.release_date || '').slice(0, 4);
            displayTitle += title + (releaseYear ? ` (${releaseYear})` : "");
        } else {
            // Dizi için genellikle araya sezon/bölüm eklenir
            // Örnek: https://streamimdb.me/embed/tt1234567/1/1
            targetUrl = `https://streamimdb.me/embed/${imdbId}/${season}/${episode}`;
            displayTitle += `${title} - S${season}E${episode}`;
        }

        // 3. Linki Döndür
        // Not: Bu tarz embed servisleri HEAD isteğine (403/405) hata verebilir, 
        // o yüzden direkt objeyi döndürmek en sağlıklısıdır.
        return [{
            name: title, // Üstte görünen isim
            title: displayTitle, // Altta görünen detay
            url: targetUrl,
            quality: "Auto",
            headers: {
                'Referer': 'https://streamimdb.me/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            provider: 'streamimdb'
        }];

    } catch (e) {
        console.error(`[V${VERSION}] HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
