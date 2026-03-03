// eklentiler/fullhdfilmizesene.js dosyası içeriği

const BASE_URL = 'https://www.fullhdfilmizlesene.live';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'X-Requested-With': 'XMLHttpRequest'
};

// Şifre çözücü fonksiyon
function universalDecode(encoded) {
    if (!encoded) return null;
    try {
        var rot13 = s => s.replace(/[a-zA-Z]/g, c => 
            String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26));
        var cleaned = rot13(encoded).replace(/\s/g, '');
        // Android ortamında Buffer yoksa: atob(cleaned) kullanın
        var decoded = Buffer.from(cleaned, 'base64').toString('utf-8');
        return decoded.startsWith('http') ? decoded : null;
    } catch (e) { return null; }
}

// ANA FONKSİYON: NuvioTV bunu çağırır
async function getStreams(id, mediaType) {
    // Sadece film desteği (JSON'da tv de var ama kodun film için)
    if (mediaType !== 'movie') return [];

    try {
        // 1. TMDB'den film adını al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${id}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const movie = await tmdbRes.json();
        const searchTitle = movie.title || movie.original_title;

        // 2. Sitede ara
        const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(searchTitle)}`, { headers: HEADERS });
        const searchHtml = await searchRes.text();
        const filmMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
        
        if (!filmMatch) return [];
        const filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];

        // 3. Kaynakları çek (scx)
        const filmRes = await fetch(filmUrl, { headers: HEADERS });
        const filmHtml = await filmRes.text();
        const scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        
        if (!scxMatch) return [];
        const scxData = JSON.parse(scxMatch[1]);
        
        let results = [];
        const keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];

        for (const key of keys) {
            if (!scxData[key]?.sx?.t) continue;
            const sourceArray = Array.isArray(scxData[key].sx.t) ? scxData[key].sx.t : Object.values(scxData[key].sx.t);

            for (let i = 0; i < sourceArray.length; i++) {
                let decodedUrl = universalDecode(sourceArray[i]);
                if (!decodedUrl) continue;

                // Android Player Uyumu için URL'ye header gömme
                let finalUrl = decodedUrl + `|User-Agent=${encodeURIComponent(HEADERS['User-Agent'])}&Referer=${encodeURIComponent(HEADERS['Referer'])}`;

                results.push({
                    name: `FHD | ${key.toUpperCase()} - ${i + 1}`,
                    url: finalUrl,
                    quality: "1080p",
                    is_direct: true // Linki doğrudan oynatıcıya gönder
                });
            }
        }
        return results;
    } catch (error) {
        return [];
    }
}

// Eklenti sistemine dışa aktar
module.exports = { getStreams };
