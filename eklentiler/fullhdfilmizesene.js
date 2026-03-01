// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// ==================== YARDIMCI ŞİFRE ÇÖZÜCÜLER ====================

// Packer (eval(function...)) Unpacker - VidMoxy/Rapid için kritik
function unpack(code) {
    function unbase(s, b) {
        var alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
        var out = 0;
        var s_arr = s.split("");
        for (var i = 0; i < s_arr.length; i++) {
            out = out * b + alphabet.indexOf(s_arr[i]);
        }
        return out;
    }
    var p = /}\('(.*)',\s*(\d+),\s*(\d+),\s*'(.*)'\.split\('\|'\)/.exec(code);
    if (!p) return code;
    var payload = p[1], base = parseInt(p[2]), count = parseInt(p[3]), dict = p[4].split('|');
    while (count--) {
        if (dict[count]) {
            payload = payload.replace(new RegExp('\\b' + count.toString(base) + '\\b', 'g'), dict[count]);
        }
    }
    return payload;
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

// Hex Decode - VidMoxy/Rapid hex stringleri için
function hexToStr(hex) {
    var str = '';
    var cleanHex = hex.replace(/\\x/g, '');
    for (var i = 0; i < cleanHex.length; i += 2) {
        str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
    }
    return str;
}

// ==================== ÖZEL EXTRACTORLAR ====================

// 1. TurkeyPlayer Extractor
async function fetchTurkeyPlayer(url, referer) {
    try {
        const res = await fetch(url, { headers: { ...HEADERS, 'Referer': referer } });
        const html = await res.text();
        const videoJsonMatch = html.match(/var\s+video\s*=\s*(\{.*?\});/);
        if (!videoJsonMatch) return [];
        
        const videoData = JSON.parse(videoJsonMatch[1]);
        // Kotlin kodundaki masterUrl yapısı
        const masterUrl = `https://watch.turkeyplayer.com/m3u8/8/${videoData.md5}/master.txt?s=1&id=${videoData.id}&cache=1`;
        return [{ url: masterUrl, quality: "Master", type: "application/x-mpegURL" }];
    } catch (e) { return []; }
}

// 2. VidMoxy / RapidVid Extractor (Unpack & Hex Desteği)
async function fetchVidMoxy(url, referer) {
    try {
        const res = await fetch(url, { headers: { ...HEADERS, 'Referer': referer } });
        const html = await res.text();
        
        let escapedHex = "";
        const directMatch = html.match(/file":\s*"(.*?)",/);
        
        if (directMatch) {
            escapedHex = directMatch[1];
        } else {
            // eval/packer yapısı varsa çöz
            const evalMatch = html.match(/eval\(function\(p,a,c,k,e,d\)[\s\S]*?\.split\('\|'\)\)\)/);
            if (evalMatch) {
                const unpacked = unpack(evalMatch[0]);
                const hexMatch = unpacked.match(/file":"(.*?)","label/);
                if (hexMatch) escapedHex = hexMatch[1].replace(/\\x/g, '');
            }
        }
        
        if (escapedHex) {
            const decoded = hexToStr(escapedHex);
            return [{ url: decoded, quality: "720p", type: "application/x-mpegURL" }];
        }
        return [];
    } catch (e) { return []; }
}

// 3. Trstx & Sobreatsesuyp (POST İşlemi)
async function fetchPostPlaylist(url, referer, providerDomain) {
    try {
        const res = await fetch(url, { headers: { ...HEADERS, 'Referer': referer } });
        const html = await res.text();
        const file = html.match(/file":"([^"]+)"/)?.[1];
        if (!file) return [];

        const postRes = await fetch(`${providerDomain}/${file.replace(/\\/g, "")}`, { method: 'POST', headers: HEADERS });
        const list = await postRes.json();
        
        const results = [];
        for (let i = 1; i < list.length; i++) {
            const vidUrl = await (await fetch(`${providerDomain}/playlist/${list[i].file.substring(1)}.txt`, { method: 'POST', headers: HEADERS })).text();
            results.push({ url: vidUrl.trim(), quality: list[i].title, type: "application/x-mpegURL" });
        }
        return results;
    } catch (e) { return []; }
}

// ==================== ANA AKIŞ ====================

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const movie = await tmdbRes.json();
        const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(movie.title)}`, { headers: HEADERS });
        const searchHtml = await searchRes.text();
        
        const filmUrlMatch = searchHtml.match(/<li[^>]*class="film"[^>]*>[\s\S]*?<a href="([^"]+)"/i);
        if (!filmUrlMatch) return [];
        
        const filmUrl = filmUrlMatch[1].startsWith('http') ? filmUrlMatch[1] : BASE_URL + filmUrlMatch[1];
        const filmPageHtml = await (await fetch(filmUrl, { headers: HEADERS })).text();

        const scxMatch = filmPageHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];
        const scx = JSON.parse(scxMatch[1]);

        const streams = [];
        const keys = Object.keys(scx);

        for (const key of keys) {
            const t = scx[key]?.sx?.t;
            if (!t) continue;
            const encodedLinks = Array.isArray(t) ? t : Object.values(t);

            for (const [index, enc] of encodedLinks.entries()) {
                const decoded = decodeLink(enc);
                if (!decoded) continue;

                let extracted = [];
                if (decoded.includes('turkeyplayer')) {
                    extracted = await fetchTurkeyPlayer(decoded, filmUrl);
                } else if (decoded.includes('vidmoxy') || decoded.includes('rapidvid')) {
                    extracted = await fetchVidMoxy(decoded, filmUrl);
                } else if (decoded.includes('trstx.org')) {
                    extracted = await fetchPostPlaylist(decoded, filmUrl, 'https://trstx.org');
                } else if (decoded.includes('sobreatsesuyp.com')) {
                    extracted = await fetchPostPlaylist(decoded, filmUrl, 'https://sobreatsesuyp.com');
                } else if (decoded.includes('turbo.imgz.me')) {
                    const res = await fetch(decoded, { headers: HEADERS });
                    const txt = await res.text();
                    const link = txt.match(/file: "(.*)",/)?.[1];
                    if (link) extracted = [{ url: link, quality: "HD", type: "application/x-mpegURL" }];
                } else {
                    extracted = [{ url: decoded, quality: "720p", type: decoded.includes('m3u8') ? "application/x-mpegURL" : "video/mp4" }];
                }

                extracted.forEach(item => {
                    streams.push({
                        name: `⌜ FullHD ⌟ ${key.toUpperCase()} #${index + 1}`,
                        url: item.url,
                        title: item.quality || "HD",
                        type: item.type,
                        headers: { ...HEADERS, 'Referer': filmUrl }
                    });
                });
            }
        }
        return streams;
    } catch (e) { return []; }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
