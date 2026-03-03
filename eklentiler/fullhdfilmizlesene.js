var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Referer': BASE_URL + '/'
};

// Cihazın atob desteği yoksa diye yedek decoder
function manualAtob(s) {
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, tmp_arr = [];
    if (!s) return s;
    s += '';
    do {
        h1 = b64.indexOf(s.charAt(i++));
        h2 = b64.indexOf(s.charAt(i++));
        h3 = b64.indexOf(s.charAt(i++));
        h4 = b64.indexOf(s.charAt(i++));
        bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;
        o1 = bits >> 16 & 0xff;
        o2 = bits >> 8 & 0xff;
        o3 = bits & 0xff;
        if (h3 == 64) tmp_arr[ac++] = String.fromCharCode(o1);
        else if (h4 == 64) tmp_arr[ac++] = String.fromCharCode(o1, o2);
        else tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
    } while (i < s.length);
    return tmp_arr.join('');
}

function universalDecode(encoded) {
    if (!encoded) return null;
    try {
        var rot13 = function(s) {
            return s.replace(/[a-zA-Z]/g, function(c) {
                return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
            });
        };
        var cleaned = rot13(encoded).replace(/\s/g, '');
        var decoded = (typeof atob !== 'undefined') ? atob(cleaned) : manualAtob(cleaned);
        return (decoded.indexOf('http') === 0) ? decoded : null;
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?language=tr-TR&api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(r) { return r.json(); })
            .then(function(movie) {
                var searchTitle = movie.title || movie.original_title;
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(searchTitle), { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var filmMatch = html.match(/<li[^>]*class=["']film["'][^>]*>[\s\S]*?<a[^>]+href=["']([^"']+)["']/i);
                if (!filmMatch) throw new Error('Film bulunamadı');
                var filmUrl = filmMatch[1].indexOf('http') === 0 ? filmMatch[1] : BASE_URL + filmMatch[1];
                return fetch(filmUrl, { headers: HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
                if (!scxMatch) return resolve([]);

                var scxData = JSON.parse(scxMatch[1]);
                var keys = ['tr', 'en', 'atom', 'fast', 'proton'];
                var results = [];

                for (var k = 0; k < keys.length; k++) {
                    var key = keys[k];
                    if (scxData[key] && scxData[key].sx && scxData[key].sx.t) {
                        var rawSources = scxData[key].sx.t;
                        var sourceArray = Array.isArray(rawSources) ? rawSources : Object.values(rawSources);

                        for (var i = 0; i < sourceArray.length; i++) {
                            var decodedUrl = universalDecode(sourceArray[i]);
                            if (decodedUrl) {
                                results.push({
                                    name: "FHD | " + key.toUpperCase() + " - " + (i + 1),
                                    url: decodedUrl,
                                    quality: "1080p",
                                    headers: HEADERS
                                });
                            }
                        }
                    }
                }
                resolve(results);
            })
            .catch(function(err) {
                console.log("Hata: " + err);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
}
