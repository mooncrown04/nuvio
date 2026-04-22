/**
 * JetFilmizle - Nuvio Ultra (v53 Final Strike)
 * Belleği ve sertifika kontrolünü yormadan tekil vuruş yapar.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
        const targetUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;

        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // 1. ADIM: Doğrulanmış 12 haneli TITAN kodu
        const pattern = /[a-zA-Z0-9]{12}/g;
        let matches = html.match(pattern) || [];
        let finalId = matches.reverse().find(k => /[0-9]/.test(k) && /[A-Z]/.test(k) && !/google|manager|Active|Object/i.test(k));

        if (!finalId) return [];

        // 2. ADIM: Tek ve Yalın İstek (Kanıt kodundaki gibi)
        const response = await fetch(`https://videopark.top/titan/w/${finalId}`, {
            headers: {
                'Referer': BASE_URL + '/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        
        const content = await response.text();

        // 3. ADIM: _sd Ayıklama (Regex ile doğrudan)
        if (content.includes('_sd')) {
            const sdPart = content.split('var _sd = ')[1].split('};')[0] + '}';
            const data = JSON.parse(sdPart);

            return [{
                name: "Jet-Titan (Series)",
                url: data.stream_url,
                type: "hls",
                subtitles: data.subtitles ? data.subtitles.map(s => ({
                    url: s.file, language: s.label, format: "vtt"
                })) : [],
                headers: { 
                    'Referer': 'https://videopark.top/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                }
            }];
        }

        return [];
    } catch (err) { return []; }
}

module.exports = { getStreams };
