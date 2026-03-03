// Cihazda olmayan fonksiyonlar için koruma
if (typeof setTimeout === 'undefined') {
    var setTimeout = function(fn, ms) { /* Boş fonksiyon */ };
}

var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// Basitleştirilmiş Base64 Çözücü (atob yoksa çalışır)
function simpleDecode(str) {
    try {
        // ROT13 işlemi
        var r = str.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        // Base64 temizleme ve çözme (Cihazın atob desteği varsa kullanılır)
        var cleaned = r.replace(/\s/g, '');
        return atob(cleaned);
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(movie) {
                var title = movie.title || movie.original_title;
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(title), { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var filmMatch = html.match(/class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
                if (!filmMatch) return resolve([]);
                
                var filmUrl = filmMatch[1].indexOf('http') === 0 ? filmMatch[1] : BASE_URL + filmMatch[1];
                return fetch(filmUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
                if (!scxMatch) return resolve([]);

                var scxData = JSON.parse(scxMatch[1]);
                var results = [];
                var keys = ['tr', 'en', 'atom']; // Sadece en önemli 3 kaynağı al (RAM için)

                for (var i = 0; i < keys.length; i++) {
                    var k = keys[i];
                    if (scxData[k] && scxData[k].sx && scxData[k].sx.t) {
                        var raw = scxData[k].sx.t;
                        var link = Array.isArray(raw) ? raw[0] : raw; // Sadece ilk linki al
                        
                        var decoded = simpleDecode(link);
                        if (decoded && decoded.indexOf('http') === 0) {
                            results.push({
                                name: "FHD | " + k.toUpperCase(),
                                url: decoded,
                                quality: "1080p",
                                headers: HEADERS
                            });
                        }
                    }
                }
                resolve(results);
            })
            .catch(function() { resolve([]); });
    });
}

module.exports = { getStreams };
