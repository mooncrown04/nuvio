/**
 * JetFilmizle - Nuvio Ultra (v49 Ghost Sniper)
 * RAM yükünü sıfıra indirir. 
 * 7 adaydan sadece EN SONUNCUSUNA (genelde asıl budur) odaklanır.
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

        // Belleği korumak için tek bir fetch
        const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const html = await pageRes.text();

        // 1. ADIM: Nokta Atışı (Loglarda gördüğümüz format)
        // ldiszufYa4IF gibi 12 haneli büyük-küçük harf karışık yapıları en sondan yakala
        const pattern = /[a-zA-Z0-9]{11,12}/g;
        let all = html.match(pattern) || [];
        
        // Sadece içinde hem rakam hem büyük harf olan ve gereksiz olmayan TEK bir ID seç
        let finalId = all.reverse().find(k => 
            /[0-9]/.test(k) && /[A-Z]/.test(k) && !/^(Jet|Copyright|Image)/.test(k)
        );

        if (!finalId) return [];

        console.error(`[GHOST-SNIPER] Tek Hedef: ${finalId}`);

        // 2. ADIM: Tek mermi, yüksek ihtimal
        const response = await fetch(`https://videopark.top/titan/w/${finalId}`, {
            headers: {
                'Referer': BASE_URL + '/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        
        const playerHtml = await response.text();

        // 3. ADIM: _sd objesi avı
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        if (sdMatch) {
            const data = JSON.parse(sdMatch[1]);
            console.error(`[SUCCESS] Akış Başlatılıyor...`);

            return [{
                name: "Jet-Titan (Ultra Light)",
                url: data.stream_url,
                type: "hls",
                subtitles: data.subtitles ? data.subtitles.map(s => ({
                    url: s.file,
                    language: s.label,
                    format: "vtt"
                })) : [],
                headers: {
                    'Referer': 'https://videopark.top/',
                    'User-Agent': 'Mozilla/5.0'
                }
            }];
        }

        return [];
    } catch (err) {
        return [];
    }
}

module.exports = { getStreams };
