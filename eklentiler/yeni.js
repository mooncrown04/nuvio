/**
 * JetFilmizle — Nuvio Provider (URL Eklemeleri Kaldırıldı)
 */

function getStreams(id, mediaType, season, episode) {
    var tmdbId = id.toString().replace(/[^0-9]/g, '');
    var type = (mediaType === 'tv') ? 'tv' : 'movie';

    return fetch('https://api.themoviedb.org/3/' + type + '/' + tmdbId + '?api_key=' + TMDB_API_KEY + '&language=tr-TR')
        .then(function(r) { return r.json(); })
        .then(function(info) {
            var originalTitle = info.name || info.title;
            
            return fetch(BASE_URL + '/filmara.php', {
                method: 'POST',
                headers: Object.assign({}, HEADERS, { 'Content-Type': 'application/x-www-form-urlencoded' }),
                body: 's=' + encodeURIComponent(originalTitle)
            })
            .then(function(res) { return res.text(); })
            .then(function(searchHtml) {
                var regex = new RegExp('href="(https?://jetfilmizle\\.net/(film|dizi)/([^"/]+))"', 'i');
                var m = regex.exec(searchHtml);
                
                var finalUrl = '';
                if (m) {
                    // ARTIK BURADA EKLEME YAPMIYORUZ. 
                    // Sadece bulduğumuz temiz URL'ye gidiyoruz.
                    finalUrl = m[1]; 
                } else {
                    var fallbackSlug = titleToSlug(originalTitle);
                    finalUrl = BASE_URL + '/' + (mediaType === 'tv' ? 'dizi' : 'film') + '/' + fallbackSlug;
                }

                console.error('[JetFilm-Debug] Gidilen Temiz URL: ' + finalUrl);
                return fetch(finalUrl, { headers: HEADERS });
            });
        })
        .then(function(r) { return r.text(); })
        .then(function(html) {
            if (html.indexOf('Sayfa Bulunamadı') !== -1 || html.length < 500) {
                return [];
            }

            var streams = [];
            var dil = (html.indexOf('dublaj') !== -1) ? "Dublaj" : "Altyazı";

            // 1. Titan Player ve Kaynakları Yakala
            var iframeRe = /<iframe[^>]+src="([^"]+)"/gi;
            var m;
            while ((m = iframeRe.exec(html)) !== null) {
                var src = m[1];
                // Titan veya diğer hızlı kaynaklar
                if (src.indexOf('jetv') !== -1 || src.indexOf('d2rs') !== -1 || src.indexOf('videopark') !== -1) {
                    streams.push({
                        name: "JetFilmizle",
                        title: '⌜ Kaynak ⌟ | 🇹🇷 ' + dil,
                        url: src.startsWith('//') ? 'https:' + src : src,
                        type: 'embed'
                    });
                }
            }

            // 2. Pixeldrain Yakala
            var pdRe = /href="(https?:\/\/pixeldrain\.com\/u\/([^"]+))"/g;
            while ((m = pdRe.exec(html)) !== null) {
                streams.push({
                    name: "JetFilmizle",
                    title: '⌜ Pixeldrain ⌟ | 🇹🇷 ' + dil,
                    url: 'https://pixeldrain.com/api/file/' + m[2] + '?download',
                    type: 'video',
                    headers: { 'Referer': 'https://pixeldrain.com/' }
                });
            }

            return streams;
        })
        .catch(function(e) {
            return [];
        });
}
