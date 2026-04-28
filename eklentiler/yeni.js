/* * SERVİS: STREAMIMDB (STABLE RESOLVER V2)
 * AÇIKLAMA: Cloudnestra linklerini daha derin tarayarak çözer.
 * Sürüm: 9.6.0-DEEP-SCAN
 */

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function resolveCloudnestra(embedUrl) {
    try {
        const res = await fetch(embedUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://streamimdb.me/'
            }
        });
        const html = await res.text();

        // 1. Yöntem: Düz m3u8 araması
        const m3u8Regex = /(https:\/\/cloudnestra\.com\/hls\/[^\s'"]+\.m3u8)/;
        const match = html.match(m3u8Regex);
        if (match) return match[1];

        // 2. Yöntem: Base64 şifreli olabilir, sayfadaki tüm tırnak içindeki metinleri tara
        const allStrings = html.match(/"[A-Za-z0-9+/=]{20,}"/g) || [];
        for (let str of allStrings) {
            try {
                const decoded = atob(str.replace(/"/g, ''));
                if (decoded.includes('cloudnestra.com')) {
                    const found = decoded.match(/https?:\/\/[^\s'"]+\.m3u8/);
                    if (found) return found[0];
                }
            } catch(e) {}
        }

        // 3. Yöntem: Hiçbir şey bulunamazsa hata bas
        console.error('[StreamIMDB] HATA: Sayfa içinde m3u8 linki bulunamadı!');
        return null; 
    } catch (e) {
        console.error('[StreamIMDB] Sayfa çekme hatası:', e.message);
        return null;
    }
}

async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        const typePath = (mediaType === 'movie') ? 'movie' : 'tv';
        const tmdbUrl = `https://api.themoviedb.org/3/${typePath}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR&append_to_response=external_ids`;
        
        const tmdbRes = await fetch(tmdbUrl);
        const d = await tmdbRes.json();
        
        const imdbId = d.external_ids ? d.external_ids.imdb_id : null;
        const title = d.title || d.name || "İçerik";
        
        if (!imdbId) return [];

        let embedUrl = (mediaType === 'movie') 
            ? `https://streamimdb.me/embed/${imdbId}`
            : `https://streamimdb.me/embed/${imdbId}/${season}/${episode}`;

        console.error('[StreamIMDB] Kaynak aranıyor:', embedUrl);

        const finalStreamUrl = await resolveCloudnestra(embedUrl);
        
        if (!finalStreamUrl) {
            console.error('[StreamIMDB] Video linki çözülemedi, iptal ediliyor.');
            return [];
        }

        console.error('[StreamIMDB] BAŞARILI: Çözülen Link:', finalStreamUrl);

        return [{
            name: title,
            title: `⌜ STREAMIMDB ⌟ | HD`,
            url: finalStreamUrl,
            quality: "Auto",
            headers: {
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
