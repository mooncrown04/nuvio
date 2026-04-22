/**
 * JetFilmizle — Nuvio Provider (Titan API Edition)
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
    console.error('[JetFilm-Debug] Titan API Taraması: S' + season + ' E' + episode);
    
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var slug = titleToSlug(info.name || info.title);
            var finalUrl = BASE_URL + '/' + (mediaType === 'tv' ? 'dizi' : 'film') + '/' + slug;
            return fetch(finalUrl, { headers: HEADERS });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            var streams = [];
            
            // 1. ADIM: Film ID'sini al (Sayfa içindeki global değişken veya inputtan)
            var filmIdM = html.match(/name="film_id" value="(\d+)"/) || html.match(/post_id\s*:\s*(\d+)/);
            if (!filmIdM) return [];

            var filmId = filmIdM[1];
            console.error('[JetFilm-Debug] Film ID bulundu: ' + filmId);

            // 2. ADIM: AJAX isteğiyle asıl kaynakları "zorla" çek
            // YouTube (trailer) linklerini buraya hiç dahil etmiyoruz
            var formData = 'action=get_player_source&film_id=' + filmId + 
                           '&season=' + season + '&episode=' + episode + 
                           '&type=dublaj'; // Veya altyazi

            return fetch(BASE_URL + '/wp-admin/admin-ajax.php', {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                body: formData
            })
            .then(function(res) { return res.json(); })
            .then(function(json) {
                if (json.success && json.data) {
                    // Tek bir link veya link listesi gelebilir
                    var videoUrl = json.data.video_url || json.data.url;
                    if (videoUrl && !videoUrl.includes('youtube.com')) {
                        streams.push({
                            name: "JetFilmizle",
                            title: "⌜ Asıl Kaynak ⌟",
                            url: videoUrl.startsWith('//') ? 'https:' + videoUrl : videoUrl,
                            type: 'embed'
                        });
                    }
                }
                
                // 3. ADIM: Eğer AJAX boş dönerse, HTML içinde YouTube OLMAYAN tek linki ara
                if (streams.length === 0) {
                    var matches = html.match(/(?:https?:)?\/\/[^\s"'<>]+(?:titan|jetv|videopark|d2rs|vcloud)[^\s"'<>]*/gi) || [];
                    matches.forEach(function(u) {
                        if (!u.includes('youtube') && !u.includes('google')) {
                            streams.push({
                                name: "JetFilmizle",
                                title: "⌜ Yedek Kaynak ⌟",
                                url: u.startsWith('//') ? 'https:' + u : u,
                                type: 'embed'
                            });
                        }
                    });
                }

                console.error('[JetFilm-Debug] Sonuç (YouTube Hariç): ' + streams.length);
                return streams;
            });
        })
        .catch(function(err) {
            console.error('[JetFilm-Debug] HATA: ' + err.message);
            return [];
        });
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = globalThis.getStreams || getStreams; }
