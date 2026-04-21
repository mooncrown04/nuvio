/**
 * JetFilmizle — Nuvio Ultra
 * Arama motoruna takılmadan direkt URL tahmini ve Titan Cozucu
 */

var BASE_URL = 'https://jetfilmizle.net';
var TMDB_API_KEY = '500330721680edb6d5f7f12ba7cd9023';

var HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36',
    'Referer': 'https://jetfilmizle.net/'
};

function toSlug(t) {
    if(!t) return "";
    return t.toLowerCase()
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
            var trName = info.name || info.title;
            var enName = info.original_name || info.original_title;
            console.error('[Hata-Nerede] 2: TMDB TR->' + trName + ' EN->' + enName);
            
            // Arama motoruna sormadan önce en güçlü adayları belirle
            var candidates = [];
            if (mediaType === 'tv') {
                var suffix = '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                candidates.push(BASE_URL + '/dizi/' + toSlug(trName) + suffix);
                candidates.push(BASE_URL + '/dizi/' + toSlug(enName) + suffix);
            } else {
                candidates.push(BASE_URL + '/film/' + toSlug(trName));
                candidates.push(BASE_URL + '/film/' + toSlug(enName));
            }

            // Bu adayları sırayla dene, hangisi 200 dönerse onu al
            console.error('[Hata-Nerede] 3: Adaylar denenecek: ' + candidates[0]);
            
            return fetch(candidates[0], { headers: HEADERS }).then(function(res) {
                if (res.status === 200) return res.text();
                console.error('[Hata-Nerede] 4: Ilk aday tutmadi, ikinci deneniyor: ' + candidates[1]);
                return fetch(candidates[1], { headers: HEADERS }).then(function(res2) {
                    return res2.text();
                });
            });
        })
        .then(function(html) {
            if (!html || html.indexOf('Sayfa Bulunamadı') !== -1) {
                console.error('[Hata-Nerede] 5: Hicbir URL sonuc vermedi.');
                return [];
            }
            
            console.error('[Hata-Nerede] 6: HTML basariyla alindi');
            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // --- TITAN / VIDEOPARK TARAMA ---
            var playerUrls = [];
            var pRe = /(?:src|data-video|data-src)=['"](https?:\/\/videopark\.top\/titan\/w\/[^'"]+)['"]/gi;
            var match;
            while ((match = pRe.exec(html)) !== null) {
                if (playerUrls.indexOf(match[1]) === -1) playerUrls.push(match[1]);
            }

            var promises = [];
            for (var i = 0; i < playerUrls.length; i++) {
                console.error('[Hata-Nerede] 9: Titan Linki Bulundu -> ' + playerUrls[i]);
                promises.push(
                    fetch(playerUrls[i], { headers: HEADERS })
                    .then(function(r) { return r.text(); })
                    .then(function(p_html) {
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

            return Promise.all(promises).then(function(results) {
                for (var j = 0; j < results.length; j++) {
                    if (results[j]) streams.push(results[j]);
                }

                // Filmler için doğrudan _sd (Sayfa içindeyse)
                if (html.indexOf('var _sd =') !== -1) {
                    try {
                        var raw = html.split('var _sd =')[1].split('};')[0] + '}';
                        var vData = JSON.parse(raw);
                        if (vData.stream_url && streams.length === 0) {
                            streams.push({
                                name: "JetFilm (Direct)",
                                url: vData.stream_url,
                                type: 'hls',
                                title: '⌜ Kaynak 1 ⌟',
                                headers: { 'Referer': 'https://videopark.top/' }
                            });
                        }
                    } catch(e) {}
                }

                console.error('[Hata-Nerede] 10: Bitti. Kaynak: ' + streams.length);
                return streams;
            });
        })
        .catch(function(e) {
            console.error('[JetFilm-KRITIK]: ' + e.message);
            return [];
        });
}

module.exports = { getStreams: getStreams };
