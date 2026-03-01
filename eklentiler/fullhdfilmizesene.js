// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL,
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

// ==================== KRİTİK AYIKLAYICILAR ====================

function rot13(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function decodeFHD(encoded) {
    try {
        return atob(rot13(encoded));
    } catch (e) { return null; }
}

// RapidVid ve VidMoxy gibi servislerin içinden gerçek m3u8'i çekme
async function extractExternal(url) {
    try {
        const res = await fetch(url, { headers: { 'Referer': BASE_URL + '/' } });
        const text = await res.text();
        // Sitenin içindeki 'file': '...' yapısını veya hex kodunu yakalar
        const match = text.match(/file["']:\s*["']([^"']+)["']/) || text.match(/source\s*:\s*["']([^"']+)["']/);
        if (match) {
            let link = match[1];
            // Eğer link hex kodlu gelirse (\x...) onu temizle (Python kodundaki mantık)
            if (link.includes('\\x')) {
                link = link.replace(/\\x/g, '').replace(/[^a-zA-Z0-9]/g, ''); // Basit temizleme
            }
            return link;
        }
    } catch (e) { return null; }
    return url;
}

// ==================== ANA MOTOR ====================

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        const tmdbUrl = `https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`;
        const tmdbRes = await fetch(tmdbUrl);
        const tmdbData = await tmdbRes.json();
        
        const searchUrl = `${BASE_URL}/arama/${encodeURIComponent(tmdbData.title)}`;
        const searchHtml = await (await fetch(searchUrl)).text();
        
        const filmMatch = searchHtml.match(/<li[^>]*class="film"[^>]*>[\s\S]*?<a href="([^"]+)"/i);
        if (!filmMatch) return [];
        
        const filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];
        const filmPage = await (await fetch(filmUrl)).text();

        const scxMatch = filmPage.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];
        
        const scx = JSON.parse(scxMatch[1]);
        const keys = ["atom", "advid", "proton", "fast", "tr", "en"];
        const streams = [];

        for (const key of keys) {
            if (!scx[key]?.sx?.t) continue;
            const t = scx[key].sx.t;
            const rawLinks = Array.isArray(t) ? t : Object.values(t);

            for (const [index, enc] of rawLinks.entries()) {
                let decoded = decodeFHD(enc);
                if (!decoded) continue;

                // EKSTRA AYIKLAMA (Kotlin/Python Mantığı)
                // Eğer link bir iframe ise içeriğine girip gerçek m3u8'i almalıyız
                if (decoded.includes('rapidvid') || decoded.includes('vidmoxy') || decoded.includes('trstx')) {
                    const realUrl = await extractExternal(decoded);
                    if (realUrl) decoded = realUrl;
                }

                if (decoded.includes('http')) {
                    const isM3U8 = decoded.includes('.m3u8') || decoded.includes('playlist');
                    
                    streams.push({
                        name: `⌜ FullHD ⌟ ${key.toUpperCase()} #${index + 1}`,
                        url: decoded,
                        title: `${tmdbData.title} · HD`,
                        type: isM3U8 ? 'M3U8' : 'VIDEO',
                        headers: {
                            ...STREAM_HEADERS,
                            'Referer': filmUrl // Sunucunun videoyu reddetmemesi için şart
                        }
                    });
                }
            }
        }
        return streams;
    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
