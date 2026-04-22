/**
 * JetFilmizle — Nuvio Provider (Final JSON Matcher)
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
    console.error('[JetFilm-Debug] Başlatıldı: ' + mediaType + ' S:' + season + ' E:' + episode);
    
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var slug = titleToSlug(info.name || info.title);
            var finalUrl = BASE_URL + '/' + (mediaType === 'tv' ? 'dizi' : 'film') + '/' + slug;
            console.error('[JetFilm-Debug] Sayfa Yükleniyor: ' + finalUrl);
            return fetch(finalUrl, { headers: HEADERS });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            var streams = [];
            
            // 1. ADIM: Doğru butonun index numarasını al (Logunda 23 çıkan yer)
            var btnRegex = new RegExp('data-source-index="(\\d+)"[^>]*data-season="' + season + '"[^>]*data-episode="' + episode + '"', 'i');
            var btnMatch = btnRegex.exec(html);

            if (btnMatch) {
                var targetIndex = parseInt(btnMatch[1]);
                console.error('[JetFilm-Debug] Hedef Index: ' + targetIndex);

                // 2. ADIM: Sayfa içindeki gizli "sources" dizisini yakala
                // Jetfilmizle veriyi genellikle [ { "url": "...", "index": 0 }, ... ] formatında saklar
                var jsonRegex = /(?:var|const|let)\s+(?:sources|player_sources|video_sources|titan_sources)\s*=\s*(\[[\s\S]*?\]);/i;
                var jsonMatch = jsonRegex.exec(html);

                if (jsonMatch) {
                    try {
                        var allSources = JSON.parse(jsonMatch[1]);
                        console.error('[JetFilm-Debug] JS Veri Bloğu Yakalandı. Kayıt: ' + allSources.length);
                        
                        // Index numarasına göre doğru kaynağı seç
                        var item = allSources[targetIndex];
                        if (item && (item.url || item.file || item.src)) {
                            var vUrl = item.url || item.file || item.src;
                            streams.push({
                                name: "JetFilmizle",
                                title: '⌜ ' + (item.title || 'Titan Player') + ' ⌟ | HD',
                                url: vUrl.startsWith('//') ? 'https:' + vUrl : vUrl,
                                type: 'embed'
                            });
                        }
                    } catch (e) {
                        console.error('[JetFilm-Debug] JSON Parse Hatası: ' + e.message);
                    }
                } else {
                    console.error('[JetFilm-Debug] KRİTİK: Sayfada "sources" değişkeni bulunamadı.');
                }
            }

            // Fallback: Statik tarama (Hala bir şeyler varsa yakalar)
            return scanStatic(html, streams);
        })
        .catch(function(err) {
            console.error('[JetFilm-Debug] HATA: ' + err.message);
            return [];
        });
}

function scanStatic(html, streams) {
    var videoRe = /(?:iframe[^>]+src|data-src|data-link)="([^"]*(?:jetv|videopark|titan|d2rs|vcloud)[^"]*)"/gi;
    var m;
    while ((m = videoRe.exec(html)) !== null) {
        var src = m[1];
        if (!streams.some(function(s) { return s.url.includes(src); })) {
            streams.push({
                name: "JetFilmizle",
                title: '⌜ Kaynak ⌟',
                url: src.startsWith('//') ? 'https:' + src : src,
                type: 'embed'
            });
        }
    }
    console.error('[JetFilm-Debug] Final Kaynak Sayısı: ' + streams.length);
    return streams;
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { getStreams: getStreams }; }
if (typeof globalThis !== 'undefined') { globalThis.getStreams = getStreams; }
