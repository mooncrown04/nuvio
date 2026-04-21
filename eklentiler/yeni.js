/**
 * JetFilmizle — Nuvio PRO (Titan Dynamic)
 * Film + Dinamik Dizi Çözücü
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': 'https://jetfilmizle.net/'
};

function getStreams(id, mediaType, season, episode) {
    console.error('[Hata-Nerede] 1: Basladi');
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var searchTitle = info.name || info.title;
            console.error('[Hata-Nerede] 2: TMDB -> ' + searchTitle);
            
            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': HEADERS['User-Agent'] },
                body: 's=' + encodeURIComponent(searchTitle)
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var regex = /href=['"](https?:\/\/jetfilmizle\.net\/(film|dizi)\/([^'"]+))['"]/i;
                var m = regex.exec(searchHtml);
                
                var finalUrl = '';
                if (m) {
                    finalUrl = m[1];
                    if (mediaType === 'tv' && finalUrl.indexOf('sezon') === -1) {
                        finalUrl += '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                    }
                } else {
                    var slug = (searchTitle || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
                    finalUrl = (mediaType === 'tv') 
                        ? BASE_URL + '/dizi/' + slug + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1)
                        : BASE_URL + '/film/' + slug;
                }

                console.error('[Hata-Nerede] 6: Gidilen URL -> ' + finalUrl);
                return fetch(finalUrl, { headers: HEADERS }).then(function(r) { return r.text(); });
            });
        })
        .then(function(html) {
            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // 1. ADIM: Sayfa içindeki Videopark/Titan linklerini topla
            var playerUrls = [];
            var patterns = [
                /src=['"](https?:\/\/videopark\.top\/titan\/w\/[^'"]+)['"]/gi,
                /data-video=['"](https?:\/\/videopark\.top\/titan\/w\/[^'"]+)['"]/gi,
                /data-src=['"](https?:\/\/videopark\.top\/titan\/w\/[^'"]+)['"]/gi
            ];

            for (var i = 0; i < patterns.length; i++) {
                var match;
                while ((match = patterns[i].exec(html)) !== null) {
                    if (playerUrls.indexOf(match[1]) === -1) playerUrls.push(match[1]);
                }
            }

            // 2. ADIM: Senin "Titan" mantığını her bulunan link için çalıştır
            var promises = [];
            for (var k = 0; k < playerUrls.length; k++) {
                console.error('[Hata-Nerede] 9: Titan Player Cozuluyor -> ' + playerUrls[k]);
                promises.push(
                    fetch(playerUrls[k], { headers: HEADERS })
                    .then(function(r) { return r.text(); })
                    .then(function(p_html) {
                        // Senin koddaki _sd yakalama kısmı
                        var sdMatch = p_html.match(/var\s+_sd\s*=\s*({[\s\S]*?});/);
                        if (sdMatch) {
                            var data = JSON.parse(sdMatch[1]);
                            return {
                                name: "JetFilm (Titan)",
                                title: '⌜ Videopark ⌟ | 🇹🇷 ' + dil,
                                url: data.stream_url,
                                type: 'hls',
                                headers: { 'Referer': 'https://videopark.top/' }
                            };
                        }
                        return null;
                    }).catch(function(){ return null; })
                );
            }

            // Filmler için doğrudan _sd kontrolü (Sayfa içinde varsa)
            if (html.indexOf('var _sd =') !== -1) {
                try {
                    var raw = html.split('var _sd =')[1].split('};')[0] + '}';
                    var vData = JSON.parse(raw);
                    if (vData.stream_url) {
                        streams.push({
                            name: "JetFilm (Direct)",
                            url: vData.stream_url,
                            type: 'hls',
                            title: '⌜ Kaynak 1 ⌟ | 🇹🇷 ' + dil,
                            headers: { 'Referer': 'https://videopark.top/' }
                        });
                    }
                } catch(e) {}
            }

            return Promise.all(promises).then(function(results) {
                for (var j = 0; j < results.length; j++) {
                    if (results[j]) streams.push(results[j]);
                }

                // Pixeldrain (Yedek)
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
