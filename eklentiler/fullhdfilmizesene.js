// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Sunucunun (Atom/Proton) istediği zorunlu kimlik bilgileri
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'X-Requested-With': 'XMLHttpRequest'
};

// ==================== DECODE SİSTEMİ ====================

function decodeFHD(encoded) {
    try {
        var rot13 = function(s) { return s.replace(/[a-zA-Z]/g, function(c) { return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26); }); };
        var step1 = rot13(encoded).replace(/\s/g, '');
        return (typeof Buffer !== 'undefined') ? Buffer.from(step1, 'base64').toString('utf-8') : atob(step1);
    } catch (e) { return null; }
}

// ==================== ANA MOTOR ====================

async function fetchDetailAndStreams(filmUrl) {
    try {
        const res = await fetch(filmUrl, { headers: HEADERS });
        const html = await res.text();
        
        const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
        const title = titleMatch ? titleMatch[1].trim() : 'Film';
        
        const scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];

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
                const decoded = decodeFHD(item.encoded);
                if (!decoded || !decoded.startsWith('http')) continue;

                // ÖNEMLİ: Linkin sonuna | eklemek bazı playerları bozar. 
                // Linki saf (pure) bırakıp headerları obje olarak veriyoruz.
                allStreams.push({
                    name: '⌜ FHD ⌟ | ' + item.label,
                    title: title + ' · 1080p',
                    url: decoded, // Saf link
                    quality: '1080p',
                    headers: HEADERS, // Çoğu oynatıcı burayı okur
                    is_direct: false, // Proxy kullanımını zorlar, VLC kopmasını engeller
                    behaviorHints: {
                        notDirect: true,
                        proxyHeaders: {
                            "common": HEADERS
                        }
                    }
                });
            }
        }
        return allStreams;
    } catch (e) { return []; }
}

async function searchFullHD(title) {
    try {
        const searchUrl = BASE_URL + '/arama/' + encodeURIComponent(title);
        const res = await fetch(searchUrl, { headers: HEADERS });
        const html = await res.text();
        const regex = /<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/gi;
        let results = [], m;
        while ((m = regex.exec(html)) !== null) {
            results.push(m[1].startsWith('http') ? m[1] : BASE_URL + m[1]);
        }
        return results;
    } catch (e) { return []; }
}

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];
    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const movieData = await tmdbRes.json();
        
        let searchResults = await searchFullHD(movieData.title);
        if (searchResults.length === 0) searchResults = await searchFullHD(movieData.original_title);
        
        if (searchResults.length > 0) {
            return await fetchDetailAndStreams(searchResults[0]);
        }
        return [];
    } catch (e) { return []; }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
