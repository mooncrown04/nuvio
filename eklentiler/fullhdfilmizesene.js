// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// FullHDFilmizlesene - Link Gösterme & Atom Fix

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'X-Requested-With': 'XMLHttpRequest'
};

// ==================== YARDIMCI FONKSİYONLAR ====================

function atobFixed(str) {
    try {
        if (typeof Buffer !== 'undefined') return Buffer.from(str, 'base64').toString('utf-8');
        return atob(str);
    } catch (e) { return null; }
}

function rot13Fixed(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(char) {
        var code = char.charCodeAt(0);
        var base = code < 97 ? 65 : 97;
        return String.fromCharCode(((code - base + 13) % 26) + base);
    });
}

function decodeLinkFixed(encoded) {
    try {
        var result = atobFixed(rot13Fixed(encoded));
        return (result && result.startsWith('http')) ? result : null;
    } catch (e) { return null; }
}

// ==================== ANA MOTOR ====================

async function fetchDetailAndStreams(filmUrl) {
    try {
        console.log("[FullHD] Film sayfası yükleniyor: " + filmUrl);
        const res = await fetch(filmUrl, { headers: HEADERS });
        const html = await res.text();
        
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'FullHD Film';
        
        const scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) {
            console.log("[FullHD] scx verisi bulunamadı!");
            return [];
        }

        const scxData = JSON.parse(scxMatch[1]);
        const keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];
        let allStreams = [];

        for (const key of keys) {
            if (!scxData[key] || !scxData[key].sx || !scxData[key].sx.t) continue;
            
            const t = scxData[key].sx.t;
            const items = Array.isArray(t) 
                ? t.map((v, i) => ({ encoded: v, label: key.toUpperCase() + ' #' + (i+1) })) 
                : Object.keys(t).map(k => ({ encoded: t[k], label: key.toUpperCase() + ' ' + k }));

            for (const item of items) {
                const decoded = decodeLinkFixed(item.encoded);
                if (!decoded) continue;

                allStreams.push({
                    name: '⌜ FullHD ⌟ | ' + item.label,
                    title: title + ' · 1080p',
                    url: decoded,
                    quality: '1080p',
                    behaviorHints: {
                        notDirect: true,
                        proxyHeaders: {
                            "common": {
                                'User-Agent': HEADERS['User-Agent'],
                                'Referer': filmUrl,
                                'Origin': BASE_URL,
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        }
                    }
                });
            }
        }
        
        console.log("[FullHD] Bulunan toplam link: " + allStreams.length);
        return allStreams;
    } catch (e) {
        console.error("[FullHD] Detay hatası:", e);
        return [];
    }
}

async function searchFullHD(title) {
    try {
        const searchUrl = BASE_URL + '/arama/' + encodeURIComponent(title);
        const res = await fetch(searchUrl, { headers: HEADERS });
        const html = await res.text();
        
        const results = [];
        const regex = /<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/gi;
        let m;
        while ((m = regex.exec(html)) !== null) {
            results.push(m[1].startsWith('http') ? m[1] : BASE_URL + m[1]);
        }
        return results;
    } catch (e) {
        console.error("[FullHD] Arama hatası:", e);
        return [];
    }
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        // 1. TMDB Bilgisi
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const movieData = await tmdbRes.json();
        
        // 2. Sitede Arama
        const searchResults = await searchFullHD(movieData.title);
        if (searchResults.length === 0) {
            // Türkçe isimle bulunamadıysa orijinal isimle dene
            const altResults = await searchFullHD(movieData.original_title);
            if (altResults.length === 0) return [];
            return await fetchDetailAndStreams(altResults[0]);
        }

        // 3. İlk sonucun linklerini çek
        return await fetchDetailAndStreams(searchResults[0]);
    } catch (e) {
        console.error("[FullHD] getStreams Genel Hata:", e);
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
