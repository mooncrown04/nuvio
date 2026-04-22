/**
 * JetFilmizle - Nuvio Ultra (v48 Final Series)
 * RAM dostu, sadece en güçlü Titan koduna odaklanır.
 * Amazon Fire/TV sistemlerini yormaz.
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

        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        const html = await pageRes.text();

        // 1. ADIM: 7 aday arasından "En Güçlü" olanı seç (Genelde DFADX ile başlar)
        const titanMatches = html.match(/DFADX[a-zA-Z0-9]{5,20}/g) || [];
        const generalMatches = html.match(/[a-zA-Z0-9]{11,12}/g) || [];
        
        // Önce DFADX olanları, yoksa diğerlerini al. Sadece benzersizleri tut.
        let allCandidates = [...new Set([...titanMatches, ...generalMatches])].filter(k => 
            /[0-9]/.test(k) && /[A-Z]/.test(k) && k.length > 8
        );

        // KRİTİK: Sadece son 2 adayı al (Çünkü güncel olanlar genelde sayfa sonunda olur)
        let primaryCandidates = allCandidates.slice(-2); 

        console.error(`[FINAL] 7 adaydan elenen en güçlü 2 hedef: ${primaryCandidates.join(', ')}`);

        for (let wId of primaryCandidates) {
            try {
                // Senin kanıt kodundaki o meşhur endpoint ve referer
                const response = await fetch(`https://videopark.top/titan/w/${wId}`, {
                    headers: {
                        'Referer': BASE_URL + '/',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 3000 // Çok hızlı cevap bekliyoruz
                });
                
                const playerHtml = await response.text();

                if (playerHtml.includes('_sd')) {
                    const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                    if (sdMatch) {
                        const data = JSON.parse(sdMatch[1]);
                        console.error(`[FINAL-SUCCESS] Akış Yakalandı: ${wId}`);

                        return [{
                            name: "Jet-Titan (Dizi)",
                            url: data.stream_url,
                            type: "hls",
                            subtitles: data.subtitles ? data.subtitles.map(s => ({
                                url: s.file,
                                language: s.label,
                                format: "vtt"
                            })) : [],
                            headers: {
                                'Referer': 'https://videopark.top/',
                                'User-Agent': 'Mozilla/5.0'
                            }
                        }];
                    }
                }
            } catch (e) {
                console.error(`[FINAL] Başarısız: ${wId}`);
            }
        }

        return [];
    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
