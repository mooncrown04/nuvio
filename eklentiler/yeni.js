/* * SERVİS: STREAMIMDB (Embed)
 * AÇIKLAMA: IMDb ID üzerinden film ve dizi stream linkleri sağlar.
 * Sürüm: 8.3.0-ERROR-LOGGING-VERIFIED
 */

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        // 1. TMDB Verisini Çek
        const typePath = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${typePath}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`;
        
        const tmdbRes = await fetch(tmdbUrl);
        const d = await tmdbRes.json();
        
        // HAM VERİ KONTROLÜ (TMDB'den gelen tüm veri)
        console.error('[StreamIMDB] TMDB Ham Veri:', JSON.stringify(d));
        
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const title = d.title || d.name || "İçerik";
        
        if (!imdbId || !imdbId.startsWith('tt')) {
            console.error('[StreamIMDB] Hata: Geçerli bir IMDb ID bulunamadı.');
            return [];
        }

        // 2. URL Formatını Belirle
        let targetUrl = "";
        let displayTitle = `⌜ STREAMIMDB ⌟ | `;

        if (mediaType === 'movie') {
            targetUrl = `https://streamimdb.me/embed/${imdbId}`;
            const releaseYear = (d.release_date || '').slice(0, 4);
            displayTitle += title + (releaseYear ? ` (${releaseYear})` : "");
        } else {
            targetUrl = `https://streamimdb.me/embed/${imdbId}/${season}/${episode}`;
            displayTitle += `${title} - S${season}E${episode}`;
        }

        // 3. Link Doğrulama (GET Kontrolü)
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); 

            const checkRes = await fetch(targetUrl, { 
                method: 'GET', 
                signal: controller.signal,
                headers: { 'User-Agent': 'Mozilla/5.0' } 
            });
            
            clearTimeout(timeoutId);

            // HAM VERİ KONTROLÜ (Siteden dönen HTTP Durumu)
            console.error('[StreamIMDB] Hedef URL Durumu:', checkRes.status, '| URL:', targetUrl);

            if (checkRes.status === 404) {
                console.error('[StreamIMDB] Link geçersiz (404 Not Found)');
                return [];
            }
            
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
            console.error('[StreamIMDB] Bağlantı Hatası veya Timeout:', linkErr.message);
            return [];
        }

    } catch (e) {
        console.error('[StreamIMDB] Kritik Sistem Hatası:', e.message);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
