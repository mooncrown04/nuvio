// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// VLC'nin reddedilmemesi için en kritik kısım: UA ve Referer
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// ==================== DECODE SİSTEMİ ====================

function decodeFHD(encoded) {
    try {
        // ROT13 + Base64
        var rot13 = function(s) { return s.replace(/[a-zA-Z]/g, function(c) { return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26); }); };
        var step1 = rot13(encoded).replace(/\s/g, '');
        return (typeof Buffer !== 'undefined') ? Buffer.from(step1, 'base64').toString('utf-8') : atob(step1);
    } catch (e) { return null; }
}

function hexToUrl(hex) {
    try {
        var str = '';
        var clean = hex.replace(/\\\\x|\\x/g, '');
        for (var i = 0; i < clean.length; i += 2) {
            str += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
        }
        return str;
    } catch (e) { return null; }
}

// ==================== VLC DOSTU EXTRACTOR ====================

async function getFinalM3U8(url, pageUrl) {
    try {
        const res = await fetch(url, { headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': pageUrl } });
        const text = await res.text();
        
        // "file":"\x68\x74..." veya "file":"http..." yakala
        const match = text.match(/file["']?\s*[:=]\s*["']([^"']+)["']/);
        if (!match) return url; // Bulamazsa ana linki dön

        const found = match[1];
        if (found.includes('\\x')) return hexToUrl(found);
        return found;
    } catch (e) { return url; }
}

// ==================== ANA MOTOR ====================

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        // 1. TMDB'den film adını al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const movie = await tmdbRes.json();
        
        // 2. Sitede Ara
        const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(movie.title)}`, { headers: HEADERS });
        const searchHtml = await searchRes.text();
        const filmPathMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
        if (!filmPathMatch) return [];
        
        const filmUrl = filmPathMatch[1].startsWith('http') ? filmPathMatch[1] : BASE_URL + filmPathMatch[1];

        // 3. Kaynakları Ayıkla (scx objesi)
        const filmRes = await fetch(filmUrl, { headers: HEADERS });
        const filmHtml = await filmRes.text();
        const scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];

        const scxData = JSON.parse(scxMatch[1]);
        const keys = ['atom', 'proton', 'fast', 'tr', 'en'];
        let allStreams = [];

        for (const key of keys) {
            if (!scxData[key] || !scxData[key].sx || !scxData[key].sx.t) continue;
            const sources = Array.isArray(scxData[key].sx.t) ? scxData[key].sx.t : Object.values(scxData[key].sx.t);

            for (let i = 0; i < sources.length; i++) {
                let decoded = decodeFHD(sources[i]);
                if (!decoded) continue;

                // Eğer Rapid/Moxy gibi aracı ise içeri gir
                if (decoded.includes('rapidvid') || decoded.includes('vidmoxy')) {
                    decoded = await getFinalM3U8(decoded, filmUrl);
                }

                if (decoded && decoded.startsWith('http')) {
                    allStreams.push({
                        name: `FHD | ${key.toUpperCase()} #${i+1}`,
                        url: decoded,
                        quality: "1080p",
                        is_direct: false, // Proxy kullanımı VLC için daha güvenlidir
                        streamType: "hls", // VLC'ye m3u8 olduğunu zorla öğretir
                        headers: {
                            'User-Agent': HEADERS['User-Agent'],
                            'Referer': BASE_URL + '/',
                            'Origin': BASE_URL,
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    });
                }
            }
        }
        return allStreams;
    } catch (e) {
        return [];
    }
}

module.exports = { getStreams };
