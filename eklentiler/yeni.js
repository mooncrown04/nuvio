/**
 * JetFilmizle - Nuvio Ultra (v25 AJAX Ghost)
 * HTML iskeletini geçer, doğrudan sitenin veri sağlayan AJAX damarına saldırır.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    console.error(`[GHOST] Başlatıldı: ${mediaType} - ID: ${id}`);
    
    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';
        
        // 1. TMDB Bilgisi
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || info.title || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

        let streams = [];

        // 2. DIZI ICIN GIZLI AJAX TIKLAMASI
        if (mediaType === 'tv') {
            console.error(`[GHOST] AJAX Damarı Aranıyor...`);
            
            // Jetfilm'in bölümleri getirmek için kullandığı muhtemel endpoint'ler
            const apiEndpoints = [
                `${BASE_URL}/wp-admin/admin-ajax.php?action=get_episodes&slug=${slug}&season=${season}&episode=${episode}`,
                `${BASE_URL}/ajax/get-player?slug=${slug}&season=${season}&episode=${episode}`
            ];

            for (let api of apiEndpoints) {
                console.error(`[GHOST] Deneniyor: ${api}`);
                const apiRes = await fetch(api, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0',
                        'Referer': `${BASE_URL}/dizi/${slug}`,
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                const apiText = await apiRes.text();
                // Gelen verinin içinde ID var mı bak (Hem JSON hem HTML formatında)
                const idMatch = apiText.match(/(?:data-id=|id=|titan_id)["']?\s*[:=]?\s*["'](DFADX[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]{11})["']/i);
                
                if (idMatch) {
                    const tId = idMatch[1];
                    console.error(`[GHOST] AJAX'tan ID Yakalandı: ${tId}`);
                    
                    const tRes = await fetch(`https://videopark.top/titan/w/${tId}`, { headers: { 'Referer': BASE_URL } });
                    const tHtml = await tRes.text();
                    const sdMatch = tHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                    
                    if (sdMatch) {
                        const d = JSON.parse(sdMatch[1]);
                        streams.push({
                            name: "Videopark (Ghost)",
                            url: d.stream_url,
                            type: "hls",
                            headers: { 'Referer': 'https://videopark.top/' }
                        });
                        break; // Kaynağı bulduk, diğer API'ye gerek yok
                    }
                }
            }
        }

        // 3. STANDART FALLBACK (Filmler için hala geçerli)
        if (streams.length === 0) {
            const pageUrl = (mediaType === 'tv') ? `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}` : `${BASE_URL}/film/${slug}`;
            const pRes = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const pHtml = await pRes.text();
            
            // Eğer sayfa içine gömülüyse (Genelde filmlerde böyle)
            const sd = pHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sd) {
                const data = JSON.parse(sd[1]);
                streams.push({ name: "Jet-Direct", url: data.stream_url, type: "hls" });
            }
        }

        console.error(`[GHOST] Final: ${streams.length}`);
        return streams;

    } catch (err) {
        console.error(`[GHOST-HATA] ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
