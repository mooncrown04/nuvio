/**
 * JetFilmizle - Nuvio Ultra (v40 The Cipher Breaker)
 * Regex ile bulunamayan, Base64 ile gizlenmiş veriyi hedefler.
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

        let keys = [];

        // 1. ADIM: Gizli Base64 Bloklarını Yakala
        // Titan ID'leri genelde 16-40 karakter arası bir Base64 string içinde saklanır.
        const base64Regex = /["']([A-Za-z0-9+/]{16,40}={0,2})["']/g;
        let b64Matches = html.match(base64Regex) || [];
        
        for (let m of b64Matches) {
            try {
                let clean = m.replace(/["']/g, '');
                // Base64 Decode denemesi
                let decoded = Buffer.from(clean, 'base64').toString('utf-8');
                // Eğer decoded hali Titan formatına (DFADX veya 11 hane) uyuyorsa ekle
                if (/[a-zA-Z0-9]{8,15}/.test(decoded)) {
                    keys.push(decoded);
                }
            } catch(e) {}
        }

        // 2. ADIM: Ham Script İçindeki "Ters" Stringleri Yakala
        // Hatırlarsan bazen ID'leri "XDAFD" gibi ters yazıyorlardı.
        const scriptContent = html.match(/<script>([\s\S]*?)<\/script>/g) || [];
        for (let s of scriptContent) {
            // "data" veya "player" değişkenlerine yakın duran 11 haneli kodlar
            const potential = s.match(/[a-zA-Z0-9]{11,12}/g);
            if (potential) keys.push(...potential);
        }

        // 3. ADIM: Sitenin asıl Post ID'sini "post-\d+" sınıfından çek
        const bodyMatch = html.match(/postid-(\d+)/) || html.match(/post-(\d+)/);
        const realPostId = bodyMatch ? bodyMatch[1] : null;
        console.error(`[CIPHER] Bulunan Post ID: ${realPostId}`);

        let candidates = [...new Set(keys)].filter(k => /[0-9]/.test(k) && /[A-Z]/.test(k));
        console.error(`[CIPHER] Denenecek Anahtar Sayısı: ${candidates.length}`);

        for (let wId of candidates.slice(0, 10)) {
            try {
                const wRes = await fetch(`https://videopark.top/titan/w/${wId}`, { 
                    headers: { 'Referer': BASE_URL, 'User-Agent': 'Mozilla/5.0' } 
                });
                const wHtml = await wRes.text();
                
                if (wHtml.includes('_sd')) {
                    const sdMatch = wHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                    if (sdMatch) {
                        return [{
                            name: "Jet-Cipher",
                            url: JSON.parse(sdMatch[1]).stream_url,
                            type: "hls",
                            headers: { 'Referer': 'https://videopark.top/' }
                        }];
                    }
                }
            } catch (e) {}
        }

        return [];
    } catch (err) { return []; }
}

module.exports = { getStreams };
