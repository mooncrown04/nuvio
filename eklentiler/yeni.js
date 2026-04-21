/**
 * JetFilmizle — Nuvio Pro Ultra (Stabil Final)
 * Filmleri bozmaz, dizilerde URL avcısı kullanır.
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': 'https://jetfilmizle.net/'
};

function toSlug(t) {
    if(!t) return "";
    return t.toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function getStreams(id, mediaType, season, episode) {
    console.error('[Hata-Nerede] 1: Basladi');
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var searchTitle = info.name || info.title;
            console.error('[Hata-Nerede] 2: TMDB -> ' + searchTitle);
            
            // BOT KORUMASINA TAKILMAMAK İÇİN GET ARAMASI YAPIYORUZ
            var searchUrl = BASE_URL + '/arama/' + encodeURIComponent(searchTitle);
            return fetch(searchUrl, { headers: HEADERS }).then(function(res) { return res.text(); });
        })
        .then(function(searchHtml) {
            var s = season || 1;
            var e = episode || 1;
            var foundUrl = '';

            // Arama sonuçlarından ilk geçerli linki yakala
            var m = /href=['"](https?:\/\/jetfilmizle\.net\/(film|dizi)\/([^'"]+))['"]/i.exec(searchHtml);
            if (m) {
                foundUrl = m[1];
                if (mediaType === 'tv' && foundUrl.indexOf('sezon') === -1) {
                    foundUrl = foundUrl.replace(/\/$/, '') + '/sezon-' + s + '/bolum-' + e;
                }
            }

            var candidates = [];
            if (foundUrl) candidates.push(foundUrl); // Önce aramanın bulduğunu dene

            // Tahminleri de yedek olarak ekle (Cobra Kai örneği için)
            var slug = toSlug(foundUrl ? foundUrl.split('/').pop() : 'cobra-kai');
            if (mediaType === 'tv') {
                candidates.push(BASE_URL + '/dizi/' + slug + '/sezon-' + s + '/bolum-' + e);
                candidates.push(BASE_URL + '/dizi/' + slug + '/sezon-' + s + '-bolum-' + e + '-izle');
            } else {
                candidates.push(BASE_URL + '/film/' + slug);
            }

            return fetchSequential(candidates, 0);
        })
        .then(function(html) {
            if (!html) return [];
            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // 1. DOĞRUDAN SD YAKALAMA (Filmlerde çalışan kısım)
            var sdRegex = /var\s+_sd\s*=\s*({[\s\S]*?});/g;
            var sdMatch;
            while ((sdMatch = sdRegex.exec(html)) !== null) {
                try {
                    var data = JSON.parse(sdMatch[1]);
                    if (data.stream_url) {
                        streams.push({
                            name: "JetFilm",
                            title: '⌜ Kaynak ⌟ | ' + dil,
                            url: data.stream_url,
                            type: 'hls',
                            headers: { 'Referer': 'https://videopark.top/' }
                        });
                    }
                } catch(err) {}
            }

            // 2. TITAN IFRAME YAKALAMA (Senin başardığın kısım)
            var pUrls = [];
            var pRe = /(?:src|data-video|data-src)=['"](https?:\/\/videopark\.top\/titan\/w\/[^'"]+)['"]/gi;
            var m;
            while ((m = pRe.exec(html)) !== null) {
                if (pUrls.indexOf(m[1]) === -1) pUrls.push(m[1]);
            }

            var promises = pUrls.map(function(u) {
                return fetch(u, { headers: HEADERS }).then(function(r){ return r.text(); }).then(function(p_html){
                    var innerMatch = /var\s+_sd\s*=\s*({[\s\S]*?});/.exec(p_html);
                    if(innerMatch) {
                        var d = JSON.parse(innerMatch[1]);
                        return { 
                            name: "Titan", 
                            title: '⌜ Videopark ⌟ | ' + dil, 
                            url: d.stream_url, 
                            type: 'hls', 
                            headers: { 'Referer': 'https://videopark.top/' } 
                        };
                    }
                    return null;
                }).catch(function(){ return null; });
            });

            return Promise.all(promises).then(function(results) {
                results.forEach(function(r){ if(r) streams.push(r); });
                console.error('[Hata-Nerede] 10: Islem Bitti. Kaynak: ' + streams.length);
                return streams;
            });
        });
}

function fetchSequential(urls, index) {
    if (index >= urls.length) return Promise.resolve(null);
    console.error('[Hata-Nerede] 6: Deneniyor -> ' + urls[index]);
    return fetch(urls[index], { headers: HEADERS }).then(function(res) {
        if (res.status === 200) return res.text();
        return fetchSequential(urls, index + 1);
    });
}

module.exports = { getStreams: getStreams };
