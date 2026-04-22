/**
 * JetFilmizle - Nuvio Ultra (v37 Sniper Protocol)
 * 95 adayı 15'e düşürür. Sadece en kaliteli "Titan" adaylarına odaklanır.
 * Bellek dostu, işlemciyi yormayan v3 grupta tarama.
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

        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // 1. ADIM: "Titan" formatına en çok uyanları (DFADX veya Karmaşık 11 Hane) ayıkla
        const titanRegex = /(DFADX[A-Z0-9]{5,15}|[a-zA-Z0-9]{11,12})/g;
        let rawMatches = html.match(titanRegex) || [];
        
        // 2. ADIM: Kalite Filtresi (Sniper)
        let candidates = [...new Set(rawMatches)]
            .filter(c => {
                // Sadece rakam + harf karışık olanları ve 
                // JetFilmizle içindeki bilinen statik kelimeleri ele
                return /[0-9]/.test(c) && 
                       /[a-zA-Z]/.test(c) && 
                       !/^(JetFilmizle|ImageObject|viewport|charset|false|true)/i.test(c);
            })
            .slice(0, 15); // İlk 15 en güçlü aday (95'ten 15'e düştük!)

        console.error(`[SNIPER] Hedef Sayısı: ${candidates.length}`);

        let streams = [];
        // Cihaz kilitlenmesin diye 3'erli gruplar (Batch size 3)
        for (let i = 0; i < candidates.length; i += 3) {
            const currentBatch = candidates.slice(i, i + 3);
            console.error(`[SNIPER] Grup ${Math.floor(i/3) + 1} sızıyor...`);

            const batchResults = await Promise.all(currentBatch.map(async (wId) => {
                try {
                    const wRes = await fetch(`https://videopark.top/titan/w/${wId}`, { 
                        headers: { 'Referer': BASE_URL, 'User-Agent': 'Mozilla/5.0' },
                        timeout: 3500 // Hızlı cevap yoksa geç
                    });
                    const wHtml = await wRes.text();
                    if (wHtml.includes('_sd')) {
                        const sdMatch = wHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                        if (sdMatch) {
                            const data = JSON.parse(sdMatch[1]);
                            return {
                                name: "Jet-Sniper",
                                url: data.stream_url,
                                type: "hls",
                                headers: { 'Referer': 'https://videopark.top/' }
                            };
                        }
                    }
                } catch (e) {}
                return null;
            }));

            const found = batchResults.filter(r => r !== null);
            if (found.length > 0) {
                streams.push(...found);
                break; // Bulduğumuz an sistemi serbest bırak
            }
        }

        // BACKUP: Eğer sniper ıskalarsa ana sayfadaki _sd'ye bak
        if (streams.length === 0 && html.includes('_sd')) {
            const sdDirect = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (sdDirect) {
                try {
                    streams.push({ name: "Jet-Direct", url: JSON.parse(sdDirect[1]).stream_url, type: "hls" });
                } catch(e){}
            }
        }

        return streams;
    } catch (err) { return []; }
}

module.exports = { getStreams };
