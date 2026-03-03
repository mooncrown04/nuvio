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
        return Buffer.from(cleaned, 'base64').toString('utf-8');
    } catch (e) { return null; }
}

async function getStreams(id, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        // 1. TMDB'den detayları al (ID 550 için Fight Club gelecek)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${id}?language=tr-TR&api_key=${TMDB_API_KEY}`);
        const movie = await tmdbRes.json();
        
        // Arama için hem Türkçe hem Orijinal ismi hazırla
        const queries = [movie.title, movie.original_title].filter(Boolean);
        let filmUrl = null;

        // 2. Sitede sırayla isimleri dene
        for (const query of queries) {
            const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(query)}`, { headers: HEADERS });
            const searchHtml = await searchRes.text();
            const match = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
            if (match) {
                filmUrl = match[1].startsWith('http') ? match[1] : BASE_URL + match[1];
                break;
            }
        }

        if (!filmUrl) return [];

        // 3. scx verisini çek
        const filmRes = await fetch(filmUrl, { headers: { ...HEADERS, 'Referer': filmUrl } });
        const filmHtml = await filmRes.text();
        const scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        
        if (!scxMatch) return [];
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
                        name: `FHD | ${key.toUpperCase()} - Kaynak ${i + 1}`,
                        url: decodedUrl + `|User-Agent=${encodeURIComponent(HEADERS['User-Agent'])}&Referer=${encodeURIComponent(BASE_URL + '/')}`,
                        quality: "1080p",
                        is_direct: true
                    });
                }
            }
        }
        return results;

    } catch (e) {
        return [];
    }
}

module.exports = { getStreams };
