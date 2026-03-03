// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Atom ve Fast sunucularının geçit vermesi için gereken kritik başlıklar
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'X-Requested-With': 'XMLHttpRequest'
};

// ==================== DECODE SİSTEMİ ====================

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
        return decoded.startsWith('http') ? decoded : null;
    } catch (e) { return null; }
}

// ==================== ANA MOTOR ====================

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        // 1. TMDB Arama
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const movie = await tmdbRes.json();
        const searchTitle = movie.title || movie.original_title;

        // 2. Site İçi Arama
        const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(searchTitle)}`, { headers: HEADERS });
        const searchHtml = await searchRes.text();
        const filmMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
        if (!filmMatch) return [];

        const filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];

        // 3. Kaynak Ayıklama
        const filmRes = await fetch(filmUrl, { headers: HEADERS });
        const filmHtml = await filmRes.text();
        const scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];

        const scxData = JSON.parse(scxMatch[1]);
        const keys = ['atom', 'fast', 'proton', 'tr', 'en'];
        let results = [];

        for (const key of keys) {
            if (!scxData[key] || !scxData[key].sx || !scxData[key].sx.t) continue;
            const sourceArray = Array.isArray(scxData[key].sx.t) ? scxData[key].sx.t : Object.values(scxData[key].sx.t);

            for (let i = 0; i < sourceArray.length; i++) {
                let decodedUrl = universalDecode(sourceArray[i]);
                if (!decodedUrl) continue;

                // VLC ve Player için en güvenli gönderim formatı
                results.push({
                    name: `FHD | ${key.toUpperCase()} - ${i + 1}`,
                    url: decodedUrl,
                    quality: "1080p",
                    // header'ları hem düz hem behavior içinde gönderiyoruz ki Player şaşırmasın
                    headers: HEADERS,
                    is_direct: false, // Player'ın proxy yapmasını zorunlu kılar, 3003'ü engeller
                    behaviorHints: {
                        notDirect: true,
                        proxyHeaders: {
                            "common": HEADERS
                        }
                    }
                });
            }
        }
        return results;

    } catch (error) {
        return [];
    }
}

module.exports = { getStreams };
