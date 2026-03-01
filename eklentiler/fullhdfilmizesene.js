// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// ==================== KRİTİK ŞİFRE ÇÖZÜCÜLER (Kotlin'den Port Edildi) ====================

function rot13(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function decodeFHD(encoded) {
    try {
        // Kotlin: atob(rtt(link)) -> Önce ROT13 sonra Base64
        var rotated = rot13(encoded);
        return atob(rotated);
    } catch (e) {
        return null;
    }
}

// ==================== ANA MOTOR ====================

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl).then(res => res.json()).then(async data => {
            const title = data.title;
            const searchUrl = BASE_URL + '/arama/' + encodeURIComponent(title);
            const searchHtml = await (await fetch(searchUrl, { headers: HEADERS })).text();
            
            // Film sayfasını bul
            const filmMatch = searchHtml.match(/<li[^>]*class="film"[^>]*>[\s\S]*?<a href="([^"]+)"/i);
            if (!filmMatch) return resolve([]);
            
            const filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];
            const filmPage = await (await fetch(filmUrl, { headers: HEADERS })).text();

            // Kotlin kodundaki scx verisini yakala
            const scxMatch = filmPage.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return resolve([]);
            
            const scx = JSON.parse(scxMatch[1]);
            const finalStreams = [];
            
            // Kotlin'deki tüm anahtarlar
            const keys = ["atom", "advid", "advidprox", "proton", "fast", "fastly", "tr", "en"];

            for (const key of keys) {
                if (!scx[key] || !scx[key].sx || !scx[key].sx.t) continue;
                
                var t = scx[key].sx.t;
                // t hem Liste hem de Obje (Map) olabiliyor, Kotlin kodundaki gibi kontrol ediyoruz
                var rawLinks = [];
                if (Array.isArray(t)) {
                    rawLinks = t;
                } else if (typeof t === 'object') {
                    rawLinks = Object.values(t);
                }

                for (const [index, enc] of rawLinks.entries()) {
                    const decoded = decodeFHD(enc);
                    if (!decoded || !decoded.includes('http')) continue;

                    // Eğer link doğrudan bir video/m3u8 değilse (iframe ise)
                    // Burada 'Source Error' almamak için URL'yi olduğu gibi bırakıyoruz 
                    // Player'ın 'Sniffing' özelliği varsa m3u8'i kendi yakalayacaktır.
                    
                    finalStreams.push({
                        name: '⌜ FullHD ⌟ ' + key.toUpperCase() + (rawLinks.length > 1 ? ' #' + (index + 1) : ''),
                        url: decoded,
                        title: data.title + ' · HD',
                        type: decoded.includes('m3u8') ? 'M3U8' : 'VIDEO', // Tip belirleme çok önemli
                        headers: {
                            'User-Agent': HEADERS['User-Agent'],
                            'Referer': filmUrl,
                            'Origin': BASE_URL
                        }
                    });
                }
            }
            resolve(finalStreams);
        }).catch(err => {
            console.error(err);
            resolve([]);
        });
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
