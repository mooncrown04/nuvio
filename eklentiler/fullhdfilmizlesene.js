// Zaman aşımı desteği olmayan eski motorlar için kontrol
var timeout = function(ms, promise) {
  return new Promise(function(resolve, reject) {
    setTimeout(function() { reject(new Error("timeout")) }, ms);
    promise.then(resolve, reject);
  });
};

function getStreams(tmdbId, type) {
    return new Promise(function(resolve) {
        if (type !== 'movie') return resolve([]);

        var key = '4ef0d7355d9ffb5151e987764708ce96';
        
        // İlk aşama: TMDB'den isim al
        fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + key)
            .then(function(r) { return r.json(); })
            .then(function(m) {
                // Sadece film ismini ara, gereksiz yükten kaçın
                var q = encodeURIComponent(m.title);
                return fetch('https://www.fullhdfilmizlesene.live/arama/' + q);
            })
            .then(function(r) { return r.text(); })
            .then(function(h) {
                // HTML'in sadece ilk 5000 karakterinde link ara (CPU tasarrufu)
                var part = h.substring(0, 8000);
                var linkMatch = part.match(/href=["'](\/film\/[^"']+)["']/);
                if (!linkMatch) return resolve([]);
                
                return fetch('https://www.fullhdfilmizlesene.live' + linkMatch[1]);
            })
            .then(function(r) { return r.text(); })
            .then(function(p) {
                // scx değişkenini çok daha dar bir alanda ara
                var start = p.indexOf('scx=');
                if (start === -1) return resolve([]);
                
                var end = p.indexOf('};', start);
                var jsonStr = p.substring(start + 4, end + 1);
                var data = JSON.parse(jsonStr);
                
                var results = [];
                // Sadece en hızlı kaynak (TR)
                if (data.tr && data.tr.sx && data.tr.sx.t) {
                    var raw = Array.isArray(data.tr.sx.t) ? data.tr.sx.t[0] : data.tr.sx.t;
                    // Rot13 + Atob manuel (Önceki mesajdaki fonksiyonları buraya dahil et)
                    results.push({ name: "Hızlı Kaynak", url: raw }); 
                }
                resolve(results);
            })
            .catch(function(err) {
                resolve([]);
            });
    });
}

module.exports = { getStreams };
