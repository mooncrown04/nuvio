/**
 * JetFilmizle - Videopark Titan Otomatik Yakalayıcı
 * Senin yazdığın Videopark mantığını tüm dizi/filmlere uyarlar.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://jetfilmizle.net/'
};

function toSlug(t) {
    if(!t) return "";
    return t.toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

async function getStreams(id, mediaType, season, episode) {
    console.error('[Hata-Nerede] 1: Basladi');
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';

    try {
        // 1. TMDB'den isim al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const name = info.name || info.title || info.original_name;
        const year = (info.first_air_date || info.release_date || "").split("-")[0];
        
        const s = season || 1;
        const e = episode || 1;
        const slug = toSlug(name);
        
        // 2. Aday URL Listesi (Senin Cobra Kai ve Katil Makine denemelerin için)
        let candidates = [];
        if (mediaType === 'tv') {
            candidates.push(`${BASE_URL}/dizi/${slug}/sezon-${s}/bolum-${e}`);
            candidates.push(`${BASE_URL}/dizi/${slug}-2018/sezon-${s}/bolum-${e}`); // Cobra Kai 2018 örneği
            candidates.push(`${BASE_URL}/dizi/${slug}/sezon-${s}-bolum-${e}-izle`);
        } else {
            candidates.push(`${BASE_URL}/film/${slug}`);
            candidates.push(`${BASE_URL}/film/${slug}-izle`);
        }

        // 3. JetFilmizle sayfasını bul ve içeriği çek
        let html = "";
        for (let url of candidates) {
            console.error(`[Hata-Nerede] 6: Deneniyor -> ${url}`);
            const res = await fetch(url, { headers: HEADERS });
            if (res.status === 200) {
                html = await res.text();
                break; 
            }
        }

        if (!html) return [];

        // 4. SAYFA İÇİNDEKİ VİDEOPARK ID'SİNİ BUL (Kritik Nokta)
        // Senin kodundaki "DFADXFgPDU4" kısmını burada dinamik yakalıyoruz
        const titanMatch = html.match(/https?:\/\/videopark\.top\/titan\/w\/([a-zA-Z0-9_-]+)/);
        if (!titanMatch) {
            console.error("[TITAN-HATA] Sayfada Videopark ID bulunamadı.");
            return [];
        }

        const dynamicPlayerUrl = titanMatch[0];
        console.error(`[TITAN] Bağlanılıyor: ${dynamicPlayerUrl}`);

        // 5. SENİN YAZDIĞIN BYPASS MANTIĞI
        const response = await fetch(dynamicPlayerUrl, {
            headers: {
                'Referer': 'https://jetfilmizle.net/',
                'User-Agent': HEADERS['User-Agent']
            }
        });
        
        const playerHtml = await response.text();
        const sdMatch = playerHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
        
        if (sdMatch) {
            const data = JSON.parse(sdMatch[1]);
            const streamUrl = data.stream_url;
            const dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            console.error(`[TITAN-BAŞARILI] Akış Yakalandı: ${streamUrl}`);

            const subtitles = data.subtitles ? data.subtitles.map(s => ({
                url: s.file,
                language: s.label,
                format: "vtt"
            })) : [];

            return [{
                name: "Videopark (Titan)",
                title: `⌜ Hızlı Kaynak ⌟ | ${dil}`,
                url: streamUrl,
                type: "hls",
                subtitles: subtitles,
                headers: {
                    'Referer': 'https://videopark.top/',
                    'User-Agent': HEADERS['User-Agent']
                }
            }];
        }

        return [];

    } catch (err) {
        console.error(`[TITAN-KRITIK] Hata: ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
