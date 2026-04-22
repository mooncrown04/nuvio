/**
 * JetFilmizle - Videopark "Titan" Full Debug Edition (V3 - Fixed Export)
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

function titleToSlug(t) {
    return (t || '').toLowerCase().trim()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

async function getStreams(id, mediaType, season, episode) {
    console.error(`[DEBUG-V3] S=${season}, E=${episode} için işlem başladı.`);

    try {
        // 1. ADIM: Çerez/Oturum Hazırlığı
        console.error(`[DEBUG-V3] Ana sayfaya ön istek atılıyor...`);
        await fetch(BASE_URL + '/', { 
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } 
        });
        
        // 2. ADIM: TMDB ve Link Oluşturma
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${id}?api_key=${TMDB_API_KEY}&language=tr-TR`;
        const tmdbRes = await fetch(tmdbUrl);
        const info = await tmdbRes.json();
        const slug = titleToSlug(info.name || info.title);
        
        const pagePath = (mediaType === 'tv') ? `dizi/${slug}/${season}-sezon-${episode}-bolum` : `film/${slug}`;
        const finalUrl = `${BASE_URL}/${pagePath}`;
        console.error(`[DEBUG-V3] Hedef Sayfa: ${finalUrl}`);

        // 3. ADIM: Bölüm Sayfasını Çekme
        const pageRes = await fetch(finalUrl, { 
            headers: { 
                'Referer': BASE_URL + '/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Cookie': 'jet_session=true; has_visited=1'
            } 
        });
        
        const pageHtml = await pageRes.text();
        console.error(`[DEBUG-V3] Sayfa boyutu: ${pageHtml.length}`);

        // 4. ADIM: Hash Avlama
        const hashMatch = pageHtml.match(/videopark\.top\/titan\/w\/([a-zA-Z0-9_-]+)/);
        let playerHash = "";

        if (hashMatch) {
            playerHash = hashMatch[1];
            console.error(`[DEBUG-V3] ÖZEL HASH YAKALANDI: ${playerHash}`);
        } else {
            playerHash = "DFADXFgPDU4"; 
            console.error(`[DEBUG-V3] Özel kod yok, SABİT KOD kullanılıyor.`);
        }

        // 5. ADIM: Videopark API
        const playerUrl = `https://videopark.top/titan/w/${playerHash}`;
        const response = await fetch(playerUrl, {
            headers: {
                'Referer': finalUrl,
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        const html = await response.text();
        const sdMatch = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (sdMatch) {
            const data = JSON.parse(sdMatch[1]);
            console.error(`[DEBUG-V3] BAŞARILI! Stream URL alındı.`);

            return [{
                name: "Videopark (Titan)",
                url: data.stream_url,
                type: "hls",
                subtitles: data.subtitles ? data.subtitles.map(s => ({ url: s.file, language: s.label, format: "vtt" })) : [],
                headers: { 
                    'Referer': 'https://videopark.top/',
                    'Origin': 'https://videopark.top',
                    'User-Agent': 'Mozilla/5.0'
                }
            }];
        }

        console.error("[DEBUG-V3] HATA: _sd bulunamadı.");
        return [];
    } catch (err) {
        console.error(`[DEBUG-CRITICAL] Hata: ${err.message}`);
        return [];
    }
}

// --- KRİTİK DÜZELTME: Fonksiyonu sisteme tanıt ---
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
}
if (typeof globalThis !== 'undefined') {
    globalThis.getStreams = getStreams;
} else if (typeof global !== 'undefined') {
    global.getStreams = getStreams;
} else if (typeof window !== 'undefined') {
    window.getStreams = getStreams;
}
