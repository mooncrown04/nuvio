/**
 * JetFilmizle - Nuvio Ultra (v22 Direct Worker)
 * HTML iskeletiyle vakit kaybetmez, doğrudan veri motoruna bağlanır.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

async function getStreams(id, mediaType, season, episode) {
    console.error(`[FORCE] Başlatıldı: ${mediaType} - ID: ${id}`);
    
    try {
        const tmdbId = id.toString().replace(/[^0-9]/g, '');
        const tmdbType = (mediaType === 'tv') ? 'tv' : 'movie';
        
        // 1. TMDB'den Orjinal İsmi Al (Slug oluşturmak için kritik)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${TMDB_API_KEY}&language=tr-TR`);
        const info = await tmdbRes.json();
        const originalName = info.name || info.title || info.original_name;
        
        // Slug temizleme (Cobra Kai -> cobra-kai)
        const slug = originalName.toLowerCase()
            .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
            .replace(/ı/g,'i').replace(/ö/g,'o').replace(/ç/g,'c')
            .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');

        // 2. JET-PLAYER AJAX ENDPOINT SİMÜLASYONU
        // Sayfa içinde bulamadığımız o ID'yi, sitenin kendi API mantığıyla arıyoruz
        let streams = [];
        
        // Dizi ise bölüm bazlı, film ise direkt slug bazlı
        const targetUrl = (mediaType === 'tv') 
            ? `${BASE_URL}/dizi/${slug}/sezon-${season}/bolum-${episode}`
            : `${BASE_URL}/film/${slug}`;

        console.error(`[FORCE] Veri Kaynağı: ${targetUrl}`);

        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': BASE_URL,
                'X-Requested-With': 'XMLHttpRequest' // Worker'ı tetikleyen kritik başlık
            }
        });

        const html = await response.text();

        // 3. TITAN WORKER BYPASS (Senin Başarılı Kodun)
        // HTML içinde ne kadar 'data-id' veya 'titan' varsa süzüyoruz
        const idRegex = /(?:data-id=|titan\/w\/)["']?([a-zA-Z0-9_-]{10,15})["']?/gi;
        let matches = [];
        let m;
        while ((m = idRegex.exec(html)) !== null) {
            if (m[1].length > 10 && !m[1].startsWith('G-')) matches.push(m[1]);
        }

        console.error(`[FORCE] Bulunan ID Sayısı: ${matches.length}`);

        for (let tId of matches) {
            const titanUrl = `https://videopark.top/titan/w/${tId}`;
            console.error(`[FORCE] Titan Çözülüyor: ${titanUrl}`);

            const tRes = await fetch(titanUrl, { headers: { 'Referer': BASE_URL } });
            const tHtml = await tRes.text();
            const sdMatch = tHtml.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);

            if (sdMatch) {
                const data = JSON.parse(sdMatch[1]);
                if (data.stream_url) {
                    streams.push({
                        name: "Videopark (Titan)",
                        title: `⌜ Hızlı Kaynak ⌟`,
                        url: data.stream_url,
                        type: "hls",
                        subtitles: data.subtitles ? data.subtitles.map(s => ({ url: s.file, language: s.label, format: "vtt" })) : [],
                        headers: { 'Referer': 'https://videopark.top/' }
                    });
                }
            }
        }

        // 4. FALLBACK: Eğer ID bulunamazsa, sayfa içindeki ham akışı (direct) ara
        if (streams.length === 0) {
            const directMatch = html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
            if (directMatch) {
                const d = JSON.parse(directMatch[1]);
                streams.push({ name: "Jet-Direct", url: d.stream_url, type: "hls" });
            }
        }

        console.error(`[FORCE] Bitti. Sonuç: ${streams.length}`);
        return streams;

    } catch (err) {
        console.error(`[FORCE-HATA] ${err.message}`);
        return [];
    }
}

module.exports = { getStreams };
