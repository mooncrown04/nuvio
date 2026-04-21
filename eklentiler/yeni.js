/**
 * JetFilmizle - Nuvio Ultra (v23 AJAX Source)
 * Sayfa iskeleti yerine doğrudan sitenin AJAX veri motoruna bağlanır.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    console.error(`[GATEKEEPER] Başlatıldı: ${mediaType} - ID: ${id}`);
    
    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';
        
        // 1. TMDB'den isim ve yıl al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const originalName = info.name || info.title || info.original_name;
        const slug = originalName.toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

        let streams = [];

        // 2. AJAX PLAYER YAKALAYICI (Diziler için asıl damar burası)
        if (mediaType === 'tv') {
            console.error(`[GATEKEEPER] AJAX üzerinden bölüm verisi aranıyor...`);
            // Jetfilmizle'nin dizi bölümlerini ve player ID'lerini getiren endpoint simülasyonu
            const ajaxUrl = `${BASE_URL}/wp-admin/admin-ajax.php`;
            
            // Not: Normalde POST atılır ama biz sayfadaki gizli JSON verisini yakalamaya çalışacağız.
            // Sayfaya giderken özel bir 'Dizi' parametresi ekleyerek ham player verisini tetikliyoruz.
            const targetUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;
            
            const response = await fetch(targetUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': BASE_URL,
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            const html = await response.text();

            // Sitedeki 'video-nav-item' verilerini ham metin içinde "data-id" veya "id" olarak ara
            // Bu sefer daha geniş bir regex: "id" : "..." veya "data-id":"..."
            const titanIds = [];
            const deepRegex = /(?:data-id|id|video_id|titan_id)["']?\s*[:=]\s*["']([a-zA-Z0-9_-]{10,20})["']/gi;
            let m;
            while ((m = deepRegex.exec(html)) !== null) {
                if (m[1].length > 10 && !m[1].startsWith('G-') && titanIds.indexOf(m[1]) === -1) {
                    titanIds.push(m[1]);
                }
            }

            console.error(`[GATEKEEPER] Bulunan Derin ID: ${titanIds.length}`);

            for (let tId of titanIds) {
                const titanUrl = `https://videopark.top/titan/w/${tId}`;
                const tRes = await fetch(titanUrl, { headers: { 'Referer': BASE_URL } });
                const tHtml = await tRes.text();
                const sdMatch = tHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);

                if (sdMatch) {
                    const data = JSON.parse(sdMatch[1]);
                    if (data.stream_url) {
                        streams.push({
                            name: "Videopark (Titan)",
                            title: `⌜ Kaynak: ${tId.substring(0,4)} ⌟`,
                            url: data.stream_url,
                            type: "hls",
                            headers: { 'Referer': 'https://videopark.top/' }
                        });
                    }
                }
            }
        }

        // 3. FALLBACK (Filmler ve doğrudan enjeksiyonlar için)
        if (streams.length === 0) {
            const fallbackUrl = (mediaType === 'tv') ? `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}` : `${BASE_URL}/film/${slug}`;
            const fRes = await fetch(fallbackUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const fHtml = await fRes.text();
            const sdMatch = fHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sdMatch) {
                const d = JSON.parse(sdMatch[1]);
                streams.push({ name: "Jet-Direct", url: d.stream_url, type: "hls" });
            }
        }

        console.error(`[GATEKEEPER] Tamamlandı. Sonuç: ${streams.length}`);
        return streams;

    } catch (err) {
        console.error(`[GATEKEEPER-HATA] ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
