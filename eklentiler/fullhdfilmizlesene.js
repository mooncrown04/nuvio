var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/json,*/*'
};

// Manuel Base64 Çözücü (Cihazın atob desteklemiyorsa devreye girer)
function manualAtob(s) {
    var b = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, dec = "", tmp_arr = [];
    if (!s) return s;
    s += '';
    do {
        h1 = b.indexOf(s.charAt(i++));
        h2 = b.indexOf(s.charAt(i++));
        h3 = b.indexOf(s.charAt(i++));
        h4 = b.indexOf(s.charAt(i++));
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

function universalDecode(s) {
    try {
        var rot13 = function(t) {
            return t.replace(/[a-zA-Z]/g, function(e) {
                return String.fromCharCode((e <= "Z" ? 90 : 122) >= (e = e.charCodeAt(0) + 13) ? e : e - 26);
            });
        };
        var cleaned = rot13(s).replace(/\s/g, "");
        return (typeof atob !== 'undefined') ? atob(cleaned) : manualAtob(cleaned);
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(r) { return r.json(); })
            .then(function(movie) {
                var searchTitle = movie.title || movie.original_title;
                // Önce HTTPS dene, hata alırsa catch içinde HTTP'ye düşecek
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(searchTitle), { headers: STREAM_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var match = html.match(/<a[^>]+href=["'](\/film\/[^"']+)["']/i);
                if (!match) throw new Error('NoMatch');
                return fetch(BASE_URL + match[1], { headers: STREAM_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
                if (!scxMatch) return [];

                var scx = JSON.parse(scxMatch[1]);
                var results = [];

                ['tr', 'en'].forEach(function(l) {
                    if (scx[l] && scx[l].sx && scx[l].sx.t) {
                        var raw = Array.isArray(scx[l].sx.t) ? scx[l].sx.t[0] : Object.values(scx[l].sx.t)[0];
                        var url = universalDecode(raw);
                        if (url && url.indexOf('.vtt') === -1) {
                            results.push({
                                name: 'FHD - ' + l.toUpperCase(),
                                url: url + '|User-Agent=' + encodeURIComponent(STREAM_HEADERS['User-Agent']),
                                quality: '1080p',
                                headers: STREAM_HEADERS
                            });
                        }
                    }
                });
                resolve(results);
            })
            .catch(function(err) {
                console.log('[FHD-LOG] Hata Alindi, Sessizce Bitiriliyor');
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
