/**
 * JetFilmizle - Nuvio Ultra (v68 Fixed)
 * Syntax hatası giderildi, dünkü çalışan 'DFADX' mantığına odaklanıldı.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        
        const slug = (info.name || "").toLowerCase()
            .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
            .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
            
        const targetUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;

        const pageRes = await fetch(targetUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
        });
        const html = await pageRes.text();

        // 1. ADIM: Sayfadaki tüm 10-15 karakterli adayları topla (DFADX dahil)
        const pattern = /[a-zA-Z0-9_-]{10,15}/g;
        const matches = html.match(pattern) || [];
        const candidates = [...new Set(matches)].filter(c => 
            !/google|manager|script|Yandex|Active|Object|webkit/i.test(c)
        );

        // 2. ADIM: Adayları test et
        for (let key of candidates.reverse()) {
            try {
                const response = await fetch(`https://videopark.top/titan/w/${key}`, {
                    headers: {
                        'Referer': targetUrl,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    }
                });

                const content = await response.text();

                if (content.includes('_sd')) {
                    const sdMatch = content.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                    if (sdMatch) {
                        const data = JSON.parse(sdMatch[1]);
                        return [{
                            name: "Jet-Titan (Fixed)",
                            url: data.stream_url,
                            type: "hls",
                            headers: { 
                                'Referer': 'https://videopark.top/',
                                'User-Agent': 'Mozilla/5.0'
                            }
                        }];
                    }
                }
            } catch (e) {
                // Hata durumunda bir sonraki adaya geç
            }
        }
        return [];
    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
