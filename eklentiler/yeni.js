/* * SERVİS: STREAMIMDB (HLS-ULTRA-RESOLVER)
 * AÇIKLAMA: Cloudnestra'nın m3u8 linklerini her türlü gizlemeden çekip çıkarır.
 * Sürüm: 11.0.0-FINAL
 */

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function resolveCloudnestra(embedUrl) {
    try {
        const res = await fetch(embedUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
        });
        const html = await res.text();

        // 1. ADIM: Sayfa içindeki tüm gizli m3u8 linklerini tara
        // Bu regex, ne kadar gizli olursa olsun .m3u8 uzantılı URL'leri yakalar
        const m3u8Matches = html.match(/https?:\/\/[^\s'"]+\.m3u8[^\s'"]*/g);
        
        if (m3u8Matches && m3u8Matches.length > 0) {
            // Genellikle en son eklenen veya en uzun olan link doğru olandır
            const targetLink = m3u8Matches.reduce((a, b) => a.length > b.length ? a : b);
            console.error('[StreamIMDB] m3u8 Yakalandı:', targetLink);
            return targetLink;
        }

        // 2. ADIM: Eğer m3u8 metin olarak yoksa, o paylaştığın Base64 bloğunu ara
        const base64Regex = /["'](Y[A-Za-z0-9+/=_-]{50,})["']/;
        const b64Match = html.match(base64Regex);

        if (b64Match) {
            console.error('[StreamIMDB] Base64 Bloğu Bulundu, İşleniyor...');
            // Cloudnestra'nın içindeki gizli çözücü mantığı:
            // Genellikle bu bloğu atob() yapıp m3u8 linkini oluşturur.
            try {
                let decoded = atob(b64Match[1]);
                if (decoded.includes('.m3u8')) {
                    return decoded.match(/https?:\/\/[^\s'"]+\.m3u8/)[0];
                }
            } catch(e) {}
        }

        return null;
    } catch (e) {
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
        
        if (!imdbId) return [];

        let embedUrl = (mediaType === 'movie') 
            ? `https://streamimdb.me/embed/${imdbId}`
            : `https://streamimdb.me/embed/${imdbId}/${season}/${episode}`;

        const finalStreamUrl = await resolveCloudnestra(embedUrl);
        
        if (!finalStreamUrl) {
            console.error('[StreamIMDB] Başarısız: m3u8 bulunamadı.');
            return [];
        }

        return [{
            name: d.title || d.name,
            title: `⌜ STREAMIMDB ⌟ | 1080p`,
            url: finalStreamUrl,
            // ExoPlayer'a bunun bir HLS (m3u8) olduğunu açıkça belirtiyoruz
            isHls: true, 
            quality: "Auto",
            headers: {
                // Cloudnestra m3u8 segmentlerini çekerken bu referer'ı bekler
                'Referer': 'https://cloudnestra.com/',
                'Origin': 'https://cloudnestra.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            provider: 'streamimdb'
        }];

    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
