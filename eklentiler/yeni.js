/**
 * JetFilmizle — Nuvio Provider (STANDART ŞABLON)
 * * NOT: Hem Film hem de Dizi (TV) desteği içerir.
 * name  -> İçerik Adı (Film/Dizi İsmi)
 * title -> ⌜ Sağlayıcı ⌟ | 🇹🇷 Dil Bilgisi
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

// ── Yardımcılar ──────────────────────────────────────────────
function titleToSlug(t) {
    return (t || '').toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/â/g,'a').replace(/û/g,'u')
        .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function fetchTmdbInfo(tmdbId, mediaType) {
    var type = (mediaType === 'tv') ? 'tv' : 'movie';
    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(d) { return { title: d.name || d.title }; });
}

// ── Ana İşlem ────────────────────────────────────────────────
function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    
    return fetchTmdbInfo(tmdbId, mediaType)
        .then(function(info) {
            var slug = titleToSlug(info.title);
            var targetUrl = '';

            if (mediaType === 'tv') {
                // Dizi Yapısı: /dizi/dizi-adi/sezon-1/bolum-1
                targetUrl = BASE_URL + '/dizi/' + slug + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
            } else {
                // Film Yapısı: /film/film-adi
                targetUrl = BASE_URL + '/film/' + slug;
            }

            console.error('[JetFilm-Debug] Hedef URL: ' + targetUrl);

            return fetch(targetUrl, { headers: HEADERS })
                .then(function(r) {
                    if (r.ok) return r.text();
                    
                    // Eğer direkt link tutmazsa arama yap
                    return fetch(BASE_URL + '/filmara.php', {
                        method: 'POST',
                        headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                        body: 's=' + encodeURIComponent(info.title)
                    }).then(function(res) { return res.text(); })
                      .then(function(searchHtml) {
                          var regex = new RegExp('href="(https?://jetfilmizle\\.net/(film|dizi)/' + slug + '[^"]*)"');
                          var m = regex.exec(searchHtml);
                          if (m) {
                              var finalLink = m[1];
                              if (mediaType === 'tv') finalLink += '/sezon-' + season + '/bolum-' + episode;
                              return fetch(finalLink, { headers: HEADERS }).then(function(r) { return r.text(); });
                          }
                          throw new Error('Bulunamadı');
                      });
                })
                .then(function(html) {
                    return { html: html, name: info.title };
                });
        })
        .then(function(res) {
            var streams = [];
            
            // Dil Kontrolü
            var isDublaj = res.html.toLowerCase().indexOf('dublaj') !== -1;
            var isAltyazi = res.html.toLowerCase().indexOf('altyazı') !== -1 || res.html.toLowerCase().indexOf('altyazi') !== -1;
            var dilEtiketi = isDublaj ? "Türkçe Dublaj" : (isAltyazi ? "Türkçe Altyazı" : "Türkçe");

            // Pixeldrain Ayıklama
            var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/([^"]+))"/g;
            var m;
            while ((m = pdRe.exec(res.html)) !== null) {
                streams.push({
                    name: res.name,
                    title: '⌜ JetFilmizle ⌟ | 🇹🇷 ' + dilEtiketi + ' (Pixeldrain)',
                    url: 'https://pixeldrain.com/api/file/' + m[2] + '?download',
                    type: 'video',
                    quality: '1080p',
                    language: 'tr',
                    headers: { 'Referer': 'https://pixeldrain.com/' }
                });
            }
            
            // Iframe Ayıklama (Jetv vb.)
            var iframeRe = /<iframe[^>]+(?:src)="([^"]+)"/gi;
            while ((m = iframeRe.exec(res.html)) !== null) {
                var src = m[1];
                if (src.indexOf('jetv') !== -1 || src.indexOf('d2rs') !== -1) {
                    streams.push({
                        name: res.name,
                        title: '⌜ JetFilmizle ⌟ | 🇹🇷 ' + dilEtiketi + ' (Hızlı)',
                        url: src.startsWith('//') ? 'https:' + src : src,
                        type: 'embed',
                        language: 'tr'
                    });
                }
            }

            return streams;
        })
        .catch(function() { return []; });
}

module.exports = { getStreams: getStreams };
