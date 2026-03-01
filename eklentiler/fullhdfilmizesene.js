// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.
// Hem Arama Motoru Hem de Extractor'ları Çalışan Hibrit Versiyon

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// ==================== KRİTİK ŞİFRE ÇÖZÜCÜLER (GELİŞMİŞ) ====================

function rot13(str) {
    if (!str) return '';
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

// RapidVid ve VidMoxy'nin özel 'av' (decodeSecret) mantığı
function rapidDecode(encodedString) {
    try {
        var reversed = encodedString.split('').reverse().join('');
        var tString = atob(reversed);
        var oBuilder = "";
        var key = "K9L";
        for (var i = 0; i < tString.length; i++) {
            var keyChar = key.charCodeAt(i % key.length);
            var offset = (keyChar % 5) + 1;
            oBuilder += String.fromCharCode(tString.charCodeAt(i) - offset);
        }
        return atob(oBuilder);
    } catch (e) { return null; }
}

function decodeLink(encoded) {
    try {
        return atob(rot13(encoded));
    } catch (e) { return null; }
}

function hexToStr(hex) {
    try {
        var cleanHex = hex.replace(/\\x/g, '');
        var str = '';
        for (var i = 0; i < cleanHex.length; i += 2) {
            str += String.fromCharCode(parseInt(cleanHex.substr(i, 2), 16));
        }
        return str;
    } catch (e) { return null; }
}

// ==================== ÖZEL EXTRACTORLAR (POST VE HEX DESTEĞİ) ====================

async function fetchComplexSource(url, referer, domain) {
    try {
        const res = await fetch(url, { headers: { ...HEADERS, 'Referer': referer } });
        const html = await res.text();
        const fileMatch = html.match(/file":"([^"]+)"/);
        if (!fileMatch) return [];

        const postLink = domain + "/" + fileMatch[1].replace(/\\/g, "");
        const rawList = await (await fetch(postLink, { method: 'POST', headers: HEADERS })).json();
        
        const results = [];
        for (let i = 1; i < rawList.length; i++) {
            const vidUrl = await (await fetch(`${domain}/playlist/${rawList[i].file.substring(1)}.txt`, { method: 'POST', headers: HEADERS })).text();
            results.push({ url: vidUrl.trim(), quality: rawList[i].title });
        }
        return results;
    } catch (e) { return []; }
}

async function fetchVidMoxyOrRapid(url, referer) {
    try {
        const res = await fetch(url, { headers: { ...HEADERS, 'Referer': referer } });
        const html = await res.text();
        
        // Önce 'av' şifrelemesini dene
        const avMatch = html.match(/av\('([^']+)'\)/);
        if (avMatch) return [{ url: rapidDecode(avMatch[1]), quality: "720p" }];

        // Sonra Hex şifrelemesini dene
        const hexMatch = html.match(/file":\s*"(.*?)"/);
        if (hexMatch) return [{ url: hexToStr(hexMatch[1]), quality: "720p" }];
        
        return [];
    } catch (e) { return []; }
}

// ==================== ANA MOTOR (İLK KODUN YAPISI) ====================

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);
        
        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl).then(res => res.json()).then(async data => {
            const searchUrl = BASE_URL + '/arama/' + encodeURIComponent(data.title);
            const searchHtml = await (await fetch(searchUrl, { headers: HEADERS })).text();
            
            const filmMatch = searchHtml.match(/<li[^>]*class="film"[^>]*>[\s\S]*?<a href="([^"]+)"/i);
            if (!filmMatch) return resolve([]);
            
            const filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];
            const filmPage = await (await fetch(filmUrl, { headers: HEADERS })).text();

            const scxMatch = filmPage.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return resolve([]);
            
            const scx = JSON.parse(scxMatch[1]);
            const finalStreams = [];
            const keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];

            for (const key of keys) {
                if (!scx[key] || !scx[key].sx || !scx[key].sx.t) continue;
                const t = scx[key].sx.t;
                const links = Array.isArray(t) ? t : Object.values(t);

                for (const [index, enc] of links.entries()) {
                    const decoded = decodeLink(enc);
                    if (!decoded) continue;

                    let extracted = [];
                    if (decoded.includes('rapidvid') || decoded.includes('vidmoxy')) {
                        extracted = await fetchVidMoxyOrRapid(decoded, filmUrl);
                    } else if (decoded.includes('trstx.org')) {
                        extracted = await fetchComplexSource(decoded, filmUrl, 'https://trstx.org');
                    } else if (decoded.includes('sobreatsesuyp.com')) {
                        extracted = await fetchComplexSource(decoded, filmUrl, 'https://sobreatsesuyp.com');
                    } else if (decoded.includes('turkeyplayer')) {
                        // TurkeyPlayer master link oluşturma
                        const tpPage = await (await fetch(decoded, { headers: HEADERS })).text();
                        const tpMatch = tpPage.match(/var\s+video\s*=\s*(\{.*?\});/);
                        if (tpMatch) {
                            const tpData = JSON.parse(tpMatch[1]);
                            extracted = [{ url: `https://watch.turkeyplayer.com/m3u8/8/${tpData.md5}/master.txt?s=1&id=${tpData.id}&cache=1`, quality: "Master" }];
                        }
                    } else {
                        extracted = [{ url: decoded, quality: "720p" }];
                    }

                    extracted.forEach(item => {
                        finalStreams.push({
                            name: `⌜ FullHD ⌟ ${key.toUpperCase()} #${index + 1}`,
                            url: item.url,
                            title: (data.title || 'Film') + ' · ' + (item.quality || 'HD'),
                            type: item.url.includes('m3u8') ? 'M3U8' : 'VIDEO',
                            headers: { ...HEADERS, 'Referer': filmUrl }
                        });
                    });
                }
            }
            resolve(finalStreams);
        }).catch(() => resolve([]));
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
