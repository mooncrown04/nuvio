/**
 * JetFilmizle — Anti-404 & Universal Debugger
 * Film ve Diziler için Gelişmiş Arama + Titan
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': 'https://jetfilmizle.net/'
};

// URL dostu isim yapma fonksiyonu (Örn: Cobra Kai -> cobra-kai)
function toSlug(t) {
    return (t || '').toLowerCase()
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
            console.error('[Hata-Nerede] 2: TMDB Isim -> ' + searchTitle);
            
            var searchHeaders = {
                'User-Agent': HEADERS['User-Agent'],
                'Referer': HEADERS['Referer'],
                'Content-Type': 'application/x-www-form-urlencoded'
            };

            // Tahmini URL (Arama bulamazsa can kurtaran)
            var slug = toSlug(searchTitle);
            var fallbackUrl = (mediaType === 'tv') 
                ? BASE_URL + '/dizi/' + slug + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1)
                : BASE_URL + '/film/' + slug;

            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: searchHeaders,
                body: 's=' + encodeURIComponent(searchTitle)
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                console.error('[Hata-Nerede] 3: Arama yapildi, sonuclar taranıyor');
                
                // Daha esnek bir regex: tırnak işareti (") veya (') fark etmez
                var regex = /href=['"](https?:\/\/jetfilmizle\.net\/(film|dizi)\/([^'"]+))['"]/i;
                var m = regex.exec(searchHtml);
                
                var finalUrl = '';
                if (m) {
                    finalUrl = m[1]; // Sitenin verdiği tam link
                    if (mediaType === 'tv' && finalUrl.indexOf('sezon') === -1) {
                        finalUrl += '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                    }
                    console.error('[Hata-Nerede] 4: Siteden URL yakalandı');
                } else {
                    finalUrl = fallbackUrl;
                    console.error('[Hata-Nerede] 5: Arama sonuc vermedi, Tahmin kullanılıyor -> ' + finalUrl);
                }

                return fetch(finalUrl, { headers: HEADERS }).then(function(r) { return r.text(); });
            });
        })
        .then(function(html) {
            console.error('[Hata-Nerede] 6: Hedef Sayfa HTML Okundu');
            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // --- VIDEOPARK / TITAN TARAMA ---
            var iframeRe = /<iframe[^>]+src=['"]([^'"]+)['"]/gi;
            var match;
            var playerUrls = [];

            while ((match = iframeRe.exec(html)) !== null) {
                var src = match[1];
                if (src.indexOf('videopark.top') !== -1) {
                    playerUrls.push(src.indexOf('//') === 0 ? 'https:' + src : src);
                }
            }

            // Sayfa içinde doğrudan _sd varsa (Genelde Filmlerde olur)
            if (html.indexOf('var _sd =') !== -1) {
                console.error('[Hata-Nerede] 7: Sayfa icinde _sd verisi bulundu');
                try {
                    var raw = html.split('var _sd =')[1].split('};')[0] + '}';
                    var vData = JSON.parse(raw);
                    if (vData.stream_url) {
                        streams.push({
                            name: "JetFilm (Titan)",
                            url: vData.stream_url,
                            type: 'hls',
                            title: '⌜ Videopark ⌟ | 🇹🇷 ' + dil,
                            headers: { 'Referer': 'https://videopark.top/' }
                        });
                    }
                } catch(e) { console.error('[Hata-Nerede] 8: JSON Hatasi'); }
            }

            // Player linklerini çöz (Diziler için)
            var titanPromises = [];
            for (var i = 0; i < playerUrls.length; i++) {
                console.error('[Hata-Nerede] 9: Player linki cozuluyor -> ' + playerUrls[i]);
                titanPromises.push(
                    fetch(playerUrls[i], { headers: HEADERS })
                    .then(function(r) { return r.text(); })
                    .then(function(p_html) {
                        if (p_html.indexOf('var _sd =') !== -1) {
                            var p_raw = p_html.split('var _sd =')[1].split('};')[0] + '}';
                            var p_data = JSON.parse(p_raw);
                            return {
                                name: "JetFilm (Titan)",
                                url: p_data.stream_url,
                                type: 'hls',
                                title: '⌜ Videopark ⌟ | 🇹🇷 ' + dil,
                                headers: { 'Referer': 'https://videopark.top/' }
                            };
                        }
                        return null;
                    }).catch(function(){ return null; })
                );
            }

            return Promise.all(titanPromises).then(function(results) {
                for (var j = 0; j < results.length; j++) {
                    if (results[j]) streams.push(results[j]);
                }
                
                // --- PIXELDRAIN (Yedek) ---
                var pdRe = /href=['"](https?:\/\/pixeldrain\.com\/u\/([^'"]+))['"]/g;
                var pdM;
                while ((pdM = pdRe.exec(html)) !== null) {
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Pixeldrain ⌟ | 🇹🇷 ' + dil,
                        url: 'https://pixeldrain.com/api/file/' + pdM[2] + '?download',
                        type: 'video'
                    });
                }

                console.error('[Hata-Nerede] 10: Islem Bitti. Kaynak: ' + streams.length);
                return streams;
            });
        })
        .catch(function(e) {
            console.error('[JetFilm-KRITIK]: ' + e.message);
            return [];
        });
}

module.exports = { getStreams: getStreams };
