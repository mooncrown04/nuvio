/**
 * JetFilmizle — Nuvio Provider (FULL LOGGING & DEBUG)
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'X-Requested-With': 'XMLHttpRequest'
};

function getStreams(id, mediaType, season, episode) {
    console.error('[JetFilm-Debug] İşlem Başladı. Tip: ' + mediaType + ' S:' + season + ' E:' + episode);
    
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var originalTitle = info.name || info.title;
            console.error('[JetFilm-Debug] TMDB Başlık: ' + originalTitle);
            
            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                body: 's=' + encodeURIComponent(originalTitle)
            });
        })
        .then(function(res) { return res.text(); })
        .then(function(searchHtml) {
            var regex = new RegExp('href="(https?://jetfilmizle\\.net/(film|dizi)/([^"/]+))"', 'i');
            var m = regex.exec(searchHtml);
            
            var finalUrl = m ? m[1] : null;
            if (!finalUrl) {
                console.error('[JetFilm-Debug] HATA: Site üzerinde dizi/film bulunamadı.');
                return [];
            }

            console.error('[JetFilm-Debug] Gidilen Sayfa: ' + finalUrl);
            return fetch(finalUrl, { headers: HEADERS }).then(function(r) { return r.text(); });
        })
        .then(function(html) {
            if (!html || html.length < 500) {
                console.error('[JetFilm-Debug] HATA: Sayfa boş veya yüklenemedi.');
                return [];
            }

            var streams = [];
            var filmIdM = html.match(/name="film_id" value="(\d+)"/);

            if (mediaType === 'tv' && filmIdM) {
                var filmId = filmIdM[1];
                console.error('[JetFilm-Debug] Dizi Modu Aktif. FilmID: ' + filmId);
                
                var ajaxBody = 'action=get_player_source&film_id=' + filmId + 
                               '&season=' + (season || 1) + 
                               '&episode=' + (episode || 1) + 
                               '&type=dublaj';

                return fetch(BASE_URL + '/wp-admin/admin-ajax.php', {
                    method: 'POST',
                    headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                    body: ajaxBody
                })
                .then(function(res) { return res.text(); })
                .then(function(text) {
                    console.error('[JetFilm-Debug] AJAX Yanıtı (İlk 100 Karakter): ' + text.substring(0, 100));
                    try {
                        var json = JSON.parse(text);
                        if (json && json.data && json.data.video_url) {
                            streams.push({
                                name: "JetFilmizle",
                                title: '⌜ Titan ⌟ | 🇹🇷 Dublaj',
                                url: json.data.video_url.startsWith('//') ? 'https:' + json.data.video_url : json.data.video_url,
                                type: 'embed'
                            });
                        }
                    } catch(e) {
                        console.error('[JetFilm-Debug] AJAX JSON Parse Hatası: ' + e.message);
                    }
                    return streams;
                });
            }

            // Film ise veya AJAX başarısızsa statik tarama
            console.error('[JetFilm-Debug] Statik Tarama Yapılıyor...');
            return scanStatic(html, streams);
        })
        .catch(function(err) {
            console.error('[JetFilm-Debug] KRİTİK HATA: ' + err.message);
            return [];
        });
}

function scanStatic(html, streams) {
    var videoRe = /(?:iframe[^>]+src|data-src|data-link)="([^"]+)"/gi;
    var m;
    while ((m = videoRe.exec(html)) !== null) {
        var src = m[1];
        if (src.indexOf('jetv') !== -1 || src.indexOf('d2rs') !== -1 || src.indexOf('videopark') !== -1 || src.indexOf('titan') !== -1) {
            streams.push({
                name: "JetFilmizle",
                title: '⌜ Kaynak ⌟',
                url: src.startsWith('//') ? 'https:' + src : src,
                type: 'embed'
            });
        }
    }
    console.error('[JetFilm-Debug] Bulunan Toplam Kaynak: ' + streams.length);
    return streams;
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
