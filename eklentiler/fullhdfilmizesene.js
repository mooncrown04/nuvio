// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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
                const decoded = decodeLinkFixed(item.encoded);
                if (!decoded) continue;

                // --- VLC ve Player Fix: Linkin sonuna Header'ları zorla gömüyoruz ---
                // Bazı uygulamalar headers objesini okumaz, bu yüzden linke ekliyoruz.
                const finalUrl = decoded + "|User-Agent=" + encodeURIComponent(HEADERS['User-Agent']) + "&Referer=" + encodeURIComponent(BASE_URL + "/");

                allStreams.push({
                    name: '⌜ FHD ⌟ | ' + item.label,
                    title: title + ' · 1080p',
                    url: finalUrl, // Header gömülü link
                    quality: '1080p',
                    headers: HEADERS, // Hem objede hem linkte kalsın
                    behaviorHints: {
                        notDirect: true,
                        proxyHeaders: { "common": HEADERS }
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
        if (searchResults.length === 0) return [];
        return await fetchDetailAndStreams(searchResults[0]);
    } catch (e) { return []; }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
