/**
 * JetFilmizle — Nuvio Provider (STANDART ŞABLON)
 * * NOT: Bu eklenti Nuvio standart şablonuna göre yapılandırılmıştır.
 * name  -> İçerik Adı (Film/Dizi İsmi)
 * title -> ⌜ Sağlayıcı ⌟ | 🇹🇷 Dil Bilgisi
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

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
        .then(function(d) { return { title: d.name || d.title }; })
        .catch(function() { return { title: '' }; });
}

function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    
    return fetchTmdbInfo(tmdbId, mediaType)
        .then(function(info) {
            if (!info.title) return [];
            var slug = titleToSlug(info.title);
            
            // 1. ADIM: Direkt URL oluştur (Nuvio Bölüm Seçimi Uyumu)
            var targetUrl = (mediaType === 'tv') 
                ? BASE_URL + '/dizi/' + slug + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1)
                : BASE_URL + '/film/' + slug;

            console.error('[JetFilm-Debug] İstek: ' + targetUrl);

            return fetch(targetUrl, { headers: HEADERS })
                .then(function(r) {
                    if (r.ok) return r.text();
                    
                    // 2. ADIM: Direkt link yoksa Arama yap
                    return fetch(BASE_URL + '/filmara.php', {
                        method: 'POST',
                        headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                        body: 's=' + encodeURIComponent(info.title)
                    }).then(function(res) { return res.text(); })
                      .then(function(searchHtml) {
                          var regex = new RegExp('href="(https?://jetfilmizle\\.net/(film|dizi)/([^"/]+))"', 'i');
                          var m = regex.exec(searchHtml);
                          if (m) {
                              var finalLink = BASE_URL + '/' + m[2] + '/' + m[3];
                              if (mediaType === 'tv') finalLink += '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                              return fetch(finalLink, { headers: HEADERS }).then(function(r) { return r.text(); });
                          }
                          return '';
                      });
                })
                .then(function(html) {
                    if (!html) return [];
                    var streams = [];
                    var lowHtml = html.toLowerCase();
                    
                    // Dil Etiketi Belirleme
                    var dil = "Türkçe";
                    if (lowHtml.indexOf('dublaj') !== -1 && (lowHtml.indexOf('altyazı') !== -1 || lowHtml.indexOf('altyazi') !== -1)) dil = "Dublaj & Altyazı";
                    else if (lowHtml.indexOf('dublaj') !== -1) dil = "Dublaj";
                    else if (lowHtml.indexOf('altyazı') !== -1 || lowHtml.indexOf('altyazi') !== -1) dil = "Altyazı";

                    // Pixeldrain Fix
                    var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/([^"]+))"/g;
                    var m;
                    while ((m = pdRe.exec(html)) !== null) {
                        streams.push({
                            name: info.title,
                            title: '⌜ JetFilmizle ⌟ | 🇹🇷 ' + dil + ' (Pixeldrain)',
                            url: 'https://pixeldrain.com/api/file/' + m[2] + '?download',
                            type: 'video',
                            quality: '1080p',
                            language: 'tr',
                            headers: { 'Referer': 'https://pixeldrain.com/' }
                        });
                    }
                    
                    // Iframe/Embed Kaynaklar
                    var iframeRe = /<iframe[^>]+(?:src)="([^"]+)"/gi;
                    while ((m = iframeRe.exec(html)) !== null) {
                        var src = m[1];
                        if (src.indexOf('jetv') !== -1 || src.indexOf('d2rs') !== -1) {
                            streams.push({
                                name: info.title,
                                title: '⌜ JetFilmizle ⌟ | 🇹🇷 ' + dil + ' (Hızlı)',
                                url: src.startsWith('//') ? 'https:' + src : src,
                                type: 'embed',
                                language: 'tr'
                            });
                        }
                    }
                    return streams;
                });
        })
        .catch(function(err) {
            console.error('[Nuvio-Critical]: ' + err.message);
            return [];
        });
}

module.exports = { getStreams: getStreams };
