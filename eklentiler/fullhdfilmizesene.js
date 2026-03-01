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

// ==================== YARDIMCI ARAÇLAR ====================

function decodeFHD(enc) {
    try {
        // ROT13 + Base64
        var rotated = enc.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        return atob(rotated);
    } catch (e) { return null; }
}

// RapidVid / VidMoxy içerisinden m3u8 ayıklama
async function rapidExtractor(url, filmUrl) {
    try {
        const res = await fetch(url, { headers: { 'Referer': filmUrl } });
        const text = await res.text();
        // file": "hex_data" yapısını yakala
        const match = text.match(/file["']:\s*["']([^"']+)["']/);
        if (match) {
            let data = match[1];
            if (data.includes('\\x')) {
                // Hex decode işlemi
                data = data.replace(/\\\\x/g, '').replace(/\\x/g, '');
                let str = '';
                for (let i = 0; i < data.length; i += 2) {
                    str += String.fromCharCode(parseInt(data.substr(i, 2), 16));
                }
                return str;
            }
            return data;
        }
    } catch (e) { return null; }
    return url;
}

// ==================== ANA MOTOR ====================

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const tmdbData = await tmdbRes.json();
        
        const searchHtml = await (await fetch(`${BASE_URL}/arama/${encodeURIComponent(tmdbData.title)}`)).text();
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

                // EXTRACTOR DEVREYE GİRİYOR
                if (decoded.includes('rapidvid') || decoded.includes('vidmoxy') || decoded.includes('atom')) {
                    const extracted = await rapidExtractor(decoded, filmUrl);
                    if (extracted) decoded = extracted;
                }

                if (decoded.includes('http')) {
                    streams.push({
                        name: `⌜ FullHD ⌟ ${key.toUpperCase()} #${index + 1}`,
                        url: decoded,
                        title: `${tmdbData.title} · HD`,
                        type: decoded.includes('m3u8') ? 'M3U8' : 'VIDEO',
                        headers: { ...STREAM_HEADERS, 'Referer': filmUrl },
                        provider: 'fullhdfilmizlesene'
                    });
                }
            }
        }
        return streams;
    } catch (e) { return []; }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
