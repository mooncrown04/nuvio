/**
 * JetFilmizle — Nuvio Provider (Universal Decoder)
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
    console.error('[JetFilm-Debug] Çözücü Başlatıldı: S' + season + ' E' + episode);
    
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
            
            // 1. ADIM: Buton Index'ini yakala (Sende 23 çıkmıştı)
            var btnRegex = new RegExp('data-source-index="(\\d+)"[^>]*data-season="' + season + '"[^>]*data-episode="' + episode + '"', 'i');
            var btnMatch = btnRegex.exec(html);
            var targetIdx = btnMatch ? parseInt(btnMatch[1]) : -1;

            // 2. ADIM: Sayfa içindeki Base64 veya gizli JSON bloklarını ara
            // Jetfilm bazen veriyi 'W3siaW5kZXgiOjAsInVybCI6...' gibi uzun bir string içine gömer.
            var secretDataRegex = /["']([A-Za-z0-9+/]{100,})["']/g;
            var m;
            while ((m = secretDataRegex.exec(html)) !== null) {
                try {
                    var decoded = atob(m[1]);
                    if (decoded.includes('"url"') || decoded.includes('"file"')) {
                        console.error('[JetFilm-Debug] Gizli Veri Çözüldü!');
                        var parsed = JSON.parse(decoded);
                        if (Array.isArray(parsed)) {
                            // Eğer hedef index bulunduysa sadece onu, yoksa tümünü ekle
                            var item = (targetIdx !== -1) ? parsed[targetIdx] : null;
                            if (item) {
                                streams.push(createStream(item.url || item.file, item.title));
                            } else {
                                parsed.forEach(function(i) { streams.push(createStream(i.url || i.file, i.title)); });
                            }
                        }
                    }
                } catch(e) { /* Base64 değilse atla */ }
            }

            // 3. ADIM: Klasik Regex Taraması (Fallback)
            var urlPatterns = [
                /(?:https?:)?\/\/[^\s"'<>]+(?:titan|jetv|videopark|d2rs|vcloud|moly|vcdn)[^\s"'<>]*/gi,
                /["'](https?:\/\/[^"']+\.mp4[^"']*)["']/gi
            ];

            urlPatterns.forEach(function(pattern) {
                var matches = html.match(pattern) || [];
                matches.forEach(function(u) {
                    var clean = u.replace(/\\/g, '').split('"')[0];
                    if (!streams.some(function(s) { return s.url === clean; })) {
                        streams.push(createStream(clean, "Kaynak"));
                    }
                });
            });

            console.error('[JetFilm-Debug] Sonuç: ' + streams.length + ' kaynak.');
            return streams;
        })
        .catch(function(err) {
            console.error('[JetFilm-Debug] HATA: ' + err.message);
            return [];
        });
}

function createStream(url, title) {
    var fUrl = url.startsWith('//') ? 'https:' + url : url;
    return {
        name: "JetFilmizle",
        title: '⌜ ' + (title || 'HD Kaynak') + ' ⌟',
        url: fUrl,
        type: 'embed'
    };
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
