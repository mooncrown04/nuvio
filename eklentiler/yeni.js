/**
 * JetFilmizle - Nuvio Ultra (v28 Brute Force)
 * Değişken adı ne olursa olsun, sayısal ID'leri ve gizli API uçlarını patlatır.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    console.error(`[BRUTE] Operasyon: ${mediaType} - ID: ${id}`);
    
    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';
        
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || info.title || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

        const targetUrl = (mediaType === 'tv') 
            ? `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`
            : `${BASE_URL}/film/${slug}`;

        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        let streams = [];
        
        // 1. ADIM: SAYISAL ID AVCI (Körlemesine değil, mantıklı aralıkta)
        // Sitenin film ve bölüm ID'leri genelde 4-7 hane arası rakamlardır.
        // html içindeki setupPlayer(12345, 67890) veya benzeri yapıları yakalar.
        const allNumbers = html.match(/\d{4,8}/g) || [];
        // Unique (benzersiz) yapalım
        const uniqueIds = [...new Set(allNumbers)];
        
        console.error(`[BRUTE] Analiz Edilen Potansiyel ID Sayısı: ${uniqueIds.length}`);

        // 2. ADIM: TESPİT EDİLEN ID'LERLE API'Yİ ZORLA
        // En çok tekrar eden veya sona en yakın olan ID'ler genelde doğrudur.
        // Biz hepsini hızlıca deniyoruz.
        for (let potentialId of uniqueIds.slice(-10)) { // Son 10 sayı genelde asıl ID'lerdir
            const ajaxRes = await fetch(`${BASE_URL}/wp-admin/admin-ajax.php`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': targetUrl
                },
                // Hem film hem epId olarak dene (Brute Force mantığı)
                body: `action=get_player&filmId=${potentialId}&epId=${potentialId}`
            });

            const ajaxHtml = await ajaxRes.text();
            const tMatch = ajaxHtml.match(/(?:data-id=|titan\/w\/|id=)["']?(DFADX[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]{11})["']?/i);
            
            if (tMatch) {
                const titanId = tMatch[1];
                console.error(`[BRUTE] AJAX Patlatıldı! Titan ID: ${titanId}`);
                
                const tRes = await fetch(`https://videopark.top/titan/w/${titanId}`, { headers: { 'Referer': BASE_URL } });
                const tText = await tRes.text();
                const sdMatch = tText.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                
                if (sdMatch) {
                    const d = JSON.parse(sdMatch[1]);
                    streams.push({
                        name: "Videopark (Brute)",
                        url: d.stream_url,
                        type: "hls",
                        headers: { 'Referer': 'https://videopark.top/' }
                    });
                    if (streams.length > 2) break; // Çok fazla kaynakla şişirme
                }
            }
        }

        // 3. ADIM: STANDART TITAN ID TARAMASI (Tırnak içindekiler)
        if (streams.length === 0) {
            const titanRegex = /["'](DFADX[a-zA-Z0-9_-]{5,15}|[a-zA-Z0-9_-]{11})["']/g;
            let m;
            while ((m = titanRegex.exec(html)) !== null) {
                const tId = m[1];
                if (tId.length > 10 && !tId.startsWith('G-')) {
                    const tRes = await fetch(`https://videopark.top/titan/w/${tId}`, { headers: { 'Referer': BASE_URL } });
                    const tText = await tRes.text();
                    const sd = tText.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                    if (sd) {
                        streams.push({ name: "Videopark (Regex)", url: JSON.parse(sd[1]).stream_url, type: "hls" });
                    }
                }
            }
        }

        console.error(`[BRUTE] Bitti. Kaynak: ${streams.length}`);
        return streams;

    } catch (err) {
        console.error(`[BRUTE-HATA] ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
