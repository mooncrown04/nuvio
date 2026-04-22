/**
 * JetFilmizle - Nuvio Ultra (v47 Turbo)
 * Sadece dizilere odaklanır. 
 * 7 aday arasından en hızlı cevabı veren "Titan"ı yakalar.
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

        // 1. ADIM: "Ham Veri" tespiti (Logda gördüğümüz o 7 aday)
        // DFADX ile başlayanlar her zaman en önceliklidir
        const titanPattern = /DFADX[a-zA-Z0-9]{5,20}/g;
        const fallbackPattern = /[a-zA-Z0-9]{11,12}/g;
        
        let matches = html.match(titanPattern) || [];
        if (matches.length === 0) matches = html.match(fallbackPattern) || [];

        let uniqueKeys = [...new Set(matches)].filter(k => 
            /[0-9]/.test(k) && /[A-Z]/.test(k) && k.length > 8
        ).slice(0, 7); // Logdaki 7 adayı sınırla

        console.error(`[TURBO] Hedeflenen 7 aday sorgulanıyor...`);

        // 2. ADIM: Eşzamanlı (Parallel) değil, Sıralı (Sequential) ama Hızlı Tarama
        // Cihazın şişmemesi için 2'şerli gruplar halinde deneyelim
        for (let i = 0; i < uniqueKeys.length; i++) {
            const wId = uniqueKeys[i];
            try {
                const playerUrl = `https://videopark.top/titan/w/${wId}`;
                
                const response = await fetch(playerUrl, {
                    headers: {
                        'Referer': BASE_URL + '/', // Bazı sunucular sondaki '/' işaretini arar
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    },
                    timeout: 4000 // 4 saniyede cevap gelmezse diğer adaya geç
                });
                
                const playerHtml = await response.text();

                if (playerHtml.includes('_sd')) {
                    const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                    if (sdMatch) {
                        const data = JSON.parse(sdMatch[1]);
                        console.error(`[TURBO-BAŞARILI] Akış Yayında: ${wId}`);

                        return [{
                            name: "Jet-Turbo (Videopark)",
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
                console.error(`[TURBO] Aday ${i+1} başarısız: ${wId}`);
            }
        }

        return [];
    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
