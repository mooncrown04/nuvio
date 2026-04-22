/**
 * JetFilmizle - Nuvio Ultra (v41 The Final Core)
 * HTML'i değil, JS değişkenlerinin çalışma mantığını hedefler.
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

        // --- ASIL ÇÖZÜM BURASI ---
        // 1. ADIM: Sayfadaki tüm şifreli 'player' yapılarını topla
        // Genelde pId, sourceId veya config içinde gizlenirler.
        const dynamicPattern = /["']?([a-zA-Z0-9]{20,})["']?/g; 
        const matches = html.match(dynamicPattern) || [];

        let candidates = [];

        // 2. ADIM: Videopark'ın gizli anahtarı aslında "TITAN_DATA" gibi bir objenin içinde.
        // Ama biz onu yakalamak için 'eval' benzeri yapılara odaklanıyoruz.
        const titanSearch = html.match(/titan\s*:\s*\{[\s\S]*?id\s*:\s*["']([^"']+)["']/i);
        if (titanSearch) candidates.push(titanSearch[1]);

        // 3. ADIM: Manuel süpürme (Filtresiz ama akıllı)
        // Eğer hiçbir ID bulunamazsa, sayfadaki her script bloğunu satır satır analiz et.
        const scripts = html.match(/<script[\s\S]*?<\/script>/g) || [];
        for (let script of scripts) {
            // "video", "player" veya "setup" geçen bloklarda 11 haneli harf-rakam kombinasyonları
            if (/video|player|setup|config/i.test(script)) {
                const codes = script.match(/[a-zA-Z0-9]{11,12}/g);
                if (codes) candidates.push(...codes);
            }
        }

        // Benzersiz ve temiz adaylar
        candidates = [...new Set(candidates)].filter(c => /[0-9]/.test(c) && /[A-Z]/.test(c));
        console.error(`[CORE] Kesin Hedef Sayısı: ${candidates.length}`);

        for (let wId of candidates.slice(0, 10)) {
            try {
                // Burada Videopark'ın "v" (view) endpoint'ini de deniyoruz, bazen "w" çalışmaz.
                const testUrls = [
                    `https://videopark.top/titan/w/${wId}`,
                    `https://videopark.top/titan/v/${wId}`
                ];

                for (let url of testUrls) {
                    const wRes = await fetch(url, { 
                        headers: { 'Referer': BASE_URL, 'User-Agent': 'Mozilla/5.0' } 
                    });
                    const wHtml = await wRes.text();
                    
                    if (wHtml.includes('_sd')) {
                        const sdMatch = wHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                        if (sdMatch) {
                            return [{
                                name: "Jet-Core",
                                url: JSON.parse(sdMatch[1]).stream_url,
                                type: "hls",
                                headers: { 'Referer': 'https://videopark.top/' }
                            }];
                        }
                    }
                }
            } catch (e) {}
        }

        return [];
    } catch (err) { return []; }
}

module.exports = { getStreams };
