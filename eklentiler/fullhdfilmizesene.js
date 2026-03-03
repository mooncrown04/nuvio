// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Sunucuların bot korumasını geçmek için standart header seti
var COMMON_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
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

// ==================== SUNUCU AYIKLAYICILAR ====================

/**
 * Atom ve Fast gibi sunucular için özel header yönetimi yapar.
 * Proton için standart bağlantı yeterlidir.
 */
function resolveServerStream(key, url, index) {
    var streamInfo = {
        name: `FHD | ${key.toUpperCase()} - Kaynak ${index + 1}`,
        url: url,
        quality: "1080p",
        headers: COMMON_HEADERS,
        behaviorHints: {
            notDirect: true,
            proxyHeaders: { "common": COMMON_HEADERS }
        }
    };

    // Atom ve Fast genellikle .m3u8 (HLS) kullanır
    if (key === 'atom' || key === 'fast') {
        streamInfo.streamType = "hls";
    }

    return streamInfo;
}

// ==================== ANA MOTOR ====================

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        // 1. TMDB Bilgisi
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const movie = await tmdbRes.json();
        const searchTitle = movie.title || movie.original_title;

        // 2. Sitede Arama (XDmovies örneğindeki gibi path bulma mantığı)
        const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(searchTitle)}`, { headers: COMMON_HEADERS });
        const searchHtml = await searchRes.text();
        const filmMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
        if (!filmMatch) return [];

        const filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];

        // 3. Film Sayfası ve scx Verisi
        const filmRes = await fetch(filmUrl, { headers: COMMON_HEADERS });
        const filmHtml = await filmRes.text();
        const scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];

        const scxData = JSON.parse(scxMatch[1]);
        const targetKeys = ['atom', 'fast', 'proton', 'tr', 'en']; // Öncelik sırası
        let results = [];

        for (const key of targetKeys) {
            if (!scxData[key] || !scxData[key].sx || !scxData[key].sx.t) continue;
            
            const rawSources = scxData[key].sx.t;
            const sourceArray = Array.isArray(rawSources) ? rawSources : Object.values(rawSources);

            for (let i = 0; i < sourceArray.length; i++) {
                let decodedUrl = universalDecode(sourceArray[i]);
                if (!decodedUrl) continue;

                // XDmovies mantığı: Her kaynağı sunucu tipine göre işle
                const stream = resolveServerStream(key, decodedUrl, i);
                results.push(stream);
            }
        }

        return results;

    } catch (error) {
        console.error("Stream hatası:", error);
        return [];
    }
}

module.exports = { getStreams };
