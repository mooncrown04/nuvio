/**
 * JetFilmizle - Videopark "Titan" Full Debug Edition
 * Tüm aşamalar console.error ile loglanır.
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
    console.error(`[DEBUG-START] İşlem Başladı: ID=${id}, Tip=${mediaType}, S=${season}, E=${episode}`);

    try {
        // 1. TMDB Aşaması
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType === 'tv' ? 'tv' : 'movie'}/${id}?api_key=${TMDB_API_KEY}&language=tr-TR`;
        console.error(`[DEBUG-TMDB] İstek Atılıyor: ${tmdbUrl}`);
        
        const tmdbRes = await fetch(tmdbUrl);
        const info = await tmdbRes.json();
        const slug = titleToSlug(info.name || info.title);
        
        // 2. JetFilmizle Sayfa Aşaması
        const pagePath = (mediaType === 'tv') ? `dizi/${slug}/${season}-sezon-${episode}-bolum` : `film/${slug}`;
        const finalUrl = `${BASE_URL}/${pagePath}`;
        console.error(`[DEBUG-PAGE] JetFilm Sayfasına Gidiliyor: ${finalUrl}`);

        const pageRes = await fetch(finalUrl, { 
            headers: { 'Referer': BASE_URL, 'User-Agent': 'Mozilla/5.0' } 
        });
        const pageHtml = await pageRes.text();
        console.error(`[DEBUG-HTML] Sayfa indirildi, karakter uzunluğu: ${pageHtml.length}`);

        // 3. Hash Yakalama Aşaması
        const hashMatch = pageHtml.match(/videopark\.top\/titan\/w\/([a-zA-Z0-9_-]+)/);
        let playerHash = "DFADXFgPDU4"; // Senin çalışan sabit kodun (fallback)

        if (hashMatch) {
            playerHash = hashMatch[1];
            console.error(`[DEBUG-HASH] Sayfadan Yeni Hash Yakalandı: ${playerHash}`);
        } else {
            console.error(`[DEBUG-HASH] Sayfada hash bulunamadı, SABİT KOD kullanılıyor: ${playerHash}`);
        }

        // 4. Videopark / Titan Aşaması
        const playerUrl = `https://videopark.top/titan/w/${playerHash}`;
        console.error(`[DEBUG-PLAYER] Videopark API'ye Gidiliyor: ${playerUrl}`);

        const response = await fetch(playerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        const html = await response.text();
        console.error(`[DEBUG-PLAYER-HTML] Player içeriği alındı.`);

        // 5. _sd Objesi ve Stream URL Aşaması
        const sdMatch = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (sdMatch) {
            console.error(`[DEBUG-JSON] _sd objesi metin olarak yakalandı.`);
            const data = JSON.parse(sdMatch[1]);
            const streamUrl = data.stream_url;

            console.error(`[DEBUG-SUCCESS] ASIL YAYIN URL: ${streamUrl}`);

            const subtitles = data.subtitles ? data.subtitles.map(s => {
                console.error(`[DEBUG-SUB] Altyazı Bulundu: ${s.label} -> ${s.file}`);
                return { url: s.file, language: s.label, format: "vtt" };
            }) : [];

            return [{
                name: "Videopark (Titan-Worker)",
                url: streamUrl,
                type: "hls",
                subtitles: subtitles,
                headers: {
                    'Referer': 'https://videopark.top/',
                    'Origin': 'https://videopark.top',
                    'User-Agent': 'Mozilla/5.0'
                }
            }];
        }

        console.error("[DEBUG-FAIL] _sd objesi bulunamadı! Sayfa yapısı değişmiş veya IP engellenmiş olabilir.");
        return [];

    } catch (err) {
        console.error(`[DEBUG-CRITICAL] KRİTİK HATA: ${err.message}`);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
else globalThis.getStreams = getStreams;
