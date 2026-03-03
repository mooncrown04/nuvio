// ! Geliştirilmiş Kaynak Ayıklayıcı
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'X-Requested-With': 'XMLHttpRequest'
};

// Çift Katmanlı Şifre Çözücü (ROT13 + Base64)
function universalDecode(encoded) {
    if (!encoded) return null;
    try {
        var rot13 = s => s.replace(/[a-zA-Z]/g, c => 
            String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26));
        
        var cleaned = rot13(encoded).replace(/\s/g, '');
        var decoded = Buffer.from(cleaned, 'base64').toString('utf-8');
        return decoded.startsWith('http') ? decoded : null;
    } catch (e) { return null; }
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        // 1. Film Bilgisini Çek (TMDB)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const movie = await tmdbRes.json();
        const searchTitle = movie.title || movie.original_title;
        console.log(`[ARAMA] Film: ${searchTitle}`);

        // 2. Sitede Film URL'sini Bul
        const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(searchTitle)}`, { headers: HEADERS });
        const searchHtml = await searchRes.text();
        const filmMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
        
        if (!filmMatch) {
            console.log("[HATA] Film sayfada bulunamadı.");
            return [];
        }

        const filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];

        // 3. scx Objesini Yakala
        const filmRes = await fetch(filmUrl, { headers: HEADERS });
        const filmHtml = await filmRes.text();
        const scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        
        if (!scxMatch) {
            console.log("[HATA] Şifreli veri (scx) bulunamadı.");
            return [];
        }

        const scxData = JSON.parse(scxMatch[1]);
        const keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];
        let results = [];

        for (const key of keys) {
            if (!scxData[key]?.sx?.t) continue;
            
            const sourceArray = Array.isArray(scxData[key].sx.t) ? scxData[key].sx.t : Object.values(scxData[key].sx.t);

            for (let i = 0; i < sourceArray.length; i++) {
                let decodedUrl = universalDecode(sourceArray[i]);
                if (!decodedUrl) continue;

                // Stream bilgilerini yapılandır
                results.push({
                    name: `FHD | ${key.toUpperCase()} - Kaynak ${i + 1}`,
                    url: decodedUrl,
                    quality: "1080p",
                    is_direct: false, 
                    headers: HEADERS
                });
            }
        }

        console.log(`[BAŞARI] ${results.length} kaynak bulundu.`);
        return results;

    } catch (error) {
        console.error("[KRİTİK HATA]:", error.message);
        return [];
    }
}

module.exports = { getStreams };
