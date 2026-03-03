// eklentiler/fullhdfilmizesene.js

const BASE_URL = 'https://www.fullhdfilmizlesene.live';
const TMDB_API_KEY = '4ef0d7355d9ffb5151e987764708ce96';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
};

function universalDecode(encoded) {
    if (!encoded) return null;
    try {
        const rot13 = s => s.replace(/[a-zA-Z]/g, c => 
            String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26));
        const cleaned = rot13(encoded).replace(/\s/g, '');
        // QuickJS'de Buffer yoksa atob kullanır
        const base64Decoded = typeof Buffer !== 'undefined' 
            ? Buffer.from(cleaned, 'base64').toString('utf-8')
            : atob(cleaned);
        return base64Decoded;
    } catch (e) { 
        console.log("[FHD-LOG] Decode Hatası: " + e.message);
        return null; 
    }
}

async function getStreams(id, mediaType) {
    console.log(`[FHD-LOG] İşlem Başladı. ID: ${id}, Tip: ${mediaType}`);
    if (mediaType !== 'movie') return [];

    try {
        // 1. TMDB Verisi
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${id}?language=tr-TR&api_key=${TMDB_API_KEY}`;
        const tmdbRes = await fetch(tmdbUrl);
        
        if (!tmdbRes) throw new Error("TMDB Response Undefined");
        const movie = await tmdbRes.json();
        
        if (!movie || (!movie.title && !movie.original_title)) {
            console.log("[FHD-LOG] Film bilgisi TMDB'den alınamadı.");
            return [];
        }

        const queries = [movie.title, movie.original_title].filter(Boolean);
        console.log("[FHD-LOG] Aranacak kelimeler: " + queries.join(", "));

        let filmUrl = null;

        // 2. Arama Döngüsü
        for (const query of queries) {
            console.log(`[FHD-LOG] Aranıyor: ${query}`);
            const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(query)}`, { headers: HEADERS });
            
            if (!searchRes) {
                console.log(`[FHD-LOG] ${query} için searchRes undefined döndü.`);
                continue;
            }

            const searchHtml = await searchRes.text();
            const match = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
            
            if (match) {
                filmUrl = match[1].startsWith('http') ? match[1] : BASE_URL + match[1];
                console.log("[FHD-LOG] Film URL bulundu: " + filmUrl);
                break;
            }
        }

        if (!filmUrl) {
            console.log("[FHD-LOG] Sitede uygun film linki bulunamadı.");
            return [];
        }

        // 3. Film Sayfası ve scx Verisi
        const filmPageRes = await fetch(filmUrl, { headers: { ...HEADERS, 'Referer': filmUrl } });
        if (!filmPageRes) throw new Error("Film sayfası yanıt vermedi.");
        
        const filmHtml = await filmPageRes.text();
        const scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        
        if (!scxMatch) {
            console.log("[FHD-LOG] Sayfada şifreli veri (scx) bulunamadı.");
            return [];
        }

        const scxData = JSON.parse(scxMatch[1]);
        const results = [];
        const keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];

        for (const key of keys) {
            if (!scxData[key]?.sx?.t) continue;
            const sources = Array.isArray(scxData[key].sx.t) ? scxData[key].sx.t : Object.values(scxData[key].sx.t);

            for (let i = 0; i < sources.length; i++) {
                const decodedUrl = universalDecode(sources[i]);
                if (decodedUrl && decodedUrl.startsWith('http')) {
                    results.push({
                        name: `Nuvio | ${key.toUpperCase()} - ${i + 1}`,
                        url: decodedUrl + `|User-Agent=${encodeURIComponent(HEADERS['User-Agent'])}&Referer=${encodeURIComponent(BASE_URL + '/')}`,
                        quality: "1080p",
                        is_direct: true
                    });
                }
            }
        }

        console.log(`[FHD-LOG] Toplam ${results.length} kaynak başarıyla eklendi.`);
        return results;

    } catch (e) {
        console.log("[FHD-LOG] Kritik Hata: " + e.message);
        return [];
    }
}

module.exports = { getStreams };
