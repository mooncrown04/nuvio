/**
 * JetFilmizle - Nuvio Ultra (v34 The Harvester)
 * Filtreleri çöpe atar. Sayfadaki her tırnak içini potansiyel ID kabul eder,
 * ama sadece Videopark'tan GERÇEK video linki döndürenleri kabul eder.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';
        
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || info.title || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

        const targetUrl = (mediaType === 'tv') 
            ? `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`
            : `${BASE_URL}/film/${slug}`;

        // 1. ADIM: Sayfanın TÜM ham metnini çek
        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // 2. ADIM: "SIFIR FİLTRE" - Tırnak içindeki her şeyi topla (8-20 karakter arası)
        // Bu hem DFADX'leri, hem şifreli ID'leri, hem de çöpleri toplar.
        const allPossibleIds = html.match(/["']([a-zA-Z0-9_-]{8,20})["']/g) || [];
        
        // Temizlik: Sadece tırnakları kaldır ve benzersiz yap
        let candidates = [...new Set(allPossibleIds.map(m => m.replace(/["']/g, '')))];
        
        console.error(`[HARVESTER] Toplam Aday Sayısı: ${candidates.length} (Filtresiz)`);

        let streams = [];
        
        // 3. ADIM: HIZLI TARAMA (Paralel İşleme)
        // Her adayı Videopark Titan'a soruyoruz. Filtreyi kodda değil, sunucu cevabında yapıyoruz.
        const pool = candidates.slice(0, 50); // İlk 50 en güçlü aday (Performans için limitli)

        const results = await Promise.allSettled(pool.map(async (wId) => {
            // Bilinen çöpleri anında ele (Fetch trafiğini azaltmak için)
            if (/^(true|false|hidden|visible|ImageObject|JetFilmizle|search|UTF-8)$/i.test(wId)) return null;

            try {
                const wRes = await fetch(`https://videopark.top/titan/w/${wId}`, { 
                    headers: { 'Referer': BASE_URL, 'User-Agent': 'Mozilla/5.0' } 
                });
                const wHtml = await wRes.text();
                
                // Eğer cevapta gerçek bir video linki (_sd değişkeni) varsa, Bingo!
                const sdMatch = wHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                if (sdMatch) {
                    const data = JSON.parse(sdMatch[1]);
                    if (data.stream_url) {
                        return {
                            name: "Jet-Harvest",
                            url: data.stream_url,
                            type: "hls",
                            headers: { 'Referer': 'https://videopark.top/' }
                        };
                    }
                }
            } catch (e) {}
            return null;
        }));

        // 4. ADIM: Sadece başarılı olanları süz
        streams = results
            .filter(r => r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value);

        console.error(`[HARVESTER] Bulunan Geçerli Kaynak: ${streams.length}`);
        
        // Klasik yedek (Eğer brute-force başarısız olursa)
        if (streams.length === 0) {
            const sdDirect = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sdDirect) streams.push({ name: "Jet-Direct", url: JSON.parse(sdDirect[1]).stream_url, type: "hls" });
        }

        return streams;
    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
