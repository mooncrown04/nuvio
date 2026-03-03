// Global korumalar
if (typeof setTimeout === 'undefined') { var setTimeout = function(f, m) {}; }

var BASE = 'https://www.fullhdfilmizlesene.live';

// Temel Base64 Çözücü
function d(s) {
    try {
        var r = s.replace(/[a-zA-Z]/g, function(c) {
            return String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26);
        });
        return atob(r.replace(/\s/g, ''));
    } catch (e) { return null; }
}

function getStreams(tmdbId, type) {
    return new Promise(function(resolve) {
        if (type !== 'movie') return resolve([]);

        // TMDB yerine doğrudan arama veya daha hızlı bir yöntem simülasyonu
        var api = 'https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96';

        fetch(api)
            .then(function(r) { return r.json(); })
            .then(function(m) {
                return fetch(BASE + '/arama/' + encodeURIComponent(m.title));
            })
            .then(function(r) { return r.text(); })
            .then(function(h) {
                // Sadece ilk film linkini al
                var m = h.match(/href=["'](\/film\/[^"']+)["']/);
                if (!m) return resolve([]);
                return fetch(BASE + m[1]);
            })
            .then(function(r) { return r.text(); })
            .then(function(f) {
                var s = f.match(/scx\s*=\s*(\{.*?\});/);
                if (!s) return resolve([]);
                
                var data = JSON.parse(s[1]);
                var out = [];
                // Sadece TR ve EN kaynaklarını kontrol et (RAM tasarrufu)
                ['tr', 'en'].forEach(function(k) {
                    if (data[k] && data[k].sx && data[k].sx.t) {
                        var link = d(Array.isArray(data[k].sx.t) ? data[k].sx.t[0] : data[k].sx.t);
                        if (link) {
                            out.push({ name: "FHD " + k.toUpperCase(), url: link });
                        }
                    }
                });
                resolve(out);
            })
            .catch(function() { resolve([]); });
    });
}

module.exports = { getStreams };
