var BASE_URL = 'https://www.fullhdfilmizlesene.live';

var STREAM_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Origin': BASE_URL
};

// Base64 Çözücü (atob yoksa çalışması için manuel fonksiyon)
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
    dec = tmp_arr.join('');
    return dec;
}

function universalDecode(s) {
    try {
        var rot13 = function(t) {
            return t.replace(/[a-zA-Z]/g, function(e) {
                return String.fromCharCode((e <= "Z" ? 90 : 122) >= (e = e.charCodeAt(0) + 13) ? e : e - 26);
            });
        };
        var cleaned = rot13(s).replace(/\s/g, "");
        return manualAtob(cleaned);
    } catch (e) { return null; }
}

function fetchFilmPage(filmPath, title) {
    return fetch(BASE_URL + filmPath, { headers: STREAM_HEADERS })
        .then(function(res) { return res.text(); })
        .then(function(html) {
            var scxMatch = html.match(/scx\s*=\s*(\{[\s\S]*?\});/);
            if (!scxMatch) return [];

            var scxData = JSON.parse(scxMatch[1]);
            var streams = [];

            // Türkçe ve İngilizce kaynakları kontrol et
            ['tr', 'en'].forEach(function(lang) {
                if (scxData[lang] && scxData[lang].sx && scxData[lang].sx.t) {
                    var raw = Array.isArray(scxData[lang].sx.t) ? scxData[lang].sx.t[0] : Object.values(scxData[lang].sx.t)[0];
                    var decodedUrl = universalDecode(raw);
                    
                    if (decodedUrl && decodedUrl.indexOf('http') === 0 && decodedUrl.indexOf('.vtt') === -1) {
                        streams.push({
                            name: 'FHD - ' + (lang === 'tr' ? 'Türkçe' : 'İngilizce'),
                            title: title,
                            url: decodedUrl,
                            quality: '1080p',
                            headers: STREAM_HEADERS
                        });
                    }
                }
            });
            return streams;
        });
}

function getStreams(tmdbId, mediaType) {
    return new Promise(function(resolve, reject) {
        if (mediaType !== 'movie') {
            resolve([]);
            return;
        }

        var tmdbUrl = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(tmdbUrl)
            .then(function(res) { return res.json(); })
            .then(function(data) {
                var title = data.title || data.original_title;
                if (!title) throw new Error('Title not found');
                
                var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(title);
                return fetch(searchUrl, { headers: STREAM_HEADERS }).then(function(res) {
                    return res.text().then(function(html) {
                        return { html: html, title: title };
                    });
                });
            })
            .then(function(obj) {
                var filmMatch = obj.html.match(/<a[^>]+href=["'](\/film\/[^"']+)["']/i);
                if (!filmMatch) return [];
                return fetchFilmPage(filmMatch[1], obj.title);
            })
            .then(function(streams) {
                resolve(streams || []);
            })
            .catch(function(err) {
                console.error('[FHD] Error:', err.message);
                resolve([]);
            });
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams };
} else {
    global.getStreams = getStreams;
}
