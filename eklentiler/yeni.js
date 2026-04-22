/**
 * JetFilmizle — Nuvio Provider (Dizi AJAX Çözümü)
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function titleToSlug(t) {
    return (t || '').toLowerCase()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var originalTitle = info.name || info.title;
            
            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                body: 's=' + encodeURIComponent(originalTitle)
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var regex = new RegExp('href="(https?://jetfilmizle\\.net/(film|dizi)/([^"/]+))"', 'i');
                var m = regex.exec(searchHtml);
                
                var finalUrl = m ? m[1] : (BASE_URL + '/' + (mediaType === 'tv' ? 'dizi' : 'film') + '/' + titleToSlug(originalTitle));
                return fetch(finalUrl, { headers: HEADERS });
            });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            var streams = [];
            var filmIdM = html.match(/name="film_id" value="(\d+)"/);
            
            // DİZİ İSE AJAX İLE KAYNAK ÇEK
            if (mediaType === 'tv' && filmIdM) {
                var filmId = filmIdM[1];
                var ajaxUrl = BASE_URL + '/wp-admin/admin-ajax.php';
                var body = 'action=get_player_source&film_id=' + filmId + 
                           '&season=' + (season || 1) + 
                           '&episode=' + (episode || 1) + 
                           '&type=dublaj'; // Veya altyazı

                return fetch(ajaxUrl, {
                    method: 'POST',
                    headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                    body: body
                })
                .then(function(res) { return res.json(); })
                .then(function(json) {
                    if (json && json.data && json.data.video_url) {
                        streams.push({
                            name: "JetFilmizle",
                            title: '⌜ Titan Player ⌟ | 🇹🇷 Dublaj',
                            url: json.data.video_url,
                            type: 'embed'
                        });
                    }
                    return streams;
                });
            }

            // FİLM İSE NORMAL SCAN YAP (Senin çalışan mantığın)
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";
            var videoRe = /(?:iframe[^>]+src|data-src|data-link)="([^"]+)"/gi;
            var m;
            while ((m = videoRe.exec(html)) !== null) {
                var src = m[1];
                if (src.indexOf('jetv') !== -1 || src.indexOf('d2rs') !== -1 || src.indexOf('videopark') !== -1) {
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Kaynak ⌟ | 🇹🇷 ' + dil,
                        url: src.startsWith('//') ? 'https:' + src : src,
                        type: 'embed'
                    });
                }
            }

            var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/([^"]+))"/g;
            while ((m = pdRe.exec(html)) !== null) {
                streams.push({
                    name: "JetFilmizle",
                    title: '⌜ Pixeldrain ⌟ | 🇹🇷 ' + dil,
                    url: 'https://pixeldrain.com/api/file/' + m[2] + '?download',
                    type: 'video',
                    headers: { 'Referer': 'https://pixeldrain.com/' }
                });
            }

            return streams;
        })
        .catch(function(e) {
            return [];
        });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
