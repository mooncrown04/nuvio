// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Site içi gezinti başlıkları
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': BASE_URL + '/'
};

// Player'ın "Source Error" vermemesi için gerekli kritik başlıklar (DiziPal/SineWix örneğinden)
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

// ==================== YARDIMCI FONKSİYONLAR ====================

function rot13(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(char) {
        var code = char.charCodeAt(0);
        var base = code < 97 ? 65 : 97;
        return String.fromCharCode(((code - base + 13) % 26) + base);
    });
}

function decodeFHD(encoded) {
    try {
        // Kotlin kodundaki mantık: atob(rtt(link)) -> Önce ROT13, sonra Base64
        var rotated = rot13(encoded);
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(rotated, 'base64').toString('utf-8');
        }
        return window.atob(rotated);
    } catch (e) {
        return null;
    }
}

// ==================== ANA MANTIK ====================

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl).then(res => res.json()).then(async data => {
            var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(data.title);
            var searchHtml = await (await fetch(searchUrl, { headers: HEADERS })).text();
            
            // Film sayfasının URL'sini bul
            var filmMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
            if (!filmMatch) return resolve([]);
            
            var filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];
            var filmPage = await (await fetch(filmUrl, { headers: HEADERS })).text();

            // scx verisini ayıkla
            var scxMatch = filmPage.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return resolve([]);
            
            var scx = JSON.parse(scxMatch[1]);
            var results = [];
            var keys = ['atom', 'advid', 'proton', 'fast', 'tr', 'en'];

            keys.forEach(function(key) {
                if (!scx[key] || !scx[key].sx || !scx[key].sx.t) return;
                var t = scx[key].sx.t;

                // t verisi dizi veya obje olabilir (Kotlin kodundaki kontrol)
                var rawLinks = Array.isArray(t) ? t : Object.values(t);

                rawLinks.forEach(function(enc, index) {
                    var decoded = decodeFHD(enc);
                    if (decoded && decoded.includes('http')) {
                        results.push({
                            name: '⌜ FullHD ⌟ | ' + key.toUpperCase() + (rawLinks.length > 1 ? ' #' + (index + 1) : ''),
                            title: data.title + ' · HD',
                            url: decoded,
                            quality: '720p',
                            headers: Object.assign({}, STREAM_HEADERS, { 'Referer': filmUrl }),
                            type: decoded.includes('m3u8') ? 'M3U8' : 'VIDEO',
                            provider: 'fullhdfilmizlesene'
                        });
                    }
                });
            });
            resolve(results);
        }).catch(() => resolve([]));
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
