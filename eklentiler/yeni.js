/**
 * JetFilmizle — Nuvio Pro
 * Arama motoru bozulsa bile URL tahmin eden ve Titan ile çözen sürüm.
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
            var year = (info.first_air_date || info.release_date || "").split("-")[0];
            
            console.error('[Hata-Nerede] 2: TMDB -> ' + trName);

            // ARAMA MOTORUNA SOR (BİRİNCİ YOL)
            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': HEADERS['User-Agent'] },
                body: 's=' + encodeURIComponent(trName)
            }).then(function(res) { return res.text(); }).then(function(searchHtml) {
                var regex = /href=['"](https?:\/\/jetfilmizle\.net\/(film|dizi)\/([^'"]+))['"]/i;
                var m = regex.exec(searchHtml);
                
                var targetUrls = [];
                if (m) {
                    targetUrls.push(m[1]); // Arama motoru bulursa ilk sıraya koy
                }
                
                // TAHMİNİ URL'LER (SENİN VERDİĞİN ÖRNEKLERE GÖRE)
                var slugTr = toSlug(trName);
                var slugEn = toSlug(enName);
                
                if (mediaType === 'tv') {
                    var suffix = '/sezon-' + (season || 1) + '/bolum-' + (episode || 1);
                    targetUrls.push(BASE_URL + '/dizi/' + slugTr + suffix);
                    targetUrls.push(BASE_URL + '/dizi/' + slugEn + suffix);
                    targetUrls.push(BASE_URL + '/dizi/' + slugEn + '-' + year + suffix); // Constantine-2014 örneği için
                } else {
                    targetUrls.push(BASE_URL + '/film/' + slugTr);
                    targetUrls.push(BASE_URL + '/film/' + slugEn);
                    targetUrls.push(BASE_URL + '/film/' + slugEn + '-' + year);
                }

                // Bulunan veya tahmin edilen her linki dene
                return fetchLinkSequentially(targetUrls, 0);
            });
        })
        .then(function(html) {
            if (!html) return [];
            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // FİLMLER İÇİN DOĞRUDAN _SD (Seninle bulduğumuz yöntem)
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

            // DİZİLER İÇİN TİTAN (Seninle başardığımız yöntem)
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
                console.error('[Hata-Nerede] 10: Bitti. Kaynak: ' + streams.length);
                return streams;
            });
        })
        .catch(function(e) {
            console.error('[JetFilm-KRITIK]: ' + e.message);
            return [];
        });
}

// Yardımcı fonksiyon: Linkleri sırayla dener, çalışanı (200) döner
function fetchLinkSequentially(urls, index) {
    if (index >= urls.length) return Promise.resolve(null);
    console.error('[Hata-Nerede] 6: Deneniyor -> ' + urls[index]);
    return fetch(urls[index], { headers: HEADERS }).then(function(res) {
        if (res.status === 200) return res.text();
        return fetchLinkSequentially(urls, index + 1);
    });
}

module.exports = { getStreams: getStreams };
