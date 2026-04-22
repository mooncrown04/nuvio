/**
 * JetFilmizle — Nuvio Provider (Aggressive Scraper)
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/',
    'X-Requested-With': 'XMLHttpRequest'
};

function titleToSlug(t) {
    return (t || '').toLowerCase().trim()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function getStreams(id, mediaType, season, episode) {
    console.error('[JetFilm-Debug] İşlem Başladı. S:' + season + ' E:' + episode);
    
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var slug = titleToSlug(info.name || info.title);
            var finalUrl = BASE_URL + '/' + (mediaType === 'tv' ? 'dizi' : 'film') + '/' + slug;
            console.error('[JetFilm-Debug] Sayfa: ' + finalUrl);
            return fetch(finalUrl, { headers: HEADERS });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            var streams = [];
            
            // 1. ADIM: Sayfa içindeki 'security' veya 'nonce' anahtarını ara
            var nonceMatch = html.match(/"(?:nonce|security|token)"\s*:\s*"([^"]+)"/) || 
                             html.match(/data-nonce="([^"]+)"/);
            var nonce = nonceMatch ? nonceMatch[1] : '';
            
            var filmIdM = html.match(/name="film_id" value="(\d+)"/);
            
            if (mediaType === 'tv' && filmIdM) {
                var filmId = filmIdM[1];
                console.error('[JetFilm-Debug] FilmID: ' + filmId + ' | Nonce: ' + nonce);
                
                // AJAX isteğini tam yetkiyle tekrar dene
                return fetch(BASE_URL + '/wp-admin/admin-ajax.php', {
                    method: 'POST',
                    headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                    body: 'action=get_player_source&film_id=' + filmId + '&season=' + season + '&episode=' + episode + '&type=dublaj&security=' + nonce
                })
                .then(function(res) { return res.text(); })
                .then(function(text) {
                    console.error('[JetFilm-Debug] AJAX Ham Yanıt: ' + text.substring(0, 100));
                    try {
                        var json = JSON.parse(text);
                        if (json && json.data && json.data.video_url) {
                            streams.push({
                                name: "JetFilmizle",
                                title: '⌜ Kaynak 1 ⌟',
                                url: json.data.video_url.startsWith('//') ? 'https:' + json.data.video_url : json.data.video_url,
                                type: 'embed'
                            });
                        }
                    } catch(e) { 
                        console.error('[JetFilm-Debug] AJAX Parse Başarısız, manuel taramaya geçiliyor.');
                    }
                    return finalScan(html, streams);
                });
            }
            return finalScan(html, streams);
        })
        .catch(function(err) {
            console.error('[JetFilm-Debug] HATA: ' + err.message);
            return [];
        });
}

function finalScan(html, streams) {
    // Sayfa içinde gizlenmiş olabilecek tüm JSON yapılarını ve URL'leri yakala
    var patterns = [
        /https?:\/\/[^\s"'<>]+(?:titan|jetv|videopark|d2rs|vcloud)[^\s"'<>]*/gi,
        /["']video_url["']\s*:\s*["']([^"']+)["']/gi
    ];

    patterns.forEach(function(p) {
        var m;
        while ((m = p.exec(html)) !== null) {
            var url = m[1] || m[0];
            if (!streams.some(function(s) { return s.url === url; })) {
                streams.push({
                    name: "JetFilmizle",
                    title: '⌜ Kaynak ⌟',
                    url: url.startsWith('//') ? 'https:' + url : url,
                    type: 'embed'
                });
            }
        }
    });

    console.error('[JetFilm-Debug] Final Sonuç: ' + streams.length);
    return streams;
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = globalThis.getStreams || getStreams; }
