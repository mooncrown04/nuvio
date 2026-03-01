/**
 * FullHDFilmizlesene Link Yakalayıcı (Dinamik ve Şifre Çözücü)
 */

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Linklerin gelmesi için gereken en kritik headerlar (SineWix örneğinden)
var REQUEST_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
};

// ==================== 1. ŞİFRE ÇÖZÜCÜLER (ANIMEX/CLOUDSTREAM MANTIĞI) ====================

function decodeFullHD(encodedStr) {
    // Önce ROT13 sonra Base64 çözümü
    var rot13 = encodedStr.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
    return atob(rot13);
}

// Atom/Rapid gibi kaynakların içindeki HEX kodlu gerçek videoyu bulur
function extractHexVideo(html) {
    var match = html.match(/file["']:\s*["']([^"']+)["']/);
    if (!match) return null;
    var raw = match[1].replace(/\\\\x/g, '').replace(/\\x/g, '');
    var decoded = '';
    for (var i = 0; i < raw.length; i += 2) {
        decoded += String.fromCharCode(parseInt(raw.substr(i, 2), 16));
    }
    return decoded.replace(/\\/g, '').replace(/["']/g, "").trim();
}

// ==================== 2. ANA MOTOR (GETSTREAMS) ====================

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        // A - TMDB'den film ismini al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        
        // B - Sitede ara ve film sayfasını bul
        const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(tmdbData.title)}`);
        const searchHtml = await searchRes.text();
        const filmUrlMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
        if (!filmUrlMatch) return [];
        const filmUrl = filmUrlMatch[1].startsWith('http') ? filmUrlMatch[1] : BASE_URL + filmUrlMatch[1];

        // C - Film sayfasındaki şifreli 'scx' verisini çek
        const pageRes = await fetch(filmUrl);
        const pageHtml = await pageRes.text();
        const scxMatch = pageHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];
        
        const scx = JSON.parse(scxMatch[1]);
        const streams = [];
        const targets = ['atom', 'proton', 'fast', 'tr', 'en'];

        for (let key of targets) {
            if (!scx[key] || !scx[key].sx || !scx[key].sx.t) continue;
            const encryptedLinks = Array.isArray(scx[key].sx.t) ? scx[key].sx.t : Object.values(scx[key].sx.t);

            for (let enc of encryptedLinks) {
                const decodedUrl = decodeFullHD(enc);
                if (!decodedUrl.startsWith('http')) continue;

                // D - Eğer link bir iframe ise (Atom/Rapid), içine girip gerçek linki çek
                if (decodedUrl.includes('atom') || decodedUrl.includes('rapidvid')) {
                    const iframeRes = await fetch(decodedUrl, { headers: { 'Referer': filmUrl } });
                    const iframeHtml = await iframeRes.text();
                    const realVideoUrl = extractHexVideo(iframeHtml);
                    
                    if (realVideoUrl) {
                        streams.push({
                            name: `FHD - ${key.toUpperCase()}`,
                            url: realVideoUrl,
                            type: 'VIDEO',
                            headers: { 'Referer': decodedUrl, 'User-Agent': REQUEST_HEADERS['User-Agent'] }
                        });
                    }
                } else {
                    // Doğrudan linkler (Proton, Fast vb.)
                    streams.push({
                        name: `FHD - ${key.toUpperCase()} (Direct)`,
                        url: decodedUrl,
                        type: decodedUrl.includes('m3u8') ? 'M3U8' : 'VIDEO',
                        headers: { 'Referer': filmUrl }
                    });
                }
            }
        }
        return streams;

    } catch (e) {
        console.error("Hata oluştu:", e);
        return [];
    }
}
