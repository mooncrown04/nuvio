/**
 * JetFilmizle — Nuvio Pro (Final Link Fix)
 * Dinamik URL yapısını çözen ve Titan ile birleştiren sürüm.
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
            console.error('[Hata-Nerede] 2: Arama -> ' + searchTitle);
            
            // Arama motorundan gelen link en güvenlisidir çünkü manuel linkleri (12-maymun-2015 gibi) o bilir.
            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': HEADERS['User-Agent'] },
                body: 's=' + encodeURIComponent(searchTitle)
            });
        })
        .then(function(res) { return res.text(); })
        .then(function(searchHtml) {
            // Arama sonucundan gelen linki cımbızla çek
            var regex = /href=['"](https?:\/\/jetfilmizle\.net\/(film|dizi)\/([^'"]+))['"]/i;
            var m = regex.exec(searchHtml);
            
            if (!m) {
                console.error('[Hata-Nerede] 5: Sitede bulunamadı.');
                return [];
            }

            var finalUrl = m[1];
            
            // DIZI LINKLERINI DUZELTME MERKEZI
            if (mediaType === 'tv') {
                // Eğer link zaten bir bölüme gitmiyorsa (yani ana sayfaysa)
                if (finalUrl.indexOf('sezon') === -1) {
                    // Sonda slash varsa kaldır ve sezon/bölüm ekle
                    finalUrl = finalUrl.replace(/\/$/, '') + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                }
            }
            
            console.error('[Hata-Nerede] 6: Gidilen URL -> ' + finalUrl);
            return fetch(finalUrl, { headers: HEADERS }).then(function(r) { return r.text(); });
        })
        .then(function(html) {
            if (!html) return [];
            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // --- 1. FILMLER İÇİN DOĞRUDAN SD ---
            if (html.indexOf('var _sd =') !== -1) {
                try {
                    var raw = html.split('var _sd =')[1].split('};')[0] + '}';
                    var vData = JSON.parse(raw);
                    if (vData.stream_url) {
                        streams.push({
                            name: "JetFilm (Hızlı)",
                            url: vData.stream_url,
                            type: 'hls',
                            title: '⌜ Kaynak 1 ⌟ | 🇹🇷 ' + dil,
                            headers: { 'Referer': 'https://videopark.top/' }
                        });
                    }
                } catch(e) {}
            }

            // --- 2. DIZILER İÇİN TITAN PLAYER (Senin başarılı metodun) ---
            var playerUrls = [];
            var pRe = /(?:src|data-video|data-src)=['"](https?:\/\/videopark\.top\/titan\/w\/[^'"]+)['"]/gi;
            var match;
            while ((match = pRe.exec(html)) !== null) {
                if (playerUrls.indexOf(match[1]) === -1) playerUrls.push(match[1]);
            }

            var promises = [];
            for (var i = 0; i < playerUrls.length; i++) {
                console.error('[Hata-Nerede] 9: Titan Cozuluyor -> ' + playerUrls[i]);
                promises.push(
                    fetch(playerUrls[i], { headers: HEADERS })
                    .then(function(r) { return r.text(); })
                    .then(function(p_html) {
                        // Senin daha önce sonuç aldığın meşhur regex
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
                
                // Pixeldrain (Sağlam yedek)
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
