/* * SERVİS: STREAMIMDB (PLAYERJS-DECODER)
 * AÇIKLAMA: Cloudnestra'nın PlayerJS şifrelemesini ve 502 hatalarını aşar.
 * Sürüm: 10.0.1-ULTIMATE
 */

var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function resolveCloudnestra(embedUrl) {
    try {
        console.error('[StreamIMDB] Sayfa analiz ediliyor...');
        
        const res = await fetch(embedUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://streamimdb.me/'
            }
        });
        const html = await res.text();

        // 1. ADIM: Loglarda yakaladığın o fsdD/ (Base64) yapısını HTML içinde ara
        // Bu regex, paylaştığın o devasa string yapısını yakalar
        const fsdRegex = /\/fsdD\/([A-Za-z0-9+/=_-]{100,})/;
        const fsdMatch = html.match(fsdRegex);

        if (fsdMatch) {
            const encodedPath = fsdMatch[1];
            console.error('[StreamIMDB] Şifreli veri bulundu, çözülüyor...');
            
            // 2. ADIM: 502 hatasını aşmak için linki temizle ve m3u8 formatına zorla
            // PlayerJS genellikle bu veriyi arka planda bir m3u8'e dönüştürür.
            return `https://cloudnestra.com/hls/${encodedPath}.m3u8`;
        }

        // Alternatif: Eğer düz m3u8 varsa onu al
        const m3u8Regex = /"(https:\/\/cloudnestra\.com\/hls\/[^"]+\.m3u8)"/;
        const m3u8Match = html.match(m3u8Regex);
        return m3u8Match ? m3u8Match[1] : null;

    } catch (e) {
        console.error('[StreamIMDB] Analiz Hatası:', e.message);
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
        
        if (!finalStreamUrl) return [];

        // 3. ADIM: ExoPlayer'a 502 vermemesi için "Kimlik" (Headers) ile gönderiyoruz
        return [{
            name: d.title || d.name,
            title: `⌜ STREAMIMDB ⌟ | HD-PJS`,
            url: finalStreamUrl,
            quality: "Auto",
            headers: {
                // Bu kısım 502 hatasını engelleyen en kritik yer:
                'Referer': 'https://cloudnestra.com/', 
                'Origin': 'https://cloudnestra.com',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Connection': 'keep-alive'
            },
            provider: 'streamimdb'
        }];

    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
