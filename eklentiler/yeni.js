var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Referer': BASE_URL + '/'
};

function titleToSlug(t) {
    return (t || '').toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/â/g,'a').replace(/û/g,'u')
        .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function fetchTmdbInfo(tmdbId) {
    console.error('[Nuvio-Debug] TMDB İsteği Atılıyor: ' + tmdbId);
    return fetch('https://api.themoviedb.org/3/movie/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (!d.title) throw new Error('TMDB Verisi Dönmedi');
            console.error('[Nuvio-Debug] TMDB Başarılı: ' + d.title);
            return { titleTr: d.title, titleEn: d.original_title };
        });
}

function findFilmPage(titleTr, titleEn) {
    var slugTr = titleToSlug(titleTr);
    var urlTr = BASE_URL + '/film/' + slugTr;
    
    console.error('[Nuvio-Debug] Direkt Link Deneniyor: ' + urlTr);

    return fetch(urlTr, { headers: HEADERS })
        .then(function(r) {
            if (r.ok) return r.text();
            console.error('[Nuvio-Debug] Direkt Link Başarısız (404), Arama Yapılıyor...');
            return searchAndGetPage(titleTr);
        })
        .then(function(html) {
            // HTML içeriğinde film var mı kontrolü
            if (html.indexOf('film_id') !== -1 || html.indexOf('div#movie') !== -1) {
                console.error('[Nuvio-Debug] Film Sayfası Onaylandı.');
                return html;
            }
            throw new Error('Geçerli Film Sayfası Bulunamadı');
        });
}

function searchAndGetPage(query) {
    return fetch(BASE_URL + '/filmara.php', {
        method: 'POST',
        headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
        body: 's=' + encodeURIComponent(query)
    })
    .then(function(r) { return r.text(); })
    .then(function(html) {
        var re = /href="(https?:\/\/jetfilmizle\.net\/film\/[^"?#]+)"/g;
        var m = re.exec(html);
        if (m) {
            console.error('[Nuvio-Debug] Arama Sonucu Bulundu: ' + m[1]);
            return fetch(m[1], { headers: HEADERS }).then(function(r) { return r.text(); });
        }
        throw new Error('Arama Sonucu Boş');
    });
}

function getStreams(id, mediaType) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    console.error('[Nuvio-Debug] getStreams Başladı. ID: ' + tmdbId);

    return fetchTmdbInfo(tmdbId)
        .then(function(info) {
            return findFilmPage(info.titleTr, info.titleEn);
        })
        .then(function(html) {
            var streams = [];
            // Iframe Ayıklama
            var iframeRe = /<iframe[^>]+(?:data-litespeed-src|src)="([^"]+)"/gi;
            var m;
            while ((m = iframeRe.exec(html)) !== null) {
                var src = m[1];
                if (src.indexOf('jetv') !== -1 || src.indexOf('d2rs') !== -1) {
                    console.error('[Nuvio-Debug] Kaynak Bulundu: ' + src);
                    streams.push({
                        title: 'Jetv / D2RS',
                        url: src,
                        type: 'embed',
                        headers: { 'Referer': BASE_URL + '/' }
                    });
                }
            }
            
            // Pixeldrain Ayıklama
            var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/[^"]+)"/g;
            while ((m = pdRe.exec(html)) !== null) {
                console.error('[Nuvio-Debug] Pixeldrain Bulundu: ' + m[1]);
                streams.push({
                    title: 'Pixeldrain',
                    url: m[1],
                    type: 'embed'
                });
            }

            if (streams.length === 0) console.error('[Nuvio-Debug] Hiçbir Stream Linki Bulunamadı!');
            return streams;
        })
        .catch(function(err) {
            console.error('[Nuvio-Critical] HATA: ' + err.message);
            return [];
        });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getStreams: getStreams };
} else {
    var g = (typeof global !== 'undefined') ? global : (typeof window !== 'undefined' ? window : self);
    g.getStreams = getStreams;
}
