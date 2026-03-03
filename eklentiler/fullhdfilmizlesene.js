// eklentiler/fullhdfilmizesene.js
var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'X-Requested-With': 'XMLHttpRequest'
};

function universalDecode(encoded) {
    if (!encoded) return null;
    try {
        var rot13 = s => s.replace(/[a-zA-Z]/g, c => String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26));
        var cleaned = rot13(encoded).replace(/\s/g, '');
        var decoded = (typeof Buffer !== 'undefined') ? Buffer.from(cleaned, 'base64').toString('utf-8') : atob(cleaned);
        return decoded.startsWith('http') ? decoded : null;
    } catch (e) { return null; }
}

async function getStreams(tmdbId, mediaType) {
    console.log("[NUVIO-DEBUG] Baslatildi. ID: " + tmdbId);
    if (mediaType !== 'movie') return [];

    try {
        // 1. TMDB Bilgisi
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const movie = await tmdbRes.json();
        const searchTitle = movie.title || movie.original_title;
        console.log("[NUVIO-DEBUG] Aranan Film: " + searchTitle);

        // 2. Arama
        const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(searchTitle)}`, { headers: HEADERS });
        const searchHtml = await searchRes.text();
        const filmMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
        
        if (!filmMatch) {
            console.log("[NUVIO-DEBUG] Sitede film bulunamadi.");
            return [];
        }

        const filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];
        console.log("[NUVIO-DEBUG] Film Sayfasi: " + filmUrl);

        // 3. Kaynak Ayiklama
        const filmRes = await fetch(filmUrl, { headers: HEADERS });
        const filmHtml = await filmRes.text();
        const scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        
        if (!scxMatch) {
            console.log("[NUVIO-DEBUG] SCX verisi bulunamadi.");
            return [];
        }

        const scxData = JSON.parse(scxMatch[1]);
        const keys = ['tr', 'en', 'fast', 'proton'];
        let results = [];

        for (const key of keys) {
            if (!scxData[key]?.sx?.t) continue;
            const sourceArray = Array.isArray(scxData[key].sx.t) ? scxData[key].sx.t : Object.values(scxData[key].sx.t);

            for (let i = 0; i < sourceArray.length; i++) {
                let decodedUrl = universalDecode(sourceArray[i]);
                if (!decodedUrl) continue;

                // Android TV için URL sonuna Header ekleme (En güvenli yöntem)
                const finalUrl = decodedUrl + `|User-Agent=${encodeURIComponent(HEADERS['User-Agent'])}&Referer=${encodeURIComponent(BASE_URL + '/')}`;

                results.push({
                    name: `FHD | ${key.toUpperCase()} - ${i + 1}`,
                    url: finalUrl,
                    quality: "1080p",
                    is_direct: true, // Doğrudan URL'yi kullan
                });
            }
        }

        console.log("[NUVIO-DEBUG] Bulunan toplam kaynak: " + results.length);
        return results;

    } catch (error) {
        console.log("[NUVIO-DEBUG] KRITIK HATA: " + error.message);
        return [];
    }
}

module.exports = { getStreams };
