var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/json'
};

function manualAtob(s) {
    var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, dec = "", tmp_arr = [];
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

function universalDecode(s) {
    try {
        var rot13 = function(t) {
            return t.replace(/[a-zA-Z]/g, function(e) {
                return String.fromCharCode((e <= "Z" ? 90 : 122) >= (e = e.charCodeAt(0) + 13) ? e : e - 26);
            });
        };
        var cleaned = rot13(s).replace(/\s/g, "");
        // Cihazda atob yoksa manualAtob kullan
        return (typeof atob !== 'undefined') ? atob(cleaned) : manualAtob(cleaned);
    } catch (e) { return null; }
}

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve) {
        // TV kanallarını veya dizileri şimdilik pas geç (Film odaklı)
        if (mediaType !== 'movie') return resolve([]);

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96&language=tr-TR';

        fetch(tmdbUrl)
            .then(function(r) { return r.json(); })
            .then(function(movie) {
                var searchTitle = movie.title || movie.original_title;
                return fetch(BASE_URL + '/arama/' + encodeURIComponent(searchTitle), { headers: STREAM_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(html) {
                var match = html.match(/<a[^>]+href=["'](\/film\/[^"']+)["']/i);
                if (!match) throw new Error('Film bulunamadi');
                return fetch(BASE_URL + match[1], { headers: STREAM_HEADERS });
            })
            .then(function(res) { return res.text(); })
            .then(function(filmHtml) {
                var scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
                if (!scxMatch) return [];

                var scx = JSON.parse(scxMatch[1]);
                var results = [];

                ['tr', 'en'].forEach(function(lang) {
                    if (scx[lang] && scx[lang].sx && scx[lang].sx.t) {
                        var rawArr = scx[lang].sx.t;
                        var raw = Array.isArray(rawArr) ? rawArr[0] : Object.values(rawArr)[0];
                        var videoUrl = universalDecode(raw);
                        
                        if (videoUrl && videoUrl.indexOf('http') === 0) {
                            results.push({
                                name: 'FHD - ' + (lang === 'tr' ? 'TURKCE' : 'ALTYAZI'),
                                url: videoUrl,
                                quality: '1080p',
                                headers: STREAM_HEADERS
                            });
                        }
                    }
                });
                resolve(results);
            })
            .catch(function() {
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
