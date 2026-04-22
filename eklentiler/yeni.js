/**
 * JetFilmizle - Nuvio Ultra (v27 Brain Surgeon)
 * Sayfa başındaki sahte kodları geçer, sonundaki asıl değişkenleri (filmId, epId) yakalar.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    console.error(`[SURGEON] Operasyon Başladı: ${mediaType} - ID: ${id}`);
    
    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';
        
        // 1. TMDB Bilgisi ve Slug Hazırlığı
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || info.title || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

        const targetUrl = (mediaType === 'tv') 
            ? `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`
            : `${BASE_URL}/film/${slug}`;

        // 2. SAYFAYI ÇEK VE SON 5000 KARAKTERE ODAKLAN
        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();
        
        // Kurnaz geliştiricinin gizlediği yeri bulmak için sayfanın son kısmını alıyoruz
        const footerArea = html.substring(html.length - 10000); 

        // filmId, epId veya asıl player tetikleyici ID'yi ara
        const fIdMatch = html.match(/filmId\s*[:=]\s*["']?(\d+)["']?/i);
        const eIdMatch = html.match(/epId\s*[:=]\s*["']?(\d+)["']?/i);
        
        const fId = fIdMatch ? fIdMatch[1] : null;
        const eId = eIdMatch ? eIdMatch[1] : null;

        console.error(`[SURGEON] Gizli Kodlar Bulundu -> fId: ${fId}, eId: ${eId}`);

        let streams = [];

        // 3. ASIL AJAX POST (Sayfanın sonundaki o ID'lerle kapıyı açıyoruz)
        if (fId) {
            console.error(`[SURGEON] AJAX Hattına Sızılıyor...`);
            
            const ajaxRes = await fetch(`${BASE_URL}/wp-admin/admin-ajax.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': targetUrl
                },
                // Eğer dizi ise epId gönder, değilse sadece filmId yeterli olabilir
                body: `action=get_player&filmId=${fId}${eId ? `&epId=${eId}` : ''}`
            });

            const ajaxHtml = await ajaxRes.text();
            
            // AJAX'tan gelen tertemiz Titan ID'sini yakala
            const tMatch = ajaxHtml.match(/(?:data-id=|titan\/w\/|id=)["']?(DFADX[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]{11})["']?/i);
            
            if (tMatch) {
                const titanId = tMatch[1];
                console.error(`[SURGEON] Titan ID Ensedendi: ${titanId}`);
                
                const tRes = await fetch(`https://videopark.top/titan/w/${titanId}`, { headers: { 'Referer': BASE_URL } });
                const tText = await tRes.text();
                const sdMatch = tText.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                
                if (sdMatch) {
                    const d = JSON.parse(sdMatch[1]);
                    streams.push({
                        name: "Videopark (Surgeon)",
                        url: d.stream_url,
                        type: "hls",
                        headers: { 'Referer': 'https://videopark.top/' }
                    });
                }
            }
        }

        // 4. SON ÇARE: Sayfa içine gömülü _sd (Filmler için)
        if (streams.length === 0) {
            const sdMatch = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sdMatch) {
                const d = JSON.parse(sdMatch[1]);
                streams.push({ name: "Jet-Direct", url: d.stream_url, type: "hls" });
            }
        }

        console.error(`[SURGEON] Operasyon Tamam. Kaynak: ${streams.length}`);
        return streams;

    } catch (err) {
        console.error(`[SURGEON-HATA] ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
