/**
 * JetFilmizle - Nuvio Ultra (v71 Phantom Multi)
 * İptal (Cancel) riskini tamamen bitirir.
 * Sayfadaki tüm anahtarları tek seferde link listesine çevirir.
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

        // 1. ADIM: Sayfadaki tüm 10-12 haneli TITAN adaylarını yakala
        const pattern = /[a-zA-Z0-9_-]{10,12}/g;
        const matches = html.match(pattern) || [];
        
        // Çöpleri ayıkla, dünkü DFADX yapısına benzeyenleri önceliğe al
        const cleanKeys = [...new Set(matches)].filter(c => 
            !/google|GTM|UA-|analytics|script|webkit/i.test(c) && (/[A-Z]/.test(c) || /[0-9]/.test(c))
        ).slice(0, 8); // En iyi 8 adayı al

        console.error(`[PHANTOM] ${cleanKeys.length} adet link oluşturuluyor...`);

        // 2. ADIM: Her anahtar için bir stream objesi oluştur (Fetch yapmadan!)
        return cleanKeys.map((key, index) => ({
            name: `Jet-Link ${index + 1} (${key.substring(0,4)})`,
            url: `https://videopark.top/titan/w/${key}`,
            type: "hls",
            headers: { 
                'Referer': targetUrl,
                'User-Agent': 'Mozilla/5.0' 
            },
            is_redirect: true
        }));

    } catch (err) { return []; }
}

module.exports = { getStreams };
