var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "9.0.0-ONLY-MIXDROP";

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        // 1. TMDB Verisini Çek
        const typePath = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${typePath}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`;
        
        const tmdbRes = await fetch(tmdbUrl);
        const d = await tmdbRes.json();
        
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const title = d.title || d.name || "İçerik";
        
        if (!imdbId || !imdbId.startsWith('tt')) return [];

        // 2. Formatı Belirle (Film/Dizi)
        let suffix = "";
        let displayTitle = title;

        if (mediaType === 'movie') {
            const releaseYear = (d.release_date || '').slice(0, 4);
            displayTitle += releaseYear ? ` (${releaseYear})` : "";
        } else {
            let sStr = "s" + season;
            let eStr = "e" + (episode < 10 ? "0" + episode : episode);
            suffix = `/${sStr}/${eStr}`;
            displayTitle += ` - ${sStr.toUpperCase()}${eStr.toUpperCase()}`;
        }

        // 3. SADECE MIXDROP KONTROLÜ
        // Genellikle vidmody.com/mx/tt... veya vidmody.com/mix/tt... kullanılır
        const mixdropUrl = `https://vidmody.com/mx/${imdbId}${suffix}`;

        try {
            const checkRes = await fetch(mixdropUrl, { 
                method: 'HEAD',
                headers: { 'Referer': 'https://vidmody.com/' }
            });
            
            if (checkRes.status === 200) {
                return [{
                    url: mixdropUrl,
                    name: "Mixdrop", // Uygulama ekranında görünecek isim
                    title: displayTitle,
                    quality: "1080p",
                    headers: {
                        'Referer': 'https://vidmody.com/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36'
                    }
                }];
            }
        } catch (err) {
            console.log("Mixdrop linki bulunamadı veya erişilemedi.");
        }

        return []; // Hiçbir şey bulunamazsa boş liste dön

    } catch (e) {
        console.error(`[V${VERSION}] HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
