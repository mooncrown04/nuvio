/**
 * JetFilmizle - Nuvio Ultra (v60 Worker Hunter)
 * MTc3... gibi Base64 kodlarını decode eder ve 
 * Player'ın gizlediği asıl m3u8 kaynağına ulaşır.
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

        // 1. ADIM: Logdaki o meşhur Base64 (MTc3...) ve XLD kodlarını yakala
        const pattern = /[a-zA-Z0-9]{11,15}/g;
        let matches = html.match(pattern) || [];
        let vId = matches.reverse().find(k => /[0-9]/.test(k) && /[A-Z]/.test(k) && !/google|manager/i.test(k));

        if (!vId) return [];
        console.error(`[HUNTER] Yakalanan ID: ${vId}`);

        // 2. ADIM: Base64 Çözücü (Özellikle 1. bölümdeki MTc3 için)
        let finalKey = vId;
        if (vId.startsWith('MTc3')) {
            try {
                // Base64'ü çözüp içindeki sayısal veya string ID'yi alıyoruz
                finalKey = Buffer.from(vId, 'base64').toString('utf-8');
                console.error(`[HUNTER] Base64 Çözüldü: ${finalKey}`);
            } catch(e) {}
        }

        // 3. ADIM: Player Sayfasını oku ve içindeki _sd objesini zorla
        // Bu sefer Referer olarak targetUrl'yi (Dizi Bölüm URL'si) kullanıyoruz
        const response = await fetch(`https://videopark.top/titan/w/${vId}`, {
            headers: {
                'Referer': targetUrl,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        
        const content = await response.text();

        // Eğer hala HTML geliyorsa (< token hatası), içeriği regex ile tara
        if (content.includes('_sd')) {
            const data = JSON.parse(content.match(/var\s+_sd\s*=\s*({[\s\S]*?});/)[1]);
            console.error(`[SUCCESS] Akış Bulundu: ${vId}`);
            
            return [{
                name: "Jet-Worker (Titan)",
                url: data.stream_url,
                type: "hls",
                headers: { 
                    'Referer': 'https://videopark.top/',
                    'User-Agent': 'Mozilla/5.0' 
                }
            }];
        } else if (content.includes('file:')) {
            // Alternatif Player formatı (file: "http...")
            const fileMatch = content.match(/file\s*:\s*"(.*?)"/);
            if (fileMatch) {
                console.error(`[SUCCESS] Alternatif Link Bulundu`);
                return [{
                    name: "Jet-Direct",
                    url: fileMatch[1],
                    type: "hls",
                    headers: { 'Referer': 'https://videopark.top/' }
                }];
            }
        }

        return [];
    } catch (err) { return []; }
}

module.exports = { getStreams };
