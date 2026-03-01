// ! Bu araç @keyiflerolsun tarafından | @KekikAkademi için yazılmıştır.

var BASE_URL = 'https://www.fullhdfilmizlesene.live';

// Oynatıcı hatasını engellemek için gerekli standart başlıklar
var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'tr-TR,tr;q=0.9',
    'Origin': BASE_URL,
    'Referer': BASE_URL + '/',
    'Sec-Fetch-Dest': 'video',
    'Sec-Fetch-Mode': 'no-cors',
    'Sec-Fetch-Site': 'cross-site'
};

// ==================== KRİTİK DECODE FONKSİYONLARI ====================

function rot13(str) {
    if (!str) return null;
    return str.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
}

function decodeFHD(encoded) {
    try {
        // Cloudstream Kotlin mantığı: Önce ROT13, sonra Base64
        var rotated = rot13(encoded);
        if (typeof Buffer !== 'undefined') {
            return Buffer.from(rotated, 'base64').toString('utf-8');
        }
        return window.atob(rotated);
    } catch (e) { return null; }
}

// ==================== ANA MOTOR ====================

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl).then(res => res.json()).then(async data => {
            var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(data.title);
            var searchHtml = await (await fetch(searchUrl)).text();
            
            // Film sayfasını bulma
            var filmMatch = searchHtml.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
            if (!filmMatch) return resolve([]);
            
            var filmUrl = filmMatch[1].startsWith('http') ? filmMatch[1] : BASE_URL + filmMatch[1];
            var filmPage = await (await fetch(filmUrl)).text();

            // Sayfadaki scx değişkenini yakalama
            var scxMatch = filmPage.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return resolve([]);
            
            var scx = JSON.parse(scxMatch[1]);
            var streams = [];
            // Kotlin dosyasındaki tüm anahtar listesi
            var keys = ['atom', 'advid', 'advidprox', 'proton', 'fast', 'fastly', 'tr', 'en'];

            keys.forEach(function(key) {
                if (!scx[key] || !scx[key].sx || !scx[key].sx.t) return;
                var t = scx[key].sx.t;
                var rawLinks = Array.isArray(t) ? t : Object.values(t);

                rawLinks.forEach(function(enc, index) {
                    var decoded = decodeFHD(enc);
                    if (decoded && decoded.includes('http')) {
                        // Sniff hatasını önlemek için doğru tipi atamak şart
                        var isM3U8 = decoded.includes('.m3u8') || decoded.includes('playlist');
                        
                        streams.push({
                            name: '⌜ FullHD ⌟ ' + key.toUpperCase() + (rawLinks.length > 1 ? ' #' + (index + 1) : ''),
                            url: decoded,
                            title: data.title + ' · HD',
                            type: isM3U8 ? 'M3U8' : 'VIDEO',
                            headers: Object.assign({}, STREAM_HEADERS, { 'Referer': filmUrl }),
                            provider: 'fullhdfilmizlesene'
                        });
                    }
                });
            });
            resolve(streams);
        }).catch(() => resolve([]));
    });
}

if (typeof module !== 'undefined') module.exports = { getStreams };
