/* * SERVİS: STREAMIMDB (CLOUDNESTRA AUTO-RESOLVER)
 * AÇIKLAMA: Sayfa içindeki cloudnestra m3u8 linkini otomatik bulur ve çözer.
 * Sürüm: 9.5.0-STABLE-RESOLVER
 */

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

// Sayfadaki gizli m3u8 linkini ayıklayan fonksiyon (MediaFire mantığı)
async function resolveCloudnestra(embedUrl) {
    try {
        const res = await fetch(embedUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await res.text();

        // Cloudnestra m3u8 linkini yakalayan Regex
        const regex = /"(https:\/\/cloudnestra\.com\/hls\/[^"]+\.m3u8)"/;
        const match = html.match(regex);

        if (match && match[1]) {
            return match[1];
        } else {
            // Eğer tırnak içinde değilse direkt metin olarak ara
            const regexAlt = /https:\/\/cloudnestra\.com\/hls\/[^\s'"]+\.m3u8/;
            const matchAlt = html.match(regexAlt);
            return matchAlt ? matchAlt[0] : embedUrl;
        }
    } catch (e) {
        console.error('[StreamIMDB] Resolver Hatası:', e.message);
        return embedUrl;
    }
}

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        // 1. TMDB Verisini Çek
        const typePath = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${typePath}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`;
        
        const tmdbRes = await fetch(tmdbUrl);
        const d = await tmdbRes.json();
        
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const title = d.title || d.name || "İçerik";
        
        if (!imdbId || !imdbId.startsWith('tt')) {
            console.error('[StreamIMDB] Hata: IMDb ID bulunamadı.');
            return [];
        }

        // 2. Embed URL'sini Oluştur
        let embedUrl = (mediaType === 'movie') 
            ? `https://streamimdb.me/embed/${imdbId}`
            : `https://streamimdb.me/embed/${imdbId}/${season}/${episode}`;

        console.error('[StreamIMDB] Çözülüyor:', embedUrl);

        // 3. Cloudnestra Linkini Otomatik Çek (Resolver Çalışıyor)
        const finalStreamUrl = await resolveCloudnestra(embedUrl);
        
        console.error('[StreamIMDB] Ham Veri (Final URL):', finalStreamUrl);

        // 4. Sonucu Döndür
        return [{
            name: title,
            title: `⌜ STREAMIMDB ⌟ | CLOUDNESTRA`,
            url: finalStreamUrl,
            quality: "Auto",
            headers: {
                // Cloudnestra'nın çalışması için bu headerlar ŞART
                'Referer': 'https://streamimdb.me/',
                'Origin': 'https://streamimdb.me',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            provider: 'streamimdb'
        }];

    } catch (e) {
        console.error('[StreamIMDB] Kritik Hata:', e.message);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
