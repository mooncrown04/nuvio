/**
 * JetFilmizle - Nuvio Ultra (v46 Dizi Odaklı)
 * Sadece dizilere ve o meşhur ham Titan koduna odaklanır.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    // Film ise sistemden çık, sadece dizi
    if (mediaType !== 'tv') return [];

    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        
        // Sitenin URL yapısı: /dizi/dizi-adi/sezon-1/bolum-1
        const slug = (info.name || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
        const targetUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;

        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // 1. ADIM: "HAM VERİ" AVCILIĞI
        // Senin kanıt kodundaki o DFADX... yapısını ve türevlerini (10-15 hane arası) süpürür
        const titanPattern = /DFADX[a-zA-Z0-9]{5,20}/g; 
        const generalPattern = /[a-zA-Z0-9]{11,12}/g;
        
        let matches = html.match(titanPattern) || html.match(generalPattern) || [];
        let uniqueKeys = [...new Set(matches)].filter(k => 
            /[0-9]/.test(k) && /[A-Z]/.test(k) && !/^(JetFilmizle|Copyright|ImageObject)/.test(k)
        );

        console.error(`[SERIES] Ham Kaynak Sayısı: ${uniqueKeys.length}`);

        for (let wId of uniqueKeys.slice(0, 5)) {
            try {
                // Senin kanıtındaki asıl çalışan endpoint
                const playerUrl = `https://videopark.top/titan/w/${wId}`;
                
                const response = await fetch(playerUrl, {
                    headers: {
                        'Referer': BASE_URL,
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
                    }
                });
                
                const playerHtml = await response.text();

                // 2. ADIM: _sd objesini söküp alma
                if (playerHtml.includes('_sd')) {
                    const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                    if (sdMatch) {
                        const data = JSON.parse(sdMatch[1]);
                        console.error(`[SERIES-BAŞARILI] Akış bulundu: ${wId}`);

                        return [{
                            name: `Jet-Titan [${wId.substring(0,4)}]`,
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
            } catch (e) {}
        }

        return [];
    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
