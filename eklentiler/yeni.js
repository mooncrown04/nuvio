/**
 * JetFilmizle - Nuvio Ultra (v69 Sniper)
 * "Job was cancelled" hatasını önlemek için deneme sayısını azaltır,
 * sadece en güçlü adaylara (DFADX vb.) odaklanır.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        
        const slug = (info.name || "").toLowerCase()
            .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
            .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
            
        const targetUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;

        const pageRes = await fetch(targetUrl, { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } 
        });
        const html = await pageRes.text();

        // 1. ADIM: Sadece "gerçek" anahtar olabilecek yapıları seç (Deneme sayısını düşür)
        // DFADX ile başlayanlar veya 11-12 haneli karışık kodlar
        const pattern = /[a-zA-Z0-9]{11,12}/g;
        let matches = html.match(pattern) || [];
        
        // Önemli filtre: Sadece büyük-küçük harf ve rakam karışık olanları al (Çöpü temizle)
        const candidates = [...new Set(matches)].filter(c => 
            /[A-Z]/.test(c) && /[0-9]/.test(c) && !/google|manager|Active/i.test(c)
        ).slice(0, 5); // Sadece en güçlü ilk 5 adayı dene (İptal hatasını önler)

        console.error(`[SNIPER] Hedef seçildi: ${candidates.join(', ')}`);

        // 2. ADIM: Hızlı paralel deneme yerine sıralı ve kontrollü deneme
        for (let key of candidates) {
            try {
                // timeout süresini kısa tutuyoruz ki Job Cancel olmasın
                const response = await fetch(`https://videopark.top/titan/w/${key}`, {
                    headers: { 'Referer': targetUrl, 'User-Agent': 'Mozilla/5.0' }
                });

                const content = await response.text();

                if (content.includes('_sd')) {
                    const sdMatch = content.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                    if (sdMatch) {
                        const data = JSON.parse(sdMatch[1]);
                        return [{
                            name: "Jet-Sniper",
                            url: data.stream_url,
                            type: "hls",
                            headers: { 'Referer': 'https://videopark.top/' }
                        }];
                    }
                }
            } catch (e) { continue; }
        }
        return [];
    } catch (err) { return []; }
}

module.exports = { getStreams };
