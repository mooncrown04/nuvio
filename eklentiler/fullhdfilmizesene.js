/**
 * FullHDFilmizlesene - Gelişmiş Dinamik Link Çözücü
 * Dosyalarındaki Kotlin ve JS mantığı harmanlanmıştır.
 */

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Sunucu korumasını aşmak için gerekli Header'lar (sinewix.js örneğinden)
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
};

// ==================== YARDIMCI ARAÇLAR ====================

// Siteye özgü ROT13 + Base64 çözücü
function decodeSource(enc) {
    try {
        var rot13 = enc.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        return atob(rot13);
    } catch (e) { return null; }
}

// Cloudstream (Yeni Metin Belgesi (2).txt) dosyasındaki hex temizleme mantığı
function cleanHex(hexStr) {
    try {
        var clean = hexStr.replace(/\\\\x/g, '').replace(/\\x/g, '');
        var res = '';
        for (var i = 0; i < clean.length; i += 2) {
            res += String.fromCharCode(parseInt(clean.substr(i, 2), 16));
        }
        return res.replace(/\\/g, '').replace(/["']/g, "").trim();
    } catch (e) { return null; }
}

// ==================== ANA MOTOR ====================

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        // 1. TMDB'den film adını al (Arama için)
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR`);
        const tmdbData = await tmdbRes.json();
        const title = tmdbData.title;

        // 2. Sitede Ara (Arama sayfasından ilk sonucu al)
        const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(title)}`, { headers: HEADERS });
        const searchHtml = await searchRes.text();
        const linkMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
        if (!linkMatch) return [];
        const movieUrl = linkMatch[1].startsWith('http') ? linkMatch[1] : BASE_URL + linkMatch[1];

        // 3. Film sayfasını çek ve 'scx' değişkenini yakala
        const pageRes = await fetch(movieUrl, { headers: HEADERS });
        const pageHtml = await pageRes.text();
        const scxMatch = pageHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];

        const scx = JSON.parse(scxMatch[1]);
        const streams = [];
        const providers = ['atom', 'proton', 'fast', 'tr', 'en', 'advid'];

        for (const p of providers) {
            if (!scx[p] || !scx[p].sx || !scx[p].sx.t) continue;
            const encryptedLinks = Array.isArray(scx[p].sx.t) ? scx[p].sx.t : Object.values(scx[p].sx.t);

            for (const enc of encryptedLinks) {
                const decoded = decodeSource(enc);
                if (!decoded) continue;

                // 4. Extractor Mantığı: Eğer link bir iframe ise içine gir (Cloudstream logic)
                if (decoded.includes('atom') || decoded.includes('rapidvid') || decoded.includes('vidmoxy')) {
                    const iframeRes = await fetch(decoded, { headers: { 'Referer': movieUrl } });
                    const iframeHtml = await iframeRes.text();
                    const hexUrl = iframeHtml.match(/file["']:\s*["']([^"']+)["']/);
                    
                    if (hexUrl) {
                        const finalUrl = cleanHex(hexUrl[1]);
                        streams.push({
                            name: `⌜ FHD ⌟ ${p.toUpperCase()}`,
                            url: finalUrl,
                            type: 'VIDEO',
                            headers: { 'Referer': decoded, 'User-Agent': HEADERS['User-Agent'] }
                        });
                    }
                } else {
                    // Doğrudan linkler (Proton vb.)
                    streams.push({
                        name: `⌜ FHD ⌟ ${p.toUpperCase()} (Direct)`,
                        url: decoded,
                        type: decoded.includes('m3u8') ? 'M3U8' : 'VIDEO',
                        headers: { 'Referer': movieUrl }
                    });
                }
            }
        }
        return streams;
    } catch (err) {
        console.error("Hata:", err);
        return [];
    }
}
