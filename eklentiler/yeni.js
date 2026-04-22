/**
 * JetFilmizle - Nuvio Ultra (v52 Final Titan Sniper)
 * Loglarda yakalanan XLD, ldi, Ja0 gibi 12 haneli gerçek kodlara odaklanır.
 * Sertifika takılmalarını önlemek için tekil ve kararlı sorgu yapar.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    if (mediaType !== 'tv') return [];

    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const slug = (info.name || "").toLowerCase().replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s').replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
        const targetUrl = `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`;

        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // 1. ADIM: Loglarda doğruladığımız o 12 haneli TITAN yapılarını yakala
        const pattern = /[a-zA-Z0-9]{12}/g;
        let matches = html.match(pattern) || [];
        
        let validKeys = [...new Set(matches)].filter(k => 
            /[0-9]/.test(k) && /[A-Z]/.test(k) && 
            !/google|manager|script|Active|Object/i.test(k)
        );

        // 2. ADIM: Loglara göre en alttaki aday genelde asıl olandır (reverse)
        // Cihazın şişmemesi için sadece ilk (aslında sayfanın sonundaki) adayı alıyoruz
        let finalId = validKeys.reverse()[0]; 

        if (!finalId) {
            console.error("[SNIPER] Titan anahtarı bulunamadı.");
            return [];
        }

        console.error(`[SNIPER] Hedef Kilitlendi: ${finalId}`);

        // 3. ADIM: Tek Sorgu - Esnek Timeout (Sertifika takılmalarına karşı)
        try {
            const playerUrl = `https://videopark.top/titan/w/${finalId}`;
            const response = await fetch(playerUrl, {
                headers: {
                    'Referer': BASE_URL + '/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            
            const playerHtml = await response.text();

            if (playerHtml.includes('_sd')) {
                const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                if (sdMatch) {
                    const data = JSON.parse(sdMatch[1]);
                    console.error(`[SUCCESS] Titan Çözüldü: ${finalId}`);

                    return [{
                        name: "Jet-Titan (Dizi-Sniper)",
                        url: data.stream_url,
                        type: "hls",
                        subtitles: data.subtitles ? data.subtitles.map(s => ({
                            url: s.file, language: s.label, format: "vtt"
                        })) : [],
                        headers: { 
                            'Referer': 'https://videopark.top/', 
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' 
                        }
                    }];
                }
            }
        } catch (e) {
            console.error(`[SNIPER] Kritik Hata: ${e.message}`);
        }

        return [];
    } catch (err) { return []; }
}

module.exports = { getStreams };
