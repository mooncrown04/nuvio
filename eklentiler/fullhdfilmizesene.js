// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// ==================== KRİTİK ŞİFRE ÇÖZÜCÜLER (KOTLIN'DEN PORT EDİLDİ) ====================

function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

// RapidVid'in özel 'decodeSecret' (av) mantığı
function rapidDecode(encodedString) {
    try {
        // 1. String'i ters çevir ve Base64 çöz
        var reversed = encodedString.split('').reverse().join('');
        var tString = atob(reversed);
        
        // 2. "K9L" anahtarı ile ofset uygula
        var oBuilder = "";
        var key = "K9L";
        for (var i = 0; i < tString.length; i++) {
            var keyChar = key.charCodeAt(i % key.length);
            var offset = (keyChar % 5) + 1;
            oBuilder += String.fromCharCode(tString.charCodeAt(i) - offset);
        }
        
        // 3. Çıkan sonucu tekrar Base64 çöz
        return atob(oBuilder);
    } catch (e) {
        return null;
    }
}

// Genel çözümleyici (ROT13 + Base64)
function commonDecode(encoded) {
    try {
        return atob(rot13(encoded));
    } catch (e) { return null; }
}

// ==================== ÖZEL EXTRACTOR FONKSİYONLARI ====================

// Sobreatsesuyp & TRsTX Mantığı (POST gerektirir)
async function fetchComplexPlaylist(url, referer) {
    try {
        const domain = new URL(url).origin;
        const res = await fetch(url, { headers: { ...HEADERS, 'Referer': referer } });
        const html = await res.text();
        
        const fileMatch = html.match(/file":"([^"]+)"/);
        if (!fileMatch) return [];
        
        const postLink = domain + "/" + fileMatch[1].replace(/\\/g, "");
        const rawListRes = await fetch(postLink, { 
            method: 'POST', 
            headers: { ...HEADERS, 'Referer': referer } 
        });
        const rawList = await rawListRes.json();
        
        const results = [];
        // İlk elemanı atla (Cloudstream 'drop(1)' mantığı)
        for (let i = 1; i < rawList.length; i++) {
            const item = rawList[i];
            const playlistUrl = domain + "/playlist/" + item.file.substring(1) + ".txt";
            const videoDataRes = await fetch(playlistUrl, { method: 'POST', headers: HEADERS });
            const videoUrl = await videoDataRes.text();
            
            results.push({
                url: videoUrl.trim(),
                quality: item.title || "HD",
                type: "application/x-mpegURL"
            });
        }
        return results;
    } catch (e) { return []; }
}

// RapidVid / Vidmoxy Mantığı
async function fetchRapidVid(url, referer) {
    try {
        const res = await fetch(url, { headers: { ...HEADERS, 'Referer': referer } });
        const html = await res.text();
        const avMatch = html.match(/av\('([^']+)'\)/);
        if (avMatch) {
            const m3u8 = rapidDecode(avMatch[1]);
            return [{ url: m3u8, quality: "720p", type: "application/x-mpegURL" }];
        }
        return [];
    } catch (e) { return []; }
}

// ==================== ANA MOTOR ====================

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        // 1. Arama ve Film Sayfasına Giriş
        const tmdbRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96`);
        const movie = await tmdbRes.json();
        const searchRes = await fetch(`${BASE_URL}/arama/${encodeURIComponent(movie.title)}`, { headers: HEADERS });
        const searchHtml = await searchRes.text();
        
        const filmMatch = searchHtml.match(/<li[^>]*class="film"[^>]*>[\s\S]*?<a href="([^"]+)"/i);
        if (!filmMatch) return [];
        
        const filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];
        const filmPage = await (await fetch(filmUrl, { headers: HEADERS })).text();

        // 2. SCX Verisini Yakala
        const scxMatch = filmPage.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];
        const scx = JSON.parse(scxMatch[1]);

        const streams = [];
        const keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];

        for (const key of keys) {
            if (!scx[key] || !scx[key].sx || !scx[key].sx.t) continue;
            const t = scx[key].sx.t;
            const encodedLinks = Array.isArray(t) ? t : (typeof t === 'object' ? Object.values(t) : [t]);

            for (const [index, enc] of encodedLinks.entries()) {
                const decoded = commonDecode(enc);
                if (!decoded) continue;

                let extracted = [];
                if (decoded.includes('rapidvid') || decoded.includes('vidmoxy')) {
                    extracted = await fetchRapidVid(decoded, filmUrl);
                } else if (decoded.includes('trstx') || decoded.includes('sobreatsesuyp')) {
                    extracted = await fetchComplexPlaylist(decoded, filmUrl);
                } else if (decoded.includes('turbo.imgz.me')) {
                    // TurboImgz basitçe m3u8 barındırır
                    extracted = [{ url: decoded, quality: "HD", type: "application/x-mpegURL" }];
                } else {
                    extracted = [{ 
                        url: decoded, 
                        quality: "720p", 
                        type: decoded.includes('m3u8') ? "application/x-mpegURL" : "video/mp4" 
                    }];
                }

                extracted.forEach(res => {
                    streams.push({
                        name: `⌜ FullHD ⌟ ${key.toUpperCase()} #${index + 1}`,
                        url: res.url,
                        title: res.quality,
                        type: res.type,
                        headers: { ...HEADERS, 'Referer': filmUrl, 'Origin': BASE_URL }
                    });
                });
            }
        }
        return streams;
    } catch (e) {
        return [];
    }
}

if (typeof module !== 'undefined') module.exports = { getStreams };
