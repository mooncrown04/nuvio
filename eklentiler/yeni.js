var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';
var VERSION      = "8.2.0-STREAMIMDB-VERIFIED-CONTROL";

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

        // 2. URL Formatını Belirle
        let targetUrl = "";
        let displayTitle = `⌜ STREAMIMDB ⌟ | `;

        if (mediaType === 'movie') {
            targetUrl = `https://streamimdb.me/embed/${imdbId}`;
            const releaseYear = (d.release_date || '').slice(0, 4);
            displayTitle += title + (releaseYear ? ` (${releaseYear})` : "");
        } else {
            // Dizi formatı: /tt1234567/1/1
            targetUrl = `https://streamimdb.me/embed/${imdbId}/${season}/${episode}`;
            displayTitle += `${title} - S${season}E${episode}`;
        }

        // 3. Link Doğrulama (VİDMODY'DEKİ GİBİ KONTROL)
        try {
            // Embed siteleri bazen HEAD reddeder, bu yüzden GET ile ama çok kısa bir süre bekleyerek bakıyoruz
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 saniye içinde cevap gelmezse iptal et

            const checkRes = await fetch(targetUrl, { 
                method: 'GET', 
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0' } 
            });
            
            clearTimeout(timeoutId);

            // Eğer sayfa 404 (bulunamadı) dönüyorsa linki gösterme
            if (checkRes.status === 404) {
                console.log(`[V${VERSION}] Link bulunamadı (404): ${targetUrl}`);
                return [];
            }
            
            // Link sağlamsa objeyi döndür
            return [{
                name: title,
                title: displayTitle,
                url: targetUrl,
                quality: "Auto",
                headers: {
                    'Referer': 'https://streamimdb.me/',
                    'User-Agent': 'Mozilla/5.0'
                },
                provider: 'streamimdb'
            }];

        } catch (linkErr) {
            // Eğer site fetch isteğini tamamen engellerse (CORS vb.), 
            // risk almamak için boş dönüyoruz (Vidmody mantığı)
            return [];
        }

    } catch (e) {
        console.error(`[V${VERSION}] HATA: ${e.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
