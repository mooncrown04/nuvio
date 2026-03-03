// eklentiler/fullhdfilmizlesene.js
// @keyiflerolsun & @KekikAkademi temel alınarak optimize edilmiştir.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': BASE_URL + '/'
};

// ==================== YARDIMCI FONKSİYONLAR ====================

function universalDecode(encoded) {
    if (!encoded) return null;
    try {
        var rot13 = function(s) {
            return s.replace(/[a-zA-Z]/g, function(c) {
                return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
            });
        };
        var cleaned = rot13(encoded).replace(/\s/g, '');
        var decoded = (typeof Buffer !== 'undefined') 
            ? Buffer.from(cleaned, 'base64').toString('utf-8') 
            : atob(cleaned);
        return decoded;
    } catch (e) { return null; }
}

// ==================== ANA MOTOR ====================

async function getStreams(tmdbId, mediaType) {
    console.log("[FHD-PRO] Islem Basladi. ID: " + tmdbId);
    if (mediaType !== 'movie') return [];

    try {
        // 1. TMDB'den Film Bilgisi Al (Hızlı cevap için 5sn timeout)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        if (!tmdbRes) return [];
        const movie = await tmdbRes.json();
        const searchTitle = movie.title || movie.original_title;
        console.log("[FHD-PRO] Aranan: " + searchTitle);

        // 2. Sitede Arama Yap
        const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(searchTitle)}`, { headers: HEADERS });
        if (!searchRes) return [];
        const searchHtml = await searchRes.text();
        
        const filmMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
        if (!filmMatch) {
            console.log("[FHD-PRO] Film bulunamadi.");
            return [];
        }

        const filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];

        // 3. Film Sayfasını Çek ve Kaynakları Ayıkla
        const filmRes = await fetch(filmUrl, { headers: HEADERS });
        const filmHtml = await filmRes.text();
        const scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];

        const scxData = JSON.parse(scxMatch[1]);
        const keys = ['tr', 'en', 'fast', 'proton', 'atom'];
        let results = [];

        for (const key of keys) {
            if (!scxData[key]?.sx?.t) continue;
            
            const rawSources = scxData[key].sx.t;
            const sourceArray = Array.isArray(rawSources) ? rawSources : Object.values(rawSources);

            for (let i = 0; i < sourceArray.length; i++) {
                let decodedUrl = universalDecode(sourceArray[i]);
                
                // --- KRİTİK FİLTRE: Altyazı ve Hatalı Linkleri Ele ---
                if (!decodedUrl || !decodedUrl.startsWith('http')) continue;
                if (decodedUrl.includes('.vtt') || decodedUrl.includes('.srt')) continue; 
                // ---------------------------------------------------

                results.push({
                    name: `FHD | ${key.toUpperCase()} - Kaynak ${i + 1}`,
                    url: decodedUrl + `|User-Agent=${encodeURIComponent(HEADERS['User-Agent'])}&Referer=${encodeURIComponent(BASE_URL + '/')}`,
                    quality: "1080p",
                    is_direct: true // Player'a doğrudan video olduğunu söyle
                });
            }
        }

        console.log("[FHD-PRO] Bitti. Kaynak Sayisi: " + results.length);
        return results;

    } catch (error) {
        console.log("[FHD-PRO] Hata: " + error.message);
        return [];
    }
}

module.exports = { getStreams };
