// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Sunucu bazlı engellemeleri aşmak için gerekli başlıklar
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// Video oynatılırken Source Error almamak için gereken özel başlıklar
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

// ==================== KRİTİK ŞİFRE ÇÖZÜCÜLER ====================

function hexDecode(hex) {
    if (!hex) return null;
    try {
        // Çift kaçışlı hex karakterlerini temizle (\\x -> \x)
        var cleanHex = hex.replace(/\\\\x/g, '').replace(/\\x/g, '');
        var str = '';
        for (var i = 0; i < cleanHex.length; i += 2) {
            str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
        }
        return str;
    } catch (e) { return null; }
}

function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function decodeLink(encoded) {
    try {
        return atob(rot13(encoded));
    } catch (e) { return null; }
}

// ==================== EXTRACTOR MANTIĞI ====================

async function fetchSource(url, referer) {
    try {
        const res = await fetch(url, { headers: { ...HEADERS, 'Referer': referer } });
        const text = await res.text();
        
        // RapidVid / VidMoxy Hex Şifrelemesi
        const hexMatch = text.match(/file":\s*"(.*?)"/);
        if (hexMatch) {
            const decoded = hexDecode(hexMatch[1]);
            if (decoded) return [{ url: decoded, quality: '720p' }];
        }
        
        // Eğer direkt m3u8 varsa
        if (url.includes('.m3u8')) return [{ url: url, quality: 'HD' }];
        
        return [];
    } catch (e) { return []; }
}

// ==================== ANA AKIŞ ====================

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;

        fetch(tmdbUrl).then(res => res.json()).then(async data => {
            const searchUrl = `${BASE_URL}/arama/${encodeURIComponent(data.title)}`;
            const searchHtml = await (await fetch(searchUrl, { headers: HEADERS })).text();
            
            const filmMatch = searchHtml.match(/<li[^>]*class="film"[^>]*>[\s\S]*?<a href="([^"]+)"/i);
            if (!filmMatch) return resolve([]);
            
            const filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];
            const filmPage = await (await fetch(filmUrl, { headers: HEADERS })).text();

            const scxMatch = filmPage.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return resolve([]);
            
            const scx = JSON.parse(scxMatch[1]);
            const results = [];
            const keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];

            for (const key of keys) {
                if (!scx[key]?.sx?.t) continue;
                const t = scx[key].sx.t;
                const encodedLinks = Array.isArray(t) ? t : Object.values(t);

                for (const [index, enc] of encodedLinks.entries()) {
                    const decoded = decodeLink(enc);
                    if (!decoded) continue;

                    const extracted = await fetchSource(decoded, filmUrl);
                    extracted.forEach(item => {
                        results.push({
                            name: `⌜ FullHD ⌟ ${key.toUpperCase()} #${index + 1}`,
                            url: item.url,
                            title: `${data.title} · ${item.quality}`,
                            type: item.url.includes('m3u8') ? 'M3U8' : 'VIDEO',
                            headers: STREAM_HEADERS, // Hata almamak için kritik başlıklar
                            provider: 'fullhdfilmizlesene'
                        });
                    });
                }
            }
            resolve(results);
        }).catch(() => resolve([]));
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
