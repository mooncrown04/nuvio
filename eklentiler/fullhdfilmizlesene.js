var BASE_URL = 'https://www.fullhdfilmizlesene.live';
var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

async function getStreams(tmdbId, mediaType) {
    if (mediaType !== 'movie') return [];

    try {
        // 1. Film Adını Al (Zamanlayıcıyı kaldırdık, direkt fetch)
        var tmdbRes = await fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=4ef0d7355d9ffb5151e987764708ce96');
        var movie = await tmdbRes.json();
        
        // 2. Arama Yap
        var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(movie.title);
        var searchRes = await fetch(searchUrl, { headers: HEADERS });
        var searchHtml = await searchRes.text();
        
        // 3. Film Sayfası Linkini Bul
        var filmPathMatch = searchHtml.match(/<a[^>]+href=["'](\/film\/[^"']+)["']/i);
        if (!filmPathMatch) return [];

        var filmRes = await fetch(BASE_URL + filmPathMatch[1], { headers: HEADERS });
        var filmHtml = await filmRes.text();

        // 4. Video Verisini Ayıkla
        var scxMatch = filmHtml.match(/scx\s*=\s*(\{[\s\S]*?\});/);
        if (!scxMatch) return [];

        var scxData = JSON.parse(scxMatch[1]);
        var streams = [];

        // Sadece çalışan kaynakları ekle
        if (scxData.tr && scxData.tr.sx && scxData.tr.sx.t) {
            var rawTr = Array.isArray(scxData.tr.sx.t) ? scxData.tr.sx.t[0] : Object.values(scxData.tr.sx.t)[0];
            var decodedTr = universalDecode(rawTr);
            if (decodedTr) {
                streams.push({
                    name: "FHD - TÜRKÇE",
                    url: decodedTr + '|User-Agent=' + encodeURIComponent(HEADERS['User-Agent']),
                    quality: "1080p"
                });
            }
        }

        return streams;

    } catch (err) {
        // Hata durumunda sessizce boş dön
        return [];
    }
}

function universalDecode(s) {
    try {
        var r = function(t) {
            return t.replace(/[a-zA-Z]/g, function(e) {
                return String.fromCharCode((e <= "Z" ? 90 : 122) >= (e = e.charCodeAt(0) + 13) ? e : e - 26);
            });
        };
        var cleaned = r(s).replace(/\s/g, "");
        // atob desteği yoksa bu da çöker, o yüzden kontrol ekledik
        return typeof atob !== 'undefined' ? atob(cleaned) : null;
    } catch (e) {
        return null;
    }
}

module.exports = { getStreams };
