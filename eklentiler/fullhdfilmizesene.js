// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Sunucuyu kandırmak için en geniş kapsamlı header seti
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'X-Requested-With': 'XMLHttpRequest'
};

// ==================== EVRENSEL DECODE SİSTEMİ ====================

function universalDecode(encoded) {
    if (!encoded) return null;
    try {
        // ROT13 Çözücü
        var rot13 = function(s) {
            return s.replace(/[a-zA-Z]/g, function(c) {
                return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
            });
        };
        // Önce ROT13, sonra Base64 temizliği
        var cleaned = rot13(encoded).replace(/\s/g, '');
        var decoded = "";
        if (typeof Buffer !== 'undefined') {
            decoded = Buffer.from(cleaned, 'base64').toString('utf-8');
        } else {
            decoded = atob(cleaned);
        }
        return decoded.startsWith('http') ? decoded : null;
    } catch (e) { return null; }
}

// Hex kodlu (\x68\x74...) linkleri temizleme
function hexToUtf8(hex) {
    if (!hex) return null;
    try {
        var str = hex.replace(/\\\\x|\\x/g, '');
        var result = '';
        for (var i = 0; i < str.length; i += 2) {
            result += String.fromCharCode(parseInt(str.substr(i, 2), 16));
        }
        return result.includes('http') ? result : null;
    } catch (e) { return null; }
}

// ==================== KAYNAK AYIKLAYICI (VLC DOSTU) ====================

async function resolveSource(sourceUrl, pageUrl) {
    try {
        const response = await fetch(sourceUrl, { headers: { 'User-Agent': HEADERS['User-Agent'], 'Referer': pageUrl } });
        const text = await response.text();
        
        // Rapidvid/Vidmoxy gibi aracıların içindeki asıl .m3u8 linkini bul
        const fileMatch = text.match(/file["']?\s*[:=]\s*["']([^"']+)["']/);
        if (fileMatch) {
            let link = fileMatch[1];
            if (link.includes('\\x')) link = hexToUtf8(link);
            return link;
        }
        return sourceUrl;
    } catch (e) { return sourceUrl; }
}

// ==================== ANA MOTOR ====================

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        // 1. TMDB'den doğru ismi al
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const movie = await tmdbRes.json();
        const searchTitle = movie.title || movie.original_title;

        // 2. Sitede Ara (En alakalı ilk sonucu al)
        const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(searchTitle)}`, { headers: HEADERS });
        const searchHtml = await searchRes.text();
        const filmMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
        if (!filmMatch) return [];

        const filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];

        // 3. Film Sayfasındaki Tüm Kaynakları (scx) Tara
        const filmRes = await fetch(filmUrl, { headers: HEADERS });
        const filmHtml = await filmRes.text();
        const scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];

        const scxData = JSON.parse(scxMatch[1]);
        const keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];
        let results = [];

        for (const key of keys) {
            if (!scxData[key] || !scxData[key].sx || !scxData[key].sx.t) continue;
            
            const rawSources = scxData[key].sx.t;
            const sourceArray = Array.isArray(rawSources) ? rawSources : Object.values(rawSources);

            for (let i = 0; i < sourceArray.length; i++) {
                let decodedUrl = universalDecode(sourceArray[i]);
                if (!decodedUrl) continue;

                // Eğer link bir embed/iframe ise içine girip m3u8'i çek
                if (decodedUrl.includes('rapidvid') || decodedUrl.includes('vidmoxy')) {
                    decodedUrl = await resolveSource(decodedUrl, filmUrl);
                }

                if (decodedUrl && decodedUrl.startsWith('http')) {
                    results.push({
                        name: `FHD | ${key.toUpperCase()} - Kaynak ${i + 1}`,
                        url: decodedUrl,
                        quality: "1080p",
                        is_direct: false, // 3003 hatasını önlemek için proxy üzerinden oynat
                        streamType: decodedUrl.includes('.m3u8') ? "hls" : "video",
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
        return results;

    } catch (error) {
        console.error("Hata oluştu:", error);
        return [];
    }
}

module.exports = { getStreams };
