/**
 * JetFilmizle — Nuvio Provider (HTML Button Scraper)
 */

var BASE_URL     = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': BASE_URL + '/'
};

function titleToSlug(t) {
    return (t || '').toLowerCase().trim()
        .replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ş/g,'s')
        .replace(/ı/g,'i').replace(/İ/g,'i').replace(/ö/g,'o')
        .replace(/ç/g,'c').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
}

function getStreams(id, mediaType, season, episode) {
    console.error('[JetFilm-Debug] Başlatıldı: ' + mediaType + ' Sezon: ' + season + ' Bölüm: ' + episode);
    
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var slug = titleToSlug(info.name || info.title);
            var finalUrl = BASE_URL + '/' + (mediaType === 'tv' ? 'dizi' : 'film') + '/' + slug;
            console.error('[JetFilm-Debug] Bağlanılıyor: ' + finalUrl);
            return fetch(finalUrl, { headers: HEADERS });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            var streams = [];

            if (mediaType === 'tv') {
                // HTML içindeki butonları Regex ile tara
                // Örnek: data-source-index="23" data-player-type="dublaj" data-season="2" data-episode="9"
                var btnRegex = new RegExp('data-source-index="(\\d+)"[^>]*data-season="' + season + '"[^>]*data-episode="' + episode + '"', 'i');
                var match = btnRegex.exec(html);

                if (match) {
                    var sourceIndex = match[1];
                    console.error('[JetFilm-Debug] Bölüm Butonu Bulundu! Index: ' + sourceIndex);
                    
                    // Sitede genellikle kaynaklar "player_sources" gibi bir JS dizisinde veya 
                    // direkt iframe olarak bulunur. Şimdi genel bir iframe taraması yapıyoruz.
                    return scanForVideoSources(html, streams);
                } else {
                    console.error('[JetFilm-Debug] HATA: İstenen bölüm butonu HTML içinde bulunamadı.');
                }
            }

            return scanForVideoSources(html, streams);
        })
        .catch(function(err) {
            console.error('[JetFilm-Debug] KRİTİK HATA: ' + err.message);
            return [];
        });
}

function scanForVideoSources(html, streams) {
    // Jetfilmizle'nin kullandığı popüler player patternleri
    var videoPatterns = [
        /(?:iframe[^>]+src|data-src|data-link)="([^"]*(?:jetv|videopark|titan|d2rs|vcloud)[^"]*)"/gi,
        /video_url\s*:\s*"([^"]+)"/gi,
        /file\s*:\s*"([^"]+)"/gi
    ];

    videoPatterns.forEach(function(regex) {
        var m;
        while ((m = regex.exec(html)) !== null) {
            var src = m[1];
            if (src.indexOf('facebook.com') === -1 && src.indexOf('google.com') === -1) {
                var cleanUrl = src.startsWith('//') ? 'https:' + src : src;
                if (!streams.some(function(s) { return s.url === cleanUrl; })) {
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Kaynak ⌟ | HD',
                        url: cleanUrl,
                        type: 'embed'
                    });
                }
            }
        }
    });

    console.error('[JetFilm-Debug] İşlem Tamam. Bulunan Kaynak: ' + streams.length);
    return streams;
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
