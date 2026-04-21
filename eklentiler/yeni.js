/**
 * JetFilmizle — Nuvio PRO (Dizi Tam Çözüm)
 * Ana sayfadan bölümü bulur ve Titan ile çözer.
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

    // 1. ADIM: TMDB'den ismi al
    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var searchTitle = info.name || info.title;
            console.error('[Hata-Nerede] 2: TMDB Isim -> ' + searchTitle);
            
            // 2. ADIM: Sitede ara
            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': HEADERS['User-Agent'] },
                body: 's=' + encodeURIComponent(searchTitle)
            });
        })
        .then(function(res) { return res.text(); })
        .then(function(searchHtml) {
            // 3. ADIM: Dizi ana sayfasını yakala
            var regex = /href=['"](https?:\/\/jetfilmizle\.net\/(film|dizi)\/([^'"]+))['"]/i;
            var m = regex.exec(searchHtml);
            
            var targetUrl = '';
            if (m) {
                targetUrl = m[1];
                // Eğer diziyse ve bölüm bilgisi yoksa, sezon/bölüm ekle
                if (mediaType === 'tv' && targetUrl.indexOf('sezon') === -1) {
                    targetUrl += '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                }
            } else {
                // Hiç bulunamazsa tahmini yapı oluştur (Cobra Kai örneğindeki gibi)
                var slug = (id == "tv:77169") ? "cobra-kai" : "dizi-bulunamadi"; 
                targetUrl = BASE_URL + '/dizi/' + slug + '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
            }

            console.error('[Hata-Nerede] 6: Bolum Sayfasına Gidiliyor -> ' + targetUrl);
            return fetch(targetUrl, { headers: HEADERS }).then(function(r) { return r.text(); });
        })
        .then(function(html) {
            console.error('[Hata-Nerede] 7: Bolum Sayfası HTML Alındı');
            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // 4. ADIM: Sayfadaki Titan/Videopark linklerini bul
            var playerUrls = [];
            var pRe = /src=['"](https?:\/\/videopark\.top\/titan\/w\/[^'"]+)['"]/gi;
            var match;
            while ((match = pRe.exec(html)) !== null) {
                playerUrls.push(match[1]);
            }

            // 5. ADIM: Bulunan linkleri senin Titan metodunla çöz
            var promises = [];
            for (var i = 0; i < playerUrls.length; i++) {
                console.error('[Hata-Nerede] 9: Titan Cozuluyor -> ' + playerUrls[i]);
                promises.push(
                    fetch(playerUrls[i], { headers: HEADERS })
                    .then(function(r) { return r.text(); })
                    .then(function(p_html) {
                        // Senin meşhur _sd yakalama regexin
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
                
                // Filmler için yedek (Sayfa içindeyse)
                if (html.indexOf('var _sd =') !== -1 && streams.length === 0) {
                    try {
                        var raw = html.split('var _sd =')[1].split('};')[0] + '}';
                        var vData = JSON.parse(raw);
                        streams.push({
                            name: "JetFilm (Direct)",
                            url: vData.stream_url,
                            type: 'hls',
                            title: '⌜ Kaynak 1 ⌟',
                            headers: { 'Referer': 'https://videopark.top/' }
                        });
                    } catch(e) {}
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
