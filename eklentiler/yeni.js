/**
 * JetFilmizle - Nuvio Ultra (v29 Gatling Gun)
 * Sayfadaki tüm potansiyel ID'leri (36 aday) doğrudan Videopark Titan'da test eder.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    console.error(`[HUNTER] Başlatıldı: ${mediaType} - ID: ${id}`);
    
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
        
        // 1. ADIM: TÜM POTANSİYEL ID'LERİ TOPLA (O 36 ADAY)
        // Hem DFADX formatını hem de 11 haneli karmaşık ID'leri yakalar
        const idRegex = /(?:["']|data-id=|titan\/w\/|id=)(DFADX[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]{11})(?:["']| )/gi;
        let candidates = [];
        let m;
        while ((m = idRegex.exec(html)) !== null) {
            let cId = m[1];
            if (!cId.startsWith('G-') && !cId.includes('search') && candidates.indexOf(cId) === -1) {
                candidates.push(cId);
            }
        }

        console.error(`[HUNTER] Test Edilecek ID Sayısı: ${candidates.length}`);

        // 2. ADIM: HER BİRİNİ TİTAN'A SOR (Hızlı Paralel İstek Değil, Sıralı ve Güvenli)
        for (let tId of candidates) {
            console.error(`[HUNTER] Sorgulanıyor: ${tId}`);
            try {
                const tRes = await fetch(`https://videopark.top/titan/w/${tId}`, { 
                    headers: { 'Referer': BASE_URL, 'User-Agent': 'Mozilla/5.0' } 
                });
                const tText = await tRes.text();
                
                // Titan'ın meşhur _sd verisini ara
                const sdMatch = tText.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                if (sdMatch) {
                    const data = JSON.parse(sdMatch[1]);
                    if (data.stream_url) {
                        console.error(`[HUNTER-SUCCESS] Kaynak Patlatıldı: ${tId}`);
                        streams.push({
                            name: "Videopark (Titan)",
                            title: `⌜ Kaynak: ${tId.substring(0,4)} ⌟`,
                            url: data.stream_url,
                            type: "hls",
                            headers: { 'Referer': 'https://videopark.top/' }
                        });
                        // Birkaç kaynak bulunca dur (Performans için)
                        if (streams.length >= 3) break;
                    }
                }
            } catch (e) { continue; }
        }

        // 3. ADIM: SON ÇARE (Klasik yöntem)
        if (streams.length === 0) {
            const sd = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sd) {
                const d = JSON.parse(sd[1]);
                streams.push({ name: "Jet-Direct", url: d.stream_url, type: "hls" });
            }
        }

        console.error(`[HUNTER] Bitti. Toplam Kaynak: ${streams.length}`);
        return streams;

    } catch (err) {
        console.error(`[HUNTER-HATA] ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
