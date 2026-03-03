// Cihazda atob yoksa manuel Base64 çözücü (Güvenlik hatalarını aşmak için)
var b64 = function(s) {
    var c = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    var out = "", i = 0;
    s = s.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    while (i < s.length) {
        var e1 = c.indexOf(s.charAt(i++)), e2 = c.indexOf(s.charAt(i++)),
            e3 = c.indexOf(s.charAt(i++)), e4 = c.indexOf(s.charAt(i++));
        var r1 = (e1 << 2) | (e2 >> 4), r2 = ((e2 & 15) << 4) | (e3 >> 2), r3 = ((e3 & 3) << 6) | e4;
        out += String.fromCharCode(r1);
        if (e3 != 64) out += String.fromCharCode(r2);
        if (e4 != 64) out += String.fromCharCode(r3);
    }
    return out;
};

// Rot13 Çözücü
var r13 = function(s) {
    return s.replace(/[a-zA-Z]/g, function(c) {
        return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
    });
};

function getStreams(tmdbId, type) {
    return new Promise(function(resolve) {
        if (type !== 'movie') return resolve([]);

        var TMDB_URL = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(TMDB_URL)
            .then(function(r) { return r.json(); })
            .then(function(movie) {
                var searchUrl = 'https://www.fullhdfilmizlesene.live/arama/' + encodeURIComponent(movie.title);
                return fetch(searchUrl);
            })
            .then(function(r) { return r.text(); })
            .then(function(html) {
                var match = html.match(/href=["'](\/film\/[^"']+)["']/);
                if (!match) throw 'no_film';
                return fetch('https://www.fullhdfilmizlesene.live' + match[1]);
            })
            .then(function(r) { return r.text(); })
            .then(function(page) {
                var scxMatch = page.match(/scx\s*=\s*(\{.*?\});/);
                if (!scxMatch) throw 'no_data';
                
                var data = JSON.parse(scxMatch[1]);
                var results = [];
                
                // Sadece en stabil kaynak: Türkçe
                if (data.tr && data.tr.sx && data.tr.sx.t) {
                    var encoded = Array.isArray(data.tr.sx.t) ? data.tr.sx.t[0] : data.tr.sx.t;
                    var finalUrl = b64(r13(encoded));
                    if (finalUrl) results.push({ name: "FHD-TR", url: finalUrl });
                }
                
                resolve(results);
            })
            .catch(function(e) {
                // Hata anında boş dön ki uygulama çökmesin
                resolve([]);
            });
    });
}

module.exports = { getStreams };
